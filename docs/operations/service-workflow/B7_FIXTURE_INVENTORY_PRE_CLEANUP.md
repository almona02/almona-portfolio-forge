# B7 fixture inventory (pre-cleanup)

**DB:** `apnmoevmvihfzcnttctx`  
**Captured:** 2026-11-15 closeout (post canonical-link verify)  
**Rule:** delete only these synthetics; preserve 24 real tickets and sanitized verification evidence in git/docs.

## Counts

| Kind | n |
|------|--:|
| B7 tickets | 38 (predicate match at capture; includes CAN/LINK closeout shells) |
| Real (non-B7) tickets | 24 |
| Jobs / visits | 17 / 8 |
| Shares / access events | 4 / 4 |
| Governance audit / workflow audit | 45 / 94 |
| Messages | 2 |
| Reports / revisions (via B7 visits) | 6 / 6 |
| Machines (`B7J1-%` / `B7STG-%`) | 15+ |
| Storage objects (`ticket-attachments` under B7 ticket ids) | 6 |

## Headline evidence ticket (retain in docs only; row deleted in cleanup)

- `3dac7d8a-4d9d-445a-9eee-b11714849167` · `TKT-2026-000018` · `B7STG-J1-mwi8kisn` · serial `B7J1-SN-mwi8kisn` · machine `a3c8bb6c-7eea-4635-949c-6c943d312aa1` · `machine_id` NULL (legacy path)

## Canonical verify tickets (also synthetic — delete)

- `d15d09a1-…` `TKT-2026-000020` linked to `a3c8bb6c-…`
- `786ff892-…` `TKT-2026-000023` linked to `668ac90f-…` (`B7STG-CANR-6afa0e7b`)
- Cross-deny shells: `TKT-2026-000021`, `TKT-2026-000024` (+ LINKX rows)

## Shares

| share_id | ticket | revoked |
|----------|--------|---------|
| `ecd745f9-…` | `B7STG-PA-mwi6zii2` | yes |
| `8c602640-…` | `B7STG-PA-mwi6zsfv` | yes |
| `03290094-…` | `TKT-2026-000018` | no |
| `c542143e-…` | `TKT-2026-000018` | no |

## Storage object names (6)

Prefixes are B7 ticket UUIDs only (`…/b4/…/b7j_evidence.jpg`):

- `3dac7d8a-4d9d-445a-9eee-b11714849167/…`
- `420f6b76-6766-4355-9109-e5446aa08bb1/…`
- `4912f1de-2a42-49b3-8288-5841e51249bd/…`
- `8f412501-53c8-4de9-a623-febef44a4677/…`
- `bcd02493-4966-42c7-a491-30c2b3dab101/…`
- `c6b37383-27e8-4fa9-b40e-ef83817fb4d0/…`

## Selection predicate (cleanup)

```sql
ticket_number LIKE 'B7STG-%'
OR title LIKE 'B7STG-%'
OR title LIKE 'b7pa%'
OR title LIKE 'b7g2%'
OR title = 'xlink'
OR machine_serial_number LIKE 'B7J1-%'
OR machine_serial_number LIKE 'B7STG-%'
```

Machines: `serial_number LIKE 'B7J1-%' OR serial_number LIKE 'B7STG-%'`.
