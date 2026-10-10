# Fabricator user workflow upgrade plan

Date: 6 October 2026 (scorecard refreshed **10 October 2026**).
Status: Batches 1–6 implementation ~94%; manufacturing stack #61–#68 **merged** via #69; #70–#75 on `main` tip `f27f0317`. Staging §5.2 + Phase B fail-closed gates **pass**; Phase C prod #71/#72 SQL **applied**. Live acceptance ~55%; production readiness **PARTIAL**. Composite provisional **~89/100** — see [Oct 9 scorecard](../reviews/FABRICATOR_SCORECARD_2026-10-09.md) and synced [upgrade scorecard](FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md). Next: §5.3 positive convert + live FINAL GOAL. See the [staging/promote plan](FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md), [repair exit](FABRICATOR_REPAIR_AND_OPTIMIZATION_EXIT_PLAN_2026-10-05.md), and [responsive/PDF audit](../audits/FABRICATOR_OPTIMIZATION_RESPONSIVE_AUDIT_2026-10-06.md).

| Companion | Role |
|---|---|
| [Oct 9 scorecard](../reviews/FABRICATOR_SCORECARD_2026-10-09.md) | Current provisional scores + Phase B/C evidence |
| [Upgrade scorecard](FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md) | Synced gate-by-gate companion (10 Oct) |
| [Batch 1 implementation](FABRICATOR_BATCH1_IMPLEMENTATION_2026-10-05.md) | What shipped and how it was verified |
| [Batch 1 readiness](FABRICATOR_BATCH1_READINESS_2026-10-05.md) | Pre-implementation toolchain baseline |
| [Security remediation](SECURITY_DEPENDABOT_REMEDIATION_BATCH_2026-10-05.md) | Dependabot clearable pins + blocked braces/node-forge |
| [FP-028 Apex Accuracy](FP-028_FABRICATOR_DESIGN_STUDIO_APEX_ACCURACY.md) | Manufacturing formula authority (orthogonal; do not invent physics in Batch 2) |

Inputs: [extended wiring audit](../audits/FABRICATOR_USER_PAGES_WIRING_AUDIT_2026-10-05.md), [fabrication/Stock/Profiles audit](../audits/LIVE_FABRICATION_STOCK_PROFILES_AUDIT_2026-10-05.md).

---

## Revision audit (what changed since the original plan)

| Plan claim (morning / early) | Reality (night 5 Oct 2026) | Plan action |
|---|---|---|
| Batch 1 “acceptance pending” | UP-01…05 shipped: live Studio stage order, consultation UUID receipt, `test:batch1` 30/30, promote + `origin/main` `91802b8` / CI `7a3226a` / security `a599c54` | Mark Batch 1 **DONE** (product). Batch 0 fixtures remain. |
| Blocked by git sync | Batch 1 committed and pushed | Remove as blocker |
| Redis reported healthy when missing | Honesty live (`b44a864`): Redis `unhealthy`/`unreachable`; overall `degraded` | Remove honesty blocker; optional Redis **provision** remains ops work |
| `railway.json` Prestige Dockerfile | Live service uses Industrial `Dockerfile.realistic`; repo `railway.json` aligned in `a599c54` | Document Industrial as canonical Railway path |
| “First slice = UP-01…04 + UP-06/09” | UP-01…05 complete; UP-06/09 not started | Next slice = **close Batch 0**, then **UP-06 + UP-09** |
| Scorecard “git FAIL / Redis FAIL” | Stale relative to night commits | Treat scorecard evidence index as outdated until refreshed; this plan is source of truth for sequencing |
| FUA findings all open | Batch 1 closed/reduced FUA-01, 02, 04, 06, 11, 18 + public calculator/consultation | Keep outstanding FUA mapped to Batches 2–6 |
| Security not in scope | PyJWT 2.15.1 + npm pins shipped; braces #943/#944 and node-forge #942 blocked upstream | Track as ops/security parallel, not UP tickets |

**Audit verdict:** The original plan’s target journey, contracts, and batch boundaries remain valid. What was wrong was status and sequencing—Batch 1 is no longer the next coding slice.

---

## Target outcome

A workshop user can create a customer-linked project, measure and design its positions, resolve verified profiles, review a qualified BOM, plan stock and optimize cuts, save an accurate quotation, create one linked order, release a specific revision, record production and QC evidence, and complete delivery. The same project, position, profile, currency and revision remain identifiable across pages and reloads.

Upgrade the existing React/FastAPI/Supabase architecture in bounded changes. Preserve authoritative hydration, required-part conservation, manufacturing-rule approval, stale-result rejection, stock provenance and QC acknowledgement. A missing contract should produce a useful blocked state; a visual status must never bypass a manufacturing gate.

