# Machine Services, Maintenance, After-Sale Services & Ticketing System — Codebase Analysis

**Scope:** Machine services, maintenance flows, after-sale services, and the unified ticketing system.  
**Source:** Code inspection only (no README or marketing docs).

---

## 1. Executive Summary

The project implements:

- **Machine registration** — Two paths: generic `machines` (owner + serial) and YILMAZ-specific registration with serial validation and service history.
- **Unified ticketing** — One `service_tickets` table with a `category` enum (support, preventive/scheduled/emergency maintenance, product_quote, add_to_quote), optional digital twin codes, and ticket messages.
- **Maintenance** — Preventive, scheduled, corrective, calibration, emergency, seasonal; scheduling UI and service packages (Egypt-focused).
- **After-sale** — Warranty registration and validation (RPC + table), machine photos, and service history linked to machines.
- **Admin/staff** — Ticket list, filters, assignment, status updates, and metrics via `AdminTicketDashboard` and backend role checks.

Gaps observed in code: V2 ticket creation is feature-flagged; frontend often falls back to legacy Supabase insert; some DB columns (e.g. `maintenance_type` on tickets) are not used; machine tables (`machines` vs `machine_profiles`) and YILMAZ vs generic registration are not fully aligned in one flow.

---

## 2. Ticketing System

### 2.1 Data Model

**Tables:**

- **`service_tickets`** — Core ticket table.
  - Identity: `id`, `ticket_number` (unique), optional `digital_twin_code`.
  - Classification: `type` (legacy enum: general, technical, billing, sales, spare_parts, warranty, complaint, installation, maintenance), `priority`, `status`.
  - Unified: `category` (support | preventive_maintenance | scheduled_maintenance | emergency_service | product_quote | add_to_quote) — from migration `unify_tickets_migration.sql`.
  - Links: `user_id`, `related_quote_id`, `related_order_id`, `related_product_id`, `machine_id`, `machine_serial_number`, `assigned_to`, `assigned_by`, `assigned_at`.
  - Maintenance: `scheduled_for`, `maintenance_metadata` (JSONB).
  - SLA: `sla_response_due`, `sla_resolution_due`, `first_response_at`, `sla_breached`, `escalated`, `escalated_at`.
  - Contact: `contact_phone`, `contact_email`, `preferred_contact_method`, `site_location`.
  - Resolution: `resolution_summary`, `customer_satisfaction_rating`, `customer_feedback`, `resolved_at`, `closed_at`.
- **`ticket_messages`** — Thread per ticket: `ticket_id`, `author_id`, `message`, `message_type` (message, spare_parts_request, status_update, assignment, resolution, internal_note), `is_internal_note`, `attachments` (JSONB), `spare_parts_details` (JSONB), `status_change` (JSONB), `time_spent_minutes`.
- **`sla_configurations`** — Defines response/resolution times by `priority` and `ticket_type`.

**Backend (Python) — Models & API**

- **Models** (`python_backend/models/api_v2_models.py`):
  - `TicketStatus`: open, in_progress, resolved, closed.
  - `TicketCategory`: support, preventive_maintenance, scheduled_maintenance, emergency, product_quote, add_to_quote.
  - `TicketPriority`: low, medium, high, urgent, critical.
  - Create DTOs: `SupportTicketCreate`, `PreventiveMaintenanceTicketCreate`, `ScheduledMaintenanceTicketCreate`, `EmergencyServiceTicketCreate`, `ProductQuoteTicketCreate`, `AddToQuoteTicketCreate`.
- **API** (`python_backend/apis/v2/tickets.py`):
  - `POST /tickets/support` — support ticket.
  - `POST /tickets/maintenance/preventive` — preventive maintenance (with `maintenance_metadata`).
  - `POST /tickets/maintenance/scheduled` — scheduled maintenance (with `scheduled_for`, `maintenance_metadata`).
  - `POST /tickets/emergency` — emergency (with `severity`).
  - `POST /tickets/product-quote` — product quote (with `related_product_id`).
  - `POST /tickets/add-to-quote` — add-to-quote (with `related_quote_id`).
  - `GET /tickets/`, `GET /tickets/{id}` — list/get (user-scoped; staff can see more by role).
  - `POST /tickets/{id}/status` — update status (and optional `resolution_summary`).
  - `POST /tickets/{id}/assign/{assignee_id}` — assign (admin/technician/sales_rep only).
  - `POST /tickets/{id}/messages`, `GET /tickets/{id}/messages` — add/list messages.

