# Service routines — first-slice product proposal (no implementation)

**Status:** Proposal only · **do not implement yet**  
**Depends on:** Staging-closed core service program; B3/B4 **approved configurable-routines addendum**  
**Addendum sources (reuse, do not reopen):**  
[`B3_VISIT_CONTRACT.md`](./B3_VISIT_CONTRACT.md) § Configurable routine extension · [`B4_REPORT_CONTRACT.md`](./B4_REPORT_CONTRACT.md) § Configurable routines (integration only)

## Intent

Admin-configurable, **versioned** service routines linked to **catalog models**, with technician checklist execution and **recorded results**. First slice delivers authoring → pin → execute → persist. Later slices add contracts, recurrence, and squad dispatch.

## Separated concerns (hard boundaries)

| Lane | In first slice? | Owns |
|------|-----------------|------|
| **A — Authoring / review / publication / model applicability** | **Yes** | Draft → review → publish routine **versions**; attach applicability to catalog model ids (and explicit uncatalogued/uncertain handling later if needed) |
| **B — Pinned checklist instances + technician results** | **Yes** | Pin a **published version** onto a visit (`pinned_routine_version_id`); tech records `checklist_results` at report submit (B4 contract already reserved) |
| **C — Contract coverage, recurrence generation, squad dispatch** | **No — deferred** | Service contracts, scheduled recurrence, squad assignment / multi-tech dispatch |

Do not collapse A into B (no live-edit of a pin). Do not pull C into the first slice.

## First-slice scope (small)

### Data (conceptual)

- `service_routines` (identity) + `service_routine_versions` (immutable published snapshots: items schema, labels; **no** live mutate after publish).
- `service_routine_model_links` (catalog_model_id ↔ routine; effective dating optional in slice-1 as single current link).
- Visit already has `pinned_routine_version_id` + `checklist_results` (B3/B4) — first slice **wires** them; does not reinvent submit.

### Actors / RPCs (sketch)

| Actor | Capability |
|-------|------------|
| Admin (or designated publisher) | Create draft, submit for review, publish version, set model applicability |
| Support | Pin published version onto a visit (or inherit default from machine catalog link when present) |
| Attending technician | Execute checklist; submit results via existing report path when pin set |
| Customer / anon | No routine draft/version writes; no unpublished checklist content |

### Explicit non-goals (slice 1)

- Contract entitlement / paid coverage gates  
- Recurring visit generation from routines  
- Squad / multi-assignee dispatch  
- Hardcoded model tolerances in report SQL (remain with publisher metadata)  
- Editing a pinned version in place (publish a new version + re-pin instead)

## Acceptance scenarios (first slice)

1. **Publish:** Admin publishes routine version V1 with ≥1 checklist item; draft is no longer editable; V1 id is stable.
2. **Applicability:** Catalog model M linked to routine R; unrelated model M2 has no default pin suggestion.
3. **Pin:** Support pins V1 on a completed-eligible visit; `pinned_routine_version_id = V1`; unpin/clear allowed only before submit (policy TBD — default: clear only if no results).
4. **Submit with pin:** Attending tech submit without `checklist_results` → denied; with matching `routine_version_id` + `items[]` → accepted; results immutable with revision.
5. **Submit without pin:** Existing B4 path unchanged; `checklist_results` must be NULL.
6. **Version skew:** Results citing V2 while pin is V1 → denied.
7. **Visibility:** Customer/share payloads never include unpublished draft routines; issued reports expose only customer-visible result summaries (policy aligned with B5 issue rules).
8. **Authz:** Unrelated tech cannot submit checklist for a visit they did not attend; admin cannot forge attending identity (B4 R4-05 preserved).

## Sequencing relative to production packages

- Can design/implement against staging after core program closeout.
- Production apply of routines schema is **independent** of the Slice0+MI first-release security package, but must not ship pins that break B4 submit until B4 (or compatible submit) is live in that environment.

## Exit criteria for “slice 1 done”

Disposable + staging Spark scenarios 1–8 PASS; no C-lane tables; B3 safety gate remains the minimum start gate (routines do not replace it).