**AICS-001:** No ML on manufacturing execution paths. Catalog/profile resolution and BOM remain rule-based. Batch 2 must not invent ROCK60/physics authority—defer to FP-028 evidence gates.

---

## Canonical user journey (shipped navigation)

Primary Studio sequence (Batch 1):

`Project → Measure → Design → BOM → Stock → Optimize → Quote → Production → QC → Delivery`

| Rule | Behavior |
|---|---|
| Stock step | Position-scoped availability/reservation intent; global Stock library remains under Data. Until UP-09/10, Stock stage stays **Not recorded** (no fake completion). |
| Draft estimate | May exist from estimate BOM; must never authorize production. |
| Production quote | Requires qualified BOM + reconciled optimization. |
| Design CTA | **Review BOM** (not “Proceed to Optimization”). |
| QC / Delivery hrefs | Carry `projectId` + `poseId` query context (Batch 1). |
| Orders | One user workspace later (UP-17); admin bulk actions separately gated. |

Standalone pages remain: Customers, Systems, Profiles, Stock, Orders, Reports, Integrations.

---

## Shared contracts (still required before Batches 3–5)

| Contract | Required behavior | Status after Batch 1 |
|---|---|---|
| Workflow identity | Owner/workshop, project UUID, position UUID, revision/fingerprint; route resolve + server ownership | **Partial** — pose hydration + QC context improved; not fully server-bound for all writes |
| Profile identity | Catalog code ≠ owned UUID; role, material, verified geometry | **Open** — Batch 2 |
| Catalog resolution | One resolver; unknown ID errors; no first-pack substitution | **Open** — UP-06 |
| BOM/optimization | Qualification, ledgers, fingerprints, invalidate on edit | **Partial** — fail-closed gates exist; project aggregation still weak (FUA-16) |
| Inventory | Adapter, units, movements, revision reservations | **Open** — UP-09/10 |
| Quote/order | Currency, lines, totals, idempotent conversion | **Open** — Batch 4 |
| Production/QC/delivery | Server ack against released revision; real evidence | **Closed** — Batch 5 UP-18/19/20 (apply SQLs) |
| Save status | draft → pending → acknowledged; not `updatedAt` | **Partial** — Batch 1 removed false autosave; UP-14 completes |

Keep adapters centralized. Do not add another global store that owns manufacturing truth.

---

## Batch status rollup

| Batch | Scope | Status | Score | Exit gate |
|---|---|---|---|---|
| **0** | Toolchain + disposable fixtures + deploy baseline | **NEAR EXIT** | ~85% | Owners seeded; §5.3 positive convert + FINAL GOAL still open |
| **1** | Truthful readiness / nav / demos / public lead | **DONE** | ~95% | Product exit met; fixtures/Redis provision optional for “release-perfect” |
| **2** | Profiles / systems / inventory | **DONE** | ~95% | Soft reservation exit; DB reservation deferred |
| **3** | Customer / pattern / revision handoffs | **DONE** | ~90% | UP-11…14 |
| **4** | Quote → order + admin separation | **DONE** | ~90% | UP-15…17 |
| **5** | Production / QC / delivery release | **DONE** | ~95% | UP-18…20 |
| **6** | Reporting / a11y / integrations | **DONE** | ~85% | UP-21…23 |

---

## Batch 0 — Staging baseline (NEAR EXIT)

**Done:** npm/Vitest restored; `npm run test:batch1`; production builds; Railway Redis honesty; git on `main`; release metadata pattern (`batch1-verification.json`); [Batch 0 baseline doc](BATCH0_STAGING_BASELINE_2026-10-05.md) + seed template; two-owner fixtures seeded; Phase B fail-closed + cross-owner gates recorded.

**Still required:**

1. §5.3 positive convert on disposable fixture with approved authority.
2. Expand multi-revision poses if needed for release/QC walk.
3. Restore points for fixture data.
4. Record Railway image digest on next staging/prod promote.

**Exit:** targeted identity/validation/QC suites run against fixtures; failures classified; route inventory + deploy baseline recorded; positive convert + release→QC→delivery evidenced.

---

## Batch 1 — Truthful readiness (DONE)

Tickets:

| Ticket | Status | Evidence |
|---|---|---|
| **UP-01** Readiness ≠ selection | **DONE** | `studioWorkflow.ts` + tests; live blocked reasons |
| **UP-02** Stage order / Review BOM / QC context | **DONE** | Live Studio order; QC query context |
| **UP-03** Empty tuning / Save&Return | **DONE** | `tuningReadiness` + SystemPackTuningStudio |
| **UP-04** Demo isolation / no URL role grants | **DONE** | persona tests; kiosk/delivery demos gated |
| **UP-05** Calculator + consultation + CTAs | **DONE** | Live UUID receipt; migration on Supabase |

**Exit (met):** estimate BOM does not imply manufacturing Complete; blocked steps explain recovery; empty packs not “All Tuned”; demos cannot emit operational completion; consultation returns acknowledged UUID.

