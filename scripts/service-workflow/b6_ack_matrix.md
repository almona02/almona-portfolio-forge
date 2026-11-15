# B6 acknowledgment/closure verification matrix (Spark independent)

Status: RE-CLOSE-AUTH CORRECTION `3e387199dcca327a218e8371e24ee69310e55bf4`
(docs stamp `585b0281`) EXECUTED. Verdict: **STILL BLOCKED on F-B6-09
alone** — F-B6-08 verified fixed (Q6-44 + full-matrix Q6-47 green);
the race-ordering defect is unchanged. No staging/prod apply. Evidence:
`spark_b6_battery.sql` (Q6-01..Q6-47) + `run_spark_b6e.py` (R6-C1..C5),
this directory. Prior verdicts preserved: freeze BLOCKED at `ed22ad03`,
correction BLOCKED at `b6500999`, integrity BLOCKED at `4c045f51`.

## Re-close-auth binding (3e387199)

- New migration: `.../20261115171100_service_workflow_b6_f_b6_08_reclose_auth.sql`
  (clean-apply PASS; B6/B6FIX/B6INT byte-identical to `9998f1a4`; all 18
  pre-B6 files byte-identical to B5 acceptance `2a4042ad`).
- Auth (resolver → admin/support pass, technician scope + explicit
  idempotent denial, else 42501) now precedes the idempotent return.
- Verified: Q6-44 PASS; Q6-47 full matrix PASS (support/admin/delegated
  service-role succeed with zero mutation; owner, assigned + unrelated
  tech, sales, anon, forged, unattributed service-role denied, no
  payload, no mutation); Q6-41/42/43 green; R6-C1..C4 green.
- Regressions: B5 40/40, B4 27+3 known/0 unexpected, B3 51/51,
  B1/B2 72+4 DEFER. Vitest: closure 5/5 + ack 3/3 (no src changes).
- Cursor B6-01..16 16/16 reproduced; Cursor's modified Spark-named copy
  44/44 on a separate DB (their run, their file — see attribution).

## F-B6-09 (BLOCKED, unchanged at 3e387199)

- Affected operation: `effective_acknowledgment` /
  `effective_acknowledgment_disposition` winner selection when two
  responses race (distinct txn-start timestamps).
- Reproduction: barrier-synchronized accept-vs-refuse race (R6-C5).
  Observed at `3e387199`: 1 of 3 rounds BAD (effective ≠ max-seq row);
  at `9998f1a4`: 2 of 3 BAD. Concrete rows (standalone repro): refused
  (.660413, seq 1) beat accepted (.620688, seq 2).
- Expected: effective follows the defined serialized order (`event_seq`,
  allocated under per-ticket advisory serialization). Observed: winner
  follows txn-start `now()` because `responded_at` outranks `event_seq`.
- Present at `3e387199`: YES — correction was F-B6-08-only; ORDER BY
  untouched. Identifier is neither a mistake nor a duplicate.
- Blocking: YES — violates the approved integrity requirement
  (deterministic acknowledgment including concurrent competing
  responses; seq must reflect the defined serialized order). The
  effective response feeds closure gates; a race can settle the wrong
  response. Fix: order by `event_seq` first, or stamp `responded_at`
  at serialization time. Narrow, no redesign.

## Authorship (B6_3e387199_SPARK_RESULTS.md is NOT Spark's)

- Spark did NOT execute or author that file or the "SHA-bound Spark
  PASS" stamp message. It is Cursor supporting evidence, mislabeled.
- Proof: it cites runner `run_spark_b6c.py` and "Q6-01–Q6-44", but
  Spark's harness at `4c045f51` is Q6-01–Q6-46 + R6-C5 under
  `run_spark_b6d.py`; its Q6-44 detail string matches neither Spark's
  Q6-44 format. Cursor's Spark-named battery copy is Spark's work
  minus Q6-45/Q6-46 plus a rewritten Q6-44 (184 differing lines).
- This matrix status + Spark's review message are the only
  independently authored SHA-bound verdict on `3e387199`. Neither
  agent's files were overwritten.

## Integrity verdict (9998f1a4, preserved)

Previous verdict was **STILL BLOCKED** on F-B6-08 + F-B6-09. F-B6-08 is
fixed at `3e387199` (see above); F-B6-09 is unchanged (see above). All
other prior fixes remain green.

## Integrity correction binding (9998f1a4)