**Service layer** (`python_backend/apis/v2/services/ticket_service.py`): Validates payload, maps category/priority, applies extras (scheduled_for, maintenance_metadata, severity, related_quote_id, etc.), then uses **TicketsRepository** to read/write `service_tickets` and `ticket_messages`.

**Repository** (`python_backend/apis/v2/repositories/tickets.py`): Inserts/selects/updates `service_tickets`; inserts/lists `ticket_messages`; reads `profiles.role` for permission checks.

### 2.2 Frontend — Creation & Listing

**Creation paths:**

1. **Legacy (primary when V2 off)** — `src/lib/ticketApi.ts`:
   - `createTicket(ticketData, userId)` builds a payload with `type`, `priority`, `status: 'open'`, `machine_serial_number`, `machine_model`, contact fields, and client-generated `ticket_number` and `digital_twin_code`.
   - Inserts directly into Supabase `service_tickets`.
   - If `VITE_ENABLE_V2_TICKETS === 'true'`, it first tries to map `type` (e.g. maintenance → scheduled_maintenance, sales → product_quote) and call the V2 API; on failure it falls back to this insert.
2. **V2 client** — `src/lib/api/ticketsV2.ts`:
   - Typed payloads per category (support, preventive_maintenance, scheduled_maintenance, emergency_service, product_quote, add_to_quote).
   - Calls FastAPI `/api/v2/tickets/...` endpoints; response includes `digital_twin_code` when applicable.

**UI:**

- **TicketWizardDialog** (`src/components/support/TicketWizardDialog.tsx`): Multi-step wizard; calls `createTicket()` from `ticketApi`; shows success and optional digital twin code.
- **TicketForm** (`src/components/support/TicketForm.tsx`): Non-wizard form used on Create Ticket page.
- **CreateTicketPage** (`src/pages/CreateTicketPage.tsx`): Standalone page; auth required; uses `TicketForm` with optional prefill from location state (e.g. maintenance_type, priority).
- **CustomerSupport** / **CustomerPortal**: List user tickets (e.g. via `api.fetchUserTickets(userId)` from `src/lib/api.ts`) and link to create/detail views.
- **AdminTicketDashboard** (`src/components/support/AdminTicketDashboard.tsx`): Uses `getAllTickets`, `getTicketMetrics`, `subscribeToTicketUpdates` from `src/lib/adminTicketApi.ts`; supports filters (status, priority, type), assignment dialog, status update dialog, and metrics.

**Types** (`src/types/tickets.ts`): `ServiceTicket`, `TicketMessage`, `CreateTicketData` (includes `maintenance_type`: preventive | corrective | predictive | emergency), `TicketFilters`, `TicketWithDetails`, `MessageWithAuthor`, `MachineMaintenanceData`, `MaintenanceTicketData`.

### 2.3 Digital Twin Code & Category Mapping