**Residual (not Batch 1 scope):** full multi-owner mutation walkthrough (Batch 0); Redis service provision; PWA update prompt on every live tab after promote.

Commits of record: `91802b8` (Batch 1), `7a3226a` (CI test alignment), `b44a864` (Redis honesty), `a599c54` (security + railway.json).

---

## Batch 2 — Unify profiles, systems and inventory (DONE ~95%)

Soft reservation is the Batch 2 exit. Hard DB reservation remains deferred.

Tickets:

- **UP-06:** **DONE** — `CatalogResolver` fail-closed; wired EngineeringBay/Optimization/Production/ProjectStudio/BOMReview.
- **UP-07:** **DONE** — materialize owned UUIDs; ProfileStudioLite persists returned pack + surfaces materialize note; catalog-code dedupe.
- **UP-08:** **PARTIAL** — no silent sash invent / steel→aluminum; positive finite dims required. Broader DXF importer paths remain.
- **UP-09:** **DONE** — Studio Stock + Reports via `loadOwnedWorkshopInventory` + finite mapper.
- **UP-10:** **DONE (soft exit)** — revision-bound soft ack; intake movements + sync; optional `idempotency_key` column. Hard DB reservation deferred.

**Exit (met for soft path):** owned UUID materialize + soft pose stock ack. Apply `20261005_stock_movements_idempotency.sql` when convenient.

---

## Batch 3 — Customer, pattern, revision handoffs (DONE ~90%)

- **UP-11:** **PARTIAL** — `customerId` on `WindowUnit` + project `meta`; create path retains UUID. Full always-on server persist (flag-independent) still incomplete.
- **UP-12:** **DONE** — Pattern library wires apply/cancel to active pose + invalidates BOM/optimize.
- **UP-13:** **DONE** — Project BOM uses CatalogResolver; failed poses labeled; partial estimate banner.
- **UP-14:** **DONE** — unified chrome; tones `dirty|local|acknowledged|error|unknown`; never invents Saved from identity alone (FUA-19).

**Exit:** customer-linked create under both flag configs; UP-14 chrome; position switch never retains foreign BOM/quote.

---

## Batch 4 — Quote → order + admin separation (DONE ~92% implementation; staging positive convert open)

