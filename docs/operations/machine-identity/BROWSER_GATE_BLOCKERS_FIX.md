# Browser-gate blockers fix (Spark 7/10 @ da9e8f13)

Canonical Spark report: `.artifacts/slice0/machine-identity/SPARK_CURSOR_BLOCKERS_da9e8f13.md`

## Fixes in this correction

| Blocker | Fix |
|---------|-----|
| 1 NoSuchBucket | Migration `20261111200000_staging_machine_photos_and_ticket_number.sql` provisions private `machine-photos` + `profile-thumbnails` with owner-folder RLS. App upload uses `machine-photos` and returns a signed evidence URL. |
| 2 Select `onValueChange` | `src/components/ui/select.tsx` uses React context so nested `SelectItem` under `SelectContent` receives value + `onValueChange`. |
| 3 `ticket_number` 23502 | Same migration: `BEFORE INSERT` trigger `service_tickets_assign_ticket_number` allocates `TKT-YYYY-######` server-side when omitted. `governedCreateTicket` still omits client numbers (soft-fail link contract unchanged). |

## Staging apply order (after Spark reviews this correction)

1. Apply **only** `20261111200000_staging_machine_photos_and_ticket_number.sql` on `apnmoevmvihfzcnttctx`.
2. Do **not** re-apply foundation `20261111165835` or evidence follow-up `20261111180711`.
3. Deploy matching preview of the correction commit (not production).
4. Issue fresh protected share out-of-band; Spark reruns all 10 journey checks.

Production remains unauthorized. PR #155 stays draft.
