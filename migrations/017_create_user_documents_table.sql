-- Migration 017: Create user_documents table
-- Creates the user_documents table for storing user-uploaded documents
-- ============================================================================

-- Create user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_upload_date ON public.user_documents(upload_date DESC);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DO $$
BEGIN
    DROP POLICY IF EXISTS "auth_view_own_documents" ON public.user_documents;
    DROP POLICY IF EXISTS "auth_insert_own_documents" ON public.user_documents;
    DROP POLICY IF EXISTS "auth_update_own_documents" ON public.user_documents;
    DROP POLICY IF EXISTS "auth_delete_own_documents" ON public.user_documents;
END $$;

-- Create RLS policies
-- Users can view their own documents
CREATE POLICY "auth_view_own_documents" ON public.user_documents
    FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can insert their own documents
CREATE POLICY "auth_insert_own_documents" ON public.user_documents
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update their own documents
CREATE POLICY "auth_update_own_documents" ON public.user_documents
    FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can delete their own documents
CREATE POLICY "auth_delete_own_documents" ON public.user_documents
    FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_documents';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Failed to create all RLS policies for user_documents. Expected 4, found %', policy_count;
    END IF;
END $$;
