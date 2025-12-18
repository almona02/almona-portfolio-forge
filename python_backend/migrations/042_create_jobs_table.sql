-- Create jobs table for async task tracking
-- Enables Supabase Realtime subscriptions for instant status updates
-- Check if jobs table exists, and drop it if we need to recreate
DO $$ BEGIN -- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Workers can update job status" ON jobs;
-- Drop indexes if they exist
DROP INDEX IF EXISTS idx_jobs_job_id;
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_user_id;
DROP INDEX IF EXISTS idx_jobs_workshop_id;
DROP INDEX IF EXISTS idx_jobs_created_at;
-- Drop table if it exists (be careful with this!)
DROP TABLE IF EXISTS jobs;
END $$;
-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    -- 'optimization', 'smart_scan', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, processing, completed, failed
    -- Job metadata
    user_id UUID,
    workshop_id VARCHAR(255),
    project_ids JSONB DEFAULT '[]'::jsonb,
    -- Input data (stored for debugging/recovery)
    input_data JSONB,
    -- Results
    result_data JSONB,
    error_message TEXT,
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Performance metrics
    processing_time_seconds FLOAT,
    estimated_time_seconds INTEGER DEFAULT 30,
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);
-- Indexes for performance
CREATE INDEX idx_jobs_job_id ON jobs(job_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_workshop_id ON jobs(workshop_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Users can only see their own jobs
CREATE POLICY "Users can view their own jobs" ON jobs FOR
SELECT USING (auth.uid() = user_id);
-- Users can insert their own jobs
CREATE POLICY "Users can create their own jobs" ON jobs FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Workers can update job status (via service role)
CREATE POLICY "Workers can update job status" ON jobs FOR
UPDATE USING (true);
-- Allow updates from backend services
-- Add comments
COMMENT ON TABLE jobs IS 'Tracks async computation jobs for realtime status updates';
COMMENT ON COLUMN jobs.job_id IS 'Celery job ID for correlation';
COMMENT ON COLUMN jobs.job_type IS 'Type of job: optimization, smart_scan, etc.';
COMMENT ON COLUMN jobs.status IS 'Current status: pending, processing, completed, failed';