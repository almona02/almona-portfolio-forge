# Cursor disposition — Spark Lane C / ticket gaps vs tip `8e01cfee` (+ amendments)

**Blocked verdict base (do not auto-carry):** Spark BLOCKED on `110a5789…`  
**Amended review base (do not auto-carry):** `8e01cfee3b4e44f25c4f95e77c67919d2cd365a6` / gap-close `081d13a2…`  
**Policy content tip for Spark re-review:** `c7addbb19be8a1391687e2b0d831c6dde9d59702`  
**This disposition-map tip:** branch HEAD after the label-correction commit (docs only; **no policy change**).  
**Lane B:** closed — not reopened.

**Label correction:** An earlier disposition row mislabeled **G-C6** as attendance/former-assignee. Spark’s **original G-C6** is **limit equality + stable keys for ID-less items**. Attendance/former-assignee remains specified in contract §3.4 / ticket §6.2 / T-G2 — it is **not** G-C6.

| ID | Spark concern (original BLOCKED mapping) | Status at bare `8e01cfee` | Disposition after `c7addbb1` policy amendments | Exact sections |
|----|------------------------------------------|---------------------------|--------------------------------------------------|----------------|
| **G-C1** | Supported item types + authoritative safety classification | Partial | **Closed** | Lane C §3.5 vocabulary + `requirement_class` authority |
| **G-C2** | Exact unit/evidence/N/A fields, source, absent defaults | Partial | **Closed** | Lane C §3.5 field-source / absent-default table |
| **G-C3** | Snapshot creation event, once-only guard, immutable item identity | Partial | **Closed** | Lane C §3.2 event + once-only; §3.5 stable `item_key` |
| **G-C4** | Optimistic edit token + exact conflict (locking ≠ enough) | Open | **Closed** | Lane C §3.6 `checklist_revision` / `PT409` / `routine_checklist_stale_revision` |
| **G-C5** | Frozen error codes + audit actions | Partial | **Closed** | Lane C §3.4.1 codes; §3.8 audit actions |
| **G-C6** | **Limit equality (inclusive/exclusive) + stable keys for ID-less items** | Open / incomplete | **Closed** (policy at `c7addbb1`; was mislabeled in a prior disposition row) | Lane C §3.5 bound inclusivity + measurement compare; §3.5 stable `item_key`; LC-21/LC-22 |
| **T-G1** | Ticket field exposure; SELECT-only ≠ privacy | **Open** (full-row SELECT) | **Closed per supervisor** — narrow header RPC/view | Ticket gap §6.2 |
| **T-G2** | Header / checklist visibility: current assignee vs completed attendee / former assignee | Open | **Closed** (not G-C6) | Ticket gap §6.2; Lane C §3.4; TR-04; LC-24/25 |
| **T-G3** | Negatives: updates, messages, OOS under staging-equivalent policies | Missing | **Closed (spec)** | Ticket gap §6.1 ENABLE + §6.4 TR-09…TR-12 |

**Unresolved for listed IDs:** none on policy text at `c7addbb1`. Implementation **held** until Spark PASS on both proposals.
