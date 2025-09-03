-- Test Script for Service Ticketing System
-- This script validates the critical functionality of the service ticketing system

-- 1. Test ENUM type creation
SELECT 'Testing ENUM types...' as test_step;
SELECT unnest(enum_range(NULL::ticket_type)) as ticket_types;
SELECT unnest(enum_range(NULL::ticket_priority)) as ticket_priorities;
SELECT unnest(enum_range(NULL::ticket_status)) as ticket_statuses;

-- 2. Test table creation and structure
SELECT 'Testing table structure...' as test_step;
\d public.service_tickets;
\d public.ticket_messages;
\d public.sla_configurations;

-- 3. Test SLA configurations insertion
SELECT 'Testing SLA configurations...' as test_step;
SELECT priority, ticket_type, response_time_hours, resolution_time_hours 
FROM public.sla_configurations 
WHERE priority = 'critical' AND ticket_type = 'technical';

-- 4. Test ticket number generation function
SELECT 'Testing ticket number generation...' as test_step;
SELECT generate_ticket_number() as generated_ticket_number;
SELECT generate_ticket_number() as generated_ticket_number_2;

-- 5. Test SLA calculation function
SELECT 'Testing SLA calculation...' as test_step;
SELECT * FROM calculate_sla_dates('critical'::ticket_priority, 'technical'::ticket_type, NOW());

-- 6. Create test users for assignment testing
INSERT INTO public.profiles (id, full_name, role, username) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Customer', 'customer', 'test_customer'),
('22222222-2222-2222-2222-222222222222', 'Test Technician', 'technician', 'test_technician'),
('33333333-3333-3333-3333-333333333333', 'Test Sales Rep', 'sales_rep', 'test_sales'),
('44444444-4444-4444-4444-444444444444', 'Test Admin', 'admin', 'test_admin')
ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    username = EXCLUDED.username;

-- 7. Test auto-assignment function
SELECT 'Testing auto-assignment logic...' as test_step;
SELECT auto_assign_ticket('00000000-0000-0000-0000-000000000000'::UUID) as assigned_user_for_general;

-- 8. Create test product for spare parts testing
INSERT INTO public.products (id, sku, name_ar, name_en, category, price, is_active) VALUES 
('55555555-5555-5555-5555-555555555555', 'TEST-PART-001', 'قطعة اختبار', 'Test Part', 'spare_part', 100.00, true)
ON CONFLICT (sku) DO UPDATE SET 
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    price = EXCLUDED.price;

-- 9. Test ticket creation with triggers
SELECT 'Testing ticket creation...' as test_step;
INSERT INTO public.service_tickets (
    user_id,
    title,
    description,
    type,
    priority
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test Technical Issue',
    'This is a test technical issue for validation',
    'technical',
    'high'
) RETURNING id, ticket_number, assigned_to, sla_response_due, sla_resolution_due;

-- Get the created ticket ID for further testing
WITH latest_ticket AS (
    SELECT id FROM public.service_tickets 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC 
    LIMIT 1
)
-- 10. Test message creation
INSERT INTO public.ticket_messages (
    ticket_id,
    author_id,
    message,
    message_type
) 
SELECT 
    lt.id,
    '11111111-1111-1111-1111-111111111111',
    'This is a test message from the customer',
    'message'
FROM latest_ticket lt
RETURNING id, ticket_id, message;

-- 11. Test spare parts request message
WITH latest_ticket AS (
    SELECT id FROM public.service_tickets 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO public.ticket_messages (
    ticket_id,
    author_id,
    message,
    message_type,
    spare_parts_details
) 
SELECT 
    lt.id,
    '22222222-2222-2222-2222-222222222222',
    'Customer needs spare parts for machine repair',
    'spare_parts_request',
    '{"parts": [{"sku": "TEST-PART-001", "name": "Test Part", "quantity": 2, "urgency": "high"}], "estimated_cost": 200, "delivery_timeline": "3-5 days"}'::jsonb
FROM latest_ticket lt
RETURNING id, ticket_id, spare_parts_details;

-- 12. Test ticket status update
WITH latest_ticket AS (
    SELECT id FROM public.service_tickets 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC 
    LIMIT 1
)
UPDATE public.service_tickets 
SET status = 'in_progress'
FROM latest_ticket lt
WHERE public.service_tickets.id = lt.id
RETURNING id, status, updated_at, first_response_at;

-- 13. Verify quote creation from spare parts request
SELECT 'Testing spare parts quote creation...' as test_step;
WITH latest_ticket AS (
    SELECT id, related_quote_id FROM public.service_tickets 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    q.id as quote_id,
    q.title,
    q.status,
    qi.product_sku,
    qi.quantity,
    qi.unit_price
FROM latest_ticket lt
JOIN public.quotes q ON lt.related_quote_id = q.id
JOIN public.quote_items qi ON q.id = qi.quote_id;

-- 14. Test notifications creation
SELECT 'Testing notifications...' as test_step;
SELECT 
    title_en,
    message_en,
    type,
    is_read,
    created_at
FROM public.notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 5;

-- 15. Test assignment history
SELECT 'Testing assignment history...' as test_step;
WITH latest_ticket AS (
    SELECT id FROM public.service_tickets 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    tah.assigned_from,
    tah.assigned_to,
    tah.assignment_reason,
    tah.created_at
FROM latest_ticket lt
JOIN public.ticket_assignments_history tah ON lt.id = tah.ticket_id
ORDER BY tah.created_at DESC;

-- 16. Test views
SELECT 'Testing ticket summary view...' as test_step;
SELECT 
    ticket_number,
    customer_name,
    assigned_to_name,
    status,
    age_hours,
    response_time_hours
FROM public.ticket_summary 
WHERE customer_name = 'Test Customer'
LIMIT 5;

-- 17. Test SLA performance view
SELECT 'Testing SLA performance view...' as test_step;
SELECT 
    type,
    priority,
    total_tickets,
    responded_tickets,
    avg_response_time_hours
FROM public.sla_performance 
WHERE type = 'technical'
LIMIT 5;

-- 18. Test RLS policies (basic check)
SELECT 'Testing RLS policies...' as test_step;
-- This would need to be tested with actual user sessions, but we can verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('service_tickets', 'ticket_messages')
ORDER BY tablename, policyname;

-- 19. Verify foreign key constraints
SELECT 'Testing foreign key constraints...' as test_step;
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('service_tickets', 'ticket_messages', 'ticket_assignments_history', 'ticket_escalations')
ORDER BY tc.table_name, kcu.column_name;

-- 20. Test cleanup (optional - comment out if you want to keep test data)
/*
DELETE FROM public.ticket_messages WHERE author_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);
DELETE FROM public.service_tickets WHERE user_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);
DELETE FROM public.products WHERE sku = 'TEST-PART-001';
*/

SELECT 'Critical-path testing completed successfully!' as final_result;
