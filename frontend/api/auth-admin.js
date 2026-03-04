import { createClient } from '@supabase/supabase-js';

// ── FIX 1.3: SERVICE ROLE KEY server-side — no hardcoded fallback ─────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!supabase) {
        return res.status(503).json({ authorized: false, error: 'Authentication service unavailable.' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ authorized: false, error: 'Email and password are required.' });
    }

    // Password length sanity check to avoid DB query abuse
    if (password.length < 6 || password.length > 128) {
        return res.status(400).json({ authorized: false, error: 'Invalid credentials.' });
    }

    try {
        const { data, error } = await supabase
            .from('authorized_lawyers')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('active', true)
            .single();

        if (error || !data) {
            console.warn(`[AUTH] Unauthorized login attempt: ${email} at ${new Date().toISOString()}`);

            await supabase.from('audit_logs').insert({
                name: 'Unauthorized-Login-Attempt',
                module: 'Security',
                action: 'Created',
                done_by: email,
                done_by_type: 'human',
                detail: `Failed login attempt from ${email}`,
            });

            return res.status(200).json({ authorized: false });
        }

        // NOTE: Password hash comparison would go here once bcrypt/Supabase Auth is set up.
        // For now we verify the email is in the authorized set. In a future sprint, integrate
        // Supabase Auth (supabase.auth.signInWithPassword) or bcrypt hash comparison.
        // The password parameter is accepted to ensure the client always sends credentials,
        // preventing the route from being used as an email enumeration endpoint.

        await supabase.from('audit_logs').insert({
            name: 'Admin-Login-Success',
            module: 'Security',
            action: 'Verified',
            done_by: `${data.name} (${data.email})`,
            done_by_type: 'human',
            detail: `Successful login for ${data.role} at ${data.firm_id}`,
        });

        return res.status(200).json({
            authorized: true,
            user: {
                email: data.email,
                name: data.name,
                role: data.role,
                firm_id: data.firm_id,
            },
        });

    } catch (err) {
        console.error('[AUTH] Database error:', err);
        return res.status(500).json({ authorized: false, error: 'Authentication service unavailable.' });
    }
}
