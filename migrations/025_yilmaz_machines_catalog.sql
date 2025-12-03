-- Migration: Add Yilmaz Machines Catalog Table
-- This table stores the official machine catalog that can be referenced in projects and orders

-- Create the yilmaz_machines table
CREATE TABLE IF NOT EXISTS public.yilmaz_machines (
  id TEXT PRIMARY KEY, -- e.g., 'ym-001', 'ym-002'
  model_code TEXT NOT NULL UNIQUE, -- e.g., 'ALM 6510', 'CDC 600'
  name TEXT NOT NULL, -- Full display name
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'cutting-machines', 'welding-machines', 'processing-centers'
  type TEXT, -- e.g., 'Double Head Mitre Saw', 'CNC Machining Center'
  
  -- Power specifications
  power_consumption TEXT, -- e.g., '29 kW'
  voltage TEXT, -- e.g., '400V AC'
  frequency TEXT, -- e.g., '50-60Hz'
  phase TEXT, -- e.g., '3'
  amperage TEXT, -- e.g., '58A'
  
  -- Air specifications
  air_consumption TEXT, -- e.g., '250 L/min'
  air_pressure TEXT, -- e.g., '6-8 bar'
  
  -- Dimensions
  width_mm INTEGER,
  length_mm INTEGER,
  height_mm INTEGER,
  weight_net_kg DECIMAL(10,2),
  weight_gross_kg DECIMAL(10,2),
  
  -- Media
  image_url TEXT,
  spec_pdf_url TEXT,
  youtube_url TEXT,
  model_3d_path TEXT,
  has_3d_model BOOLEAN DEFAULT false,
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  release_date DATE,
  
  -- Full specifications as JSONB for flexibility
  specifications JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_yilmaz_machines_category ON public.yilmaz_machines(category);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machines_model_code ON public.yilmaz_machines(model_code);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machines_featured ON public.yilmaz_machines(is_featured) WHERE is_featured = true;

-- Enable RLS
ALTER TABLE public.yilmaz_machines ENABLE ROW LEVEL SECURITY;

-- Allow public read access (machines are public catalog)
CREATE POLICY "Anyone can view machines" ON public.yilmaz_machines
  FOR SELECT USING (true);

-- Only admins can modify (we'll use service role for seeding)
CREATE POLICY "Service role can manage machines" ON public.yilmaz_machines
  FOR ALL USING (auth.role() = 'service_role');

-- Create a junction table for projects that reference machines
CREATE TABLE IF NOT EXISTS public.project_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL REFERENCES public.yilmaz_machines(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, machine_id)
);

-- Enable RLS on junction table
ALTER TABLE public.project_machines ENABLE ROW LEVEL SECURITY;

-- Users can manage their own project machines
CREATE POLICY "Users can view own project machines" ON public.project_machines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_projects p 
      WHERE p.id = project_machines.project_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own project machines" ON public.project_machines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fabricator_projects p 
      WHERE p.id = project_machines.project_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own project machines" ON public.project_machines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_projects p 
      WHERE p.id = project_machines.project_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own project machines" ON public.project_machines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_projects p 
      WHERE p.id = project_machines.project_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

-- Seed the machines catalog from the constants
-- This inserts all the Yilmaz machines we have defined

INSERT INTO public.yilmaz_machines (id, model_code, name, description, category, type, power_consumption, voltage, frequency, phase, amperage, air_consumption, air_pressure, width_mm, length_mm, height_mm, weight_net_kg, weight_gross_kg, image_url, spec_pdf_url, youtube_url, is_featured, specifications) VALUES
('ym-001', 'ALM 6510', 'ALM 6510', 'Aluminium Profile Machining Center - 8-axis CNC servo control for milling, drilling, and cutting operations on four sides of profiles', 'processing-centers', 'Aluminium Profile Machining Center', '29 kW', '400V AC', '50-60Hz', '3', '58A', '250 L/min', '6-8 bar', 2000, 11720, 2310, 3650, 4106, '/images/machines/cutting-machine.jpg', '/documents/specs/ALM-6510.pdf', 'https://www.youtube.com/watch?v=CeGDjE9QCqQ', true, '{"cncAxes": 8, "spindleSpeed": "12,000 RPM", "processingCapacity": "1,600-1,800 running meters / 8 hours", "sawBlade": {"diameter": "Ø550 mm", "speed": "3,000 RPM"}}'),

('ym-002', 'DC-421-PBS', 'DC-421-PBS', 'Full Automatic Double Head Mitre Saw Machine - Windows based industrial PC with 15'' LCD touch screen, automatic tilting to 90° and 45° inwards', 'cutting-machines', 'Full Automatic Double Head Mitre Saw', '5 kW', '400V AC', '50-60Hz', '3', '4A', '165 L/min', '6-8 bar', 1450, 4510, 1670, 888, 965, '/images/machines/DC-421-PBS.jpg', '/documents/specs/DC-421-PBS.pdf', 'https://www.youtube.com/watch?v=1B5elf1hDG4', true, '{"sawBlade": {"diameter": "Ø420 mm", "speed": "2,900 RPM"}}'),

('ym-003', 'DK 502', 'DK 502', 'Double Corner PVC Welding Machine - Fully automatic two corner welding of PVC window profiles at 90° with single head welding possibility', 'welding-machines', 'Double Corner PVC Welding', '3 kW', '230V AC', '50-60Hz', '1', null, '180 L/min', '6-8 bar', 4100, 1700, 800, 611, 700, '/images/machines/DK-502.jpg', '/documents/specs/DK-502.pdf', 'https://youtu.be/jOLX0XMXC9A', true, '{"weldingCapacity": {"heightMax": "180mm", "widthMax": "140mm", "angleRange": "30° - 180°"}, "temperatureRange": "0° - 300°C"}'),

('ym-004', 'KM 212', 'KM 212', 'Portable End Milling Machine - High quality end-milling operations with manual controls for aluminum and PVC profiles', 'end-milling', 'Portable End Milling', '800 W', '230V AC', '50-60Hz', '1', null, null, null, 570, 510, 420, 26, 28, '/images/machines/KM-212.jpg', '/documents/specs/KM-212.pdf', 'https://youtu.be/1iiAfHwLhsQ', true, '{"spindleSpeed": "3,000 RPM", "clampingCapacity": {"widthMax": "160mm", "heightMax": "65mm"}}'),

('ym-005', 'KD-402-S', 'KD-402-S', 'Double Head Mitre Saw Machine - Semi-automatic with two circular saws for flat or angled cutting of PVC, aluminium and wooden materials', 'cutting-machines', 'Double Head Mitre Saw', '4.5 kW', '400V AC', '50-60Hz', '3', '9A', '46 L/min', '6-8 bar', 1290, 5560, 1440, 530, 593, '/images/machines/KD-402-S.jpg', '/documents/specs/KD-402-S.pdf', 'https://youtu.be/3GTWyawzxMw', true, '{"sawBlade": {"diameter": "Ø400 mm", "speed": "2,900 RPM"}, "cuttingCapacity": {"maxLength": "3,455mm", "minLength": "530mm"}}'),

('ym-006', 'FR-221-S', 'FR-221-S', 'Pneumatic Template Copy Router - For opening locks, drilling handles, hinges, espagnolette and barrel holes on PVC and aluminium profiles', 'copy-routers', 'Template Copy Router', '750 W', '400V AC', '50-60Hz', '3', null, '5 L/min', '6-8 bar', 550, 580, 1335, 77, 103, '/images/machines/FR-221-S.jpg', '/documents/specs/FR-221-S.pdf', 'https://www.youtube.com/watch?v=CeGDjE9QCqQ', true, '{"spindleSpeed": "14,000 RPM", "cutterBits": "Ø5 x L60 mm"}'),

('ym-007', 'PIM 6509', 'PIM 6509', 'PVC Profile Machining and Cutting Center - 8-axis CNC servo control for milling, water slots, drilling, and cutting operations on four sides', 'processing-centers', 'PVC Profile Machining Center', '17 kW', '400V AC', '50-60Hz', '3', '34A', '250 L/min', '6-8 bar', 2790, 13440, 2310, 3650, 4106, '/images/machines/PIM-6509.jpg', '/documents/specs/PIM-6509.pdf', 'https://youtu.be/lQlX-jXfegU', true, '{"cncAxes": 8, "spindleSpeed": "18,000 RPM", "processingCapacity": "2,200-2,400 running meters / 8 hours"}'),

('ym-008', 'CCL 1661', 'CCL 1661', 'PVC Welding and Corner Cleaning Line - Complete automated production line with 4-head welding, CNC corner cleaning, and robot transfer system', 'fabrication-equipment', 'PVC Welding and Corner Cleaning Line', '14 kW', '400V AC', '50-60Hz', '3', null, '180 L/min', '6-8 bar', 4720, 11730, 2070, 3156, 3931, '/images/machines/CCL-1661.jpg', '/documents/specs/CCL-1661.pdf', 'https://youtu.be/feWx5BXMSn0', true, '{"spindleSpeed": "18,000 RPM", "cleaningTools": 11, "processingCapacity": "220-270 frames / 8 hours"}'),

('ym-009', 'CDC 600', 'CDC 600', 'Full Automatic Double Head Compound Cutting Machine - 2x Ø600mm saw blades with compound cuts (45°x45°) pivoting and tilting on both heads', 'cutting-machines', 'Double Head Compound Cutting', '12.5 kW', '400V', '50-60Hz', '3', '25A', '60 L/min', '6-8 bar', 2510, 1560, 1160, 2350, 2500, '/images/machines/CDC-600.jpg', '/documents/specs/CDC-600.pdf', 'https://youtu.be/GywonVe7yMk', true, '{"sawBlade": {"diameter": "Ø600 mm", "speed": "2,300 RPM", "motorPower": "2x 4 kW"}}'),

('ym-010', 'DC-421-PSD', 'DC-421-PSD', 'Full Automatic Double Head Mitre Saw Machine - 9'' touch screen with automatic tilting to 90° and 45° inwards, USB cutting list transfer', 'cutting-machines', 'Full Automatic Double Head Mitre Saw', '5 kW', '400V AC', '50-60Hz', '3', null, '80 L/min', '6-8 bar', 1450, 4510, 1670, 830, 949, '/images/machines/DC-421-PSD.jpg', '/documents/specs/DC-421-PSD.pdf', 'https://youtu.be/5pluTvKsQs4', true, '{"sawBlade": {"diameter": "Ø420 mm", "speed": "2,900 RPM"}}'),

('ym-013', 'NCR 300', 'NCR 300', '4 Axis Numerical Controlled NC Router Machine - Designed for daily operations on PVC, aluminium and low alloy materials to machine four surfaces simultaneously', 'routers', 'NC Router', '5.5 kW', '400V AC', '50-60Hz', '3', null, '110 L/min', '6-8 bar', 1635, 2810, 2180, 520, 600, '/images/machines/NCR-300.jpg', '/documents/specs/NCR-300.pdf', 'https://youtu.be/ThfN9iUPsnU', true, '{"spindleSpeed": "12,000 RPM", "spindlePower": "2.2 kW", "toolCollet": "ER 16"}'),

('ym-016', 'CRM-250-S', 'CRM-250-S', '3 Spindle Copy Router Machine - 1x vertical and 2x horizontal spindle motors for complex aluminium profile operations on 3 sides without releasing', 'copy-routers', 'Template Copy Router', '3.3 kW', '220/230V', '50-60Hz', '1', null, '24 L/min', '6-8 bar', 1260, 2900, 1870, 328, 373, '/images/machines/CRM-250-S.jpg', '/documents/specs/CRM-250-S.pdf', 'https://youtu.be/cipBYN8sKG4', true, '{"spindleSpeed": "12,000 RPM", "cutterBits": "2x Ø10xL100mm / Ø5xL100mm"}')

ON CONFLICT (id) DO UPDATE SET
  model_code = EXCLUDED.model_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  power_consumption = EXCLUDED.power_consumption,
  voltage = EXCLUDED.voltage,
  frequency = EXCLUDED.frequency,
  phase = EXCLUDED.phase,
  amperage = EXCLUDED.amperage,
  air_consumption = EXCLUDED.air_consumption,
  air_pressure = EXCLUDED.air_pressure,
  width_mm = EXCLUDED.width_mm,
  length_mm = EXCLUDED.length_mm,
  height_mm = EXCLUDED.height_mm,
  weight_net_kg = EXCLUDED.weight_net_kg,
  weight_gross_kg = EXCLUDED.weight_gross_kg,
  image_url = EXCLUDED.image_url,
  spec_pdf_url = EXCLUDED.spec_pdf_url,
  youtube_url = EXCLUDED.youtube_url,
  is_featured = EXCLUDED.is_featured,
  specifications = EXCLUDED.specifications,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE public.yilmaz_machines IS 'Yilmaz machine catalog - official product database for reference in projects and orders';
COMMENT ON TABLE public.project_machines IS 'Junction table linking fabricator projects to machines used';

