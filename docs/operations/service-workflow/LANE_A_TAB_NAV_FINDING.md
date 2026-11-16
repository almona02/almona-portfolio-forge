# Finding — `?tab=service-routines` deep link drops query (not applied)

| Field | Value |
|-------|-------|
| **Runtime under test** | `e1345a0a` (accepted — **not modified**) |
| **Status** | **Confirmed** reproducible (not flaky once auth remount path is hit) |
| **Severity** | UX / deep-link; sidebar click and in-app `selectTab` work |
| **Fix** | Proposed only — requires a **new** correction SHA if authorized |

## Reproduction (isolated local, 2026-11-16)

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
- Support `/support/routines` (path-based) is **unaffected**.
- Unit test `AdminDashboard.accessibility.test.tsx` deep-links via `MemoryRouter` **without** `ProtectedRoute`, so it does not catch this.

## Root cause (narrow)

`ProtectedRoute` saves only the pathname when redirecting to login:

```ts
// src/components/auth/ProtectedRoute.tsx
<Navigate to="/login" replace state={{ from: location.pathname }} />
```

`Login` then `navigate(postLoginPath)` using that string — so `/admin?tab=service-routines` becomes `/admin`.

## Proposed fix (do not land on `e1345a0a`)

1. Persist full return location, e.g. `state={{ from: location.pathname + location.search }}` (or `{ pathname, search }`).
2. Keep Login’s open-redirect guard (`startsWith('/') && !startsWith('//')`).
3. Add a route-level test: ProtectedRoute → login → restore `/admin?tab=service-routines`.

No silent patch on the accepted runtime tip.
