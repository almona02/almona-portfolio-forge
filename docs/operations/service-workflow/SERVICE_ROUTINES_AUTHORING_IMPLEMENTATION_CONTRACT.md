# Service routines — authoring implementation contract (Lane A only)

**Status:** Final Lane A contract for Spark closeout · **no runtime until Spark PASS on this tip**  
**Branch:** `feat/service-routines-authoring` (from `feat/service-workflow-b1-planning` @ `1cd5e094`)  
**Based on:** `5ff07e5f509b04144fb4d47f2eb0af09f82c11ba` + finalization below  
**Sources:** [`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md) Lane A · Spec §13 + Status §A–C (`docs/specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md` blob `6f0e11cb…`)  
**FR-1:** Untouched · runtime freeze remains `e17858a5` on `release/fr1-slice0-share-privacy`  
**Gates:** #155 frozen · #156 draft · **no merge · no staging apply · no production · no credential reset**

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
| **Model mismatch enforcement** | **Family** not in the routine’s declared family set → **hard deny** on applicability **metadata** link. **Catalog-model** (or manufacturer) whose family/manufacturer conflicts with declared applicability → **allow only with attributable Admin override** on that metadata row (`override_reason`, `overridden_by`, `overridden_at`); never silent. | Adopts Spec §13.9 / Status §C warning+override for model/manufacturer; hard block for family. |
| **Override limits (Lane A)** | Metadata overrides **must not** bypass: non-waivable `safety_gate` rules, publish validation, or an **explicit manufacturer restriction** recorded on the routine (e.g. manufacturer allow-list / deny-list). Overrides are **not** assignment overrides — **no assignment/pin enforcement in Lane A**. | Assignment enforcement deferred (Lane B/C). |
| **Who reviews publication (current roles)** | **Admin** authors drafts. **Support** records operational feasibility review (primary). **Admin** publishes after a recorded valid review. | Maps §13 “Squad mgr reviews” → `support` (no squad role in accepted behavior, Status §A). |
| **Author / reviewer separation** | Actor-level: reviewer’s **user id** must be **distinct** from the draft’s primary **author user id**. Comparison is by stable actor id, **including after role changes** (a user who authored as `admin` cannot later self-review after becoming `support`, and vice versa). Reviewer role at review time ∈ {`support`,`admin`}. Publisher at publish time ∈ {`admin`}. | Same pattern as B5 author-after-role-change: identity, not current role label alone. |
| **Manufacturer-contributed content** | **External document references only** (doc id / URL / citation on items and measurement limits). **No** manufacturer accounts, roles, or manufacturer-scoped publish. Admin authors; manufacturer text is source material, not a system actor. | Status §C; external manufacturer accounts are **not** implied. |

**Disagreement to surface (not blocking this contract’s wording):** If the supervisor wants **hard deny** on model mismatch (no override), that contradicts Spec §13.9’s warning+override default — escalate before coding applicability RPCs. Authoring validation can ship family hard-deny immediately; model-override path is the contested piece.

---

## 3. Data shape (conceptual)

- `service_routines` — stable **code**, name EN/AR, description, owner, status aggregate.
- **Code uniqueness:** `service_routines.code` is unique across **all** routine identities, **including retired**. Retirement **never** releases a code for reuse. Creating or renaming to a code that already exists on any row (any lifecycle) is denied.
- `service_routine_versions` — version ordinal; lifecycle `draft | in_review | published | retired`; immutable payload once `published`.
- Version payload: sections → items; item fields: type, instruction / manufacturer-doc ref, requirement class, evidence requirement, optional finding mapping + follow-up trigger, measurement unit + optional limit **only if** tolerance-source ref present.
- Draft concurrency token: each draft version carries `draft_revision` (digest) and `content_updated_at` (or equivalent row version) used for optimistic concurrency on edits.
- Applicability rows (**Lane A metadata only**): family set; optional manufacturer ids; optional `catalog_model_id` links; override metadata when used. These rows describe intended applicability; they do **not** enforce visit/coverage assignment (deferred). Assignment and assignment overrides remain **out of scope**.
- Explicit manufacturer restrictions (optional allow-list / deny-list on the routine) are stored with the routine identity and are checked on metadata links; mismatch overrides **cannot** attach a denied manufacturer.

Item types (§13.2): `safety_gate` | `inspection` | `measurement` | `photo_evidence` | `task` | `note`.  
Requirement classes (§13.3): `safety_gate` (non-waivable) | `required` | `optional`. Configuring an item **cannot** make a safety gate waivable.

---

## 3.1 Audit ledger — pinned event strings and denied-operation behavior

| Field | Rule |
|-------|------|
| **Ledger** | Append-only `public.service_workflow_audit` (B1–B7 program ledger). `entity_type` ∈ {`service_routine`, `service_routine_version`, `service_routine_applicability`}. `action` uses the **exact** strings below (pinned; do not invent synonyms). |
| **Pinned `action` strings** | `routine_draft_created` · `routine_draft_updated` · `routine_draft_edit_conflict` · `routine_review_submitted` · `routine_review_recorded` · `routine_review_invalidated` · `routine_published` · `routine_retired` · `routine_applicability_set` · `routine_applicability_override` · `routine_authz_denied` · `routine_validation_denied` |
| **Attribution** | Every audit row: `actor_id`, `actor_role`, timestamp, `entity_type`, `entity_id`, plus details JSON with `routine_id`, `version_id`, optional applicability id, optional `draft_revision`. |
| **Successful mutation atomicity** | Business write + its success audit row commit in **one** transaction. If audit insert fails, the business write rolls back. Applies to create/update draft, submit review, record review, invalidate review, publish, retire, applicability set/override. |
| **Denied operations** | Authz failure, validation failure, stale-edit conflict, or code-uniqueness conflict: **business state unchanged**. Caller receives an explicit error (`42501` authz, `22023`/`P0001` validation/conflict as appropriate, or API 403/409). Optional audit of the deny using `routine_authz_denied`, `routine_validation_denied`, or `routine_draft_edit_conflict` may commit in a **separate** transaction (or same txn that only inserts audit and no business mutation). **Never** partially apply a denied mutation. |

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

Unauthorized callers → `42501` (or API 403), **no payload leak** of unpublished content, **business writes unchanged**, deny audited per §3.1 when recorded.

---

## 5. Server-enforced validation (publish blockers)

Publish **denied** (version stays draft/in_review; itemised errors; business state unchanged) when any of:

1. **Fewer than one non-waivable `safety_gate` item** in the version.
2. **No dedicated safety section** — at least one section with `kind = safety` (or equivalent) that **contains every** `safety_gate` item; safety_gate items outside that section are publish errors. (Clarifies Spec §13.7 “missing safety section” vs RA-2 item rule: **both** item and section are required.)
3. Measurement limit present without manufacturer/tolerance **source ref**.
4. Interval/cadence fields if present ≤ 0 (authoring may store cadence metadata for later Lane C; generator not built).
5. Routine **code** collides with any existing routine identity (**including retired**).
6. Missing **valid** author≠reviewer review bound to the **exact** draft revision/digest that is still eligible (see §6).
7. Family applicability metadata empty (at least one family required before publish).
8. Any attempt to mark safety_gate waivable.

Runtime must **never** invent pass/fail tolerances when no limit is configured (preview shows unit + empty judgement). Safety requirements are not configurable-waivable.

---

## 5.1 Concurrent draft-edit handling

| Case | Behavior |
|------|----------|
| Two Admins (or two sessions) edit the same draft version | Client must supply the **expected** `draft_revision` (or content version) known at read time. |
| Stale edit (expected revision ≠ current) | **Fail explicitly** — conflict error (API 409 / SQL conflict). **Do not** silently overwrite newer content. Optional audit `routine_draft_edit_conflict`. Business row unchanged. |
| Fresh edit (expected matches current) | Apply payload, compute new `draft_revision`, audit `routine_draft_updated` atomically with the write. If a prior review was eligible for the old revision, run §6 invalidation in the same transaction. |

---

## 6. Lifecycle, review binding, publish / version allocation

`draft → in_review → published → retired`

- Draft: Admin mutable under §5.1 concurrency. Each successful save advances **draft revision / digest**.
- Submit for review: version enters `in_review` with payload + draft revision/digest frozen for the review cycle.
- **Review binding (confirmed):** Feasibility **approval** is bound to that **exact** draft revision/digest. Publish may use an approval only when `approval.draft_revision = version.draft_revision` and the approval is not invalidated.
- **Edits vs history:** Any content change that advances `draft_revision` **invalidates eligibility** of prior approvals for publication (`routine_review_invalidated` + clear/flag “eligible for publish” on those review rows). **Prior review rows remain retained** as history (append-only; do not delete). Publish then requires a **new** review of the new revision. Actor-level author≠reviewer still applies after role changes (§2).
- Published: **immutable**; content edits require new version N+1 as a new draft.
- Retired: code remains reserved forever (§3); cannot be newly assigned (Lane C later); **retained** and readable for history and preview.

### Repeat-publish and concurrent version allocation

| Case | Behavior |
|------|----------|
| Repeat publish of an **already published** version (same `version_id`) | **Idempotent success** for the same Admin (or denied if caller unauthorized): no second ordinal, no payload mutation, audit may record an idempotent acknowledge or be silent on pure no-op — implementation must not create duplicate published rows. |
| Concurrent first-time publishes / concurrent N+1 drafts racing to publish | Version **ordinal allocated under a per-routine advisory lock** (or equivalent serialization). Exactly one winner per ordinal; loser retries with next ordinal or fails cleanly with no partial publish. |
| Two drafts both trying to become “the” next published | Both may exist as drafts; publish serializes ordinals `N`, `N+1`, … with no gaps required beyond monotonic increase per routine. |

---

## 6.1 Lane A applicability metadata vs deferred assignment

| Lane A (this package) | Deferred (not implemented here) |
|-----------------------|----------------------------------|
| Store family / manufacturer / catalog-model applicability **metadata** on the routine | Enforce which published version may be **assigned/pinned** to coverage, visit, or job |
| Admin override on **metadata mismatch** only (with limits in §2) | Assignment-time overrides, pin suggestion, or soft-warn at schedule |
| Publish-time checks that metadata is coherent enough to publish | Runtime generator / squad / contract activation filters |

**Do not implement assignment overrides in Lane A.**

---

## 7. Technician-style read-only preview

Exact published (or retired) version rendered as the technician will see it: sections ordered, safety gates first, item instructions, evidence hints, units, source refs — **no** edit controls, **no** result capture in this package.

---

## 8. Acceptance criteria (mapped for Spark)

| ID | Criterion | Maps |
|----|-----------|------|
| RA-A1 | Admin creates draft with sections/items; Sales/Customer/Tech/Anon create denied | §13.6, proposal authz |
| RA-A2 | Publish without safety_gate **or** without dedicated safety section denied; with both + distinct Support/Admin review → published immutable id | RA-2, §13.7 |
| RA-A3 | Measurement limit without source ref → publish denied | RA-1 |
| RA-A4 | Family-inapplicable metadata hard-denied; model mismatch metadata override audited; override cannot attach explicitly restricted manufacturer; **no assignment override path** | §13.9 / Status §C |
| RA-A5 | Author user id cannot self-review (including after role change); edit advances digest, invalidates publish eligibility, **preserves** prior review history rows; publish without valid bound review denied | §13.4 + §6 |
| RA-A6 | Published version edit denied; new draft version N+1 allowed; concurrent publish allocates distinct ordinals without duplicate publish rows | §13.4 + §6 |
| RA-A7 | Retire published version; code remains unreusable; preview still exact | RA-8 + §3 code rule |
| RA-A8 | Tech/Support/Admin preview of published version read-only; Customer/Anon denied draft content | RA-9 partial |
| RA-A9 | Unauthorized mutate/publish → denied; business unchanged; no draft leak | §3.1 deny |
| RA-A10 | Pinned audit `action` strings (§3.1); success mutation+audit atomic; deny leaves business unchanged | §3.1 |
| RA-A11 | Repeat publish of same published version is idempotent (no second ordinal / no mutation) | §6 |
| RA-A12 | Stale draft edit (wrong expected `draft_revision`) fails explicitly; newer content not overwritten | §5.1 |
| RA-A13 | Creating/renaming to a retired (or any existing) code denied | §3 |

Lane B scenarios (visit pin, checklist_results, version skew on submit) are **not** in this Spark battery.

---

## 9. Spark handoff / implementation gate

See [`SPARK_ROUTINES_AUTHORING_REVIEW.md`](./SPARK_ROUTINES_AUTHORING_REVIEW.md).

| Gate | Rule |
|------|------|
| Until Spark PASS on **this** final contract tip | **No** runtime implementation |
| After Spark confirms points 1–4 below closed | Lane A implementation + local/disposable tests only; freeze a **separate** implementation SHA |
| Always | FR-1 unchanged · no staging apply · no merge · no production |

**Spark must confirm closed:** (1) code unique including retired; (2) stale draft edit fails explicitly; (3) approval bound to exact digest, edits invalidate eligibility, history preserved; (4) pinned audit strings + atomic success / unchanged-on-deny.
