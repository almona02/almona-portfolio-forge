# Applied SQL payloads — B6 staging (`apnmoevmvihfzcnttctx`)

## Provenance rules

- **Original applied** = exact bytes passed to MCP `apply_migration` / `execute_sql` that mutated staging.
- Do **not** treat a reconstructed cut of the reviewed migration as the truncated `#1` wire payload.
- Hashing: UTF-8 → LF normalize → `lf_sha256`.

## Execution order (live stamps)

| Order | Stamp / channel | Name / note | File | Original? |
|------:|-----------------|-------------|------|-----------|
| 1 | `20261115151114` `apply_migration` | `service_workflow_b6_acknowledgment_closure` | *(wire payload not retained — truncated in transit)* | **Unrecovered** |
| 1b | unstamped `execute_sql` | unavailable + disposition RPCs | `20261115151114_01b_unavailable_disposition.sql` | Yes — prepared remainder chunk applied as `execute_sql` arg (matches `.artifacts/.../b6-apply-chunks/01b_…`) |
| 1c | unstamped `execute_sql` | evaluate + assert | `20261115151114_01c_evaluate_assert.sql` | Yes — same |
| 1d | unstamped `execute_sql` | govern overloads | `20261115151114_01d_govern.sql` | Yes — same |
| 1e | unstamped `execute_sql` | EXECUTE grants/revokes | `20261115151114_01e_grants.sql` | Yes — same |
| 2 | `20261115151624` `apply_migration` | `service_workflow_b6_f_b6_03_05_correction` (stamped head) | `20261115151624_02_01_f_b6_03_05_stamped.sql` | Yes |
| 2b | unstamped `execute_sql` | correction remainder | `20261115151624_02_02_f_b6_03_05_remainder.sql` | Yes |
| 3 | `20261115151655` `apply_migration` | `service_workflow_b6_integrity_targeting` (stamped head) | `20261115151655_03_01_integrity_stamped.sql` | Yes |
| 3b | unstamped `execute_sql` | integrity evaluate | `20261115151655_03_02_integrity_evaluate.sql` | Yes |
| 3c | unstamped `execute_sql` | integrity govern | `20261115151655_03_03_integrity_govern.sql` | Yes |
| 4 | `20261115151750` `apply_migration` | `service_workflow_b6_f_b6_08_reclose_auth` | `20261115151750_04_01_f_b6_08_reclose_auth.sql` | Yes (full) |
| 5 | `20261115151814` `apply_migration` | `service_workflow_b6_f_b6_09_event_seq_order` | `20261115151814_05_01_f_b6_09_event_seq_order.sql` | Yes (full) |

Reviewed tip copies @ `da2132b6` (for comparison, **not** claimed as the truncated `#1` wire payload):

- `20261115160000_service_workflow_b6_acknowledgment_closure.sql`
- `20261115170000_…` … `20261115171200_…`

## Digests (`lf_sha256`)

| File | `lf_sha256` | bytes |
|------|-------------|------:|
| `20261115151114_01b_unavailable_disposition.sql` | `d65646eb538ca0f85908ed78af4332280e24e5d15c54656c6f661cf1f5005873` | 5650 |
| `20261115151114_01c_evaluate_assert.sql` | `5ea260c22632f2fb1efa26d03cd95430a1c258a72ec3e68fc24e6f138ae994ce` | 7174 |
| `20261115151114_01d_govern.sql` | `ad057eb51fb292b290622af5ec4660f01e21d75b5b88a8444ff135dad902e8df` | 5164 |
| `20261115151114_01e_grants.sql` | `86001af1690b1fd3435e435a7370406e3f9cc928f048e130d25f62becfed0d90` | 1887 |
| `20261115151624_02_01_f_b6_03_05_stamped.sql` | `8063ef08e89b2fbe007b044f420443931ca7474b43e11917ae39e5670294d7e0` | 5885 |
| `20261115151624_02_02_f_b6_03_05_remainder.sql` | `41cca4c53fdb7bc09484b2b742b2c0246c898b237c44abae9fda7d143a69fb9d` | 6283 |
| `20261115151655_03_01_integrity_stamped.sql` | `fed79d1ffbe6d749a7f36cf2dc7453511cc2bb9398efc0e6d16ad08ece9829d5` | 2894 |
| `20261115151655_03_02_integrity_evaluate.sql` | `b7130bea1506a56e24688077795473ca368b958dc231a15fa9d255c129b33570` | 6769 |
| `20261115151655_03_03_integrity_govern.sql` | `c84b0ed8f546f1bc0eea5316a02436fcf3ca0f8c0ca76b48fe04f215a495f50f` | 5586 |
| `20261115151750_04_01_f_b6_08_reclose_auth.sql` | `97933727cbaf11937a1fb91e14a5753130cf2d95258a0c0e863a7278f4f92326` | 6090 |
| `20261115151814_05_01_f_b6_09_event_seq_order.sql` | `c099f51ee612a768f11804f0a14e0fc4c69d22fb28e07e2be41bd46e0a2e0eec` | 8287 |
| `20261115160000_…acknowledgment_closure.sql` (reviewed tip copy) | `48c8b2f34adcaae2510ed16733f94db4d073a5c44fcf42837160ea8144672af1` | 31292 |
| `20261115170000_…f_b6_03_05_correction.sql` (reviewed tip copy) | `7aec3d9396472fed8515f7b1b23ec25e3fbdec6e6ec8141ec5aa82b96e837828` | 12183 |
| `20261115171000_…integrity_targeting.sql` (reviewed tip copy) | `8c0ac6f6730eb6ad116f6f71e79217bc07d6a8fbf4f9f22f929a3785873e21b3` | 15264 |
| `20261115171100_…f_b6_08_reclose_auth.sql` (reviewed tip copy) | `97933727cbaf11937a1fb91e14a5753130cf2d95258a0c0e863a7278f4f92326` | 6090 |
| `20261115171200_…f_b6_09_event_seq_order.sql` (reviewed tip copy) | `c099f51ee612a768f11804f0a14e0fc4c69d22fb28e07e2be41bd46e0a2e0eec` | 8287 |

## Unrecovered

The exact MCP `apply_migration` query string for stamp `20261115151114` (truncated `#1`) was **not** retained in transcripts as a recoverable full payload. Do not invent it. Staging repaired via `01b`–`01e` from the reviewed remainder @ `da2132b6`.
