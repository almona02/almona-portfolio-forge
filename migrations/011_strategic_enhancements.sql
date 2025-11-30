-- Strategic Enhancements Database Migrations
-- Implements database schema for subscription management, optimizer leads, 
-- optimization comparisons, onboarding progress, and invoice imports

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
  projects_used INTEGER DEFAULT 0,
  projects_limit INTEGER, -- NULL = unlimited
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT valid_projects_limit CHECK (projects_limit IS NULL OR projects_limit > 0),
  CONSTRAINT valid_projects_used CHECK (projects_used >= 0),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 2. Optimizer Leads Table
CREATE TABLE IF NOT EXISTS public.optimizer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  optimization_result JSONB,
  savings_egp DECIMAL(10,2),
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 3. Optimization Comparisons Table
CREATE TABLE IF NOT EXISTS public.optimization_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES public.fabricator_positions(id) ON DELETE CASCADE,
  manual_bars_used INTEGER NOT NULL,
  optimized_bars_used INTEGER NOT NULL,
  manual_waste_percentage DECIMAL(5,2) NOT NULL,
  optimized_waste_percentage DECIMAL(5,2) NOT NULL,
  savings_egp DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_waste_percentage CHECK (
    manual_waste_percentage >= 0 AND manual_waste_percentage <= 100 AND
    optimized_waste_percentage >= 0 AND optimized_waste_percentage <= 100
  ),
  CONSTRAINT valid_bars CHECK (manual_bars_used > 0 AND optimized_bars_used > 0)
);

-- 4. Onboarding Progress Table
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  steps_completed JSONB DEFAULT '[]',
  profile_imported BOOLEAN DEFAULT FALSE,
  first_customer_created BOOLEAN DEFAULT FALSE,
  first_optimization_run BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invoice Imports Table
CREATE TABLE IF NOT EXISTS public.invoice_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_file_url TEXT,
  supplier_name TEXT,
  invoice_number TEXT,
  imported_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Job Risk Scores Table
CREATE TABLE IF NOT EXISTS public.job_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES public.fabricator_positions(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  warnings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enhance Remnant Marketplace Listings with Location
ALTER TABLE public.remnant_marketplace_listings
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS governorate TEXT;

-- 8. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_optimizer_leads_email ON public.optimizer_leads(email);
CREATE INDEX IF NOT EXISTS idx_optimizer_leads_converted ON public.optimizer_leads(converted);
CREATE INDEX IF NOT EXISTS idx_optimization_comparisons_position_id ON public.optimization_comparisons(position_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_imports_user_id ON public.invoice_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_job_risk_scores_position_id ON public.job_risk_scores(position_id);
CREATE INDEX IF NOT EXISTS idx_remnant_marketplace_location ON public.remnant_marketplace_listings(city, governorate);
CREATE INDEX IF NOT EXISTS idx_remnant_marketplace_coordinates ON public.remnant_marketplace_listings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 9. Row Level Security Policies
-- Subscriptions: Users can only see their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Optimizer Leads: Public insert, admin view
ALTER TABLE public.optimizer_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create optimizer leads" ON public.optimizer_leads;
CREATE POLICY "Anyone can create optimizer leads" ON public.optimizer_leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view optimizer leads" ON public.optimizer_leads;
CREATE POLICY "Admins can view optimizer leads" ON public.optimizer_leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Optimization Comparisons: Users can view their own
ALTER TABLE public.optimization_comparisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own comparisons" ON public.optimization_comparisons;
CREATE POLICY "Users can view own comparisons" ON public.optimization_comparisons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_positions fp
      WHERE fp.id = optimization_comparisons.position_id
      AND fp.owner_user_id = auth.uid()
    )
  );

-- Onboarding Progress: Users can view and update their own
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- Invoice Imports: Users can view their own
ALTER TABLE public.invoice_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoice imports" ON public.invoice_imports;
CREATE POLICY "Users can view own invoice imports" ON public.invoice_imports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own invoice imports" ON public.invoice_imports;
CREATE POLICY "Users can create own invoice imports" ON public.invoice_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job Risk Scores: Users can view their own
ALTER TABLE public.job_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own risk scores" ON public.job_risk_scores;
CREATE POLICY "Users can view own risk scores" ON public.job_risk_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_positions fp
      WHERE fp.id = job_risk_scores.position_id
      AND fp.owner_user_id = auth.uid()
    )
  );

-- 10. Functions for Auto-Creating Free Subscriptions
CREATE OR REPLACE FUNCTION public.create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, projects_limit, status)
  VALUES (NEW.id, 'free', 3, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create free subscription when user profile is created
DROP TRIGGER IF EXISTS trigger_create_free_subscription ON public.profiles;
CREATE TRIGGER trigger_create_free_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_subscription_for_new_user();

