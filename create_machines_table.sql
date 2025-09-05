-- Idempotent creation for machines table & policies
DO $$ BEGIN
CREATE TABLE IF NOT EXISTS machines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_date DATE,
  warranty_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add missing columns safely (example placeholder if future schema evolves)
-- IF NOT EXISTS checks for columns could be added here.

EXCEPTION WHEN others THEN NULL; END $$;

-- Enable Row Level Security
DO $$ BEGIN
  ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can only see their own machines
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own machines" ON machines;
  CREATE POLICY "Users can view own machines" ON machines
    FOR SELECT USING (auth.uid() = owner_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can insert their own machines
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own machines" ON machines;
  CREATE POLICY "Users can insert own machines" ON machines
    FOR INSERT WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can update their own machines
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own machines" ON machines;
  CREATE POLICY "Users can update own machines" ON machines
    FOR UPDATE USING (auth.uid() = owner_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Optional: index on owner_id for faster filtering
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON machines(owner_id);
EXCEPTION WHEN others THEN NULL; END $$;