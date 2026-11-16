# Service routines — authoring implementation contract (Lane A only)

**Status:** Implementation contract for Spark review · **no runtime until Spark PASS**  
**Branch:** `feat/service-routines-authoring` (from `feat/service-workflow-b1-planning` @ `1cd5e094`)  
**Sources:** [`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md) Lane A · Spec §13 + Status §A–C (`docs/specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md` blob `6f0e11cb…`)  
**FR-1:** Untouched · runtime freeze remains `e17858a5` on `release/fr1-slice0-share-privacy`  
**Gates:** #155 frozen · #156 draft · **no merge · no production · no credential reset**

---

## 1. In scope / out of scope

| In scope (this package) | Out of scope (explicit) |
|-------------------------|-------------------------|
| Admin draft create/edit | Contract activation / coverage pinning |
| Manufacturer, catalog-model, family applicability | Recurrence / scheduling / occurrence generation |
| Checklist sections, item types, requirement classes, evidence, units, manufacturer source refs | Squads / multi-tech dispatch |
| Immutable publish, retire, retained history | Stock / parts reserve-order-consume |
| Technician-style **read-only** preview of a version | Technician result capture / visit pin / `checklist_results` submit |
| Review + publish permissions (current roles) | New production deployment |
| Server-enforced validation + applicability | Configurable waiver of safety gates |
| Audit events + unauthorized denial | Invented measurement tolerances |

Lane B (pin + results) and Lane C (contracts/recurrence/squads) remain deferred. B3 minimum safety gate for visit start is unchanged and is **not** replaced by routine safety items in this package.

---

## 2. Policy resolutions (named)

| Question | Resolution for this package | Evidence / note |
|----------|----------------------------|-----------------|
| **Model mismatch enforcement** | **Family** not in the routine’s declared family set → **hard deny** on applicability link. **Catalog-model** (or manufacturer) whose family/manufacturer conflicts with declared applicability → **allow only with attributable Admin override** (`override_reason`, `overridden_by`, `overridden_at`); never silent. | Adopts Spec §13.9 / Status §C warning+override for model/manufacturer; hard block for family. |
| **Who reviews publication (current roles)** | **Admin** authors drafts. **Support** records operational feasibility review. **Admin** publishes after a recorded review. | Maps §13 “Squad mgr reviews” → `support` (no squad role in accepted behavior, Status §A). |
| **Author / reviewer separation** | Publish requires a recorded review by a **different user** than the draft’s primary author. Reviewer role ∈ {`support`,`admin`}. Publisher ∈ {`admin`}. Same user cannot satisfy author+reviewer for that version. | Hardens §13.4 “publisher is never the sole author without a recorded review.” |
| **Manufacturer-contributed content** | **External document references only** (doc id / URL / citation on items and measurement limits). **No** manufacturer accounts, roles, or manufacturer-scoped publish. Admin authors; manufacturer text is source material, not a system actor. | Status §C; external manufacturer accounts are **not** implied. |

**Disagreement to surface (not blocking this contract’s wording):** If the supervisor wants **hard deny** on model mismatch (no override), that contradicts Spec §13.9’s warning+override default — escalate before coding applicability RPCs. Authoring validation can ship family hard-deny immediately; model-override path is the contested piece.

---

## 3. Data shape (conceptual)

- `service_routines` — stable code, name EN/AR, description, owner, status aggregate.
- `service_routine_versions` — version ordinal; lifecycle `draft | in_review | published | retired`; immutable payload once `published`.
- Version payload: sections → items; item fields: type, instruction / manufacturer-doc ref, requirement class, evidence requirement, optional finding mapping + follow-up trigger, measurement unit + optional limit **only if** tolerance-source ref present.
- Applicability rows: family set; optional manufacturer ids; optional `catalog_model_id` links; override metadata when used.
- Audit: append-only workflow-style events for draft save, submit-for-review, review recorded, publish, retire, applicability changes, unauthorized attempts (deny, no mutation).

Item types (§13.2): `safety_gate` | `inspection` | `measurement` | `photo_evidence` | `task` | `note`.  
Requirement classes (§13.3): `safety_gate` (non-waivable) | `required` | `optional`. Configuring an item **cannot** make a safety gate waivable.

---

## 4. Permissions (current roles)

| Action | Admin | Support | Technician | Sales | Customer | Anon |
|--------|-------|---------|------------|-------|----------|------|
| Create/edit draft | R | — | — | — | — | — |
| Submit for review | R | — | — | — | — | — |
| Record feasibility review | A (if not author) | R (if not author) | — | — | — | — |
| Publish / retire | R | — | — | — | — | — |
| Set applicability (+ override) | R | — | — | — | — | — |
| Read published / retired (library) | R | R | R (preview only) | — | Own-machine summaries later (out) | — |
| Read draft / in_review | R | R (reviewers) | — | — | — | — |
| Technician-style preview | R | R | R (published/retired exact version) | — | — | — |

Unauthorized callers → `42501` (or API 403), **no payload leak** of unpublished content, **no writes**, audit deny where practical.

---

## 5. Server-enforced validation (publish blockers)

Publish **denied** (version stays draft/in_review; itemised errors) when any of:

1. No `safety_gate` item in the version.
2. Measurement limit present without manufacturer/tolerance **source ref**.
3. Interval/cadence fields if present ≤ 0 (authoring may store cadence metadata for later Lane C; generator not built).
4. Duplicate routine code on a non-retired identity.
5. Missing author≠reviewer recorded review.
6. Family applicability empty (at least one family required before publish).
7. Any attempt to mark safety_gate waivable.

Runtime must **never** invent pass/fail tolerances when no limit is configured (preview shows unit + empty judgement). Safety requirements are not configurable-waivable.

---

## 6. Lifecycle

`draft → in_review → published → retired`

- Draft: Admin mutable.
- In review: payload frozen for review or Admin may return to draft (audited); no publish without review row.
- Published: **immutable**; edits require new version N+1.
- Retired: cannot be newly assigned (Lane C later); **retained** and readable for history and preview.

---

## 7. Technician-style read-only preview

Exact published (or retired) version rendered as the technician will see it: sections ordered, safety gates first, item instructions, evidence hints, units, source refs — **no** edit controls, **no** result capture in this package.

---

## 8. Acceptance criteria (mapped for Spark)

| ID | Criterion | Maps |
|----|-----------|------|
| RA-A1 | Admin creates draft with sections/items; Sales/Customer/Tech/Anon create denied | §13.6, proposal authz |
| RA-A2 | Publish without safety_gate denied; with gate + distinct Support/Admin review → published immutable id | RA-2, proposal §1 |
| RA-A3 | Measurement limit without source ref → publish denied | RA-1 |
| RA-A4 | Family-inapplicable model/family link hard-denied; model mismatch allowed only with Admin override audit | §13.9 / Status §C |
| RA-A5 | Author cannot self-satisfy review; publish without other-user review denied | §13.4 separation |
| RA-A6 | Published version edit denied; new draft version N+1 allowed | §13.4 |
| RA-A7 | Retire published version; preview still exact; cannot select for new applicability targets that imply “current publish” | RA-8 (authoring half) |
| RA-A8 | Tech/Support/Admin preview of published version read-only; Customer/Anon denied draft content | RA-9 partial |
| RA-A9 | Unauthorized mutate/publish → denied + no draft leak | proposal §7/§8 partial |
| RA-A10 | Audit rows for create, review, publish, retire, applicability override, deny | program audit pattern |

Lane B scenarios (visit pin, checklist_results, version skew on submit) are **not** in this Spark battery.

---

## 9. Spark handoff

See [`SPARK_ROUTINES_AUTHORING_REVIEW.md`](./SPARK_ROUTINES_AUTHORING_REVIEW.md). **No staging apply / no production** until Spark PASS on this contract tip.
**runtime implementation starts only after that PASS.**
