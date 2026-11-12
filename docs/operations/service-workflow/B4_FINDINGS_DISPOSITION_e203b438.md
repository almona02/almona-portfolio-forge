# B4 findings disposition vs `e203b4387d56197847694bc60be387815e244d5c`

Prior independent PASS on privacy / auth-order / UI recovery / delegation remains useful evidence for those items. It does **not** close F-B4-05.

| Finding | On `e203b438` | Notes |
|---------|---------------|-------|
| F-B4-00 / 02 / 03 / 04 | Accepted evidence retained | Untouched-apply, service-role delegation, getter JSON privacy, auth-before-state |
| UI retry / remount | Accepted evidence retained | Submitted identity persistence |
| **F-B4-05 labour XOR** | **BLOCKED** | Table CHECK was softened to “forbid contradiction only,” allowing `no_labour=false` + empty `labour`. Approved contract requires full XOR at the table boundary; fixtures must adapt — production rules must not weaken. |

## Correction freeze

**`6a64a01e`** — restores full table XOR + preflight counts + fixture adaptations. Spark re-verify labour narrowly; retain accepted `e203b438` evidence for other findings.
