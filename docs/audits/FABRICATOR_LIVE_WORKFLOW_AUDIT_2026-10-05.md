# Live Fabricator end-to-end workflow audit

Date: 5 October 2026, approximately 22:58–23:10 Africa/Cairo. Target: https://www.almona02.com. Verdict: **FAIL — a successful manufacturing workflow through delivery cannot currently be completed with the designated fixtures.** The live test covered every stage's accessible surface and prerequisite gates; it did not manufacture a passing release, QC approval, order or delivery receipt.

## Scope and evidence

- Browser: actual production domain, normal application sign-in as disposable Owner A. Existing credentials entered only into ALMONA's sign-in form; remember-me disabled.
- Live API: normal password authentication for designated Owners A and B; owner-scoped Supabase REST reads and negative QC/delivery RPC calls. Credentials/tokens are not in the evidence output.
- Fixture A project `a2000000-0000-4000-8000-0000000000a1`; tested position `a3000000-0000-4000-8000-0000000000a1` (POS-R1).
- Fixture B project `b2000000-0000-4000-8000-0000000000b1`; position `b3000000-0000-4000-8000-0000000000b1` used for cross-owner rejection.
- Reproducible API checker: `scripts/audit-live-fabricator-fixtures.py`. Machine-readable results: `live-fabricator-fixture-audit.json` in repository root.
- Key browser screenshot captured for cross-owner rejection; DOM observations recorded in this audit. A captured screenshot is not a deployment digest.
- Only the disposable A POS-R1 was saved: R1 → R2 with sliding pattern, then R2 → R3 with fixed-window pattern; dimensions remained 1200 × 1400 mm. Fixture remarks identify the synthetic audit. No customer project was edited, no production completion was forced, and no receipt was fabricated. The fixture was retained for investigation; its original baseline revision is now changed.

## Stage results

| Stage | Live result | Outcome |
|---|---|---|
| Public estimate | 150 × 150 cm, standard UPVC, double glazing, casement, quantity one produced EGP 9,864 and preliminary-estimate wording | PASS for displayed estimate; no new consultation lead submitted |
| Sign-in and project list | Owner A authenticated; list contained only BATCH0-A, two poses; Owner B API has only its project/pose | PASS for scoped reads |
| Account/project context | Before a fixture pose was loaded, header retained previous user's project/customer/position; opening BATCH0-A combined its project ID with the old position ID in workflow URLs | FAIL: stale identity/privacy context |
| Measuring | Normal wizard accepted pattern/glazing and checked cut-size confirmation; save toast appeared, route moved to Design and revision advanced | PASS for save and handoff; save chrome inaccurate |
| Pattern validation | Sliding pattern saved at 1200 × 1400; Review BOM then rejected minimum 1500 × 1800 | FAIL in validation timing; recovered with suitable fixed pattern |
| Design | Fixed pattern reached Engineering Bay and Review BOM; layout and R3 persisted on full reload | PARTIAL: successful visual handoff, manufacturing authority absent |
| BOM | Fixed pattern produced an estimate (total EGP 517); Continue to Optimization disabled; no visible qualification action | BLOCKED: estimate is not a qualified manufacturing BOM |
| Stock | Shows three ROCK 60 catalog profiles with zero stock and USD pricing; owner's two live inventory fixture rows are not the displayed stock list; no revision acknowledgement control visible | FAIL: catalog-as-stock and missing live acknowledgement flow |
| Optimization | B005: approved catalogue version missing; approved manufacturing rule version missing | BLOCKED correctly; approval path not completed |
| Quote | O001: Optimization must complete before generating a quote | BLOCKED correctly; quote persistence, conversion and VAT retry not exercised |
| Orders | Empty owner Orders view, EGP 0.00, directs user to Commercial workspace | PASS for empty view; submit/cancel and quote conversion untested |
| Production | P002: optimization result required; qualified manufacturing BOM required | BLOCKED correctly; no release frozen |
| QC | UI and own-position RPC fail: approved dimensional tolerance rule unavailable; Approve & Complete disabled | BLOCKED: all three A/B seeded positions lack usable approved tolerance context |
| Delivery | UI blocks until authoritative release/evidence connected; negative RPC rejects missing photo hash | PASS for negative gate; successful delivery/QR/idempotency not exercised |
| Profiles | Turkish custom-profile creation form with Add First Profile; no owned-profile library visible despite A having two rows | FAIL against expected owned-library behavior |
| Reports | After hydration loads two owned profiles; embedded inventory value is `$ NaN`; top value USD 0.00; mock OEE 72.2% appears under Live data status | FAIL: finite-value/currency/source-scope behavior absent |
| Command | Engine cards still say READY; material alerts say all tracked profiles above minimum despite fixture's empty stock; job board says two jobs but all stage columns show zero | FAIL: readiness/alerts/status mapping incomplete |
| Reload | R3, dimensions and fixed layout survive; measuring shows Glazing type is required again; design readiness regresses after changing surfaces | FAIL: complete manufacturing input/readiness persistence |

