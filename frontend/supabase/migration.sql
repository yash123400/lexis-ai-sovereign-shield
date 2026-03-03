-- =====================================================
-- LEXIS-AI SOVEREIGN DATABASE SCHEMA
-- Supabase PostgreSQL Migration
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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovereign_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_lawyers ENABLE ROW LEVEL SECURITY;

-- Allow anon read on audit_logs (for the dashboard)
CREATE POLICY "Allow anon read audit_logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Allow anon access to sovereign_intakes
CREATE POLICY "Allow anon read sovereign_intakes" ON sovereign_intakes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert sovereign_intakes" ON sovereign_intakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update sovereign_intakes" ON sovereign_intakes FOR UPDATE USING (true);

-- Allow anon access to intake_tokens
CREATE POLICY "Allow anon read intake_tokens" ON intake_tokens FOR SELECT USING (true);
CREATE POLICY "Allow anon insert intake_tokens" ON intake_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update intake_tokens" ON intake_tokens FOR UPDATE USING (true);

-- Allow anon access to document_uploads
CREATE POLICY "Allow anon read document_uploads" ON document_uploads FOR SELECT USING (true);
CREATE POLICY "Allow anon insert document_uploads" ON document_uploads FOR INSERT WITH CHECK (true);

-- Allow anon read on authorized_lawyers (for login check)
CREATE POLICY "Allow anon read authorized_lawyers" ON authorized_lawyers FOR SELECT USING (true);

-- =====================================================
-- REALTIME (Enable for Audit Logs)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE sovereign_intakes;
