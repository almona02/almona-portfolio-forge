-- Migration: Create machine profiles table for CNC integration
-- Date: 2025-12-03
-- Description: Stores CNC machine configurations, profiles, and runtime data
--              for Fabricator Pro multi-brand machine support

BEGIN;

-- Create machine_brand enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_brand') THEN
        CREATE TYPE machine_brand AS ENUM (
            'yilmaz',
            'elumatec',
            'fomm',
            'emmegi',
            'biesse',
            'custom'
        );
    END IF;
END $$;

-- Create machine_status enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_status') THEN
        CREATE TYPE machine_status AS ENUM (
            'idle',
            'running',
            'maintenance',
            'error',
            'offline'
        );
    END IF;
END $$;

-- Create machine_profiles table
CREATE TABLE IF NOT EXISTS machine_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand machine_brand NOT NULL DEFAULT 'custom',
    model VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    
    -- Owner association (simplified - no workshops dependency)
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    location VARCHAR(255),
    
    -- Technical specifications
    max_x_travel DECIMAL(10,2) DEFAULT 6500.00,  -- mm
    max_y_travel DECIMAL(10,2) DEFAULT 1200.00,  -- mm
    max_z_travel DECIMAL(10,2) DEFAULT 300.00,   -- mm
    max_spindle_speed INTEGER DEFAULT 18000,     -- RPM
    max_feed_rate DECIMAL(10,2) DEFAULT 15000.00, -- mm/min
    rapid_feed_rate DECIMAL(10,2) DEFAULT 30000.00, -- mm/min
    tool_changer_capacity INTEGER DEFAULT 10,
    controller_type VARCHAR(100),
    
    -- G-code configuration
    gcode_dialect VARCHAR(50) DEFAULT 'fanuc',
    post_processor_config JSONB DEFAULT '{
        "safety_height": 50.0,
        "work_offset": "G54",
        "coolant_on": "M08",
        "coolant_off": "M09",
        "spindle_cw": "M03",
        "spindle_ccw": "M04",
        "spindle_stop": "M05",
        "program_end": "M30",
        "tool_change": "M06"
    }'::jsonb,
    
    -- Default tools configuration
    default_tools JSONB DEFAULT '[]'::jsonb,
    
    -- Safety limits
    safety_limits JSONB DEFAULT '{
        "min_x": 0,
        "min_y": 0,
        "min_z": -300,
        "max_x": 6500,
        "max_y": 1200,
        "max_z": 100,
        "max_spindle_temp": 60,
        "max_feed_override": 150,
        "clamp_positions": []
    }'::jsonb,
    
    -- Calibration data
    calibration_date TIMESTAMP WITH TIME ZONE,
    calibration_accuracy DECIMAL(5,3),  -- mm
    last_maintenance_date TIMESTAMP WITH TIME ZONE,
    next_maintenance_date TIMESTAMP WITH TIME ZONE,
    total_runtime_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Real-time status (updated by Edge Agent)
    status machine_status DEFAULT 'offline',
    current_job_id UUID,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    current_program VARCHAR(255),
    error_message TEXT,
    
    -- Telemetry (updated by Edge Agent)
    telemetry JSONB DEFAULT '{
        "spindle_temp": null,
        "spindle_load": null,
        "feed_rate_actual": null,
        "position": {"x": 0, "y": 0, "z": 0}
    }'::jsonb,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_machine_profiles_owner_id ON machine_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_brand ON machine_profiles(brand);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_status ON machine_profiles(status);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_is_active ON machine_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_last_heartbeat ON machine_profiles(last_heartbeat);

-- Enable Row Level Security
ALTER TABLE machine_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified - owner-based only)

-- Users can view their own machines or template machines (no owner)
CREATE POLICY "Users can view own machines or templates"
    ON machine_profiles FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR owner_id IS NULL  -- Template machines are viewable by all
    );

-- Users can insert their own machines
CREATE POLICY "Users can insert own machines"
    ON machine_profiles FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
        OR (owner_id IS NULL AND auth.uid() IS NOT NULL)  -- Allow creating templates if authenticated
    );

-- Users can update their own machines
CREATE POLICY "Users can update own machines"
    ON machine_profiles FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Users can delete their own machines
CREATE POLICY "Users can delete own machines"
    ON machine_profiles FOR DELETE
    USING (owner_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_machine_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_machine_profiles_updated_at ON machine_profiles;
CREATE TRIGGER update_machine_profiles_updated_at
    BEFORE UPDATE ON machine_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_machine_profiles_updated_at();

-- Create generated G-code storage table
CREATE TABLE IF NOT EXISTS generated_gcode (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- References
    job_id UUID,
    machine_id UUID REFERENCES machine_profiles(id) ON DELETE SET NULL,
    
    -- G-code content
    gcode TEXT NOT NULL,
    filename VARCHAR(255),
    file_size INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    warnings TEXT[] DEFAULT '{}',
    
    -- Audit
    generated_by UUID REFERENCES auth.users(id),
    
    -- Expiry (auto-cleanup old G-code)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '30 days')
);

