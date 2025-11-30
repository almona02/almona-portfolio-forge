-- Migration: Remnant Marketplace and Workshop Analytics
-- Creates tables for remnant marketplace and workshop performance tracking

-- ============================================================================
-- Remnant Marketplace Tables
-- ============================================================================

-- Remnant Listings Table
CREATE TABLE IF NOT EXISTS public.remnant_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remnant_id UUID REFERENCES public.material_remnants(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Listing Details
  length DECIMAL(10,2) NOT NULL CHECK (length > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'EGP',
  location VARCHAR(100),
  quality TEXT DEFAULT 'good' CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Status and Metadata
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'expired', 'cancelled')),
  description TEXT,
  images TEXT[], -- Array of image URLs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_listing CHECK (length > 0 AND price >= 0)
);

-- Remnant Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS public.remnant_marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.remnant_marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction Details
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'EGP',
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'disputed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_transaction CHECK (price >= 0 AND quantity > 0),
  CONSTRAINT buyer_seller_different CHECK (buyer_id != seller_id)
);

-- ============================================================================
-- Workshop Analytics Tables
-- ============================================================================

-- Workshop Metrics Table (Daily aggregations)
CREATE TABLE IF NOT EXISTS public.workshop_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  
  -- OEE Metrics
  oee_percentage DECIMAL(5,2) CHECK (oee_percentage >= 0 AND oee_percentage <= 100),
  availability_percentage DECIMAL(5,2) CHECK (availability_percentage >= 0 AND availability_percentage <= 100),
  performance_percentage DECIMAL(5,2) CHECK (performance_percentage >= 0 AND performance_percentage <= 100),
  quality_percentage DECIMAL(5,2) CHECK (quality_percentage >= 0 AND quality_percentage <= 100),
  
  -- Production Metrics
  waste_percentage DECIMAL(5,2) CHECK (waste_percentage >= 0 AND waste_percentage <= 100),
  utilization_percentage DECIMAL(5,2) CHECK (utilization_percentage >= 0 AND utilization_percentage <= 100),
  jobs_completed INTEGER DEFAULT 0 CHECK (jobs_completed >= 0),
  material_used DECIMAL(10,2) CHECK (material_used >= 0),
  material_waste DECIMAL(10,2) CHECK (material_waste >= 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_workshop_date UNIQUE (workshop_id, date)
);

-- Operator Metrics Table
CREATE TABLE IF NOT EXISTS public.operator_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workshop_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  
  -- Performance Metrics
  jobs_completed INTEGER DEFAULT 0 CHECK (jobs_completed >= 0),
  efficiency_score DECIMAL(5,2) CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
  average_waste_percentage DECIMAL(5,2) CHECK (average_waste_percentage >= 0 AND average_waste_percentage <= 100),
  average_setup_time DECIMAL(10,2) CHECK (average_setup_time >= 0), -- minutes
  average_cycle_time DECIMAL(10,2) CHECK (average_cycle_time >= 0), -- minutes
  on_time_delivery_rate DECIMAL(5,2) CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_operator_date UNIQUE (operator_id, date)
);

-- Optimization Training Data Table (for ML model training)
CREATE TABLE IF NOT EXISTS public.optimization_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID,
  
  -- Job Complexity Features
  total_cuts INTEGER NOT NULL CHECK (total_cuts > 0),
  unique_profiles INTEGER NOT NULL CHECK (unique_profiles > 0),
  average_cut_length DECIMAL(10,2) NOT NULL,
  max_cut_length DECIMAL(10,2) NOT NULL,
  complexity_score DECIMAL(10,2) NOT NULL,
  
  -- Algorithm Used
  algorithm TEXT NOT NULL CHECK (algorithm IN ('greedy', 'linear', 'genetic')),
  
  -- Performance Results
  solve_time_ms INTEGER NOT NULL CHECK (solve_time_ms >= 0),
  waste_percentage DECIMAL(5,2) NOT NULL CHECK (waste_percentage >= 0 AND waste_percentage <= 100),
  nesting_efficiency DECIMAL(5,2) NOT NULL CHECK (nesting_efficiency >= 0 AND nesting_efficiency <= 100),
  remnant_utilization DECIMAL(5,2) CHECK (remnant_utilization >= 0 AND remnant_utilization <= 100),
  success BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Remnant Marketplace Indexes
