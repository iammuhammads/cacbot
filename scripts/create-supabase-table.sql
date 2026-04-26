-- Run this SQL in your Supabase project's SQL editor to create the `cac_accounts` table
CREATE TABLE IF NOT EXISTS public.cac_accounts (
  user_id text PRIMARY KEY,
  payload text NOT NULL,
  created_at timestamptz DEFAULT now()
);
