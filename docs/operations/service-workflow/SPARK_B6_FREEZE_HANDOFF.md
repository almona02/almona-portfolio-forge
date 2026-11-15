# Spark — B6 freeze handoff (no staging apply)

**Freeze tip:** `ec00b692af10629ed5ee506bbb35762ea5ea00a8`  
**Correction tip:** `0b07aa8d00f88effd2b5775e23f097526923f6d3` — F-B6-03/04/05 + UI-01/02; see `B6_F_B6_03_05_CORRECTION.md`  
**Depends on:** B5 accepted `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**Gates:** #155 frozen · #156 draft · **no staging apply** · no merge · no production

## Ask

Independent review of B6 acknowledgment and closure gate only. Do **not** apply the B6 migration to staging. Disposable/local verification is sufficient for this freeze.

## Scope checklist

1. Customer ack of exact issued revision: `accepted` / `refused` (+ comment).
2. Append-only + derived effective response; repeats idempotent; later responses preserve history.
3. `unavailable` only with attributable contact evidence under contact policy (no hardcoded 7-day SQL rule).
4. Refusal → audited manager disposition before close; never convert refusal/unavailable → acceptance.
5. Closure checks required jobs, completing issued reports, visits/reviews, ack/disposition, resolution summary, permitted state.
6. Optional jobs need not complete; active attendance + pending reviews must be settled.
7. Named prerequisite failures via trusted backend.
8. Enforce on every close/resolve entry point; legacy jobless retained; activated cannot bypass.
9. Concurrency-safe/atomic ack, disposition, resolve/close + audit where one operation.
10. Customer acknowledgment UI + manager prerequisite/closure UI.

## Artifacts

| Kind | Path |
|------|------|
| Contract | `docs/operations/service-workflow/B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md` |
| Permission matrix | `docs/operations/service-workflow/B6_PERMISSION_MATRIX.md` |
| Contact policy | `docs/operations/service-workflow/B6_ACKNOWLEDGMENT_CONTACT_POLICY.md` |
| Migration | `supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql` |
| Disposable | `scripts/service-workflow/disposable_b6_battery.sql` + `run_disposable_b6.py` |
| UI | `CustomerReportAcknowledgmentPanel`, `TicketWorkflowClosurePanel` (wired on `TicketDetailPage`) |
| Vitest | `CustomerReportAcknowledgmentPanel.b6.test.tsx`, `TicketWorkflowClosurePanel.b6.test.tsx` |

## Policy reminders for reviewers

- Ack attaches to the issued revision; new corrections do not inherit prior acceptance.
- Late ack after unavailable/closure appends history without auto-reopening.
- Ack/closure do not clear safety restrictions or imply return-to-service.
- Sales-role-owner: RPC ownership-based; UI customer-role-only fail-closed — see matrix.

## Local proof (access-holder)

- Disposable B6 battery: 9/9 PASS (`.artifacts/slice0/service-workflow/disposable_b6_results.json`)
- Vitest: `CustomerReportAcknowledgmentPanel.b6.test.tsx` + `TicketWorkflowClosurePanel.b6.test.tsx` (+ B5 route/view regression) PASS

## Explicit non-actions

No staging apply · no preview redeploy for B6 · no production · no merge · no auto-closure · no closed-ticket reopening · no contract scheduling · no routine-editor.
