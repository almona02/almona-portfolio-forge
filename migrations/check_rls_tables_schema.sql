-- Check schema for RLS tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN (
    'design_templates',
    'recurring_invoice_schedules',
    'invoice_reminders',
    'feature_usage_metrics',
    'user_satisfaction_metrics'
)
ORDER BY table_name, ordinal_position;
