# LINTS: API boundary batch — 2026-10-19

PR: [LINTS #99](https://github.com/almona02/almona-portfolio-forge/pull/99). Current main (`b71d4c60`) was merged into the isolated lint branch without conflicts before this batch.

## Exact before/after comparison

Both measurements use the same five API files and unchanged ESLint configuration. This avoids attributing warnings from newly merged features to the lint cleanup.

| API module | Warnings before | Warnings after |
| --- | --- | --- |
| `src/lib/serviceContractApi.ts` | 47 | 0 |
| `src/lib/usedMachines/UsedMachineService.ts` | 37 | 0 |
| `src/lib/ticketMessageApi.ts` | 19 | 0 |
| `src/lib/adminTicketApi.ts` | 4 | 0 |
| `src/lib/adminUsersApi.ts` | 1 | 0 |
| **Total** | **108** | **0** |

Both measurements report zero ESLint errors. The two new test files also pass zero-warning lint. No lint rule, severity, exclusion or type baseline was changed.

## What differs in the code

- Service contracts and ticket shares use migration-derived local table contracts with required insert fields and database defaults represented explicitly. Ticket messages and used-machine listings reuse existing row/write definitions. Typed client views reuse the existing authenticated connection; no database schema or permissions change.
- Admin ticket queries declare their result shapes. SDK compatibility metadata restores type checking for writes. Date filters now express their existing truthiness checks as type predicates, so nullable timestamps cannot reach date construction in the filtered collections.
- Admin-user failures enter the code as `unknown`. Only a nonempty string in a JSON error object replaces the fallback message. Null, arrays, numbers, objects, empty strings and non-JSON gateway responses retain a useful fallback.
- The changes do not alter dashboard appearance or establish a runtime speedup. They make incorrect writes and unchecked result access easier to catch during development.

## Verification

The combined regression run passed **52 tests across six files**: the two new API boundary suites, existing ticket governance/runtime suites and the two admin accessibility suites. New boundary coverage includes unchanged request payloads, valid service errors, malformed/empty responses, public-message evidence fields and rejected write/RPC calls. Targeted TypeScript diagnostics across changed modules/tests are zero. Full lint/type regression results are recorded below.

## Remaining contracts and performance follow-ups

- The global database type still lacks complete SDK metadata. Local typed views are compile-time compatibility descriptions, not runtime validation or a replacement for regenerating authoritative schema types.
- `SharedTicket.ticket.description` still inherits a non-null string contract even though the database description is nullable. Align that public interface and consumers in a focused follow-up; this batch preserves the existing return contract.
- The broad ticket filter API includes `other`, which is absent from the legacy shared table type. Its existing query boundary was preserved rather than silently dropping that filter or inventing database enum support.
- `UsedMachineService.incrementViews` still uses a read/modify/write cycle. A migration already defines an atomic increment RPC; verify its deployed authorization/contract and use it in a separate performance/correctness batch to avoid lost concurrent increments.

## Final integration results

Full-project ESLint completed successfully across **2,356 files: 0 errors, 16,076 warnings**. This is a fresh snapshot after integrating newer main; use the five-file 108-to-zero comparison above for attributable batch reduction. The full type-regression gate passed with 1,665 existing application errors against the unchanged 1,791-error baseline, no new signatures or occurrence increases, and clean node-project types. The secret scan and diff checks passed. All 52 relevant tests passed.