- **UP-15:** **DONE** — Persist quotes/lines bound to project/position/revision; draft estimate vs priced. **FUA-08**
- **UP-16:** **DONE (code)** — Server convert-to-order + durable optimize gate (#67/#69); live positive convert still §5.3. **FUA-09**
- **UP-17:** **DONE** — Orders UX + admin bulk gated. **FUA-10**

**Exit (product):** one order after retries; PDF/list/order match; unauthorized writes fail server-side. **Residual:** §5.3 fixture convert under approved authority.

---

## Batch 5 — Production, QC, delivery on released records

Batch 1 already: demos isolated; simulated delivery cannot complete ops paths.

- **UP-18:** Release coordinator; freeze qualified BOM, cut ledger, reservations, machine/settings versions; scans bind to released cut IDs. **FUA-11**
- **UP-19:** Reload QC acknowledgements; explicit new inspection; contextual back/next. **FUA-07**
- **UP-20:** Delivery queue on unit + approved QC; real evidence hashes/QR; server ack before status. **FUA-05/06**

Until a real machine protocol exists: labeled **manual production recording** only—never claim timer = CNC.

**Exit:** stale release refused; unknown scans rejected; Pause stops work; QC/Delivery survive refresh and reject stale revisions; fake evidence cannot complete delivery.

---

## Batch 6 — Reporting and usability

- **UP-21:** Command/Reports from authoritative jobs/inventory/events; freshness + unknown states; mock metrics labeled. **FUA-12/13**
- **UP-22:** Searchable lists, recovery CTAs, a11y dialogs, keyboard + Arabic RTL. **FUA-20** + initial a11y audit
- **UP-23:** Integrations as honest capability/setup (no fake SAP/Odoo until a connector contract). **FUA-20**

**Exit:** no green lies, NaN, or currencyless totals; keyboard/RTL can finish supported journeys.

---

## Audit finding disposition (FUA)

| Finding | Priority | Disposition |
|---|---|---|
| FUA-01 Readiness vs selection | P1 | **Closed** — Batch 1 / UP-01 |
| FUA-02 Stage order / CTAs | P1 | **Closed** — Batch 1 / UP-02 |
| FUA-03 Catalog / Stock vs Reports | P1 | **Reduced** — Batch 2 / UP-06, UP-09 (Stock≠catalog; Reports finite) |
| FUA-04 Empty pack “All Tuned” | P1 | **Closed** — Batch 1 / UP-03 |
| FUA-05 Delivery disconnected | P1 | **Closed** — Batch 5 / UP-20 (release + QC + server ack) |
| FUA-06 Delivery simulations | P1 | **Closed** — Batch 1 isolate + Batch 5 / UP-20 real evidence |
| FUA-07 QC ambient / clear-on-entry | P1 | **Closed** — Batch 5 / UP-19 reload |
| FUA-08 Quote not persisted | P1 | **Closed** — Batch 4 / UP-15 |
| FUA-09 Double tax on convert | P1 | **Closed** — Batch 4 / UP-16 |
| FUA-10 Dual Orders / admin | P1 | **Closed** — Batch 4 / UP-17 |
| FUA-11 Kiosk simulation | P1 | **Closed** — Batch 1 demos + Batch 5 / UP-18 release freeze |
| FUA-12 Reports NaN / inventory map | P1 | **Closed** — Batch 2 UP-09 + Batch 6 UP-21 (EGP + scoped badges) |
| FUA-13 Command static READY | P2 | **Closed** — Batch 6 / UP-21 (Available / Not recorded) |
| FUA-14 Customer / quick-link loss | P1 | **Reduced** — UP-11 customerId retain; full persist open |
| FUA-15 Pattern never applies | P1 | **Closed** — Batch 3 / UP-12 |
| FUA-16 Project BOM fallbacks | P1 | **Closed** — Batch 3 / UP-13 (+ UP-06) |
| FUA-17 Read flag skips persist | P1 | **Reduced** — Batch 3 / UP-11 local retain; always-on server still open |
| FUA-18 URL persona override | P1 | **Closed** — Batch 1 / UP-04 |
| FUA-19 Save status contradiction | P2 | **Closed** — Batch 3 / UP-14 (Revision loaded ≠ Saved) |
| FUA-20 Recovery / Integrations copy | P2 | **Closed** — Batch 6 / UP-22 search + UP-23 native Open links |

Initial public Fabrication Services findings (calculator / consultation / CTAs): **Closed** — UP-05.

---

## Required regression scenarios

| Scenario | Acceptance |
|---|---|
| Owner/project/position mismatch | Reject hydration/write; no cross-owner leak |
| Position switch during solver/save | Discard stale completion; keep selected pose |
| Change geometry / system / rules / settings | Invalidate BOM/optimize/release; keep audit evidence |
| Empty/unknown/custom catalog | Exact resolve or actionable block; no substitution |
| Stock intake retry/concurrency | Correct balance; one movement per request |
| Quote conversion retry/concurrency | One order; exact money/links/revision |
| QC refresh/revisit | Existing server approval visible; new inspection explicit |
| Delivery evidence failure | No fabricated proof; no delivered without ack |
| Offline/save error/session change | Truthful status; recoverable owned drafts |
| Desktop / tablet / RTL / keyboard | Project → recorded delivery with legible state |

After each batch: run `npm run test:batch1` plus new contract tests; lint/type-check/build; bounded staging E2E. Mocked unit tests do not prove RPC/RLS or machine behavior.

---

## Parallel tracks (not UP tickets)

| Track | Status | Note |
|---|---|---|
| Dependabot clearable pins | **Shipped** `a599c54` | Await Dependabot re-scan |
| braces CVE-2026-93687 | **Blocked** | No npm >3.0.3 |
| node-forge nested DigestAlgorithm | **Blocked** | 1.4.1 not on npm |
| Redis service provision | **Optional** | Honesty already fails closed |
| FP-028 ROCK60 live gates | **Blocked** on operator evidence | Must not invent formulas in Batch 2 |

---

## Rollout and recovery

Additive schema + reviewed backfills first. Keep record IDs and legacy URLs; redirect with context. Gate new writes by explicit capability flags. Staging → small workshop cohort → wider adoption after stock/quote/release reconciliation.

Rollback: disable new UI/write paths; retain acknowledged records and migration maps; never restore incompatible balances or erase audit evidence.

Metrics (no PII/secrets): hydration failures, blocked reasons, save ack latency, unresolved catalog IDs, stock reconciliation errors, duplicate conversions, stale solver results, approval/delivery rejection rates.

---

## Immediate next sequence

1. **§5.3 positive convert** on disposable Batch 0 (or dedicated) fixture: approved manufacturing authority → qualified BOM → durable optimize evidence → convert-to-order.
2. Complete release → QC → delivery + hardener approve/override/revoke audit; attach digests (Git / Vercel / Railway / migrations).
3. Live FINAL GOAL walk on almona02.com; raise Oct 9 scorecard live layer only with evidence.
4. Triage open follow-ons #76–#79; close superseded Phase PRs #54–#57 when owner agrees.
5. Keep FP-028 accuracy and Phase 6/7 (#59/#60) off the manufacturing critical path until live exit.

No delivery-date commitment until §5.3 convert and live FINAL GOAL evidence are attached.
