# B7 machine linkage closeout

**Gates:** #155 frozen · #156 draft · **no merge / production**  
**Evidence tip (G-01):** Spark `6547040b` / `journey_b7.cjs`  
**Canonical verify (Cursor):** 2026-11-15T19:56Z staging `apnmoevmvihfzcnttctx`

## Exact G-01 journey ticket

| Field | Value |
|-------|-------|
| Ticket id | `3dac7d8a-4d9d-445a-9eee-b11714849167` |
| Ticket number | `TKT-2026-000018` |
| Title tag | `B7STG-J1-mwi8kisn` |
| `machine_serial_number` | `B7J1-SN-mwi8kisn` |
| `machine_id` | **NULL** |
| Registered machine | `a3c8bb6c-7eea-4635-949c-6c943d312aa1` (owner `e2000000-…0001`) |

## Registration path (J1)

Owner UI `/portal/register-machine` → uncatalogued model → `Complete Registration` → `machines` row created for serial `B7J1-SN-mwi8kisn`.

## Ticket-creation path (J2) — **legacy / free-text serial**

Owner UI `/support/tickets/new` (`CreateTicketPage` → `TicketForm`).  
Spark filled the free-text serial input (`placeholder="As printed on the plate"`) and did **not** select the registered machine from the owned-machine dropdown.

`TicketForm` documents this as the supported legacy path: when `machine_id` is empty, only `machine_serial_number` is sent; `link_ticket_machine` is **not** requested (`machineLink.reason = not_requested`).

**Label:** G-01 headline journey used the **supported legacy/free-text serial path**. Serial-only does **not** satisfy the canonical identity requirement.

## Canonical path (separate Cursor verification)

| Step | Result |
|------|--------|
| `register_machine_identity` | `668ac90f-eafe-4079-bf74-cc5a41f05182` / serial `B7STG-CANR-6afa0e7b` |
| Create ticket (insert without `machine_id`) | `TKT-2026-000023` / `786ff892-…` |
| `link_ticket_machine` (selected UUID) | HTTP 200 |
| Persist + reload (REST) | `machine_id` = `668ac90f-…` |
| Browser reload `/support/tickets/{id}` | Machine UUID + serial present in DOM |
| Cross-customer link (unrelated → owner machine) | HTTP **403** `42501` Not authorized for machine; `machine_id` stays NULL |

Also re-verified link against G-01 machine `a3c8bb6c-…` on `TKT-2026-000020` — same persist + cross-customer deny.

**Disposition:** Not a regression. Selected-machine / `link_ticket_machine` path retains UUID. No code fix required.

## Release limitation (explicit)

Staging B7 G-01 browser evidence covers the **legacy serial-only** create path end-to-end. Canonical UUID linkage is proven separately (API + browser reload) but was **not** the G-01 journey create gesture. Do not claim G-01 alone satisfies canonical machine identity.
