-- Report Schedules Migration
-- Creates table for scheduled report generation and delivery
CREATE TABLE IF NOT EXISTS public.report_schedules (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    day_of_week INTEGER CHECK (
        day_of_week >= 0
        AND day_of_week <= 6
    ),
    day_of_month INTEGER CHECK (
        day_of_month >= 1
        AND day_of_month <= 31
    ),
    time TEXT NOT NULL,
    -- HH:mm format
    recipients TEXT [] NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled ON public.report_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run_at ON public.report_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_template_id ON public.report_schedules(template_id);
-- RLS Policies
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view their own schedules (if user_id is added later)
-- For now, allow authenticated users to view all schedules
CREATE POLICY "Users can view report schedules" ON public.report_schedules FOR
SELECT USING (auth.role() = 'authenticated');
-- Policy: Users can create report schedules
CREATE POLICY "Users can create report schedules" ON public.report_schedules FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- Policy: Users can update report schedules
CREATE POLICY "Users can update report schedules" ON public.report_schedules FOR
UPDATE USING (auth.role() = 'authenticated');
-- Policy: Users can delete report schedules
CREATE POLICY "Users can delete report schedules" ON public.report_schedules FOR DELETE USING (auth.role() = 'authenticated');
-- Comments
COMMENT ON TABLE public.report_schedules IS 'Scheduled report generation and delivery configurations';
COMMENT ON COLUMN public.report_schedules.template_id IS 'Report template ID from ReportTemplates';
COMMENT ON COLUMN public.report_schedules.frequency IS 'Schedule frequency: daily, weekly, or monthly';
COMMENT ON COLUMN public.report_schedules.day_of_week IS 'Day of week (0-6, Sunday=0) for weekly schedules';
COMMENT ON COLUMN public.report_schedules.day_of_month IS 'Day of month (1-31) for monthly schedules';
COMMENT ON COLUMN public.report_schedules.time IS 'Time in HH:mm format (24-hour)';
COMMENT ON COLUMN public.report_schedules.recipients IS 'Array of email addresses to receive scheduled reports';
COMMENT ON COLUMN public.report_schedules.next_run_at IS 'Next scheduled execution time';