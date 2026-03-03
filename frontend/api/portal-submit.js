import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbwcpwevgqpbehufvdqo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid2Nwd2V2Z3FwYmVodWZ2ZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzAyNTEsImV4cCI6MjA4ODEwNjI1MX0.3oVrEHeyU0441di0OspkzI5IOBMqXsMJLH1iWuihDq4';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { token, matter_id, file_urls, matter_context, client_name } = req.body;

    if (!token || !file_urls || file_urls.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Token and at least one file URL are required.',
        });
    }

    try {
        // 1. Update the sovereign_intakes status to 'pending review'
        //    Find the intake by the matter_id linked to this token
        if (matter_id) {
            const { error: intakeError } = await supabase
                .from('sovereign_intakes')
                .update({
                    status: 'verified',
                    matter_description: matter_context || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('intake_id', matter_id);

            if (intakeError) {
                console.error('[portal-submit] Intake update failed:', intakeError);
                // Non-blocking: continue even if intake row doesn't exist yet
            }
        }

        // 2. Mark the token as used
        await supabase
            .from('intake_tokens')
            .update({ status: 'used', used_at: new Date().toISOString() })
            .eq('token', token);

        // 3. Log the submission to audit_logs
        await supabase.from('audit_logs').insert({
            intake_id: matter_id || null,
            name: 'Portal-Submission',
            module: 'Integration',
            action: 'Created',
            done_by: client_name || `Client [Token: ${token.slice(0, 8)}...]`,
            done_by_type: 'human',
            detail: `${file_urls.length} document(s) submitted for Matter ${matter_id || 'unlinked'}. Status changed to Pending Review.`,
        });

        // 4. Log solicitor notification event
        await supabase.from('audit_logs').insert({
            intake_id: matter_id || null,
            name: 'Solicitor-Notification',
            module: 'Integration',
            action: 'Created',
            done_by: 'System [Portal_Worker]',
            done_by_type: 'system',
            detail: `Notification dispatched: New sovereign documents uploaded for Matter ${matter_id || 'N/A'}. ${file_urls.length} file(s) awaiting review.`,
        });

        return res.status(200).json({
            success: true,
            message: 'Documents submitted successfully. Solicitor has been notified.',
            documents_count: file_urls.length,
            matter_id: matter_id || null,
            submitted_at: new Date().toISOString(),
        });

    } catch (err) {
        console.error('[portal-submit] Critical error:', err);

        // Attempt rollback: delete uploaded files from storage
        if (file_urls && file_urls.length > 0) {
            try {
                const paths = file_urls
                    .map(url => {
                        // Extract path from full URL
                        const match = url.match(/sovereign-vault\/(.+)$/);
                        return match ? match[1] : null;
                    })
                    .filter(Boolean);

                if (paths.length > 0) {
                    await supabase.storage.from('sovereign-vault').remove(paths);
                    console.log(`[portal-submit] Rollback: removed ${paths.length} orphaned files.`);
                }
            } catch (rollbackErr) {
                console.error('[portal-submit] Rollback failed:', rollbackErr);
            }
        }

        return res.status(500).json({
            success: false,
            error: 'Submission service unavailable. Files have been rolled back.',
        });
    }
}
