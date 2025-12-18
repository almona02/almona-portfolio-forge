# Run Migration in Terminal (Railway PostgreSQL)

## Step 1: Connect to Railway PostgreSQL

```bash
railway connect Postgres
```

You should see:
```
psql (17.6, server 17.7...)
railway=#
```

## Step 2: Run the Migration SQL

Copy and paste this entire SQL block into the `railway=#` prompt:

```sql
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Workers can update job status" ON jobs;
DROP INDEX IF EXISTS idx_jobs_job_id;
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_user_id;
DROP INDEX IF EXISTS idx_jobs_workshop_id;
DROP INDEX IF EXISTS idx_jobs_created_at;
DROP TABLE IF EXISTS jobs;

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

CREATE INDEX idx_jobs_job_id ON jobs(job_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_workshop_id ON jobs(workshop_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON jobs
    FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE jobs IS 'Tracks async computation jobs for realtime status updates';
COMMENT ON COLUMN jobs.job_id IS 'Celery job ID for correlation';
COMMENT ON COLUMN jobs.job_type IS 'Type of job: optimization, smart_scan, etc.';
COMMENT ON COLUMN jobs.status IS 'Current status: pending, processing, completed, failed';
```

## Step 3: Verify

After pasting, you should see:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
COMMENT
COMMENT
COMMENT
COMMENT
```

Then verify with:
```sql
\d jobs
```

This will show the table structure.

## Step 4: Exit

Type `\q` or `exit` to leave psql.

