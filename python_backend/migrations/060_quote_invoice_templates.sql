/**
 * Quote and Invoice Templates Migration
 * 
 * Creates tables for quote and invoice document template management.
 * Allows users to create, store, and apply custom templates for PDF generation.
 * 
 * Constitutional: Deterministic template storage, no ML/AI
 * Tier: 3 Protected Determinism
 */
-- Quote Templates Table
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (
    category IN ('standard', 'premium', 'custom', 'regional')
  ),
  template_config JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  version VARCHAR(50) DEFAULT '1.0.0',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
-- Invoice Templates Table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (
    category IN ('standard', 'premium', 'custom', 'regional')
  ),
  template_config JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  version VARCHAR(50) DEFAULT '1.0.0',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
-- Indexes for quote_templates
CREATE INDEX IF NOT EXISTS idx_quote_templates_user ON quote_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_public ON quote_templates(is_public)
WHERE is_public = TRUE
  AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON quote_templates(category);
CREATE INDEX IF NOT EXISTS idx_quote_templates_deleted ON quote_templates(deleted_at)
WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_templates_user_name_unique ON quote_templates(user_id, name)
WHERE deleted_at IS NULL;
-- Indexes for invoice_templates
CREATE INDEX IF NOT EXISTS idx_invoice_templates_user ON invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_public ON invoice_templates(is_public)
WHERE is_public = TRUE
  AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_templates_category ON invoice_templates(category);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_deleted ON invoice_templates(deleted_at)
WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_templates_user_name_unique ON invoice_templates(user_id, name)
WHERE deleted_at IS NULL;
-- RLS Policies for quote_templates
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public quote templates" ON quote_templates FOR
SELECT USING (
    is_public = TRUE
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can view their own quote templates" ON quote_templates FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can create their own quote templates" ON quote_templates FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quote templates" ON quote_templates FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can delete their own quote templates" ON quote_templates FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);
-- RLS Policies for invoice_templates
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public invoice templates" ON invoice_templates FOR
SELECT USING (
    is_public = TRUE
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can view their own invoice templates" ON invoice_templates FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can create their own invoice templates" ON invoice_templates FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoice templates" ON invoice_templates FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can delete their own invoice templates" ON invoice_templates FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);
-- Updated at triggers
CREATE OR REPLACE FUNCTION update_quote_templates_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_invoice_templates_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_quote_templates_updated_at BEFORE
UPDATE ON quote_templates FOR EACH ROW EXECUTE FUNCTION update_quote_templates_updated_at();
CREATE TRIGGER trigger_update_invoice_templates_updated_at BEFORE
UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_invoice_templates_updated_at();