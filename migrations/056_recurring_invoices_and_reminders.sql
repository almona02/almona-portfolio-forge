-- Migration: 056_recurring_invoices_and_reminders.sql
-- Description: Create tables for recurring invoices and invoice reminders
-- Date: 2026-01-XX
-- Phase: Invoice Management Enhancements
-- Recurring Invoice Schedules Table
CREATE TABLE IF NOT EXISTS recurring_invoice_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    -- References customers/profiles
    template_id UUID,
    -- Optional reference to invoice template
    invoice_template JSONB NOT NULL,
    -- Template data for generating invoices
    frequency VARCHAR(20) NOT NULL CHECK (
        frequency IN (
            'daily',
            'weekly',
            'monthly',
            'quarterly',
            'yearly'
        )
    ),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    -- NULL means no end date
    next_run_date TIMESTAMP NOT NULL,
    last_run_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_paused BOOLEAN DEFAULT FALSE,
    total_runs INTEGER DEFAULT 0,
    max_runs INTEGER,
    -- NULL means unlimited
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Invoice Reminders Table
CREATE TABLE IF NOT EXISTS invoice_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    -- References invoices table
    reminder_type VARCHAR(20) NOT NULL CHECK (
        reminder_type IN ('first', 'second', 'final', 'custom')
    ),
    channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'in_app')),
    send_date TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    is_sent BOOLEAN DEFAULT FALSE,
    template_id UUID,
    -- Optional reference to email template
    custom_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_customer ON recurring_invoice_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_active ON recurring_invoice_schedules(is_active, is_paused);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_run ON recurring_invoice_schedules(next_run_date)
WHERE is_active = TRUE
    AND is_paused = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_send_date ON invoice_reminders(send_date, is_sent)
WHERE is_sent = FALSE;
-- RLS Policies (if RLS is enabled)
-- Note: Adjust policies based on your security requirements
-- Recurring schedules: Users can view/manage their own schedules
-- ALTER TABLE recurring_invoice_schedules ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their recurring schedules" ON recurring_invoice_schedules
--   FOR SELECT USING (auth.uid() = customer_id OR auth.role() = 'admin');
-- Invoice reminders: Users can view reminders for their invoices
-- ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view invoice reminders" ON invoice_reminders
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM invoices 
--       WHERE invoices.id = invoice_reminders.invoice_id 
--       AND invoices.customer_id = auth.uid()
--     ) OR auth.role() = 'admin'
--   );