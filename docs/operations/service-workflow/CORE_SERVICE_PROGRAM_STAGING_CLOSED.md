# Core service program — staging accepted · operationally closed

**Recorded:** 2026-11-15  
**Authority:** Spark staging acceptance through B7 + Cursor retirement execution  
**Gates:** #155 frozen · #156 draft lineage · **no merge · no production**

## Verdict

The core service-workflow program (Slice 0 + machine identity through B1–B7 permission/audit hardening) is **staging-accepted** and **operationally closed** on `apnmoevmvihfzcnttctx`.

Operational closeout means: fixtures purged, credentials retired, preview share revoked, sanitized evidence retained. It does **not** mean production approval.

## Acceptance chain (staging)

| Gate | Accepted tip / stamp | Evidence |
|------|----------------------|----------|
| Slice 0 + MI (#155) | `ca9f5067` | Spark browser 10/10; #155 frozen |
| B1/B2 | `49c78969` (+ security remediation `d4cfc8ce`) | `B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md` |
| B3 | `4e0ddd22` | `B3_STAGING_DEVELOPMENT_ACCEPTANCE.md` |
| B4 | `f63c9145` | `B4_STAGING_ACCEPTANCE_f63c9145.md` |
| B5 | `2a4042ad` | `B5_STAGING_ACCEPTANCE_2a4042ad.md` |
| B6 | `da2132b6` / closeout | `B6_STAGING_CLOSEOUT_da2132b6.md` |
| B7 | DB `20261115184700`→`85008`; BE `96f1d833`; FE `78372312`; edge v2 | `B7_*` apply/closeout/retirement |

## Operational closure checklist

| Item | Status |
|------|--------|
| B7 synthetics / machines / shares / storage | **0** remaining |
| Real tickets retained | **24** |
| Immutable triggers restored | 6/6 enabled |
| Fixture credentials | Rotated · discarded |
| Sessions / handoff secrets | Shredded |
| B7 preview share | Revoked |
| Sanitized manifests | Retained in handoff + git docs |

## Explicit non-claims

- Not production-ready without a dependency-complete first-release package (see `B7_RELEASE_READINESS_PACKET.md` § First production release proposal).
- Not a merge authorization for #155 or #156.
- G-01 journey used legacy serial-only create; canonical `machine_id` verified separately.
