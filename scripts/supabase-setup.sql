  -- 1. Table to store encrypted CAC user credentials
  CREATE TABLE IF NOT EXISTS cac_accounts (
    user_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL, -- Encrypted JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Table to store session metadata (The Core Database)
  CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    state TEXT NOT NULL,
    collected_data JSONB NOT NULL DEFAULT '{}',
    history JSONB NOT NULL DEFAULT '[]',
    audit_trail JSONB NOT NULL DEFAULT '[]',
    last_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexing for the Polling Queue (Phase 2)
  CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
  CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

  -- 3. Storage Bucket Setup
  -- You need to create a bucket named 'cac-automation-files' manually in the Supabase Dashboard,
  -- or run these policy helpers if you have the permission:
  /*
  INSERT INTO storage.buckets (id, name, public) VALUES ('cac-automation-files', 'cac-automation-files', false);

  CREATE POLICY "Allow Service Role Full Access" ON storage.objects
    FOR ALL TO service_role USING (bucket_id = 'cac-automation-files');
  */
