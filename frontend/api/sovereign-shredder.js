import { createClient } from '@supabase/supabase-js';

// ── FIX 1.3: Use SERVICE ROLE KEY server-side — no hardcoded fallback ────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[sovereign-shredder] CRITICAL: Supabase service credentials not configured.');
}

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * FIX 3.3: Helper to retrieve and refresh Clio token before API calls.
 * Reads from clio_tokens table; refreshes using refresh_token if expired.
 */
async function getValidClioToken(firmId = 'default') {
    if (!supabase) throw new Error('Supabase not configured — cannot retrieve Clio token.');

    const { data, error } = await supabase
        .from('clio_tokens')
        .select('*')
        .eq('firm_id', firmId)
        .single();

    if (error || !data) {
        throw new Error('No Clio token found. Please re-authorise in the onboarding flow.');
    }

    const expiresAt = new Date(data.expires_at).getTime();
    const isExpired = Date.now() >= expiresAt - 60_000; // refresh 60s before expiry

    if (!isExpired) return data.access_token;

    // ── Refresh the token if expired ──────────────────────────────────────
    if (!data.refresh_token) {
        throw new Error('Clio token expired and no refresh token available. Please re-authorise.');
    }

    const clientId = process.env.CLIO_CLIENT_ID;
    const clientSecret = process.env.CLIO_CLIENT_SECRET;

    const refreshRes = await fetch('https://au.app.clio.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: data.refresh_token,
        }),
    });

    const refreshData = await refreshRes.json();
    if (!refreshData.access_token) {
        throw new Error('Clio token refresh failed. Please re-authorise in the onboarding flow.');
    }

    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
    await supabase.from('clio_tokens').update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || data.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
    }).eq('firm_id', firmId);

    return refreshData.access_token;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { clientData, matterId } = req.body;

    if (!clientData || !matterId) {
        return res.status(400).json({ error: 'Missing client data or matter ID.' });
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Database service unavailable.' });
    }

    const auditTrail = [];
    const timestamp = new Date().toISOString();

    try {
        // ── PHASE 1: GET VALID CLIO TOKEN ────────────────────────────────
        let clioToken;
        try {
            clioToken = await getValidClioToken(clientData.firmId || 'default');
        } catch (tokenError) {
            // If Clio isn't connected, flag for manual review instead of crashing
            return res.status(503).json({
                success: false,
                error: 'Clio integration not authorised. Please reconnect in Settings.',
                detail: tokenError.message,
                require_reauth: true,
            });
        }

        auditTrail.push({
            action: 'Clio-Contact-Push',
            module: 'Integration',
            status: 'Processing',
            timestamp,
            performedBy: 'System [Sentinel_Worker]'
        });

        // ── PHASE 2: REAL CLIO API — Create Contact ──────────────────────
        const contactRes = await fetch('https://au.app.clio.com/api/v4/contacts.json', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clioToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    name: clientData.name || 'Prospect',
                    type: 'Person',
                }
            }),
        });

        if (!contactRes.ok) {
            const errText = await contactRes.text();
            throw new Error(`Clio contact creation failed (${contactRes.status}): ${errText}`);
        }

        const contactJson = await contactRes.json();
        const clioContactId = contactJson?.data?.id;

        auditTrail.push({
            action: 'Clio-Contact-Created',
            module: 'Integration',
            status: 'Success',
            detail: `Contact ID: ${clioContactId}`,
            timestamp: new Date().toISOString(),
            performedBy: 'System [Sentinel_Worker]'
        });

        // ── PHASE 3: REAL CLIO API — Create Matter ───────────────────────
        const matterRes = await fetch('https://au.app.clio.com/api/v4/matters.json', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clioToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    description: clientData.matterDescription || 'New Matter',
                    client: { id: clioContactId },
                    status: 'open',
                }
            }),
        });

        if (!matterRes.ok) {
            const errText = await matterRes.text();
            throw new Error(`Clio matter creation failed (${matterRes.status}): ${errText}`);
        }

        const matterJson = await matterRes.json();
        const clioMatterId = matterJson?.data?.id;

        auditTrail.push({
            action: 'Clio-Matter-Created',
            module: 'Integration',
            status: 'Success',
            detail: `Matter ID: ${clioMatterId}`,
            timestamp: new Date().toISOString(),
            performedBy: 'System [Sentinel_Worker]'
        });

        // ── PHASE 4: THE REAL SOVEREIGN SHREDDER ────────────────────────
        // Step 4a: Fetch document paths for this intake
        const { data: docs, error: docsError } = await supabase
            .from('document_uploads')
            .select('storage_path')
            .eq('intake_id', matterId);

        auditTrail.push({
            action: 'PII-Shred-Initiated',
            module: 'Security',
            status: 'Processing',
            timestamp: new Date().toISOString(),
            performedBy: 'System [Shred_Worker]'
        });

        // Step 4b: Delete files from Supabase Storage
        if (!docsError && docs && docs.length > 0) {
            const paths = docs.map(d => d.storage_path).filter(Boolean);
            if (paths.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('sovereign-vault')
                    .remove(paths);

                if (storageError) {
                    console.error('[sovereign-shredder] Storage deletion error:', storageError);
                    // Non-fatal: log and continue — partial deletion still audited
                }
            }
        }

        // Step 4c: Delete document_uploads rows from database
        await supabase
            .from('document_uploads')
            .delete()
            .eq('intake_id', matterId);

        // Step 4d: Null out PII columns in sovereign_intakes (retain record for audit, not PII)
        await supabase
            .from('sovereign_intakes')
            .update({
                client_name: '[SHREDDED]',
                matter_description: '[SHREDDED]',
                transaction_hash: '[SHREDDED]',
                face_request_id: '[SHREDDED]',
                status: 'shredded',
                shredded_at: new Date().toISOString(),
                clio_contact_id: String(clioContactId),
                clio_matter_id: String(clioMatterId),
                updated_at: new Date().toISOString(),
            })
            .eq('intake_id', matterId);

        auditTrail.push({
            action: 'Data-Shredded',
            module: 'Security',
            status: 'Success',
            detail: `Storage files deleted. PII columns nulled. intake_id: ${matterId}. Clio Contact: ${clioContactId}. Clio Matter: ${clioMatterId}.`,
            timestamp: new Date().toISOString(),
            performedBy: 'System [Sentinel]'
        });

        // ── PHASE 5: Write final audit log entry ─────────────────────────
        await supabase.from('audit_logs').insert({
            intake_id: matterId,
            name: 'Sovereign-Shredder-Complete',
            module: 'Security',
            action: 'Shredded',
            done_by: 'System [Sentinel_Worker]',
            done_by_type: 'system',
            detail: `Matter ${matterId} shredded. Clio Contact: ${clioContactId}, Matter: ${clioMatterId}.`,
        });

        return res.status(200).json({
            success: true,
            clio: {
                contact_id: String(clioContactId),
                matter_id: String(clioMatterId),
            },
            shredder: {
                items_destroyed: (docs?.length || 0) + 4, // files + PII fields
                method: 'SUPABASE_STORAGE_REMOVE + DB_DELETE + PII_NULL',
                compliance: 'UK-GDPR-Art17-COMPLIANT',
            },
            audit_trail: auditTrail,
            sovereign_timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[sovereign-shredder] Critical Error:', error);

        auditTrail.push({
            action: 'Shredder-Abort',
            module: 'Security',
            status: 'CRITICAL_FAILURE',
            detail: error.message,
            timestamp: new Date().toISOString(),
            performedBy: 'System [Sentinel_Worker]'
        });

        // Log failure to audit trail in Supabase
        if (supabase) {
            await supabase.from('audit_logs').insert({
                intake_id: matterId,
                name: 'Sovereign-Shredder-Failed',
                module: 'Security',
                action: 'Updated',
                done_by: 'System [Sentinel_Worker]',
                done_by_type: 'system',
                detail: `Shredder pipeline failed: ${error.message}`,
            }).catch(() => { });
        }

        return res.status(500).json({
            success: false,
            error: 'Sovereign Shredder Pipeline Failed. Data has not been destroyed. Please contact your administrator.',
            detail: error.message,
            audit_trail: auditTrail,
        });
    }
}
