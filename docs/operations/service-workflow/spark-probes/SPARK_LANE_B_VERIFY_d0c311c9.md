# Spark independent Lane B verification — d0c311c9 (manifest tip 8685aa55)

Independent verification of the Lane B job-only routine-pin implementation
against accepted contract `da4bcb4a` (bytes SHA-256 `806f90bd…`, unchanged at
this tip). Cursor's 28/28 disposable and 7/7 component results were treated as
supporting evidence only; every number below was executed by Spark.

## Bindings (all hash-verified)

| Item | Value |
|------|-------|
| Implementation | `d0c311c9cfc9a65bf67f85ee95b14946224d0a7b` |
| Manifest tip | `8685aa5510ce4ee804f1463511d619f9f41244b3` |
| Contract | `da4bcb4a`, bytes `806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed` |
| Migration | `supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql`, 29255 bytes, LF SHA-256 `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0` |

Binding choices (`LANE_B_BINDING_CHOICES.md`) reviewed against accepted policy:
all eight entries are non-policy resolutions (table/column names, trigger
placement, assert composition, RPC signatures, UI route, machine token mapping,
no visit write). No policy deviation found.

## Results by layer (kept separate)

| Layer | Result | Artifact |
|-------|--------|----------|
| Serial disposable RB battery (S-01..S-23 + S-11b) | **24/24 PASS** | `spark_lane_b_serial.py`, `spark_lane_b_fixtures.sql`, `spark_lane_b_serial_results.json` |
| Concurrency battery (LB-C1 + RB-13, separate) | **6/6 PASS** | `spark_lane_b_concurrency.py`, `spark_lane_b_concurrency_results.json` |
| Component (Lane B new: API + pin panel + mount) | **7/7 PASS** (independent re-run) | repo suites at freeze tip |
| Component regression (Lane A API/panel/route neighbors) | **17/17 PASS** | repo suites at freeze tip |
| Contract guard (bytes + frozen DETAILs + RB rows + LB-C1 clause) | **5/5 PASS** | `src/tests/constitutional/ServiceRoutinesLaneBPinContract.test.ts` |
| Real browser journey (B-01..B-13) | **13/13 PASS** | `spark_lane_b_browser.py`, `spark_lane_b_browser_fixtures.sql`, `spark_lane_b_browser_results.json` |

Serial coverage: RB-01 (admin + support), RB-02 (null + blank reason),
RB-03 (draft + in_review), RB-04 (RPC-retired), RB-05 (+ R3-on-ZZ9 positive
control), RB-06 (unlinked + uncatalogued + uncertain), RB-07 (pin stays V1
after V2 publish), RB-08 (history linkage + audit), RB-09 (unpin audit),
RB-10 (all three ops locked), RB-11 (abort/reassign/cancel keeps boundary),
RB-12, RB-14, RB-15 (incl. authz-before-state ordering), RB-16
(customer + sales), RB-17 (metadata-only tech read; customer + out-of-scope
tech denied; no payload/section/content keys), RB-18 (readable + retired
badge; new pin denied), RB-19, RB-20 (INSERT/UPDATE/DELETE denied; RLS select
scoped), boundary-clear bypass probes (jobs + visits writes denied),
denied-write audit rollback, empty-`get_` lock reflection.

Concurrency: C-1 (3 concurrent replaces, distinct targets: 3/3 ok, exactly
one active), C-2 (pin-vs-retire race: valid outcomes only), C-2b (reverse
order: pin lands, readable post-retire), C-3 (20 pin-vs-start rounds: all
valid), C-3b (delayed-start rounds: pins win validly), C-4 (6 same-target
replaces: one active S2, no cardinality violation). Worst worker 0.056s;
no 40001-class or non-explicit error anywhere.

Browser (real headless Chromium, real Auth/PostgREST, full 110-migration
chain, Vite): admin pin V1 + persistence, exact draft-replace error
(`routine_pin_version_not_published`), support replace V2, support schedules
visit, attending tech starts visit (B3 rule: staff cannot substitute the
start acknowledgment), stale-window replace denied exactly
(`routine_pin_locked_after_start`), lock banner + V2 after reload, boundary
set + `pinned_routine_version_id` still NULL (no dual-write) + exact audit
pair, tech read-only, customer sees no pin content.

## Environments (isolated, local only)

- Disposable: scratch PostgreSQL 17 (`laneb`), manifest apply sequence
  (routines base + Lane B deps + Lane A + STG-01 + Lane B). Fixture setup adds
  the B1 production read shape (`GRANT SELECT ON service_jobs,
  service_job_visits TO authenticated`) which the disposable deps stub omits;
  without it the pin SELECT policy cannot evaluate for any authenticated
  caller. No product file was modified for this.
- Browser: isolated project `almona-lane-b-local` (API/DB/Studio/Mailpit on
  54521–54524), full 110-migration chain applied with zero errors, synthetic
  users only, Vite on 127.0.0.1:3005. Running Lane A / default stacks were not
  touched. Secrets live only in scratch, never in this commit.

## Observations (non-blocking, no defect claimed)

1. Lock banner requires refetch: after visit start, an already-open pin panel
   keeps cached controls until reload/refresh; the server lock is immediate
   (stale-window Replace is denied exactly). UI is eventually consistent;
   server is authoritative.
2. Replace/unpin with no active pin is denied `22023/routine_pin_cardinality`.
   The contract is silent here; recorded as implementation-defined behavior.
3. Visit start binds the attending technician (B3 rule preserved end to end:
   staff schedule, tech starts, boundary freezes pins).
4. Browser runner takes all credentials from `LANE_B_*` env vars; fixtures use
   synthetic `@local.test` users.

## Limitations carried

- Disposable visit transitions are direct owner writes (B3 RPCs are outside
  the disposable chain); the freeze trigger path is identical. Full-chain
  browser journey covers the real B3 start path.
- Out-of-scope *support* read scoping is not separable in disposable (stub
  grants support blanket read scope); production `can_read_ticket_workflow`
  governs.
- No staging, merge, production, or FR-1 changes were made or authorized.

Verdict: Lane B implementation **PASS** at `d0c311c9` (manifest tip
`8685aa55`) for local authorization scope. Staging acceptance NOT TESTED.
