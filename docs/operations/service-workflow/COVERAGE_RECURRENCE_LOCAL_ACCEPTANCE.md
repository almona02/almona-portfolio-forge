# Coverage & recurrence — local acceptance

**Accepted proposal:** `42862fdd27636d2682ce81fc287ed3777f8005fb`  
**Frozen implementation SHA:** _(stamped in follow-up commit after code lands)_  
**Migration:** `supabase/migrations/20261118210000_service_coverage_recurrence.sql`  
**Migration SHA-256 (LF):** `226d4245ca806cc1cfa8e501c37881a7409fa8c1b07c43e9122ffe030239220d`  
**Lane B pin prerequisite SHA-256 (unchanged):** `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0`  
**Binding:** [`COVERAGE_RECURRENCE_BINDING_CHOICES.md`](./COVERAGE_RECURRENCE_BINDING_CHOICES.md) · [`COVERAGE_RECURRENCE_LOCAL_IMPLEMENTATION_MANIFEST.md`](./COVERAGE_RECURRENCE_LOCAL_IMPLEMENTATION_MANIFEST.md)

## Results by layer (keep separate)

| Layer | Result | Attribution / notes |
|-------|--------|---------------------|
| **Database** disposable PG17 battery CR-01…CR-16 (+ tech/customer deny splits) | **22/22 PASS** | Cursor disposable — `.artifacts/slice0/service-workflow/disposable_coverage_results.json` |
| **Concurrency** 8-worker generate on active coverage | **PASS** (`unique_sequences=ok`, all rc 0) | Cursor disposable concurrent — same JSON `concurrency` |
| **Component** Vitest (API + panel) | **NOT RUN** | Local Vitest suite-load fails with pre-existing `TypeError: … reading 'config'` on `describe` for **all** suites tried (including prior Lane A/B panel tests). Tests are present under `src/lib/serviceMachineCoverageApi.test.ts` and `ServiceMachineCoveragePanel.test.tsx`. |
| **Browser** smoke journey | **UNAVAILABLE** | No isolated coverage Auth/PostgREST browser stack in this package. Lane C checklist loopback stack is a different lane and was not reused. Not staging. |

### Database check map

| ID | Status |
|----|--------|
| CR-01 | PASS |
| CR-02a (family deny) | PASS |
| CR-02b-tech (manage deny) | PASS |
| CR-02c-cust (manage deny) | PASS |
| CR-03 | PASS |
| CR-04 | PASS |
| CR-05 | PASS |
| CR-06a / CR-06b (pause + resume backfill) | PASS |
| CR-07 | PASS |
| CR-08 | PASS |
| CR-09a-leap / CR-09b-nonleap | PASS |
| CR-10 | PASS |
| CR-11 | PASS |
| CR-12 (failure rollback) | PASS |
| CR-13 | PASS |
| CR-14a/b/c (customer isolation) | PASS |
| CR-15 | PASS |
| CR-16 (assign + pin present; no new FSM) | PASS |

## Authority / override wording

Existing Lane A/B rules only. **No** new coverage override permission. Model/manufacturer soft override remains Lane A metadata; coverage create/generate hard-deny inapplicable family/catalog like Lane B pins.

## Explicit non-claims

- No staging apply · no production · no merge · no FR-1  
- Accepted lanes and journey-close remain closed  
- O-JC-1/2/3 untouched  
- Component + browser layers are **not** claimed pass  
