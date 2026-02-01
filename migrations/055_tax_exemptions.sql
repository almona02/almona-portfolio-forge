-- Tax Exemptions Migration
-- Creates table for tax exemption certificates
CREATE TABLE IF NOT EXISTS public.tax_exemptions (
    id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL,
    region TEXT NOT NULL CHECK (
        region IN (
            'EG',
            'TR',
            'AE',
            'SA',
            'KW',
            'QA',
            'BH',
            'OM',
            'DEFAULT'
        )
    ),
    exemption_type TEXT NOT NULL CHECK (exemption_type IN ('full', 'partial')),
    exemption_rate DECIMAL(5, 4) CHECK (
        exemption_rate >= 0
        AND exemption_rate <= 1
    ),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    reason TEXT,
    issued_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_customer_id ON public.tax_exemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_certificate_number ON public.tax_exemptions(certificate_number);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_region ON public.tax_exemptions(region);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_status ON public.tax_exemptions(status);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_valid_until ON public.tax_exemptions(valid_until);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_exemptions_certificate_region ON public.tax_exemptions(certificate_number, region);
-- RLS Policies
ALTER TABLE public.tax_exemptions ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view tax exemptions
CREATE POLICY "Users can view tax exemptions" ON public.tax_exemptions FOR
SELECT USING (auth.role() = 'authenticated');
-- Policy: Users can create tax exemptions
CREATE POLICY "Users can create tax exemptions" ON public.tax_exemptions FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- Policy: Users can update tax exemptions
CREATE POLICY "Users can update tax exemptions" ON public.tax_exemptions FOR
UPDATE USING (auth.role() = 'authenticated');
-- Policy: Users can delete tax exemptions
CREATE POLICY "Users can delete tax exemptions" ON public.tax_exemptions FOR DELETE USING (auth.role() = 'authenticated');
-- Comments
COMMENT ON TABLE public.tax_exemptions IS 'Tax exemption certificates for customers';
COMMENT ON COLUMN public.tax_exemptions.exemption_type IS 'full = 100% exempt, partial = percentage exempt';
COMMENT ON COLUMN public.tax_exemptions.exemption_rate IS 'Exemption rate (0-1) for partial exemptions';
COMMENT ON COLUMN public.tax_exemptions.region IS 'Tax region code (EG, TR, AE, SA, etc.)';