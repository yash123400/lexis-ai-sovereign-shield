import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_rateLimit.js';

// ── FIX 1.3: SERVICE ROLE KEY server-side — no hardcoded fallback ─────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// ── UUID v4 validation regex ──────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── FIX 2.5: Rate limit — 5 validation attempts per IP per 60 seconds ─
    const allowed = checkRateLimit(req, res, { maxRequests: 5, windowMs: 60_000 });
    if (!allowed) return;

    if (!supabase) {
        return res.status(503).json({ valid: false, error: 'Validation service unavailable.' });
    }

    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ valid: false, error: 'No token provided.' });
    }

    // ── FIX 2.5: Validate token is a UUID before querying the database ─────
    if (!UUID_REGEX.test(token)) {
        return res.status(400).json({ valid: false, error: 'Invalid token format.' });
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
            return res.status(200).json({ valid: false });
        }

        // Log token validation (written server-side via service role — not bypass-able by client)
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
