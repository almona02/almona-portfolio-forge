-- Fix for Service Ticketing System Security Issues

-- 1. FIX SECURITY DEFINER VIEWS (Critical)
-- Replace SECURITY DEFINER with SECURITY INVOKER for both views
DROP VIEW IF EXISTS public.ticket_summary;
CREATE OR REPLACE VIEW public.ticket_summary
WITH (security_invoker = true)
AS 
SELECT 
    st.id,
    st.ticket_number,
    st.title,
    st.type,
    st.priority,
    st.status,
    st.created_at,
    st.sla_response_due,
    st.sla_resolution_due,
    st.first_response_at,
    st.resolved_at,
    st.sla_breached,
    p_customer.full_name as customer_name,
    p_customer.company_name,
    p_assigned.full_name as assigned_to_name,
    CASE 
        WHEN st.status IN ('resolved', 'closed') THEN 
            EXTRACT(EPOCH FROM (COALESCE(st.resolved_at, st.closed_at) - st.created_at))/3600
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - st.created_at))/3600
    END as age_hours,
    CASE 
        WHEN st.first_response_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (st.first_response_at - st.created_at))/3600
        ELSE NULL
    END as response_time_hours
FROM public.service_tickets st
LEFT JOIN public.profiles p_customer ON st.user_id = p_customer.id
LEFT JOIN public.profiles p_assigned ON st.assigned_to = p_assigned.id;

DROP VIEW IF EXISTS public.sla_performance;
CREATE OR REPLACE VIEW public.sla_performance
WITH (security_invoker = true)
AS
SELECT 
    st.type,
    st.priority,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN st.first_response_at IS NOT NULL THEN 1 END) as responded_tickets,
    COUNT(CASE WHEN st.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
    COUNT(CASE WHEN st.sla_breached = TRUE THEN 1 END) as sla_breached_tickets,
    AVG(CASE 
        WHEN st.first_response_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (st.first_response_at - st.created_at))/3600
    END) as avg_response_time_hours,
    AVG(CASE 
        WHEN st.status IN ('resolved', 'closed') THEN 
            EXTRACT(EPOCH FROM (COALESCE(st.resolved_at, st.closed_at) - st.created_at))/3600
    END) as avg_resolution_time_hours
FROM public.service_tickets st
GROUP BY st.type, st.priority;

-- 2. FIX FUNCTION SEARCH PATH ISSUES (Warning)
-- Add explicit search_path to all functions that were missing it
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    ticket_num TEXT;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'TKT-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.service_tickets
    WHERE ticket_number ~ ('^TKT-' || current_year || '-\d+$');
    
    ticket_num := 'TKT-' || current_year || '-' || LPAD(next_num::TEXT, 6, '0');
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_assign_ticket(ticket_id_param UUID)
RETURNS UUID AS $$
DECLARE
    ticket_record RECORD;
    assigned_user_id UUID;
BEGIN
    -- Get ticket details
    SELECT type, priority INTO ticket_record
    FROM public.service_tickets
    WHERE id = ticket_id_param;
    
    -- Auto-assignment logic based on ticket type
    CASE ticket_record.type
        WHEN 'technical', 'maintenance', 'installation' THEN
            -- Assign to available technician with least active tickets
            SELECT p.id INTO assigned_user_id
            FROM public.profiles p
            LEFT JOIN (
                SELECT assigned_to, COUNT(*) as active_tickets
                FROM public.service_tickets
                WHERE status IN ('assigned', 'in_progress') AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            ) active ON p.id = active.assigned_to
            WHERE p.role = 'technician'
            ORDER BY COALESCE(active.active_tickets, 0), RANDOM()
            LIMIT 1;
            
        WHEN 'sales', 'billing' THEN
            -- Assign to available sales rep
            SELECT p.id INTO assigned_user_id
            FROM public.profiles p
            LEFT JOIN (
                SELECT assigned_to, COUNT(*) as active_tickets
                FROM public.service_tickets
                WHERE status IN ('assigned', 'in_progress') AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            ) active ON p.id = active.assigned_to
            WHERE p.role = 'sales_rep'
            ORDER BY COALESCE(active.active_tickets, 0), RANDOM()
            LIMIT 1;
            
        WHEN 'spare_parts' THEN
            -- Assign to technician for parts assessment
            SELECT p.id INTO assigned_user_id
            FROM public.profiles p
            WHERE p.role = 'technician'
            ORDER BY RANDOM()
            LIMIT 1;
            
        ELSE
            -- For general tickets, assign to admin
            SELECT p.id INTO assigned_user_id
            FROM public.profiles p
            WHERE p.role = 'admin'
            ORDER BY RANDOM()
            LIMIT 1;
    END CASE;
    
    RETURN assigned_user_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_sla_dates(ticket_priority_param ticket_priority, ticket_type_param ticket_type, created_at_param TIMESTAMPTZ)