CREATE INDEX IF NOT EXISTS idx_remnant_listings_seller ON public.remnant_marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_remnant_listings_profile ON public.remnant_marketplace_listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_remnant_listings_status ON public.remnant_marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_remnant_listings_created ON public.remnant_marketplace_listings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remnant_transactions_buyer ON public.remnant_marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_remnant_transactions_seller ON public.remnant_marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_remnant_transactions_listing ON public.remnant_marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_remnant_transactions_status ON public.remnant_marketplace_transactions(status);

-- Workshop Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_workshop_metrics_workshop_date ON public.workshop_metrics(workshop_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_metrics_date ON public.workshop_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_operator_metrics_operator_date ON public.operator_metrics(operator_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_operator_metrics_workshop_date ON public.operator_metrics(workshop_id, date DESC);

-- Training Data Indexes
CREATE INDEX IF NOT EXISTS idx_training_data_user ON public.optimization_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_training_data_created ON public.optimization_training_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_data_algorithm ON public.optimization_training_data(algorithm);

-- ============================================================================
-- RLS Policies (Row Level Security)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.remnant_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remnant_marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_training_data ENABLE ROW LEVEL SECURITY;

-- Remnant Listings Policies
CREATE POLICY "Users can view available listings" ON public.remnant_marketplace_listings
  FOR SELECT USING (status = 'available' OR auth.uid() = seller_id);

CREATE POLICY "Users can create their own listings" ON public.remnant_marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings" ON public.remnant_marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own listings" ON public.remnant_marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);

-- Remnant Transactions Policies
CREATE POLICY "Users can view their transactions" ON public.remnant_marketplace_transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions as buyers" ON public.remnant_marketplace_transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Workshop Metrics Policies
CREATE POLICY "Users can view their workshop metrics" ON public.workshop_metrics
  FOR SELECT USING (auth.uid() = workshop_id);

CREATE POLICY "Users can insert their workshop metrics" ON public.workshop_metrics
  FOR INSERT WITH CHECK (auth.uid() = workshop_id);

CREATE POLICY "Users can update their workshop metrics" ON public.workshop_metrics
  FOR UPDATE USING (auth.uid() = workshop_id);

-- Operator Metrics Policies
CREATE POLICY "Users can view their operator metrics" ON public.operator_metrics
  FOR SELECT USING (auth.uid() = operator_id OR auth.uid() = workshop_id);

CREATE POLICY "Users can insert their operator metrics" ON public.operator_metrics
  FOR INSERT WITH CHECK (auth.uid() = operator_id OR auth.uid() = workshop_id);

-- Training Data Policies
CREATE POLICY "Users can view their training data" ON public.optimization_training_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their training data" ON public.optimization_training_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_remnant_listings_updated_at
  BEFORE UPDATE ON public.remnant_marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_metrics_updated_at
  BEFORE UPDATE ON public.workshop_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operator_metrics_updated_at
  BEFORE UPDATE ON public.operator_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old listings
CREATE OR REPLACE FUNCTION expire_old_listings()
RETURNS void AS $$
BEGIN
  UPDATE public.remnant_marketplace_listings
  SET status = 'expired'
  WHERE status = 'available'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.remnant_marketplace_listings IS 'Marketplace listings for buying/selling remnants between workshops';
COMMENT ON TABLE public.remnant_marketplace_transactions IS 'Transactions for remnant marketplace purchases';
COMMENT ON TABLE public.workshop_metrics IS 'Daily aggregated workshop performance metrics including OEE';
COMMENT ON TABLE public.operator_metrics IS 'Daily operator performance metrics';
COMMENT ON TABLE public.optimization_training_data IS 'Training data for ML algorithm prediction model';

