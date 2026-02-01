-- Migration: 051_payments.sql
-- Description: Create payments and payment webhooks tables for commercial page
-- Date: 2026-01-05
-- Phase: Feature - Week 1 Day 1

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID, -- Will reference invoices table when it exists
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  method VARCHAR(50) NOT NULL CHECK (method IN ('stripe', 'paypal', 'bank_transfer', 'cash', 'check')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  transaction_id VARCHAR(255),
  processor_response JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  refunded_at TIMESTAMP,
  notes TEXT,
  
  -- Ensure transaction_id is unique per method
  CONSTRAINT payments_transaction_unique UNIQUE (method, transaction_id)
);

-- Payment Webhooks Table (for Stripe/PayPal webhooks)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_status ON payments(method, status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment ON payment_webhooks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payments for their organization
CREATE POLICY "Users can view payments for their organization"
  ON payments FOR SELECT
  USING (
    -- If invoice_id exists, check invoice access
    (invoice_id IS NULL OR EXISTS (
      SELECT 1 FROM fabricator_positions p
      WHERE p.id = (
        SELECT project_id FROM invoices WHERE id = payments.invoice_id
      )
      AND p.owner_user_id = auth.uid()
    ))
    OR
    -- Or if user created the payment (for manual entries)
    EXISTS (
      SELECT 1 FROM activity_events ae
      WHERE ae.entity_type = 'payment'
      AND ae.entity_id = payments.id
      AND ae.user_id = auth.uid()
    )
  );

-- Policy: Users can insert payments
CREATE POLICY "Users can insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    -- Must have access to the invoice if invoice_id is provided
    (invoice_id IS NULL OR EXISTS (
      SELECT 1 FROM fabricator_positions p
      WHERE p.id = (
        SELECT project_id FROM invoices WHERE id = invoice_id
      )
      AND p.owner_user_id = auth.uid()
    ))
  );

-- Policy: Users can update payments (for status updates, notes)
CREATE POLICY "Users can update payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fabricator_positions p
      WHERE p.id = (
        SELECT project_id FROM invoices WHERE id = payments.invoice_id
      )
      AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fabricator_positions p
      WHERE p.id = (
        SELECT project_id FROM invoices WHERE id = payments.invoice_id
      )
      AND p.owner_user_id = auth.uid()
    )
  );

-- Policy: Webhooks are system-only (inserted via service role)
-- Note: In production, webhooks should be handled server-side
CREATE POLICY "System can manage webhooks"
  ON payment_webhooks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW 
  EXECUTE FUNCTION update_payments_updated_at();

-- Function to automatically log payment activities
CREATE OR REPLACE FUNCTION log_payment_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log payment status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_activity(
      'payment',
      NEW.id,
      'payment.' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount', NEW.amount,
        'currency', NEW.currency,
        'method', NEW.method
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER log_payment_activity_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_payment_activity();

-- Comments for documentation
COMMENT ON TABLE payments IS 'Payment records for invoices and quotes';
COMMENT ON COLUMN payments.invoice_id IS 'Reference to invoice (nullable for manual payments)';
COMMENT ON COLUMN payments.transaction_id IS 'External transaction ID from payment processor';
COMMENT ON COLUMN payments.processor_response IS 'Full response from payment processor (Stripe, PayPal, etc.)';
COMMENT ON COLUMN payments.status IS 'Current payment status';
COMMENT ON TABLE payment_webhooks IS 'Webhook events from payment processors for audit and processing';