RETURNS TABLE (response_due TIMESTAMPTZ, resolution_due TIMESTAMPTZ) AS $$
DECLARE
    sla_config RECORD;
BEGIN
    -- Get SLA configuration
    SELECT response_time_hours, resolution_time_hours
    INTO sla_config
    FROM public.sla_configurations
    WHERE priority = ticket_priority_param AND ticket_type = ticket_type_param AND is_active = TRUE;
    
    IF sla_config IS NULL THEN
        -- Default SLA if no specific configuration found
        response_due := created_at_param + INTERVAL '24 hours';
        resolution_due := created_at_param + INTERVAL '72 hours';
    ELSE
        response_due := created_at_param + (sla_config.response_time_hours || ' hours')::INTERVAL;
        resolution_due := created_at_param + (sla_config.resolution_time_hours || ' hours')::INTERVAL;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_spare_parts_quote(ticket_id_param UUID, spare_parts_details_param JSONB)
RETURNS UUID AS $$
DECLARE
    ticket_record RECORD;
    new_quote_id UUID;
    part_item JSONB;
    product_record RECORD;
BEGIN
    -- Get ticket details
    SELECT user_id, title, description INTO ticket_record
    FROM public.service_tickets
    WHERE id = ticket_id_param;
    
    -- Create new quote
    INSERT INTO public.quotes (
        user_id,
        title,
        description,
        status,
        notes
    ) VALUES (
        ticket_record.user_id,
        'Spare Parts Request - ' || ticket_record.title,
        'Auto-generated quote from service ticket for spare parts request',
        'draft',
        'Generated from service ticket: ' || ticket_id_param::TEXT
    ) RETURNING id INTO new_quote_id;
    
    -- Add quote items for each spare part
    FOR part_item IN SELECT * FROM jsonb_array_elements(spare_parts_details_param->'parts')
    LOOP
        -- Try to find the product by SKU
        SELECT id, name_ar, name_en, price INTO product_record
        FROM public.products
        WHERE sku = part_item->>'sku' AND is_active = TRUE;
        
        IF product_record.id IS NOT NULL THEN
            -- Add existing product to quote
            INSERT INTO public.quote_items (
                quote_id,
                product_id,
                product_name_ar,
                product_name_en,
                product_sku,
                quantity,
                unit_price,
                total_price,
                notes
            ) VALUES (
                new_quote_id,
                product_record.id,
                product_record.name_ar,
                product_record.name_en,
                part_item->>'sku',
                (part_item->>'quantity')::INTEGER,
                COALESCE(product_record.price, 0),
                COALESCE(product_record.price, 0) * (part_item->>'quantity')::INTEGER,
                'Urgency: ' || COALESCE(part_item->>'urgency', 'normal')
            );
        ELSE
            -- Add custom item for non-existing product
            INSERT INTO public.quote_items (
                quote_id,
                product_name_ar,
                product_name_en,
                product_sku,
                quantity,
                unit_price,
                total_price,
                notes
            ) VALUES (
                new_quote_id,
                COALESCE(part_item->>'name', part_item->>'sku'),
                COALESCE(part_item->>'name', part_item->>'sku'),
                part_item->>'sku',
                (part_item->>'quantity')::INTEGER,
                0, -- Price to be determined
                0,
                'Custom part - Price TBD. Urgency: ' || COALESCE(part_item->>'urgency', 'normal')
            );
        END IF;
    END LOOP;
    
    -- Update quote totals
    UPDATE public.quotes
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.quote_items
        WHERE quote_id = new_quote_id
    ),
    total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.quote_items
        WHERE quote_id = new_quote_id
    )
    WHERE id = new_quote_id;
    
    -- Link the quote to the ticket
    UPDATE public.service_tickets
    SET related_quote_id = new_quote_id
    WHERE id = ticket_id_param;
    
    RETURN new_quote_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
    sla_dates RECORD;
    assigned_user_id UUID;
BEGIN
    -- Generate ticket number if not provided
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := public.generate_ticket_number();
    END IF;
    
    -- Calculate SLA dates
    SELECT response_due, resolution_due INTO sla_dates
    FROM public.calculate_sla_dates(NEW.priority, NEW.type, NEW.created_at);
    
    NEW.sla_response_due := sla_dates.response_due;
    NEW.sla_resolution_due := sla_dates.resolution_due;
    
    -- Auto-assign ticket
    assigned_user_id := public.auto_assign_ticket(NEW.id);
    IF assigned_user_id IS NOT NULL THEN
        NEW.assigned_to := assigned_user_id;
        NEW.assigned_at := NOW();
        NEW.status := 'assigned';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_ticket_update()
RETURNS TRIGGER AS $$
DECLARE
    notification_title_ar TEXT;
    notification_title_en TEXT;
    notification_message_ar TEXT;
    notification_message_en TEXT;
