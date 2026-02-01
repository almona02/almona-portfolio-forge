# Priority 4: Customers Page Upgrade - Backend Implementation Plan

**Date:** January 2026  
**Status:** 🚧 **IMPLEMENTATION IN PROGRESS**  
**Priority:** P1 (Sales Efficiency)

---

## Implementation Strategy

Following Phase 3/4 patterns, implementing backend API in phases:

1. **Phase 1A: Customer Management API (CRUD)** - Foundation
2. **Phase 1B: Customer Analytics API** - Metrics and insights
3. **Phase 1C: Customer Tags API** - Tag management
4. **Phase 1D: Customer Communications API** - Communication history
5. **Phase 1E: Customer Segments API** - Segmentation

---

## Phase 1A: Customer Management API

### Database Schema
- ✅ `fabricator_customers` table exists (migration 009)
- ✅ New tables created (migration 062): customer_tags, customer_communications, customer_segments, customer_reminders

### Pydantic Models (api_v2_models.py)

**Customer Models:**
- `CustomerResponse` - Customer data with analytics summary
- `CustomerCreateRequest` - Create customer request
- `CustomerUpdateRequest` - Update customer request
- `CustomerListResponse` - List response with pagination
- `SectorType` (Enum) - ALUMINIUM, UPVC, STEEL, GLASS, GENERAL

**Tag Models:**
- `CustomerTagResponse` - Tag data
- `CustomerTagCreateRequest` - Create tag request
- `CustomerTagUpdateRequest` - Update tag request
- `CustomerTagListResponse` - List tags response
- `CustomerTagAssignmentResponse` - Tag assignment

**Communication Models:**
- `CustomerCommunicationResponse` - Communication record
- `CustomerCommunicationCreateRequest` - Create communication
- `CustomerCommunicationListResponse` - List communications
- `CommunicationType` (Enum) - email, call, meeting, note, quote, invoice

**Segment Models:**
- `CustomerSegmentResponse` - Segment data
- `CustomerSegmentCreateRequest` - Create segment request
- `CustomerSegmentUpdateRequest` - Update segment request
- `CustomerSegmentListResponse` - List segments response
- `CustomerSegmentCustomersResponse` - Customers in segment

**Reminder Models:**
- `CustomerReminderResponse` - Reminder data
- `CustomerReminderCreateRequest` - Create reminder request
- `CustomerReminderUpdateRequest` - Update reminder request
- `CustomerReminderListResponse` - List reminders response

**Analytics Models:**
- `CustomerAnalyticsResponse` - Customer metrics (revenue, orders, LTV, etc.)
- `CustomerPurchaseHistoryResponse` - Purchase history items
- `CustomerRevenueResponse` - Revenue data
- `CustomerAnalyticsSummaryResponse` - Overall analytics summary

### Repository (customers_repository.py)

**Customer Management:**
- `insert_customer()` - Create customer
- `get_customer_by_id()` - Get by ID
- `list_customers()` - List with filtering, pagination, sorting
- `count_customers()` - Count customers
- `update_customer()` - Update customer
- `delete_customer()` - Soft delete (not implemented, uses hard delete)

**Tag Management:**
- `insert_tag()` - Create tag
- `get_tag_by_id()` - Get tag by ID
- `list_tags()` - List user's tags
- `update_tag()` - Update tag
- `delete_tag()` - Soft delete tag
- `assign_tag_to_customer()` - Create tag assignment
- `remove_tag_from_customer()` - Remove tag assignment
- `get_customer_tags()` - Get tags for customer
- `get_tag_customers()` - Get customers with tag

**Communication Management:**
- `insert_communication()` - Create communication record
- `get_communication_by_id()` - Get communication by ID
- `list_communications()` - List communications for customer
- `update_communication()` - Update communication
- `count_communications()` - Count communications

**Segment Management:**
- `insert_segment()` - Create segment
- `get_segment_by_id()` - Get segment by ID
- `list_segments()` - List user's segments
- `update_segment()` - Update segment
- `delete_segment()` - Soft delete segment
- `assign_customer_to_segment()` - Create segment assignment (static segments)
- `remove_customer_from_segment()` - Remove segment assignment
- `get_segment_customers()` - Get customers in segment (dynamic or static)
- `calculate_segment_customers()` - Calculate customers for dynamic segment
- `update_segment_count()` - Update cached customer count

**Reminder Management:**
- `insert_reminder()` - Create reminder
- `get_reminder_by_id()` - Get reminder by ID
- `list_reminders()` - List reminders for customer
- `update_reminder()` - Update reminder
- `delete_reminder()` - Delete reminder
- `get_upcoming_reminders()` - Get reminders due soon

### Service (customer_service.py)

**Customer Management:**
- `list_customers()` - List with filtering, search, pagination
- `get_customer()` - Get customer by ID
- `create_customer()` - Create customer
- `update_customer()` - Update customer
- `delete_customer()` - Delete customer

