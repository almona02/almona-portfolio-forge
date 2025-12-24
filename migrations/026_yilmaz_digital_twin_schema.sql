-- Migration: YILMAZ Digital Twin Knowledge System Schema
-- Creates tables for YDT knowledge graph, components, faults, and validation feedback
-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;
-- YDT Knowledge Graph Storage
CREATE TABLE IF NOT EXISTS public.yilmaz_machine_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL REFERENCES public.yilmaz_machines(id) ON DELETE CASCADE,
    knowledge_type TEXT NOT NULL CHECK (
        knowledge_type IN (
            'capability',
            'limitation',
            'component',
            'fault',
            'procedure',
            'specification',
            'maintenance',
            'installation'
        )
    ),
    content JSONB NOT NULL,
    source_document TEXT,
    source_page INTEGER,
    confidence_score DECIMAL(3, 2) CHECK (
        confidence_score >= 0
        AND confidence_score <= 1
    ),
    validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES public.profiles(id),
    validated_at TIMESTAMPTZ,
    embedding vector(1536),
    -- For semantic search (Gemini/OpenAI embeddings)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Machine Components (from wiring diagrams)
CREATE TABLE IF NOT EXISTS public.machine_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL REFERENCES public.yilmaz_machines(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    -- e.g., 'K3', 'M1', 'S1'
    component_type TEXT NOT NULL,
    -- 'relay', 'motor', 'sensor', 'valve', 'cylinder'
    label TEXT,
    specifications JSONB DEFAULT '{}',
    diagram_references TEXT [],
    -- Array of diagram IDs where this component appears
    connections JSONB DEFAULT '[]',
    -- Array of {to: component_id, type: connection_type}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(machine_id, component_id)
);
-- Fault Database
CREATE TABLE IF NOT EXISTS public.machine_faults (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL REFERENCES public.yilmaz_machines(id) ON DELETE CASCADE,
    error_code TEXT,
    error_message TEXT,
    symptoms TEXT [],
    root_causes TEXT [],
    solutions TEXT [],
    related_components TEXT [],
    -- Component IDs that may be involved
    severity TEXT CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    frequency INTEGER DEFAULT 0,
    -- How often this fault occurs
    last_occurred TIMESTAMPTZ,
    source_document TEXT,
    validated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Knowledge Validation Feedback (Human-in-the-Loop)
CREATE TABLE IF NOT EXISTS public.knowledge_validation_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_node_id UUID REFERENCES public.yilmaz_machine_knowledge(id) ON DELETE CASCADE,
    agent_answer TEXT NOT NULL,
    technician_rating TEXT NOT NULL CHECK (
        technician_rating IN (
            'correct',
            'partially_correct',
            'incorrect'
        )
    ),
    corrections TEXT,
    technician_id UUID NOT NULL REFERENCES public.profiles(id),
    ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Review Tasks (auto-created for incorrect answers)
CREATE TABLE IF NOT EXISTS public.review_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_node_id UUID REFERENCES public.yilmaz_machine_knowledge(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (
        status IN ('open', 'in_progress', 'resolved', 'closed')
    ),
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
-- Learning Courses (for Component C)
CREATE TABLE IF NOT EXISTS public.learning_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    month_year TEXT,
    -- '2025-01'
    content_html TEXT,
    modules JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_yilmaz_machine_knowledge_machine_id ON public.yilmaz_machine_knowledge(machine_id);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machine_knowledge_type ON public.yilmaz_machine_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machine_knowledge_validated ON public.yilmaz_machine_knowledge(validated)
WHERE validated = true;
CREATE INDEX IF NOT EXISTS idx_yilmaz_machine_knowledge_embedding ON public.yilmaz_machine_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_machine_components_machine_id ON public.machine_components(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_components_type ON public.machine_components(component_type);
CREATE INDEX IF NOT EXISTS idx_machine_faults_machine_id ON public.machine_faults(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_faults_error_code ON public.machine_faults(error_code)
WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_machine_faults_severity ON public.machine_faults(severity);
CREATE INDEX IF NOT EXISTS idx_validation_feedback_knowledge_node ON public.knowledge_validation_feedback(knowledge_node_id);
CREATE INDEX IF NOT EXISTS idx_validation_feedback_rating ON public.knowledge_validation_feedback(technician_rating);
CREATE INDEX IF NOT EXISTS idx_validation_feedback_ticket ON public.knowledge_validation_feedback(ticket_id)
WHERE ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_tasks_status ON public.review_tasks(status)
WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_review_tasks_priority ON public.review_tasks(priority);
-- Auto-create review task for incorrect answers
CREATE OR REPLACE FUNCTION create_validation_review_task() RETURNS TRIGGER AS $$ BEGIN IF NEW.technician_rating = 'incorrect' THEN
INSERT INTO public.review_tasks (knowledge_node_id, priority, status)
VALUES (NEW.knowledge_node_id, 'high', 'open') ON CONFLICT DO NOTHING;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER validation_feedback_review
AFTER
INSERT ON public.knowledge_validation_feedback FOR EACH ROW
    WHEN (NEW.technician_rating = 'incorrect') EXECUTE FUNCTION create_validation_review_task();
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_yilmaz_machine_knowledge_updated_at BEFORE
UPDATE ON public.yilmaz_machine_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_machine_components_updated_at BEFORE
UPDATE ON public.machine_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_machine_faults_updated_at BEFORE
UPDATE ON public.machine_faults FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Enable RLS
ALTER TABLE public.yilmaz_machine_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_validation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
-- RLS Policies: Public read access for knowledge (it's reference data)
CREATE POLICY "Public can read machine knowledge" ON public.yilmaz_machine_knowledge FOR
SELECT USING (true);
CREATE POLICY "Public can read machine components" ON public.machine_components FOR
SELECT USING (true);
CREATE POLICY "Public can read machine faults" ON public.machine_faults FOR
SELECT USING (true);
-- Only authenticated users can insert/update
CREATE POLICY "Authenticated users can insert knowledge" ON public.yilmaz_machine_knowledge FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update knowledge" ON public.yilmaz_machine_knowledge FOR
UPDATE USING (auth.role() = 'authenticated');
-- Validation feedback: Users can insert their own, admins can view all
CREATE POLICY "Users can insert own validation feedback" ON public.knowledge_validation_feedback FOR
INSERT WITH CHECK (auth.uid() = technician_id);
CREATE POLICY "Users can view own validation feedback" ON public.knowledge_validation_feedback FOR
SELECT USING (
        auth.uid() = technician_id
        OR auth.role() = 'service_role'
    );
-- Review tasks: Assigned users and admins can view
CREATE POLICY "Users can view assigned review tasks" ON public.review_tasks FOR
SELECT USING (
        auth.uid() = assigned_to
        OR auth.role() = 'service_role'
    );
-- Learning courses: Public read
CREATE POLICY "Public can read learning courses" ON public.learning_courses FOR
SELECT USING (true);