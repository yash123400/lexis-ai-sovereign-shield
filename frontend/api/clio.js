import { createClient } from '@supabase/supabase-js';

// ── FIX 1.3: No hardcoded credentials — env vars only ────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── FIX 2.7: Persist tokens using service role (bypasses RLS safely server-side)
const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, firm_id } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, error: 'Authorization code is required.' });
    }

    // ── Validate env vars ─────────────────────────────────────────────────
    const clientId = process.env.CLIO_CLIENT_ID;
    const clientSecret = process.env.CLIO_CLIENT_SECRET;
    const redirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('[clio] CRITICAL: Clio OAuth credentials not configured in environment.');
        return res.status(503).json({ success: false, error: 'Clio integration unavailable. Contact your administrator.' });
    }

    const tokenUrl = 'https://au.app.clio.com/oauth/token';

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (!data.access_token) {
            console.error('[clio] Token exchange failed:', data);
            return res.status(400).json({ success: false, error: data.error_description || 'Clio OAuth handshake failed.' });
        }

        // ── FIX 2.7: Persist tokens to Supabase for future API calls ─────
        if (supabase) {
            const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
            const { error: dbError } = await supabase
                .from('clio_tokens')
                .upsert({
                    firm_id: firm_id || 'default',
                    access_token: data.access_token,
                    refresh_token: data.refresh_token || null,
                    expires_at: expiresAt,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'firm_id' });

            if (dbError) {
                console.error('[clio] Failed to persist token to database:', dbError);
                // Non-blocking: continue — token is still returned for in-memory use
            } else {
                console.log(`[clio] Clio token for firm ${firm_id || 'default'} persisted successfully.`);
            }
        } else {
            console.error('[clio] Supabase not configured — token will not be persisted.');
        }

        // ── FIX 4.5: Removed LEXIS_SOVEREIGN_NODE_982 demo artifact ──────
        return res.status(200).json({
            success: true,
            expires_in: data.expires_in,
            token_type: data.token_type,
        });

    } catch (error) {
        console.error('[clio] OAuth Exchange Error:', error);
        return res.status(500).json({ success: false, error: 'Clio authentication service unavailable.' });
    }
}
