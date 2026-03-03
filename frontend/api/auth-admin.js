import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbwcpwevgqpbehufvdqo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid2Nwd2V2Z3FwYmVodWZ2ZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzAyNTEsImV4cCI6MjA4ODEwNjI1MX0.3oVrEHeyU0441di0OspkzI5IOBMqXsMJLH1iWuihDq4';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ authorized: false, error: 'Email is required.' });
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

            // Log unauthorized attempt to audit_logs
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

        // Log successful login
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
                session_token: `SESS-${Date.now().toString(36).toUpperCase()}`,
            },
        });

    } catch (err) {
        console.error('[AUTH] Database error:', err);
        return res.status(500).json({ authorized: false, error: 'Authentication service unavailable.' });
    }
}
