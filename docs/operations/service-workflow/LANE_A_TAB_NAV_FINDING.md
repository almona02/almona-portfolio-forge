# Finding — `?tab=service-routines` deep link drops query

| Field | Value |
|-------|-------|
| **Accepted Lane A baseline** | `e1345a0a` (**preserved** — not rewritten) |
| **Status** | **Confirmed** on baseline; **fixed** on separate frontend correction SHA (login-return path) |
| **Severity** | UX / deep-link; sidebar click and in-app `selectTab` work on baseline |
| **Fix tip** | See staging packet **Frontend binding** (narrow `safeReturnPath` correction) |

## Reproduction (isolated local, 2026-11-16) — baseline `e1345a0a`

Admin session on `http://127.0.0.1:3000` against Lane A local Supabase.

| Trial | Action | Result |
|-------|--------|--------|
| cold-1…5 | `goto /admin?tab=service-routines` | Final URL `/admin` · h1 **OVERVIEW** · no New draft (5/5) |
| pushState+popstate | Already on `/admin`, then push `?tab=service-routines` | **SERVICE ROUTINES** · New draft OK |
| click-nav | Click “Service Routines” | OK |
| reload-with-query | Reload while URL had `?tab=service-routines` | Query stripped → OVERVIEW |

Navigation chain on cold load observed:  
`/admin?tab=service-routines` → `/login` → `/admin` (search discarded).

## Scope

- Affects **all** Admin deep links that rely on `?tab=` when `ProtectedRoute` remounts through login (full page load / brief unauthenticated flash), not only `service-routines`.
- In-memory tab changes via `selectTab` / `setSearchParams` remain correct.
- Support `/support/routines` (path-based) was **unaffected** by the query-drop bug (path already preserved).
- Unit test `AdminDashboard.accessibility.test.tsx` deep-links via `MemoryRouter` **without** `ProtectedRoute`, so it did not catch this.

## Root cause (narrow)

`ProtectedRoute` saved only the pathname when redirecting to login:

```ts
// baseline e1345a0a
<Navigate to="/login" replace state={{ from: location.pathname }} />
```

`Login` then `navigate(postLoginPath)` using that string — so `/admin?tab=service-routines` became `/admin`.

## Fix (separate correction SHA — not landed on `e1345a0a`)

1. `buildReturnPath` persists pathname + search + hash into login `state.from`.
2. `safeReturnPath` accepts only internal relative destinations; rejects external / malformed.
3. Role authorization in `ProtectedRoute` unchanged (denied roles still bounce `/`).
4. Tests: cold-load `/admin?tab=service-routines`, Support `/support/routines`, ordinary internal nav with query+fragment, denied-role access.

No silent patch on the accepted runtime tip; no staging apply / production / FR-1.
