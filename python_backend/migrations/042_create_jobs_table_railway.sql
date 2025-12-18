-- Create jobs table for async task tracking (Railway PostgreSQL version)
-- Run this in Railway PostgreSQL psql prompt

-- Drop existing objects if they exist
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Workers can update job status" ON jobs;
DROP INDEX IF EXISTS idx_jobs_job_id;
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_user_id;
DROP INDEX IF EXISTS idx_jobs_workshop_id;
DROP INDEX IF EXISTS idx_jobs_created_at;
DROP TABLE IF EXISTS jobs;

-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    user_id UUID,
    workshop_id VARCHAR(255),
    project_ids JSONB DEFAULT '[]'::jsonb,
    input_data JSONB,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_seconds FLOAT,
    estimated_time_seconds INTEGER DEFAULT 30,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_jobs_job_id ON jobs(job_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_workshop_id ON jobs(workshop_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Note: RLS policies with auth.uid() are Supabase-specific
-- For Railway, we'll use simpler policies or disable RLS
-- Enable Row Level Security (optional - can disable if not needed)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Simplified RLS policies for Railway (allow all for now, can restrict later)
CREATE POLICY "Allow all operations" ON jobs
    FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE jobs IS 'Tracks async computation jobs for realtime status updates';
COMMENT ON COLUMN jobs.job_id IS 'Celery job ID for correlation';
COMMENT ON COLUMN jobs.job_type IS 'Type of job: optimization, smart_scan, etc.';
COMMENT ON COLUMN jobs.status IS 'Current status: pending, processing, completed, failed';