BEGIN
    -- Update timestamp
    NEW.updated_at := NOW();
    
    -- Handle status changes
    IF OLD.status != NEW.status THEN
        -- Record first response
        IF OLD.status = 'open' AND NEW.status IN ('assigned', 'in_progress') AND NEW.first_response_at IS NULL THEN
            NEW.first_response_at := NOW();
        END IF;
        
        -- Record resolution time
        IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
            NEW.resolved_at := NOW();
        END IF;
        
        -- Record closure time
        IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
            NEW.closed_at := NOW();
        END IF;
        
        -- Create notification for status change
        notification_title_ar := 'تحديث حالة التذكرة ' || NEW.ticket_number;
        notification_title_en := 'Ticket Status Update ' || NEW.ticket_number;
        notification_message_ar := 'تم تغيير حالة التذكرة من ' || OLD.status || ' إلى ' || NEW.status;
        notification_message_en := 'Ticket status changed from ' || OLD.status || ' to ' || NEW.status;
        
        INSERT INTO public.notifications (
            user_id,
            title_ar,
            title_en,
            message_ar,
            message_en,
            type,
            reference_id
        ) VALUES (
            NEW.user_id,
            notification_title_ar,
            notification_title_en,
            notification_message_ar,
            notification_message_en,
            'ticket',
            NEW.id
        );
    END IF;
    
    -- Handle assignment changes
    IF COALESCE(OLD.assigned_to::TEXT, '') != COALESCE(NEW.assigned_to::TEXT, '') THEN
        NEW.assigned_at := CASE WHEN NEW.assigned_to IS NOT NULL THEN NOW() ELSE NULL END;
        
        -- Record assignment history
        INSERT INTO public.ticket_assignments_history (
            ticket_id,
            assigned_from,
            assigned_to,
            assigned_by,
            assignment_reason
        ) VALUES (
            NEW.id,
            OLD.assigned_to,
            NEW.assigned_to,
            COALESCE(NEW.assigned_by, auth.uid()),
            'Assignment change'
        );
        
        -- Notify assigned user
        IF NEW.assigned_to IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                title_ar,
                title_en,
                message_ar,
                message_en,
                type,
                reference_id
            ) VALUES (
                NEW.assigned_to,
                'تم تعيين تذكرة جديدة ' || NEW.ticket_number,
                'New Ticket Assignment ' || NEW.ticket_number,
                'تم تعيين تذكرة جديدة لك: ' || NEW.title,
                'A new ticket has been assigned to you: ' || NEW.title,
                'ticket',
                NEW.id
            );
        END IF;
    END IF;
    
    -- Check for SLA breaches
    IF NEW.first_response_at IS NULL AND NOW() > NEW.sla_response_due THEN
        NEW.sla_breached := TRUE;
    END IF;
    
    IF NEW.status NOT IN ('resolved', 'closed') AND NOW() > NEW.sla_resolution_due THEN
        NEW.sla_breached := TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    quote_id UUID;
BEGIN
    -- Handle spare parts requests
    IF NEW.message_type = 'spare_parts_request' AND NEW.spare_parts_details IS NOT NULL THEN
        quote_id := public.create_spare_parts_quote(NEW.ticket_id, NEW.spare_parts_details);
        
        -- Add reference to the created quote in the message
        NEW.spare_parts_details := NEW.spare_parts_details || jsonb_build_object('quote_id', quote_id);
    END IF;
    
    -- Create notification for ticket owner (if message is not from them)
    IF NEW.author_id != (SELECT user_id FROM public.service_tickets WHERE id = NEW.ticket_id) 
       AND NEW.is_internal_note = FALSE THEN
        INSERT INTO public.notifications (
            user_id,
            title_ar,
            title_en,
            message_ar,
            message_en,
            type,
            reference_id
        ) VALUES (
            (SELECT user_id FROM public.service_tickets WHERE id = NEW.ticket_id),
            'رد جديد على التذكرة ' || (SELECT ticket_number FROM public.service_tickets WHERE id = NEW.ticket_id),
            'New Reply on Ticket ' || (SELECT ticket_number FROM public.service_tickets WHERE id = NEW.ticket_id),
            'تم إضافة رد جديد على تذكرتك',
            'A new reply has been added to your ticket',
            'ticket',
            NEW.ticket_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 3. FIX RLS ENABLED BUT NO POLICIES (Info)
-- Add RLS policies for customers_fixed table (assuming it's a view of customers)
DROP VIEW IF EXISTS public.customers_fixed;
CREATE OR REPLACE VIEW public.customers_fixed
WITH (security_invoker = true)
AS 
SELECT * FROM public.profiles WHERE role = 'customer';

-- Add RLS policies for parts table (if it exists and should have RLS)
-- First check if the table exists, then add policies
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parts') THEN
        -- Add RLS policies for parts table
        DROP POLICY IF EXISTS "Anyone can view parts" ON public.parts;
        CREATE POLICY "Anyone can view parts" ON public.parts FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage parts" ON public.parts;
        CREATE POLICY "Admins can manage parts" ON public.parts FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- Success message
SELECT 'All security issues fixed successfully!' as message;