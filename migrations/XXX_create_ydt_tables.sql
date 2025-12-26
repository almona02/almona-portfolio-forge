-- YDT Intelligence System Database Schema
-- Creates tables for market intelligence, access audit, and watermarks

-- Market Intelligence Table
CREATE TABLE IF NOT EXISTS ydt_market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(100) NOT NULL,
  material_type VARCHAR(50) NOT NULL,
  material_cost DECIMAL(10, 2) NOT NULL,
  labor_cost DECIMAL(10, 2) NOT NULL,
  optimal_margin DECIMAL(5, 2) NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL,
  sample_size INTEGER NOT NULL,
  trend VARCHAR(20), -- 'rising', 'stable', 'declining'
  competition_data JSONB,
  shortage_alerts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for fast queries
  INDEX idx_ydt_market_location (location),
  INDEX idx_ydt_market_material (material_type),
  INDEX idx_ydt_market_updated (updated_at)
);

-- Access Audit Table
CREATE TABLE IF NOT EXISTS ydt_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  project_id UUID,
  access_type VARCHAR(50) NOT NULL, -- 'pricing', 'optimization', 'preset', 'report'
  endpoint VARCHAR(200),
  data_hash VARCHAR(64), -- SHA256 hash of accessed data
  watermark TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ydt_audit_workshop (workshop_id),
  INDEX idx_ydt_audit_type (access_type),
  INDEX idx_ydt_audit_created (created_at)
);

-- Watermarks Table
CREATE TABLE IF NOT EXISTS ydt_watermarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  project_id UUID,
  watermark TEXT NOT NULL,
  encrypted_data TEXT,
  access_key VARCHAR(64),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ydt_watermark_workshop (workshop_id),
  INDEX idx_ydt_watermark_expires (expires_at),
  INDEX idx_ydt_watermark_access_key (access_key)
);

-- Workshop Job Patterns Table (for learning)
CREATE TABLE IF NOT EXISTS workshop_job_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  pattern_type VARCHAR(50) NOT NULL, -- 'shape', 'size', 'material', 'timing'
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_workshop_patterns_workshop (workshop_id),
  INDEX idx_workshop_patterns_type (pattern_type),
  INDEX idx_workshop_patterns_last_seen (last_seen)
);

-- YDT Impact Metrics Table
CREATE TABLE IF NOT EXISTS ydt_impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  project_id UUID,
  used_ydt BOOLEAN DEFAULT FALSE,
  ydt_recommendations TEXT[],
  followed_recommendations BOOLEAN,
  profit_margin DECIMAL(5, 2),
  success BOOLEAN,
  customer_satisfaction INTEGER, -- 1-10
  competitive_win BOOLEAN,
  savings DECIMAL(10, 2), -- EGP
  time_saved DECIMAL(5, 2), -- Hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ydt_metrics_workshop (workshop_id),
  INDEX idx_ydt_metrics_used_ydt (used_ydt),
  INDEX idx_ydt_metrics_created (created_at)
);

-- Competitive Intelligence Table
CREATE TABLE IF NOT EXISTS ydt_competitive_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(100) NOT NULL,
  competitor_name VARCHAR(200),
  competitor_type VARCHAR(50), -- 'local', 'regional', 'national'
  average_price DECIMAL(10, 2),
  common_features TEXT[],
  strengths TEXT[],
  weaknesses TEXT[],
  customer_complaints TEXT[],
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ydt_competitive_location (location),
  INDEX idx_ydt_competitive_detected (detected_at)
);

-- Supplier Intelligence Table
CREATE TABLE IF NOT EXISTS supplier_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(200) NOT NULL,
  location VARCHAR(100),
  reputation VARCHAR(20), -- 'high', 'medium', 'mixed', 'low'
  trust_level DECIMAL(3, 1), -- 0-10
  risks TEXT[],
  strengths TEXT[],
  years_in_business INTEGER,
  last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_supplier_location (location),
  INDEX idx_supplier_reputation (reputation)
);

-- Comments
COMMENT ON TABLE ydt_market_intelligence IS 'Stores YDT market intelligence data for pricing and recommendations';
COMMENT ON TABLE ydt_access_audit IS 'Audit log for all YDT intelligence access for IP protection';
COMMENT ON TABLE ydt_watermarks IS 'Watermarks for tracking and protecting YDT intelligence data';
COMMENT ON TABLE workshop_job_patterns IS 'Learned patterns from workshop history for intelligent suggestions';
COMMENT ON TABLE ydt_impact_metrics IS 'Metrics for measuring YDT ROI and impact';
COMMENT ON TABLE ydt_competitive_intelligence IS 'Competitive landscape intelligence';
COMMENT ON TABLE supplier_intelligence IS 'Supplier reputation and trust data';

