# Follow-up O-JC-1 — Stranded completed visits without reports

**Status:** Recorded observation only · **no fix authorized** · **not** a production incident  
**Source:** Spark journey-close verdict `JC-PASS-BOUNDED` @ `cdcbce19` / runtime `e27f21a5` / `dpl_Hy3Urvio…`  
**Related acceptance:** [`JOURNEY_CLOSE_STAGING_ACCEPTANCE.md`](./JOURNEY_CLOSE_STAGING_ACCEPTANCE.md)

---

## Observation

F-B5-02 permanently blocks job completion when any completed visit lacks a report. Visits are terminal once completed, and report submission requires `in_progress`, so **waiver is the demonstrated exit**.

Spark harness shape probes (wrong param names) created reportless completed visits 2–3 on follow-up job `3bf4a753-…`; F-B5-02 correctly kept the job `awaiting_review`; the job was then **waived** with an honest audited rationale. Visit-4 was the clean reissue evidence.

---

## Assess against accepted workflow

| Accepted surface | Sense |
|------------------|-------|
| B5 job completion gate | Completing revision / no outstanding visits / verification constraints remain accepted; this is an edge when a visit reaches `completed` without a submitted report |
| Lane C / B4 | Submit path assumes an in-progress visit; no accepted path to “reopen” a completed visit for submit |
| Demonstrated exit | `waive_job` (governed, audited) — used live on the stranded follow-up job |

**Assessment (planning only):** Treat as a sharp edge of the accepted completion gate, not a reopen of B5. Any product change would need a separate authorization. Prefer clarifying operator/docs guidance that completing a visit without submit strands the job toward waive unless a different recovery path is later designed.

---

## Wording constraint

**“Production-reachable”** means a possible code path if a visit is completed but never submitted. It does **not** assert a verified production deployment or incident.

---

## Out of scope for this follow-up

- Implementing recovery RPCs, UI, or migrations  
- Production / merge / broader workflow redesign  