- **DB:** Migration adds `generate_digital_twin_code(machine_id, serial)` and trigger `trg_set_digital_twin_code` on `service_tickets`: for categories `preventive_maintenance`, `scheduled_maintenance`, `emergency_service` the trigger sets `digital_twin_code` if null.
- **Docs** (`docs/ticket-category-mapping.md`): Describes mapping from frontend `type`/`maintenance_type` to backend `category` (e.g. emergency → emergency_service, preventive → preventive_maintenance) and that digital twin is generated by backend for maintenance categories.
- **Reality:** Frontend often uses legacy create; `maintenance_type` is in types but not sent in the minimal insert payload in `ticketApi.ts` (commented as “column doesn't exist”). So digital twin and category are only guaranteed when the request goes through the V2 API and DB trigger.

---

## 3. Machine Services & Registration

### 3.1 Generic Machine Registration (Frontend + Supabase)

- **API** (`src/lib/api.ts`):
  - `fetchUserMachines(userId)` — list machines for user from `machines` table (`owner_id = userId`).
  - `registerMachine({ name, model, serial_number, owner_id, installation_date, warranty_valid, photo_urls })` — insert into `machines`; returns created row.
  - `uploadMachinePhoto(file, ownerId, serial)` — upload to Supabase storage bucket `machine-photos`, returns public URL.
- **UI** — `src/components/services/MachineRegistration.tsx` (exported as `MachineRegistrationEnhanced`):
  - Steps: scan (QR or manual) → details (model, serial, installation date, warranty, photos) → confirm.
  - Calls `api.registerMachine` and `api.uploadMachinePhoto`; on success invalidates/refetches user machines and shows success.
- **Table** — Expects `machines` with at least: `id`, `owner_id`, `name`, `model`, `serial_number`, `installation_date`, `warranty_valid`, `photo_urls`, `created_at`. Backend YILMAZ flow uses `serial`, `yilmaz_model_code`, `production_date`, `official_warranty_expiry`, `region` — schema may differ between “generic” and “YILMAZ” usage.

### 3.2 YILMAZ-Specific Integration (Backend)

- **Router** — `python_backend/apis/v2/yilmaz_integration.py`:
  - `POST /yilmaz/validate-serial`: Body `ValidateSerialRequest(serial_number, region)`. Calls external YILMAZ API (`YILMAZ_API_BASE_URL`, `YILMAZ_API_KEY`); returns `is_valid`, `model_code`, `warranty_status`, `production_date`.
  - `POST /yilmaz/register`: Body `RegisterMachineRequest(serial_number, region, model_code?, production_date?, warranty_expiry?)`. Inserts into `machines` (fields: serial, yilmaz_model_code, production_date, official_warranty_expiry, region, owner_id from `current_user.username`). Then inserts one row into `yilmaz_service_history` (service_type: `initial_registration`, service_report text).
- **Tables:** `machines` (YILMAZ payload), `yilmaz_service_history` (machine_id, service_date, service_type, yilmaz_tech_id, official_service_code, parts_used, service_report).

So: two registration flows — (1) frontend → Supabase `machines` with generic fields, (2) backend YILMAZ → `machines` + `yilmaz_service_history`. They may assume different `machines` column sets.

### 3.3 Machine Profiles (CNC / Fabrication)

- **Router** — `python_backend/apis/v2/machines.py` (prefix `/machines`):
  - CRUD on **`machine_profiles``** (not `machines`): name, description, brand (YILMAZ, ELUMATEC, FOMM, EMMEGI, BIESSE, CUSTOM), model, serial_number, workshop_id, location, travel/axis, spindle, feed, tool changer, controller, gcode_dialect, post_processor_config, safety_limits, status (idle | running | maintenance | error | offline).
  - `PATCH /{machine_id}/status` — status + optional current_job_id, current_program, error_message, telemetry (for “Edge Agent”).
  - `POST /{machine_id}/generate-gcode` — generates G-code, stores in `generated_gcode`, returns gcode_id and download URL.
  - `POST /{machine_id}/queue`, `GET /{machine_id}/queue` — job queue table `machine_job_queue`.

So: **machine_profiles** = CNC/fabrication assets with technical specs and G-code; **machines** = owner-registered units (generic or YILMAZ) for warranty/service. No single “machine” entity ties both in code.

---

## 4. Maintenance

### 4.1 Maintenance as Ticket Category

- Backend supports three ticket categories: **preventive_maintenance**, **scheduled_maintenance**, **emergency_service**, with optional `scheduled_for` and `maintenance_metadata`.
- Frontend `CreateTicketData` and types include `maintenance_type` (preventive | corrective | predictive | emergency); mapping to backend category is documented but only applied when V2 path is used.

### 4.2 Scheduling & Service Packages (UI)

- **ScheduleMaintenance** (`src/components/services/ScheduleMaintenance.tsx`):
  - Form: company, contact, email, phone, machine id/model/type, service type (preventive | corrective | calibration | emergency | seasonal), priority, preferred date/time, duration, governorate, industrial zone, technician preference, notes, spare parts, options (operator training, safety inspection, software update), payment (cash, bank_transfer, installments), Turkish technician, translation.
  - Egyptian governorates and industrial zones (Cairo, Giza, Alexandria, etc.).
  - Service packages (e.g. Basic Aluminum Maintenance, Comprehensive Aluminum Service) with price, duration, features (EN/AR), recommendedFor, turkishExpert, seasonalDiscount.
  - Machine types: CNC Machining Center, Cutting & Sawing, Welding, Bending, etc.
  - Submitting this form is not wired in the provided snippet to a specific API; it’s likely intended to create a maintenance ticket (scheduled or preventive) or to be sent to a backend — needs to be confirmed against actual submit handler.
- **PreventiveMaintenanceDialog**, **SmartMaintenanceTab**, **MaintenanceDashboard** — Present in `src/components/services/` and referenced from Services page; provide maintenance-focused UI and likely feed into ticket creation or machine health views.

### 4.3 Predictive Maintenance (UI / Simulated)

- **Services.tsx**: Loads “predictive” data (e.g. `PredictiveAlert[]`, `MachineHealth[]`) from mock arrays — severity, component, issue, predicted failure date, confidence, recommended actions, sensor types.
- **PredictiveMaintenanceEngine**, **MachineHealthTrends**, **MachineHealthCheck** — Components exist; logic appears to be simulated (e.g. health scores, sensor readings) rather than connected to a real predictive backend in the inspected code.

### 4.4 Service History

- **YILMAZ:** `yilmaz_service_history` is written on YILMAZ registration (initial_registration). No other service history endpoints were read; the table is suitable for logging subsequent visits/parts.
- **Generic:** No dedicated “service history” table or API for non-YILMAZ machines in the files inspected; machine-related history is partly implied by tickets (machine_serial_number / machine_id).

---

## 5. After-Sale Services

### 5.1 Warranty

- **Client** — `src/lib/data/warrantyClient.ts`:
  - `createWarrantyRegistration(input)` — inserts into `warranty_registrations` (machine_serial_number, plan_id, product_id, order_id, duration_months, meta, notes).
  - `listWarranties(filters)` — status, serial, customer_id.
  - `confirmWarrantySale(warrantyId, serial, durationOverride?)` — RPC `confirm_warranty_sale`.
  - `validateWarranty(serial)` — RPC `validate_warranty`; returns `ValidatedWarranty[]` (warranty_code, machine_serial_number, status, warranty_start_date, warranty_end_date, days_remaining, plan_name, coverage).
- **Types:** WarrantyRegistrationInput (zod), ValidatedWarranty (status: pending | active | expired | void). No warranty table DDL was read; presence of RPCs implies backend/DB logic for confirmation and validation.

### 5.2 Machine Registration & Photos

- Covered above: generic registration stores installation_date, warranty_valid, photo_urls; YILMAZ registration stores official_warranty_expiry and creates initial service history. Photos are in `machine-photos` bucket.

### 5.3 Spare Parts & Quotes in Tickets

- Ticket types include spare_parts; `ticket_messages` has `spare_parts_details` (JSONB) and message_type `spare_parts_request`.
- Product quote tickets (`product_quote`, `add_to_quote`) link tickets to products/quotes; after-sale flows can attach these when the request originates from shop/product pages.

---

## 6. Services Page Structure

- **Services.tsx**: Tabbed UI — overview, machine registration, maintenance dashboard, predictive maintenance, service ROI analytics; view toggle (simple | advanced); emergency dialog; operator training dialog; ticket wizard. Uses lazy-loaded components: MachineRegistrationEnhanced, MaintenanceDashboard, PredictiveMaintenanceEngine, ServiceROIAnalytics, TicketWizardDialog, etc.
- **Routes:** `/support`, `/support/tickets/new`, `/portal`, `/portal/register-machine`, `/portal/create-ticket` (redirect to new ticket), etc. Customer portal and support pages list tickets and link to create/detail.

---

## 7. Security & Permissions

- **Tickets:** Backend ensures list/get by `user_id`; staff roles (admin, technician, sales_rep) can see other users’ tickets and can assign. Assignment endpoint checks role.
- **Machines:** Generic fetch/register use Supabase RLS (owner_id). YILMAZ register uses authenticated user (username → owner_id). Machine profiles API uses a shared Supabase client; `get_current_user_id` was a no-op in the snippet, so RLS or other middleware likely enforces access.
- **Frontend:** `canCreateServiceTicket`, `trackServiceTicketBlocked` used to gate ticket creation; Create Ticket page requires auth.

---

## 8. Gaps & Inconsistencies (from code only)

1. **Two machine models:** `machines` (owner, serial, warranty, photos / YILMAZ fields) vs `machine_profiles` (CNC specs, G-code, job queue). No clear link in code (e.g. machine_profiles.workshop_id vs machines.owner_id).
2. **Two registration flows:** Frontend generic registration vs backend YILMAZ registration; different column sets and tables (e.g. yilmaz_service_history only for YILMAZ).
3. **V2 tickets feature-flagged:** When `VITE_ENABLE_V2_TICKETS !== 'true'`, all creates use legacy Supabase insert; then category, digital_twin_code, scheduled_for, maintenance_metadata may be missing or client-only.
4. **maintenance_type:** In frontend types and UI but not in legacy insert payload; backend supports maintenance_metadata/scheduled_for but frontend may not always send them unless using V2.
5. **ScheduleMaintenance submit:** Form is rich but the exact API (ticket create vs dedicated maintenance API) was not verified in the snippet.
6. **Predictive maintenance:** Implemented as mock data in Services; no clear backend for predictions or sensor ingestion.
7. **Warranty:** Client and RPCs exist; full schema and who can create/confirm (e.g. admin only) not verified in this pass.
8. **SLA:** Table `sla_configurations` exists; no code read that calculates sla_response_due/sla_resolution_due or marks sla_breached on tickets.

---

## 9. File Reference (main pieces)

| Area | Location |
|------|----------|
| Ticket types | `src/types/tickets.ts` |
| Ticket create (legacy + V2 try) | `src/lib/ticketApi.ts` |
| V2 ticket API client | `src/lib/api/ticketsV2.ts` |
| Ticket wizard | `src/components/support/TicketWizardDialog.tsx` |
| Ticket form | `src/components/support/TicketForm.tsx` |
| Admin ticket dashboard | `src/components/support/AdminTicketDashboard.tsx`, `src/lib/adminTicketApi.ts` |
| Backend ticket API | `python_backend/apis/v2/tickets.py` |
| Ticket service | `python_backend/apis/v2/services/ticket_service.py` |
| Ticket repository | `python_backend/apis/v2/repositories/tickets.py` |
| Ticket models | `python_backend/models/api_v2_models.py` |
| Service tickets DDL | `service-ticketing-system.sql` |
| Unified category + digital twin | `archive/database-migrations/unify_tickets_migration.sql` |
| Category mapping docs | `docs/ticket-category-mapping.md` |
| Generic machine API | `src/lib/api.ts` (fetchUserMachines, registerMachine, uploadMachinePhoto) |
| Machine registration UI | `src/components/services/MachineRegistration.tsx` |
| YILMAZ validate/register | `python_backend/apis/v2/yilmaz_integration.py` |
| Machine profiles (CNC) | `python_backend/apis/v2/machines.py` |
| Schedule maintenance UI | `src/components/services/ScheduleMaintenance.tsx` |
| Maintenance dashboard / predictive | `src/components/services/MaintenanceDashboard.tsx`, `PredictiveMaintenanceEngine.tsx` |
| Services page | `src/pages/Services.tsx` |
| Warranty client | `src/lib/data/warrantyClient.ts` |
| Create ticket page | `src/pages/CreateTicketPage.tsx` |

---

This document reflects only what is implemented and visible in the codebase (and migrations/docs referenced from it), not product or roadmap claims.