## Owner isolation and schema checks

Both fixture logins returned 200. A sees one project, two positions and two profiles; B sees one project, one position and one profile. All six reciprocal cross-owner table reads return zero rows. All three cross-owner QC context requests return 403 / 42501, “position not found or not owned by inspector.” Owner A's browser deep link to B's fixture returns “Position was not found for this owner and project.” This verifies read/context isolation, **not** arbitrary release/quote write authorization.

Live quote, release and delivery tables are accessible under owner RLS; stock_movements.idempotency_key and orders.fabricator_pose_quote_id selects succeed. No fixture quote, release or delivery receipt exists. Negative delivery RPC calls for A and B return 400, “Photo evidence hash required,” without creating receipts. Schema presence confirms the pending-migration wording in older notes is stale; it does not prove every constraint, grant and RPC matches the checked-in definition.

## Prioritized findings

1. **P1 — Account switch retains former user's workspace/role context.** Fixture A initially showed old customer/position and an Admin badge. A full reload changed it to Customer. Project navigation mixed new project and stale position IDs. Clear owner-scoped caches and workspace stores atomically on auth change; gate workflow links until identity hydration succeeds. Server reads rejected the foreign position, but UI stale data remains a privacy and operator-error risk. Actual admin write privilege escalation was not tested or established.
2. **P1 — No complete qualified-BOM → stock → optimize path in this live fixture run.** Required approved catalogue/manufacturing authority and QC tolerance are missing. Provide an explicitly approved, fixture-compatible contract and tolerance setup plus the operator qualification path. Do not invent approval values to turn the test green.
3. **P1 — Stock uses catalog rows instead of owned workshop balances.** Reports proves the two owner rows exist while Stock displays three zero-balance catalog rows. Publish and verify the intended owned-inventory/acknowledgement implementation against this fixture after correcting its audited stock error handling.
4. **P1 — Save/reload loses required input/readiness.** Saved fixed layout/revision survives, but glazing validation fails again and Design/BOM readiness regresses across surfaces. Persist and hydrate the complete manufacturing input contract, keyed by owner/project/position/revision; verify a fresh browser session, not just in-memory navigation.
5. **P2 — Reports produces NaN and mixes currencies/mock metrics.** Apply finite cost mapping; show correct currency and source at each metric. Command alerts must derive from the same owned inventory.
6. **P2 — Save and validation feedback contradicts state.** Save toast/revision advance coexist with Unsaved/Not recorded chrome; invalid sliding dimensions are accepted by Measuring and rejected later. Align save acknowledgement and early pattern validation with downstream constraints.

The previous source audit also found weak direct release/quote reference ownership checks and false-success stock retry/sync handling. These remain source-level findings, not proven live exploit results. See `CURSOR_IMPLEMENTATION_COMPARISON_2026-10-05.md`.

## Required exit rerun

Fix account-context clearing and persistence first. Prepare the disposable fixture's approved catalogue/manufacturing authority and QC tolerance through the authorized approval process. Deploy the exact reviewed frontend/backend revisions and record their hashes. Then rerun: save/reload → qualified BOM → owned UUID stock intake/retry/availability → optimize → quote save/retry → convert once/no double VAT → owner order submit → revision-bound release → QC approval/reload → delivery with permitted real capture → receipt reload. Include cross-owner write rejection, stale revision rejection, altered retry payload rejection and failed-stock-sync rejection. Current negative gates must remain enforced.

Successful release/QC/delivery, genuine GPS/photo/signature capture, positive delivery retry, order conversion, stock intake and reservation writes remain **NOT VERIFIED**. Full happy-path completion is blocked by the specific product/data issues above; no acceptance percentage is assigned.

Final direct QC navigation after the foreign-position check showed “The requested position is not loaded. Open its production record before inspecting,” despite explicit own projectId/poseId query parameters and a stale own header. QC therefore also depends on prior workspace hydration; deep-link/reload recovery must be included in the exit rerun.