**Customer Analytics:**
- `get_customer_analytics()` - Get metrics for customer (revenue, orders, LTV, etc.)
- `get_customer_purchase_history()` - Get purchase/order history
- `get_customer_revenue()` - Get revenue data
- `get_analytics_summary()` - Get overall customer analytics summary
- `_calculate_customer_metrics()` - Calculate metrics from projects/payments

**Tag Management:**
- `list_tags()` - List user's tags
- `get_tag()` - Get tag by ID
- `create_tag()` - Create tag
- `update_tag()` - Update tag
- `delete_tag()` - Delete tag
- `assign_tag()` - Assign tag to customer
- `remove_tag()` - Remove tag from customer
- `get_customer_tags()` - Get tags for customer

**Communication Management:**
- `list_communications()` - List communications for customer
- `get_communication()` - Get communication by ID
- `create_communication()` - Create communication record
- `update_communication()` - Update communication

**Segment Management:**
- `list_segments()` - List user's segments
- `get_segment()` - Get segment by ID
- `create_segment()` - Create segment
- `update_segment()` - Update segment
- `delete_segment()` - Delete segment
- `get_segment_customers()` - Get customers in segment
- `_calculate_dynamic_segment()` - Calculate customers for dynamic segment based on criteria

**Reminder Management:**
- `list_reminders()` - List reminders for customer
- `get_reminder()` - Get reminder by ID
- `create_reminder()` - Create reminder
- `update_reminder()` - Update reminder
- `delete_reminder()` - Delete reminder
- `get_upcoming_reminders()` - Get upcoming reminders

### Router (customers.py)

**Customer Management Endpoints:**
- `GET /customers` - List customers (with filtering, pagination, sorting)
- `GET /customers/{id}` - Get customer by ID
- `POST /customers` - Create customer
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer

**Customer Analytics Endpoints:**
- `GET /customers/{id}/analytics` - Get customer analytics/metrics
- `GET /customers/analytics/summary` - Get overall customer analytics summary
- `GET /customers/{id}/purchase-history` - Get customer purchase history
- `GET /customers/{id}/revenue` - Get customer revenue data

**Tag Endpoints:**
- `GET /customers/tags` - List all tags
- `GET /customers/tags/{tagId}` - Get tag by ID
- `POST /customers/tags` - Create tag
- `PUT /customers/tags/{tagId}` - Update tag
- `DELETE /customers/tags/{tagId}` - Delete tag
- `POST /customers/{id}/tags` - Add tags to customer
- `DELETE /customers/{id}/tags/{tagId}` - Remove tag from customer

**Communication Endpoints:**
- `GET /customers/{id}/communications` - Get communication history
- `GET /customers/communications/{commId}` - Get communication by ID
- `POST /customers/{id}/communications` - Create communication record
- `PUT /customers/communications/{commId}` - Update communication

**Segment Endpoints:**
- `GET /customers/segments` - List segments
- `GET /customers/segments/{segmentId}` - Get segment by ID
- `POST /customers/segments` - Create segment
- `PUT /customers/segments/{segmentId}` - Update segment
- `DELETE /customers/segments/{segmentId}` - Delete segment
- `GET /customers/segments/{segmentId}/customers` - Get customers in segment

**Reminder Endpoints:**
- `GET /customers/{id}/reminders` - Get reminders for customer
- `GET /customers/reminders/{reminderId}` - Get reminder by ID
- `POST /customers/{id}/reminders` - Create reminder
- `PUT /customers/reminders/{reminderId}` - Update reminder
- `DELETE /customers/reminders/{reminderId}` - Delete reminder

**Total Endpoints:** ~25 endpoints

---

## Implementation Notes

### Customer-Project Linking
- Projects use `client_name` (text field), not foreign key to customers
- Analytics will match projects to customers by `client_name` matching customer `name`
- This is a practical MVP approach; ideal solution would add `customer_id` to projects table

### Analytics Calculations
- Revenue: Aggregate from `payments` table (link via projects → client_name → customer name)
- Order count: Count projects with matching `client_name`
- LTV: Sum of revenue from all customer's projects/payments
- Purchase history: List projects with matching `client_name`

### Segment Calculation
- Dynamic segments: Query customers based on criteria JSONB
- Static segments: Use `customer_segment_assignments` table
- Cache customer count in `customer_count` field for performance

---

## Implementation Order

1. ✅ Database migration (062_customers_enhancements.sql)
2. ⏳ Pydantic models (api_v2_models.py)
3. ⏳ Repository (customers_repository.py)
4. ⏳ Service (customer_service.py)
5. ⏳ Router (customers.py)
6. ⏳ Router registration (routers/__init__.py)

---

**Status:** Phase 1A in progress

**Last Updated:** January 2026