-- Index for G-code lookup
CREATE INDEX IF NOT EXISTS idx_generated_gcode_job_id ON generated_gcode(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_gcode_machine_id ON generated_gcode(machine_id);
CREATE INDEX IF NOT EXISTS idx_generated_gcode_expires_at ON generated_gcode(expires_at);

-- Enable RLS on generated_gcode
ALTER TABLE generated_gcode ENABLE ROW LEVEL SECURITY;

-- Users can view their own generated G-code
CREATE POLICY "Users can view own gcode"
    ON generated_gcode FOR SELECT
    USING (generated_by = auth.uid());

CREATE POLICY "Users can insert own gcode"
    ON generated_gcode FOR INSERT
    WITH CHECK (generated_by = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own gcode"
    ON generated_gcode FOR DELETE
    USING (generated_by = auth.uid());

-- Create machine job queue table (for Edge Agent)
CREATE TABLE IF NOT EXISTS machine_job_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- References
    machine_id UUID REFERENCES machine_profiles(id) ON DELETE CASCADE NOT NULL,
    job_id UUID,
    gcode_id UUID REFERENCES generated_gcode(id) ON DELETE SET NULL,
    
    -- Job info
    job_name VARCHAR(255),
    priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
    status VARCHAR(50) DEFAULT 'queued',  -- queued, sent, running, completed, failed
    
    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    sent_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    result_status VARCHAR(50),
    error_message TEXT,
    runtime_seconds INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    queued_by UUID REFERENCES auth.users(id)
);

-- Indexes for job queue
CREATE INDEX IF NOT EXISTS idx_machine_job_queue_machine_id ON machine_job_queue(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_job_queue_status ON machine_job_queue(status);
CREATE INDEX IF NOT EXISTS idx_machine_job_queue_priority ON machine_job_queue(priority);

-- Enable RLS
ALTER TABLE machine_job_queue ENABLE ROW LEVEL SECURITY;

-- Users can view jobs for machines they own
CREATE POLICY "Users can view own machine jobs"
    ON machine_job_queue FOR SELECT
    USING (
        machine_id IN (
            SELECT id FROM machine_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert jobs for own machines"
    ON machine_job_queue FOR INSERT
    WITH CHECK (
        machine_id IN (
            SELECT id FROM machine_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own machine jobs"
    ON machine_job_queue FOR UPDATE
    USING (
        machine_id IN (
            SELECT id FROM machine_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- Insert sample machine profiles for common configurations (templates - no owner)
INSERT INTO machine_profiles (
    name,
    description,
    brand,
    model,
    max_x_travel,
    max_y_travel,
    max_z_travel,
    max_spindle_speed,
    max_feed_rate,
    gcode_dialect,
    post_processor_config,
    is_active,
    status,
    owner_id
) VALUES 
(
    'YILMAZ CNC-101 Template',
    'Standard YILMAZ CNC profile for aluminum cutting - use as template',
    'yilmaz',
    'CNC-101',
    6500.00,
    1200.00,
    300.00,
    18000,
    15000.00,
    'fanuc',
    '{
        "safety_height": 50.0,
        "work_offset": "G54",
        "coolant_on": "M08",
        "coolant_off": "M09",
        "spindle_cw": "M03",
        "spindle_stop": "M05",
        "program_end": "M30",
        "tool_change": "M06",
        "custom_init": ["G21", "G90", "G40", "G80"]
    }'::jsonb,
    true,
    'offline',
    NULL  -- Template: no owner
),
(
    'Elumatec SBZ 151 Template',
    'German high-precision CNC profile for windows and doors - use as template',
    'elumatec',
    'SBZ 151',
    7000.00,
    1500.00,
    350.00,
    24000,
    20000.00,
    'siemens',
    '{
        "safety_height": 100.0,
        "work_offset": "G54",
        "coolant_on": "COOLANT ON",
        "coolant_off": "COOLANT OFF",
        "spindle_cw": "M03",
        "spindle_stop": "M05",
        "program_end": "M30",
        "requires_warmup": true,
        "custom_init": ["G71", "G90", "G94", "G17"]
    }'::jsonb,
    true,
    'offline',
    NULL  -- Template: no owner
),
(
    'Emmegi Quasar Template',
    'Italian precision CNC for aluminum profiles - use as template',
    'emmegi',
    'Quasar',
    6500.00,
    1200.00,
    300.00,
    21000,
    18000.00,
    'fanuc',
    '{
        "safety_height": 75.0,
        "work_offset": "G54",
        "coolant_on": "M08",
        "coolant_off": "M09",
        "spindle_cw": "M03",
        "spindle_stop": "M05",
        "program_end": "M30",
        "tool_change": "M06"
    }'::jsonb,
    true,
    'offline',
    NULL  -- Template: no owner
)
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE machine_profiles IS 'CNC machine configurations and real-time status for Fabricator Pro';
COMMENT ON COLUMN machine_profiles.post_processor_config IS 'JSON configuration for G-code post-processing';
COMMENT ON COLUMN machine_profiles.safety_limits IS 'Machine-specific safety constraints including clamp positions';
COMMENT ON COLUMN machine_profiles.telemetry IS 'Real-time telemetry data from Edge Agent';
COMMENT ON TABLE generated_gcode IS 'Storage for generated G-code programs with auto-expiry';
COMMENT ON TABLE machine_job_queue IS 'Job queue for Edge Agent to pull and execute';

COMMIT;
