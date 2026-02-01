-- Create drafts table for user draft management
-- This migration creates the table structure for saving and loading user drafts
CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    twincode TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    element_count INTEGER DEFAULT 0
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_twincode ON drafts(twincode);
-- Enable Row Level Security
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Users can view their own drafts
DROP POLICY IF EXISTS "Users can view their own drafts" ON drafts;
CREATE POLICY "Users can view their own drafts" ON drafts FOR
SELECT USING (auth.uid() = user_id);
-- Users can insert their own drafts
DROP POLICY IF EXISTS "Users can insert their own drafts" ON drafts;
CREATE POLICY "Users can insert their own drafts" ON drafts FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own drafts
DROP POLICY IF EXISTS "Users can update their own drafts" ON drafts;
CREATE POLICY "Users can update their own drafts" ON drafts FOR
UPDATE USING (auth.uid() = user_id);
-- Users can delete their own drafts
DROP POLICY IF EXISTS "Users can delete their own drafts" ON drafts;
CREATE POLICY "Users can delete their own drafts" ON drafts FOR DELETE USING (auth.uid() = user_id);
-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at BEFORE
UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();