# Fabricator Pro improvement plan

Based on the authenticated Fabricator and running DoWin review of 22 September
2026. Companion evidence: `FABRICATOR-DOWIN-USABILITY_2026-09-22.md`.

## Product direction

Build a dependable Arabic/English workshop platform with DoWin's directness in
design-to-cutting and ALMONA's regional systems, quoting and service integration.
Retain React/Vite, Supabase and FastAPI. A framework migration does not address
the observed problems. Retain the existing drawing tools and deterministic solver;
repair their shared data and release boundaries before adding features.

## Revised comparison

| Area | DoWin observed | Fabricator observed | Decision |
| --- | --- | --- | --- |
| Starting work | Project form and saved-project list together | Project summary, position cards and measurements available | Preserve Fabricator summary; add a prominent Resume job / New job action instead of making analytics the primary entrance. |
| Design clarity | Large 2D drawing, dimensions, context-sensitive controls | SmartDraw, 3D and broad drafting tools; crowded nested panels | Make 2D the default work surface; show 3D, physics and advanced tools on demand. |
| Design continuity | Opened one saved drawing and its matching preview | Same position rendered differently across Measure/Design; header/editor later disagreed | Fix authoritative position loading before UI redesign. DoWin continuity across edits was not tested. |
| Cutting review | Assembly names, profile codes, lengths, both end angles, totals | Aggregate rows, one displayed angle, high confidence despite defaults | Build piece-level traceability rather than another summary dashboard. |
| Optimization | Required parts, stock, results and unplaced-parts views together | Strategy controls dominate while required pieces and stock are missing | Present real demand and stock first; advanced weights belong in a drawer. Neither solver was benchmarked in this review. |
| Commercial | Project/customer information inspected; costing workflow not fully tested | EGP quote preview and Orders exist, but approval/persistence handoff is incomplete | Complete revision-linked estimate → approved quote → order. No claim that DoWin lacks commercial features. |
| Quality/delivery | Not inspected as equivalent modules | QC checklist and Delivery screen exist; QC approval lacks enforcement | Persist inspection evidence before calling this factory execution. |
| Catalogue | Two visible systems with role/code/dimension tables | 26 advertised packs; readiness/count contradictions | Qualify a small pilot catalogue before expanding its size. |
| Localization | English interface with Turkish text in places | Arabic/RTL foundations; inspected route still contains hard-coded English | Test a complete Arabic job; retain Latin profile codes and unambiguous numbers/units. |
| Machine output | MDB export control visible; no controller import tested | Production blocked in this session; source contains simulated sending | Qualify one real controller end to end; neither visible button nor generated file proves machine acceptance. |

## Delivery sequence and acceptance

Each row is a separately reviewable work package. Owners are proposed roles,
not assigned people. Advance on evidence rather than calendar promises.

