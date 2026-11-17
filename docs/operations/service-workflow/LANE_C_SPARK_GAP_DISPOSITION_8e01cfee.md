# Cursor disposition — Spark Lane C / ticket gaps vs tip `8e01cfee` (+ amendments)

**Blocked verdict base (do not auto-carry):** Spark BLOCKED on `110a5789…`  
**Amended review base (do not auto-carry):** `8e01cfee3b4e44f25c4f95e77c67919d2cd365a6` / gap-close `081d13a2…`  
**This disposition tip:** branch HEAD after the docs commit that lands with this file (see Spark handoff).  
**Lane B:** closed — not reopened.

Gap IDs below match Spark’s BLOCKED ask (item vocabulary, field defaults, snapshot timing, concurrent-edit, frozen codes/limits/keys, attendance visibility; ticket field exposure; negatives). Where the attached BLOCKED text is not in-repo, wording is reconstructed from that ask + supervisor T-G1 direction.

| ID | Spark concern (110a5789 BLOCKED) | Status at bare `8e01cfee` | Disposition after this amendment tip | Exact sections |
|----|----------------------------------|---------------------------|--------------------------------------|----------------|
| **G-C1** | Supported item types + authoritative safety classification | Partial (types listed; class authority soft) | **Closed** | Lane C §3.5 vocabulary + `requirement_class` authority |
| **G-C2** | Exact unit/evidence/N/A fields, source, absent defaults | Partial | **Closed** | Lane C §3.5 field-source / absent-default table |
| **G-C3** | Snapshot creation event, once-only guard, immutable item identity | Partial (“first capture”; identity weak) | **Closed** | Lane C §3.2 event + once-only; §3.5 stable `item_key` |
| **G-C4** | Optimistic edit token + exact conflict (locking ≠ enough) | Open (lock-only wording) | **Closed** | Lane C §3.6 `checklist_revision` / `PT409` / `routine_checklist_stale_revision` |
| **G-C5** | Frozen error codes/audit actions; inclusive/exclusive limits; stable keys without IDs | Partial (audit named; codes “illustrative”; bounds absent) | **Closed** | Lane C §3.4.1 codes; §3.5 limits inclusivity; §3.8 audit; §3.5 `item_key` |
| **G-C6** | Historical attendance + former-assignee visibility | Partial | **Closed** | Lane C §3.4 matrix; LC-24/25 |
| **T-G1** | Ticket field exposure; SELECT-only ≠ privacy | **Open** (proposed full-row SELECT) | **Closed per supervisor** — narrow header RPC/view; full-row SELECT broadening **rejected** | Ticket gap §6.2 field table + justifications |
| **T-G2** | Header visibility for attending vs former assignee | Open / conflated with SELECT | **Closed** | Ticket gap §6.2 attendance table; TR-04 |
| **T-G3** | Negatives: updates, messages, OOS under staging-equivalent policies | Missing | **Closed (spec)** | Ticket gap §6.1 ENABLE + §6.4 TR-09…TR-12 |

**Unresolved after this tip:** none identified for the listed G-C/T-G IDs. Implementation remains unauthorized until Spark PASS on the new tip.

**Honesty note:** Spark’s verbatim BLOCKED artifact was not present in the shared handoff tree at disposition time; if Spark’s attached text uses different ID labels, map by concern title above and flag any ID mismatch in the SHA-bound verdict.
