import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbwcpwevgqpbehufvdqo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid2Nwd2V2Z3FwYmVodWZ2ZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzAyNTEsImV4cCI6MjA4ODEwNjI1MX0.3oVrEHeyU0441di0OspkzI5IOBMqXsMJLH1iWuihDq4';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ valid: false, error: 'No token provided.' });
    }

    try {
        const { data, error } = await supabase
            .from('intake_tokens')
            .select('*')
            .eq('token', token)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) {
            // Token not found or expired
            return res.status(200).json({ valid: false });
        }

        // NOTE: Token is NOT marked as 'used' here.
        // It is only consumed during final submission via /api/portal-submit.
        // This allows the client to refresh the page or re-visit the link.

        // Log token validation
        await supabase.from('audit_logs').insert({
            intake_id: data.matter_id,
            name: 'Client-Token-Validated',
            module: 'Concierge',
            action: 'Verified',
            done_by: 'System [Token_Validator]',
            done_by_type: 'system',
            detail: `Token ${token.slice(0, 8)}... validated for matter ${data.matter_id}`,
        });

        return res.status(200).json({
            valid: true,
            matter_id: data.matter_id,
            expires_in: Math.floor((new Date(data.expires_at) - Date.now()) / 1000),
        });

    } catch (err) {
        console.error('[validate-token] Error:', err);
        return res.status(500).json({
            valid: false,
            error: 'Token validation service unavailable.',
        });
    }
}