- New migration: `.../20261115171000_service_workflow_b6_integrity_targeting.sql`
  (clean-apply PASS; B6/B6FIX byte-identical to `0b07aa8d`; all 18
  pre-B6 files byte-identical to B5 acceptance `2a4042ad`).
- `event_seq` (sequence default, NOT NULL, backfilled) added to acks +
  dispositions; effective getters order by (responded_at, event_seq, id);
  prereqs return structured `entity_id` (revision/job/visit/ticket ids);
  re-close/re-resolve return early with preserved timestamps, no audit.
- UI uses `entity_id` only (no prose parsing, no head fallback;
  missing → null → disabled). Stale ids fail safely server-side
  (F-B6-03/refused guards).
- Verified: Q6-41 10/10 ties (seq decides), Q6-42 closed_at kept + no
  dup audits, Q6-43 closure-bomb rollback, Q6-45 entity_id exactness
  (2-head + job), Q6-46 seq monotonic across rollback gaps, prior
  Q6-11/13/17 green, races R6-C1..C4 green, Cursor B6-01..16 16/16
  reproduced, Cursor-7 file 7/7 on a separate DB (see attribution).
- Regressions: B5 40/40, B4 27+3 known/0 unexpected, B3 51/51,
  B1/B2 72+4 DEFER. Vitest: closure 5/5 + ack 3/3; independent
  entity_id probe 3/3 (rev-B via entity_id with no prose token;
  missing → disabled/RPC never called; stale → server denial
  surfaced; probe removed after run).

## New findings (BLOCKED)

- F-B6-08: idempotent re-close returns the full ticket row to unauthorized callers
  BEFORE role checks (govern :298-301 precedes :313-329). Q6-44:
  owner + unrelated-tech re-close SUCCEED (should be 42501). Fix: run
  authorization before the idempotent return.
- F-B6-09: concurrent competing acks resolve by txn-start `now()`,
  not serialized seq order — `responded_at` outranks `event_seq`.
  R6-C5 1/3 (eff≠max-seq twice). Concrete race: refused
  (.660413, seq 1) beat accepted (.620688, seq 2) — the
  serialization winner lost. Fix: order by `event_seq` first (it
  reflects per-ticket advisory serialization), or stamp
  `responded_at` at serialization time.

## Attribution (reconcile, no overwrite)

- Cursor's `scripts/service-workflow/spark_b6_battery.sql` (275 lines,
  7 checks) + `run_spark_b6.py` (182 lines) are Cursor-authored and
  must be relabeled as Cursor's targeted supporting suite — they are
  NOT Spark's unchanged Q6-01..Q6-46 battery (1171 lines @ `b6500999`
  + extensions here). Same filename + `spk6_eval` table + overlapping
  Q6-11/13/17 IDs: "Spark harness 7/7" is not equivalent to the
  independent battery. Executed separately above (7/7 green) without
  touching Spark's evidence. Neither agent's files were overwritten.
- `9998f1a4` message says "docs" but carries the full runtime
  correction — mislabeled; tested SHA is as directed. Docs tip
  `ed6627c5` is docs-only on top.

## Correction verdict (0b07aa8d, preserved)

Previous verdict was **STILL BLOCKED** on F-B6-06 (tie ordering) +
F-B6-07 (re-close side effects). F-B6-07 is fixed at `9998f1a4`;
F-B6-06 is fixed for ties but superseded by F-B6-09 for races (see
above). All five F-B6-03/04/05 + UI-01/02 fixes remain green.

## Correction binding (0b07aa8d)

- New migration: `supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql`
  (clean-apply PASS; B6 migration byte-identical to `ec00b692`; all 18
  pre-B6 chain files byte-identical to B5 acceptance `2a4042ad`).
- Server: F-B6-03 guard (effective ∈ {NULL, unavailable}), F-B6-04
  ack-bound disposition lookup in the gate, F-B6-05 distinctness by
  (attempted_at, channel), `id=<uuid>` in ack prereq details.
- UI: staff-entered attempt rows (datetime-local + channel + outcome,
  ≥3 complete, nothing invented), head-aware targeting (parsed `id=` +
  head-state fallback, null-safe with disabled buttons + toast).
- Q6-11/13/17 now PASS (Q6-17 required a backdate fix: same-txn ties
  made the unfixed effective a coin flip — itself F-B6-06 evidence).