| Order | Package / owner | Scope | Exit check |
| --- | --- | --- | --- |
| 1 | Release safeguards — frontend/backend + QA | Empty/failing optimization stays failed; QC requires checked evidence; incomplete quotes remain clearly estimates; remove unsupported Verified/accuracy/online/saved claims. | Solver exceptions and missing inputs cannot complete a step. QC rejects missing evidence. No displayed success without its corresponding acknowledgement. |
| 2 | Position and revision integrity — frontend/backend | Use one authoritative owner/project/position/revision across workspace context, store and route loader. Reconcile grid, dimensions, system, measurements and components. Invalidate descendants after edits. | The observed 1210 × 1550 sliding position matches across Measure, Design, drafting, BOM and reload; no Panda/default substitution. Switching two positions or users cannot reuse another artifact. |
| 3 | Manufacturing data contract — fabrication engineer + developers | Canonical piece IDs, left/right angles, quantity, units, kerf/trim/weld conventions and catalogue versions. Complete BOM and stock inputs. Reject unresolved data. | Required, placed, unplaced, cut-sheet and exported quantities reconcile exactly. Every dimension has a documented rule/tolerance; no aggregate row masquerades as one physical cut. |
| 4 | Save and commercial lifecycle — backend/frontend | Confirmed save/retry states, immutable quote revisions, decimal money policy, quote acceptance/order references, transactional inventory reservations. | Failed saves never show Saved; retry is idempotent. Screen/database/PDF totals agree. An order references the accepted revision and cannot reserve stock twice. |
| 5 | Operator workspace — product/frontend + workshop operators | Four main groups, one next action, canvas-first layout, complete Arabic copy, keyboard-friendly tables and accessible targets. Keep expert tools available. | Primary controls remain visible at 1366 × 768 and 1440 × 1000 without horizontal clipping. Mobile measurement/status works at 390 px. Test keyboard focus and RTL, not just screenshots. |
| 6 | Qualified pilot — engineer + machine technician + QA | One commercially important aluminium system, one UPVC system and one target controller. Review supplier drawings and physical samples. | Approved reference jobs pass individual dimensional tolerances, controller import, sample cuts, stock reconciliation and recovery tests. |
| 7 | Evidence-backed operations — backend/product | Real dashboard metrics, production acknowledgements, QC/delivery audit trail, service/passport connections. | Every metric has a source/time range; disconnected services show unavailable. Execution retries are idempotent and attributed to authenticated operators. |

Packages 1–4 address reliability before cosmetic work. UI prototypes can proceed
alongside them, but final workflow changes must use the corrected contracts.
Existing strict-typecheck debt and release security/ownership work remain separate
launch gates; they are not waived by this plan.

## Proposed everyday interface

1. **Project:** customer, project, positions, delivery date, qualified system.
2. **Design:** dimensions and 2D drawing, contextual sash/mullion/profile controls.
3. **Review & Price:** complete parts, glass/hardware, stock shortages, estimate or
   approved quote with clearly different status.
4. **Cut & Export:** actual stock, bar patterns, unplaced pieces, validation report,
   release approval, controller-specific export and acknowledgement.

These are navigation groups, not a forced commercial chronology. An estimate may
precede nesting; final manufacturing release requires validated nesting and the
approved revision. QC and Delivery remain visible production milestones.

Persistent header: project, position, revision, system and confirmed save state.
Main canvas: largest usable area. Left: collapsible position list. Right: only
selected-element properties. Secondary drawers: 3D, engineering evidence,
catalogue editing, advanced solver settings and AI assistance. AI suggestions
remain advisory and cannot override manufacturing calculations or approvals.

Remove development wording, fixed demo KPIs and unexplained confidence scores
from the operational view. Use Draft / Missing data / Validated / Released labels
with a precise next action. Keep actual failure details available for support.

## Pilot and usability acceptance

Create a matched reference suite from approved supplier data: fixed, sliding,
casement, asymmetric/mullioned, repeated positions, mixed stock and shortage cases.
Include invalid inputs, non-finite values, missing profiles, save failures, solver
failures, reloads, two users and edits after optimization. Compare DoWin and
Fabricator on identical inputs; do not infer accuracy from the different jobs
viewed during this audit.

Observe at least two experienced operators and two new users in Arabic/English.
Measure task completion, median time, corrections, help requests and recovery.
Proposed pilot target: at least 90% unassisted completion of routine tasks, zero
wrong-position exports, zero unexplained missing pieces and zero false-success
states. Timing targets follow the measured baseline; no speed advantage is claimed.

Ship only a qualified scope after strict application/tooling checks, constitutional
and isolation gates, manufacturing regressions, production build and authenticated
end-to-end tests pass on the deployed commit. Maintain rollback and restoration
evidence. Scope unsupported systems/controllers explicitly rather than implying
universal production parity.

## Immediate first implementation

Start with package 1: fail-closed optimization and enforced QC approval, accompanied
by focused regression tests. Then resolve L01 position hydration before modifying
manufacturing formulas. This review produced a plan only; it did not implement,
deploy or certify these changes.
