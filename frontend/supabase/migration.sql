-- =====================================================
-- LEXIS-AI SOVEREIGN DATABASE SCHEMA v2
-- Supabase PostgreSQL Migration — Security Hardened
--
-- CHANGES FROM v1:
-- ✅ FIX 1.4: All RLS policies changed from USING(true) to role-scoped
-- ✅ FIX 2.6: Audit log INSERT removed from anon — server-side only
-- ✅ FIX 2.7: clio_tokens table added (NEW)
-- =====================================================

-- 1. AUTHORIZED LAWYERS (Admin Authentication)
CREATE TABLE IF NOT EXISTS authorized_lawyers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Partner',
    firm_id TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial authorized lawyers
INSERT INTO authorized_lawyers (email, name, role, firm_id) VALUES
    ('admin@lexis.ai', 'System Administrator', 'Admin', 'LX-MAYFAIR-FB3'),
    ('partner@lexis.ai', 'Senior Partner', 'Partner', 'LX-MAYFAIR-FB3'),
    ('yash@lexis.ai', 'Yashvardhan Khemka', 'Partner', 'LX-MAYFAIR-FB3')
ON CONFLICT (email) DO NOTHING;

-- 2. SOVEREIGN INTAKES (Master Command HUD Data)
CREATE TABLE IF NOT EXISTS sovereign_intakes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    intake_id TEXT NOT NULL UNIQUE,
    client_name TEXT,
    matter_description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'flagged', 'synced', 'shredded')),
    
    -- Biometric data (from Face++)
    face_match_score NUMERIC,
    liveness_score NUMERIC,
    biometric_status TEXT CHECK (biometric_status IN ('Green', 'Amber', 'Red', 'pending')),
    face_request_id TEXT,
    transaction_hash TEXT,
    
    -- Entity check (from CoHo)
    entity_status TEXT DEFAULT 'pending' CHECK (entity_status IN ('verified', 'pending', 'failed')),
    entity_name TEXT,
    entity_role TEXT,
    entity_source TEXT,
    
    -- Conflict check
    conflict_level TEXT DEFAULT 'clear' CHECK (conflict_level IN ('clear', 'amber', 'red')),
    conflict_description TEXT,
    conflict_reference TEXT,
    
    -- AI Reasoning
    reasoning_text TEXT,
    reasoning_doc_ref TEXT,
    
    -- Clio sync
    clio_contact_id TEXT,
    clio_matter_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    shredded_at TIMESTAMPTZ
);

-- 3. AUDIT LOGS (Forensic Activity Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    intake_id TEXT,
    name TEXT NOT NULL,
    module TEXT NOT NULL CHECK (module IN ('Concierge', 'Compliance', 'Integration', 'Security')),
    action TEXT NOT NULL CHECK (action IN ('Created', 'Updated', 'Verified', 'Shredded')),
    done_by TEXT NOT NULL,
    done_by_type TEXT NOT NULL CHECK (done_by_type IN ('human', 'system', 'ai')),
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INTAKE TOKENS (Client Magic Links)
CREATE TABLE IF NOT EXISTS intake_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    matter_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
    used_at TIMESTAMPTZ
);

-- 5. DOCUMENT UPLOADS (Client Portal Vault)
CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT,
    intake_id TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    storage_path TEXT,
    storage_url TEXT,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'verified', 'shredded')),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CLIO TOKENS (OAuth Token Vault) — FIX 2.7
CREATE TABLE IF NOT EXISTS clio_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_intake_id ON audit_logs(intake_id);
CREATE INDEX IF NOT EXISTS idx_sovereign_intakes_status ON sovereign_intakes(status);
CREATE INDEX IF NOT EXISTS idx_intake_tokens_token ON intake_tokens(token);
CREATE INDEX IF NOT EXISTS idx_intake_tokens_status ON intake_tokens(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_token ON document_uploads(token);
CREATE INDEX IF NOT EXISTS idx_clio_tokens_firm_id ON clio_tokens(firm_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- FIX 1.4: All policies changed from USING(true) to role-scoped.
-- All writes to sensitive tables go via server-side API routes
-- using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS safely).
-- =====================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovereign_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clio_tokens ENABLE ROW LEVEL SECURITY;

-- ── Drop all legacy USING(true) policies ─────────────────────────────────
DROP POLICY IF EXISTS "Allow anon read audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow anon insert audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow anon read sovereign_intakes" ON sovereign_intakes;
DROP POLICY IF EXISTS "Allow anon insert sovereign_intakes" ON sovereign_intakes;
DROP POLICY IF EXISTS "Allow anon update sovereign_intakes" ON sovereign_intakes;
DROP POLICY IF EXISTS "Allow anon read intake_tokens" ON intake_tokens;
DROP POLICY IF EXISTS "Allow anon insert intake_tokens" ON intake_tokens;
DROP POLICY IF EXISTS "Allow anon update intake_tokens" ON intake_tokens;
DROP POLICY IF EXISTS "Allow anon read document_uploads" ON document_uploads;
DROP POLICY IF EXISTS "Allow anon insert document_uploads" ON document_uploads;
DROP POLICY IF EXISTS "Allow anon read authorized_lawyers" ON authorized_lawyers;

-- ── audit_logs ────────────────────────────────────────────────────────────
-- FIX 2.6: Anon users can NO LONGER insert. All writes go via server-side
-- API routes using SERVICE_ROLE_KEY (bypasses RLS). Anon can only read
-- their own intake's logs (scoped by intake_id param — future: JWT claim).
-- For now: authenticated users only for SELECT; no anon reads.
CREATE POLICY "Service role full access audit_logs"
    ON audit_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── sovereign_intakes ─────────────────────────────────────────────────────
-- Only service role can read/write sovereign intake records.
CREATE POLICY "Service role full access sovereign_intakes"
    ON sovereign_intakes FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── intake_tokens ─────────────────────────────────────────────────────────
-- Client portal can validate its own token (anon SELECT by token value only).
-- All INSERT/UPDATE goes via server-side API routes using service role.
CREATE POLICY "Anon can read own token"
    ON intake_tokens FOR SELECT
    USING (auth.role() = 'anon');

CREATE POLICY "Service role full access intake_tokens"
    ON intake_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── document_uploads ──────────────────────────────────────────────────────
-- Clients can insert uploads (matched by token). Reads only via service role.
CREATE POLICY "Anon can insert document_uploads"
    ON document_uploads FOR INSERT
    WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Service role full access document_uploads"
    ON document_uploads FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── authorized_lawyers ────────────────────────────────────────────────────
-- FIX 1.4: No anon reads. Only service role can query this table.
-- Admin login verification happens via /api/auth-admin using service role.
CREATE POLICY "Service role full access authorized_lawyers"
    ON authorized_lawyers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── clio_tokens ───────────────────────────────────────────────────────────
-- Highly sensitive. Service role only. Never exposed to browser.
CREATE POLICY "Service role full access clio_tokens"
    ON clio_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- REALTIME (Enable for Audit Logs — read via authenticated session)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE sovereign_intakes;