- Cursor battery 12/12 reproduced (B6-10/11/12 new); Cursor panel tests
  9/9 green; independent disposable 2-head probe 2/2 (rev-B targeted
  with entered values; missing target → disabled, RPC never called;
  probe removed after run).
- Races R6-C1..C4 4/4; regressions B5 40/40, B4 27+3 known/0
  unexpected, B3 51/51, B1/B2 72+4 DEFER; Q6-43 closure-bomb PASS (new
  coverage: resolve/close fully rolls back on audit-write failure).

## New findings (BLOCKED)

- F-B6-06 (integrity): effective-ack ties still break by random id —
  Q6-41 last-writer-wins 5/10 then 7/10 across runs (coin flip), while
  reads-given-rows are stable. A tie can even flip gate outcomes
  (observed in Q6-17 pre-fix run). Required: insertion/commit-ordered
  tiebreak (sequence or equivalent), deterministic across writers.
- F-B6-07 (integrity): re-close rewrites `closed_at` and appends
  duplicate workflow + governance audits (Q6-42: wf=1/2 gov=1/2).
  Required: idempotent re-close preserves `closed_at` and emits no
  duplicate closure event.

## Observations (correction)

- UI parses `id=` from human-readable detail text (anchored 36-hex +
  state fallback + null-safe). Acceptable; a structured `revision_id`
  column would be cleaner in a future slice (task preference noted).
- `new Date(invalid).toISOString()` in `buildContactAttempts` runs
  outside try; datetime-local inputs constrain this in practice.
- Distinctness key uses session-TimeZone `v_ts::text` — same instant in
  different zone spellings still collides correctly (same timestamptz).

## Freeze verdict (ec00b692, preserved)

Original freeze verdict was **BLOCKED** — 3 server findings (F-B6-03,
F-B6-04, F-B6-05) + 2 closure-panel UI findings (F-B6-UI-01, F-B6-UI-02).
All five are now verified fixed at `0b07aa8d` (see above).

## Freeze binding (ec00b692)

- Migration: `supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql`
  (773 lines; clean-apply PASS on untouched chain; all 18 pre-B6 chain
  files byte-identical to B5 acceptance `2a4042ad`; B1/B2 pins match).
- RPCs: `record_service_acknowledgment` (owner accepted/refused, :208),
  `record_service_acknowledgment_unavailable` (staff + contact evidence,
  :280), `record_acknowledgment_disposition` (staff, refused-only, :346),
  `effective_acknowledgment` (B1 invoker-rights + RLS, B1:562),
  `effective_acknowledgment_disposition` (invoker-rights + RLS, B6:82),
  `evaluate_ticket_workflow_prerequisites` (DEFINER, :420),
  `assert_ticket_workflow_allows_resolve_close` (:570),
  `govern_ticket_transition` 5-arg + 4-arg (unchanged signatures, :608/:731).
- Bound semantics: ownership-based ack (sales-role owners allowed via
  RPC, fail-closed in UI); unavailable = admin/support + ≥3 attempts
  (1 issue notification + 2 follow-ups, attributable); disposition binds
  `acknowledgment_id` at record time; summary mandatory (blank-blocked)
  on resolve/close for activated tickets; legacy jobless closes without
  summary; closed terminal vs exits, same-state re-close FSM-idempotent.
