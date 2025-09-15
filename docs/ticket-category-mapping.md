# Ticket Category Mapping & Digital Twin Code Generation

This document explains how `maintenance_type`, `type`, and ticket creation logic map to backend categories and when a Digital Twin Code is generated.

## Overview
The frontend constructs a ticket payload via the wizard or page form. The function `createTicket` (in `src/lib/ticketApi.ts`) attempts a **V2 pathway** first. If successful, the V2 service returns a ticket that may include a `digital_twin_code`. If the V2 attempt fails (error / unsupported category), the code falls back to the legacy `service_tickets` insert (no twin code auto-generation unless database triggers exist there).

## Mapping Logic (createTicket)
```ts
if (ticket.type === 'maintenance') {
  switch (maintenance_type) {
    emergency   -> category = 'emergency_service'
    preventive  -> category = 'preventive_maintenance'
    (corrective | predictive | other maintenance) -> category = 'scheduled_maintenance'
  }
} else if (ticket.type === 'sales') category = 'product_quote'
else if (ticket.type in ['general','technical']) category = 'support'
```
If a category is resolved, a V2 payload is built and the endpoint path is chosen inside `ticketsV2Api.create` (see `src/lib/api/ticketsV2.ts`).

### Maintenance Metadata
When `category === 'preventive_maintenance'` the code attaches:
```ts
payload.maintenance_metadata = { maintenance_type }
```
Other maintenance categories currently do not carry additional metadata (can be extended later).

## Digital Twin Code Generation
The backend V2 service is responsible for generating `digital_twin_code` for the maintenance / support categories that implement it. On success:
- `digital_twin_code` is returned in the V2 response.
- The frontend maps it onto the `ServiceTicket` object.
- The wizard success screen displays the code with a copy button.

If V2 path fails (network error, unsupported category, backend exception):
1. A warning is logged: `V2 create failed, legacy fallback:`
2. Legacy insert occurs: `service_tickets` row is created via Supabase.
3. No twin code will be present unless a database trigger on `service_tickets` populates one.

## Adding New Categories
To introduce a new category or refine mapping:
1. Update mapping block in `createTicket`.
2. Ensure backend V2 endpoint supports the new category path.
3. Optionally extend maintenance_metadata for richer context (e.g. `predictive` scheduling parameters).
4. Update documentation & tests.

## Predictive Maintenance
The UI now includes `predictive` as a selectable maintenance type. Predictive is grouped into `scheduled_maintenance` (same as corrective) so it shares the same category and fallback behavior. To differentiate predictive in backend logic, extend the `maintenance_metadata` block for non-preventive categories or add a dedicated predictive endpoint.

## machine_model Field
A new optional field `machine_model` has been added:
- Migration: `add_machine_model_column.sql` adds the column if missing.
- Mapped in `mapTicket` & legacy insert path and V2 success mapping.
- Wizard fetches user machines and offers distinct model dropdown.

## Failure Behavior & Resilience
- Missing machines table / RLS denial returns empty dropdown lists (handled gracefully).
- Any V2 error triggers fallback without breaking user flow.

## Future Enhancements
- Provide backend support for `predictive` distinct category or metadata.
- Add server-side validation for `machine_model` consistency with selected `machine_serial_number`.
- Emit analytics event when twin code is generated vs. fallback.

---
Last updated: (auto-generated) 2025-09-16.
