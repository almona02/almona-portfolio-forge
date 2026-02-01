/**
 * Customers Enhancements Migration
 * 
 * Creates tables for customer enhancements: tags, communications, segments, and reminders.
 * Enables advanced customer management features for Priority 4: Customers Page Upgrade.
 * 
 * Constitutional: Deterministic customer data storage, no ML/AI
 * Tier: 3 Protected Determinism
 */

-- Customer Tags Table
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color code
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Customer Tag Assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES fabricator_customers(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES customer_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, tag_id)
);

-- Customer Communications Table
CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES fabricator_customers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('email', 'call', 'meeting', 'note', 'quote', 'invoice')
  ),
  subject VARCHAR(255),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer Reminders Table
CREATE TABLE IF NOT EXISTS customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES fabricator_customers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_date TIMESTAMP NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer Segments Table
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}', -- Filter criteria for dynamic segments
  is_dynamic BOOLEAN DEFAULT TRUE, -- Dynamic segments auto-update based on criteria
  customer_count INTEGER DEFAULT 0, -- Cache count for performance
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Customer Segment Assignments (for static segments, many-to-many)
CREATE TABLE IF NOT EXISTS customer_segment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES fabricator_customers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(segment_id, customer_id)
);

-- Indexes for customer_tags
CREATE INDEX IF NOT EXISTS idx_customer_tags_user ON customer_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_deleted ON customer_tags(deleted_at)
WHERE deleted_at IS NULL;

-- Indexes for customer_tag_assignments
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer ON customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);

-- Indexes for customer_communications
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_user ON customer_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(type);
CREATE INDEX IF NOT EXISTS idx_customer_communications_created ON customer_communications(created_at DESC);

-- Indexes for customer_reminders
CREATE INDEX IF NOT EXISTS idx_customer_reminders_customer ON customer_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_user ON customer_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_date ON customer_reminders(reminder_date)
WHERE is_completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_reminders_completed ON customer_reminders(is_completed);

-- Indexes for customer_segments
CREATE INDEX IF NOT EXISTS idx_customer_segments_user ON customer_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_deleted ON customer_segments(deleted_at)
WHERE deleted_at IS NULL;

-- Indexes for customer_segment_assignments
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_segment ON customer_segment_assignments(segment_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_customer ON customer_segment_assignments(customer_id);

-- RLS Policies for customer_tags
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own customer tags" ON customer_tags FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can create their own customer tags" ON customer_tags FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customer tags" ON customer_tags FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customer tags" ON customer_tags FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for customer_tag_assignments
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tag assignments for their customers" ON customer_tag_assignments FOR
ALL USING (
    EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_tag_assignments.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM customer_tags
      WHERE customer_tags.id = customer_tag_assignments.tag_id
        AND customer_tags.user_id = auth.uid()
        AND customer_tags.deleted_at IS NULL
    )
  );

-- RLS Policies for customer_communications
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view communications for their customers" ON customer_communications FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_communications.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create communications for their customers" ON customer_communications FOR
INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_communications.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own communications" ON customer_communications FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for customer_reminders
ALTER TABLE customer_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reminders for their customers" ON customer_reminders FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_reminders.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create reminders for their customers" ON customer_reminders FOR
INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_reminders.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own reminders" ON customer_reminders FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for customer_segments
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own customer segments" ON customer_segments FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
CREATE POLICY "Users can create their own customer segments" ON customer_segments FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customer segments" ON customer_segments FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customer segments" ON customer_segments FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for customer_segment_assignments
ALTER TABLE customer_segment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage segment assignments for their customers" ON customer_segment_assignments FOR
ALL USING (
    EXISTS (
      SELECT 1
      FROM customer_segments
      WHERE customer_segments.id = customer_segment_assignments.segment_id
        AND customer_segments.user_id = auth.uid()
        AND customer_segments.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM fabricator_customers
      WHERE fabricator_customers.id = customer_segment_assignments.customer_id
        AND fabricator_customers.owner_user_id = auth.uid()
    )
  );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_customer_tags_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_communications_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_reminders_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_segments_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_tags_updated_at
  BEFORE UPDATE ON customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_tags_updated_at();

CREATE TRIGGER trigger_update_customer_communications_updated_at
  BEFORE UPDATE ON customer_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_communications_updated_at();

CREATE TRIGGER trigger_update_customer_reminders_updated_at
  BEFORE UPDATE ON customer_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_reminders_updated_at();

CREATE TRIGGER trigger_update_customer_segments_updated_at
  BEFORE UPDATE ON customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_segments_updated_at();