- R6→Q6 mapping: R6-01→Q6-01, R6-02→Q6-04, R6-03→(code-verified:
  `assert_revision_is_issued` denies unissued; ack RPC :237), R6-04→Q6-04,
  R6-05→Q6-05, R6-X1→Q6-07, R6-X2→Q6-08, R6-X3→Q6-09 (service_role
  REVOKED on writers — delegation intentionally unavailable),
  R6-X4→Q6-37, R6-X5→Q6-39/Q6-40, R6-X6→Q6-34 (+observation: revision-ID
  existence oracle, negligible), R6-06→Q6-18/Q6-19, R6-07→Q6-18/R6-C2
  (append wins; tie-break observation below), R6-08→Q6-25/Q6-16,
  R6-09→Q6-14/Q6-15, R6-10→Q6-10/Q6-11/Q6-12, R6-11→Q6-21 (follow-up-job
  path; same-job post-issue correction impossible by B4/B5 terminal
  guards — confirmed by Cursor B6-03's own fixture comment), R6-12→Q6-26,
  R6-13→Q6-24/Q6-26/Q6-27/Q6-28/Q6-29, R6-14→Q6-26 (optional-flag tamper:
  direct job UPDATE denied for clients per B2 protected-columns trigger
  — retained B2 evidence, not re-probed), R6-15→Q6-30, R6-16→Q6-22..Q6-25,
  R6-17→Q6-22/Q6-32, R6-18→retained Slice0/B1 evidence (no B6 change to
  ticket status trigger), R6-19→side-door inventory: `create_service_job`
  (resolved→in_progress add-back only; closed/cancelled denied),
  `govern_ticket_transition` (assert+summary), no other writer reaches
  resolved/closed; R6-20→Q6-32 (no reopen defined; closed terminal),
  R6-C1/R6-C2/R6-C4→runner as written. R6-C3 (issue-vs-ack)
  inapplicable-as-written — same-job post-issue N+1 cannot exist (B4/B5
  terminal guards); replaced by unavailable-vs-resolve race (ordering
  coherence) + Q6-21 per-head isolation. R6-C5 close-vs-close: NOT RUN
  (same-state idempotent re-close makes "single audit" inapplicable;
  recorded, not failed). R6-21→Q6-33, R6-22→(same atomicity
  shape as Q6-33; closure path shares `workflow_audit` call — NOT
  separately bombed), R6-23/R6-24→code-verified (ack/close RPCs write
  only ack/disposition/audit rows), R6-25→Q6-22 (RTS note in closure
  audit) + UI disclaimers.

## Executed results (disposable, port 55450, cluster removed)

- SPARK B6: 37/40 PASS. FAILs: Q6-11 (dup-follow-up accepted → F-B6-05),
  Q6-13 (unavailable overwrote accepted → F-B6-03), Q6-17 (stale
  disposition satisfied fresh refusal → F-B6-04).
- Races: R6-C1..C4 4/4 PASS (idempotent accept race 1 row/1 audit;
  accept-vs-refuse 2 rows/2 audits; unavailable-vs-resolve coherent;
  job-create-vs-close exactly-one-winner; no 40P01).
- Cursor B6 battery executed independently: 9/9 PASS (reproduced).
- Regressions: B5 40/40; B4 27 + 3 known drifts, 0 unexpected;
  B3 51/51; B1/B2 72 + 4 DEFER, 0 fail.
- Vitest: B6 files 6/6; B6+review+route subset 14/14 (claim reconciled);
  broader B5+B6 UI run 21/21. None cover the two-head unavailable path.
- Disposable UI probe (2-head fixture, since removed): unavailable
  targeted the ACCEPTED head rev-A with fabricated
  [issue_notification, phone, email] attempts → F-B6-UI-01 + F-B6-UI-02.

## Findings (BLOCKED)

- F-B6-UI-01 (blocker): closure panel fabricates contact attempts
  (`TicketWorkflowClosurePanel.tsx` `contactAttempts()`, :101-126):
  one click invents notification+phone+email with backdated timestamps,
  violating the contact policy's genuine-evidence rule. UI must collect
  real attempts (or derive from a notification log).
- F-B6-UI-02 (blocker): unavailable + disposition target
  `issuedHeadsQuery.data[0]` regardless of which head is outstanding/
  refused (:95-99, :159-169). Multi-head: unavailable overwrites the
  wrong head (incl. a real acceptance); disposition fails closed
  server-side (confusing). Panel must resolve head-per-failure.
- F-B6-03 (server, moderate): staff unavailable overwrites customer
  accepted/refused (no current-state guard, :313-321). Required fix:
  allow only when effective ∈ {NULL, unavailable}.
- F-B6-04 (server, moderate-high): closure gate ignores the
  disposition→ack binding (:528-544): refused→disposed→re-refused
  closes on the stale disposition. Required fix: require
  `v_disp.acknowledgment_id = v_ack.id`.
- F-B6-05 (server, minor): validator enforces 1+2 counts but not the
  policy's distinctness (same timestamp+channel twice counts), :189-201.

## Observations (non-blocking)

- Tie-break: same-`responded_at` acks order by random id (R6-C2, Q6-13
  note); documented rule, but winner need not be last writer.
- Re-close rewrites `closed_at` + appends audit (FSM-idempotent, Q6-32).
- Owner direct-SELECT/getter sees full contact_attempts (RLS
  staff+owner); customer UI shows response+comment only — accepted.
- Revision-ID existence oracle before ownership check (unguessable
  UUIDs — negligible); `validate_unavailable_contact_attempts` and the
  disposition trigger lack `SET search_path` (ambient DEFINER path
  applies — hardening only); future timestamps / arbitrary-UUID
  `by_actor_id` accepted (shape-only attribution).
- Post-issue correction on the same job is impossible (B4 submit +
  B5 review terminal guards); new issued heads arrive via follow-up
  jobs — consistent with the contact policy + Cursor B6-03.
- Share INSERT grant absent in the disposable reduced chain
  (pre-existing harness artifact; Q6-36 seeded as owner; live share
  creation is Slice0-verified scope).

---

## Original prepared matrix (pre-freeze text retained below)

## Scope contract (bind exact names at freeze)

- Source: supervisor's 11 B6 areas + spec
  `docs/specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md` §5.1 ticket
  lifecycle (Resolve requires all jobs resolved + report(s) issued; Close
  from resolved), §5.5/§8 report rules (issued immutable; RTS authorization
  is a separate decision from acknowledgment and closure), Slice 0 lock-in
  (ack ∈ {accepted, refused, unavailable}; refusal/unavailability recorded,
  does not automatically block every closure when policy allows), B1
  `service_acknowledgments` DDL (append-only events; effective response =
  latest by (responded_at, id); response CHECK; FK to issued revision).
- Roles in scope: admin / support / technician / customer(owner) /
  sales_rep / anon+share. Acknowledgment is the OWNER's act on own issued
  revisions; staff may record unavailable with evidence (bind exact
  recorder rule at freeze). Closure is a governed staff-or-owner act per
  the existing ticket FSM — bind the B6 role mapping at freeze; do not
  require a new role.
- "Optional jobs": bind the exact flag/meaning at freeze
  (`create_service_job` carries a boolean today). Expected semantics:
  optional jobs never block closure; active (non-optional, non-terminal)
  jobs do. A flag that silently exempts active work is a defect, not a
  feature — test the boundary, not just the label.
- Refusal disposition + unavailable evidence: bind exact B6 rules at
  freeze. Minimum assertions hold regardless (R6-08..R6-11 below): refused
  grants no closure credit; unavailable without its required evidence is
  denied; both are recorded as first-class ack events, never silent.
- Follow-up linkage for refused/unavailable (new visit/job) is expected
  workflow behavior; if B6 ships responses without linkage, mark DEFER
  with evidence, never PASS.
- Fixture path: governed B2 assign → B3 safety + visit start/complete →
  B4 submit → B5 review/issue, then B6 ack/close. No privileged fixture
  writes except where a test explicitly says so.

## Evidence standard (every test)

- Assert PERSISTED state (rows, counts, ticket/job states, effective ack),
  not error text. Denials may return zero rows instead of raising.
- Every mutation test also checks `service_workflow_audit`: exactly the
  expected row(s), or zero rows on denial/rollback.
- Every test names: actor, setup, action, expected persisted result,
  evidence queries. PASS / FAIL / NOT TESTED only; no inferred passes.

## A. Own-issued acknowledgment + cross-owner denial

- R6-01 owner accepts own issued revision: actor ticket owner. Setup:
  rev N issued on own ticket. Action: acknowledge accepted. Expected:
  succeeds; exactly one ack row (response accepted, responded_by owner,
  issued_revision_id N); effective ack = accepted; audit row.
- R6-02 cross-owner ack denied: actor owner of ticket A. Action: ack a
  revision issued on ticket B. Expected: denied; zero ack rows for B's
  revision; zero audit.
- R6-03 ack on unissued revision denied: actor owner. Setup: rev N+1
  submitted but undecided. Action: ack rev N+1. Expected: denied even
  though caller owns the ticket (only ISSUED revisions are acknowledgable);
  zero rows.
- R6-04 non-owner roles denied: actors unrelated customer, sales_rep
  (non-owner), anon. Action: ack any issued revision. Expected: denied;
  zero rows. (Staff recording rules bind at freeze; staff-as-owner-proxy
  without an explicit unavailable path is denied.)
- R6-05 technician cannot ack: actor attending tech (author). Expected:
  denied; authorship grants submit/revise rights, never acknowledgment.

## B. Actor injection + trusted delegation (every new B6 RPC)

- R6-X1 anonymous injection: unauthenticated call / spoofed actor id.
  Expected: denied; no payload; no writes; no audit.
- R6-X2 authenticated forged actor: caller A with actor id = B. Expected:
  denied; no writes; no audit.
- R6-X3 verified service-role delegation: service_role + valid actor id
  succeeds where the B4/B5 pattern allows; missing actor denied;
  forged actor denied.
- R6-X4 hosted grants: anon EXECUTE denied on all new B6 RPCs;
  adversarial anon re-grant still denied at body level.
- R6-X5 no bypass path: ack/closure-controlled state changes ONLY via
  governed RPCs; direct INSERT/UPDATE/DELETE on acks denied for ordinary
  callers (incl. staff roles); safe search_path; no GUC/owner backdoor
  reachable by clients.
- R6-X6 auth before state disclosure: unrelated callers cannot
  distinguish ack states (unacknowledged vs refused vs accepted) or
  closure eligibility via error shape; denial precedes state checks.

## C. Append-only / idempotent / conflicting retries

- R6-06 repeat identical ack idempotent: same owner, revision, response.
  Expected: success; exactly ONE ack row; exactly one ack audit (or the
  documented idempotent shape — bind at freeze; the no-duplicate
  assertion holds regardless).
- R6-07 conflicting retry on same revision: accepted then refused (or
  reverse) by the same owner. Expected: per append-only DDL, the second
  response is RECORDED as a new event (history preserved) and the
  EFFECTIVE response becomes the latest by (responded_at, id) — OR the
  B6 contract explicitly forbids response changes, in which case denied
  cleanly with zero new rows. BIND AT FREEZE; whichever rule, assert it
  holds uniformly: no silent overwrite, no lost history, effective value
  unambiguous. Record which semantic the freeze implements.
- R6-08 refused ack grants no closure credit: setup: issued rev with
  effective response refused. Action: attempt closure paths that require
  acceptance. Expected: denied while refused is effective (unless the
  B6 contract names an explicit refusal-disposition override — bind at
  freeze; an undocumented override is a defect).
- R6-09 refusal disposition recorded: actor owner refusing with the B6
  required disposition (reason/follow-up choice — bind exact fields at
  freeze). Expected: ack row + disposition persisted; ticket/job state
  reflects "refused, follow-up due" rather than silently open. Missing
  required disposition → denied.
- R6-10 unavailable requires evidence: actor recording unavailable
  (bind recorder: owner and/or staff). Setup: no qualifying evidence.
  Action: respond unavailable. Expected: denied. With qualifying
  evidence attached/referenced: succeeds; evidence link persisted on
  the ack event. An unavailable response with no evidence anywhere is
  FAIL either way.
- R6-11 new issued revision starts unacknowledged: setup: rev1 issued +
  accepted; correction rev2 submitted + issued. Expected: rev2 has ZERO
  ack rows; effective ack for rev2 is empty (must re-acknowledge); rev1's
  ack rows intact and still attached to rev1. Any inheritance/copying of
  rev1's ack onto rev2 is FAIL.

## D. Named multi-job closure prerequisites

- R6-12 all-jobs prerequisite enforced: setup: ticket with job1
  completed/closed-path-ready and job2 active. Action: close/resolve.
  Expected: denied; ticket state unchanged; denial names (or audit
  records) the blocking job/prerequisite — bind exact surfacing at
  freeze, but "denied with no attributable cause" is FAIL.
- R6-13 per-job prerequisite list honored: for EACH named B6 closure
  prerequisite (bind the list at freeze — expected shape: job terminal,
  reports issued, no FWR outstanding, ack per policy, no outstanding
  visits), construct a fixture violating exactly that one item.
  Expected: closure denied in every case; fixing the single item (and
  only that item) unblocks. One passing item must not mask a failing one.
- R6-14 optional jobs don't block; active work does: setup: job1
  optional + non-terminal, job2 active + complete-ready (all else met).
  Action: close. Expected: succeeds (optional ignored). Counter-setup:
  job1 active + non-terminal. Expected: denied. Also: flipping a job's
  optional flag as an ordinary caller is denied or audited (bind at
  freeze) — silent re-flagging to force closure is FAIL.
- R6-15 legacy jobless tickets still close: setup: B2-style jobless
  ticket (no jobs; legacy/inactive, never opted in). Action: governed
  close. Expected: succeeds under pre-B1 rules (no job prerequisites
  applied); no spurious "missing job" denial; audit coherent. Both
  legacy and never-activated shapes tested.

## E. Every resolve/close path + direct-write bypass

- R6-16 resolve path: eligible ticket → governed resolve succeeds;
  ticket resolved + audit with from/to states; ineligible ticket →
  denied with states unchanged.
- R6-17 close path: resolved ticket → governed close succeeds + audit;
  closing a non-resolved ticket (open/assigned/in_progress/
  awaiting_review) → denied.
- R6-18 direct status UPDATE denied: actors customer, tech, support,
  admin as ORDINARY callers. Action: direct UPDATE of ticket status to
  resolved/closed (and job state to completed/resolved). Expected:
  denied; rows unchanged. (Service-role/trusted-backend boundary tested
  separately per the retained B1/B2 threat model — ordinary-client
  exploitability is the bar here.)
- R6-19 no side-door transitions: enumerate every RPC/function that can
  write ticket status or job terminal states at the freeze (schema
  inventory, not just the handoff list). Expected: each path enforces
  the same prerequisites; any path reaching resolved/closed/completed
  without them is FAIL, including admin/support-only paths.
- R6-20 return/reopen after close (if B6 defines it): bind at freeze.
  If defined: reopen requires rationale + audit, restores a truthful
  non-closed state. If undefined: closed stays terminal; direct
  reopen UPDATE denied. Either way, no silent state resurrection and
  no history loss.

## F. Concurrency (barrier-synchronized, runner)

- R6-C1 concurrent identical acks: same owner/response twice at once.
  Expected: both succeed; exactly one ack row; one audit (idempotent
  under race); no 40P01.
- R6-C2 conflicting concurrent acks: accepted vs refused same revision
  at once. Expected: coherent append-only outcome per the R6-07 rule
  (both recorded with deterministic effective-latest, or exactly one
  wins with clean denial); no lost event; no ambiguous effective value.
- R6-C3 issue-vs-ack race: staff issues rev N+1 while owner acks rev N
  (or N+1 pre-issue). Expected: each call judges the state it locked;
  ack on unissued-at-commit denied; ack on issued recorded; no ack
  attached to the wrong revision; no 40P01; audit matches final state.
- R6-C4 job-create-vs-close race: staff creates a job on the ticket
  while owner/staff closes it. Expected: exactly one coherent outcome —
  close wins (new job denied on closed ticket) or job wins (close
  denied/rechecked with the new job in scope). A close that silently
  ignores a concurrently created active job is FAIL.
- R6-C5 close-vs-close race: two close attempts at once. Expected:
  exactly one terminal transition; single closure audit; loser gets a
  clean already-closed/idempotent response; no duplicate audits.

## G. Atomic audit rollback + safety restrictions unchanged

- R6-21 audit failure rolls back ack: inject audit-write failure, then
  ack. Expected: FULL rollback — zero ack rows, no state change.
  "Persisted:false after successful mutation" is FAIL (Slice 0 rule).
- R6-22 audit failure rolls back closure: same injection, then
  resolve/close. Expected: ticket state unchanged, zero closure audit,
  zero partial rows.
- R6-23 ack performs no safety/job/visit writes: after any ack
  (accepted/refused/unavailable), assert: zero safety-check rows
  created, zero visit/job state changes, zero RTS artifacts. Ack is a
  customer voice, not a work action.
- R6-24 closure performs no safety fabrication: after close, assert no
  safety records created/modified, no invented attestations, no visit
  completion side effects. Closure never manufactures a safe state.
- R6-25 RTS stays separate: setup: ack accepted + ticket closed.
  Expected: NO return-to-service authorization exists unless the
  explicit RTS decision was recorded through its own governed path.
  Ack and closure grant zero RTS credit; assert the RTS record (or its
  absence) directly, not via status inference.

## Regressions at freeze (counts bound then)

- B5 disposable battery (40/40) + B5c correction checks + B5 races,
  unchanged.
- B4 battery file checks with the three documented non-blocking drifts
  (Q4-07c B4FIX behavior, Q4-23 B5 scope, Q4-30 B4FIX policy text).
- B3 (55/55) + B1/B2 (72 + 4 DEFER) full batteries.
- Any B6 migration touching B1–B5 objects requires the preflight-compat
  treatment (existing-row audit before new constraints; no invented
  declarations to make old rows pass).
- B6 staging (when authorized later) re-proves evidence downloads,
  cross-ticket isolation, and the browser ack/close journey; disposable
  concurrency evidence is retained, never claimed as live.
