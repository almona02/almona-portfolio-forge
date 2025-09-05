-- Idempotent tickets table + policies upgrade
DO $$ BEGIN
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
  type TEXT DEFAULT 'general',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
EXCEPTION WHEN others THEN NULL; END $$;

-- Enable Row Level Security
DO $$ BEGIN
  ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can only see their own tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
  CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can insert their own tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own tickets" ON tickets;
  CREATE POLICY "Users can insert own tickets" ON tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Policy: Users can update their own tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;
  CREATE POLICY "Users can update own tickets" ON tickets
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Recommended index for ownership filtering
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
EXCEPTION WHEN others THEN NULL; END $$;