-- Idempotent migration: add Yilmaz fields to machines and create yilmaz_service_history

DO $$
BEGIN
    -- add columns to machines if they do not exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='machines' AND column_name='yilmaz_model_code'
    ) THEN
        ALTER TABLE public.machines ADD COLUMN yilmaz_model_code TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='machines' AND column_name='production_date'
    ) THEN
        ALTER TABLE public.machines ADD COLUMN production_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='machines' AND column_name='official_warranty_expiry'
    ) THEN
        ALTER TABLE public.machines ADD COLUMN official_warranty_expiry DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='machines' AND column_name='yilmaz_certified_tech_id'
    ) THEN
        ALTER TABLE public.machines ADD COLUMN yilmaz_certified_tech_id UUID REFERENCES auth.users(id);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Machines table alteration skipped or failed: %', SQLERRM;
END $$;

-- Create yilmaz_service_history table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='yilmaz_service_history'
    ) THEN
        CREATE TABLE public.yilmaz_service_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
            service_date DATE NOT NULL,
            service_type TEXT,
            yilmaz_tech_id UUID REFERENCES auth.users(id),
            official_service_code TEXT,
            parts_used JSONB,
            service_report TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'yilmaz_service_history creation skipped or failed: %', SQLERRM;
END $$;

-- Enable RLS and policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='yilmaz_service_history') THEN
        -- enable rls
        EXECUTE 'ALTER TABLE public.yilmaz_service_history ENABLE ROW LEVEL SECURITY';

        -- allow admins (role: admin) to full access
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='yilmaz_service_history' AND policyname='yilmaz_allow_admins'
        ) THEN
            EXECUTE $$
                CREATE POLICY yilmaz_allow_admins ON public.yilmaz_service_history
                FOR ALL USING (EXISTS (SELECT 1 FROM auth.users u WHERE u.id = current_setting(''jwt.claims.user_id'', true)::uuid AND u.role = 'admin'))
            $$;
        END IF;

        -- technicians can view and update
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='yilmaz_service_history' AND policyname='yilmaz_tech_access'
        ) THEN
            EXECUTE $$
                CREATE POLICY yilmaz_tech_access ON public.yilmaz_service_history
                FOR ALL USING (EXISTS (SELECT 1 FROM auth.users u WHERE u.id = current_setting(''jwt.claims.user_id'', true)::uuid AND u.role = 'technician'))
                WITH CHECK (EXISTS (SELECT 1 FROM auth.users u WHERE u.id = current_setting(''jwt.claims.user_id'', true)::uuid AND u.role = 'technician'));
            $$;
        END IF;

        -- users can view records for machines they own (assumes machines.owner_id)
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='yilmaz_service_history' AND policyname='yilmaz_owner_view'
        ) THEN
            EXECUTE $$
                CREATE POLICY yilmaz_owner_view ON public.yilmaz_service_history
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.owner_id = current_setting(''jwt.claims.user_id'', true)::uuid
                    )
                );
            $$;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS setup skipped or failed: %', SQLERRM;
END $$;
