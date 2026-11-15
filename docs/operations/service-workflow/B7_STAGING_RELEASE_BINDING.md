# B7 staging release binding

**Gates:** #155 frozen · #156 draft · no merge · no production  
**Status:** Staging **accepted** (Spark) · fixtures cleaned · credentials **retired** (`B7_RETIREMENT_EXECUTED.md`)  
**Secure handoff (sanitized):** `C:\projects\_almona_handoff\slice0-b7-permission-audit\`

| Layer | Binding | Status |
|-------|---------|--------|
| Frontend SHA | `78372312d73f79a78605a8f31d14df5b1b827c93` | Was `dpl_46faneJn7bnf6oE9rzxZm6Cfa6dn` — **`_vercel_share` revoked** at retirement |
| Docs / closeout | `4049b637` (+ this retirement docs tip) | Linkage · hash correction · cleanup · retirement |
| Railway backend SHA | `96f1d833` (F-B7-01/02) | Deploy `64673eff-c8aa-46a6-ad15-48a5f6cf754c` · health 200 degraded |
| DB migrations | F-B7-04 then F-B7-03 | Stamps `20261115184700` / `20261115185008`; `lf_sha256` in `B7_STAGING_APPLY_6c501536.md` |
| Edge | `ticket-share-attachment` | **v2** access-event recording |

## Correction commits

| ID | SHA |
|----|-----|
| F-B7-01/02 | `96f1d833` |
| F-B7-03 | `b974ab0f` |
| Inventory correction | `c5b7ae3d` |
| Spark review request | `78372312` |
| F-B7-04 | `6c501536` |
| Closeout docs | `4049b637` |

## Program status

Staging **accepted** and **operationally closed** — [`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`](./CORE_SERVICE_PROGRAM_STAGING_CLOSED.md).

## Release-readiness

See [`B7_RELEASE_READINESS_PACKET.md`](./B7_RELEASE_READINESS_PACKET.md) (preparation only — no merge / no production).  
First production release must not ship bare `#155` without F-B7-01/02/03/04 (and prerequisites).
