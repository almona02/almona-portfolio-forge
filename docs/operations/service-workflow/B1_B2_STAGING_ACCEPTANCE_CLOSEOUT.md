# B1/B2 staging acceptance closeout

**Status:** ACCEPTED for staging development  
**Accepted source:** `49c7896963e648d173020d7d25be6fbb3eb8a2d6`  
**Authority:** Spark independent browser journey PASS + retained security evidence  
**Issues:** #155 frozen · #156 draft  
**Gates:** No merge · no production deployment · B3 authorized separately (implementation freeze only; no staging apply until Spark B3 review PASS)

## Browser verification binding

| Field | Value |
|-------|--------|
| Build | Local production build: `npx vite build` + `vite preview :3002` |
| Backend | Staging Supabase `apnmoevmvihfzcnttctx` only |
| Immutable hosted preview | **Not claimed.** Vercel preview `dpl_EJdBuGt2…` was deleted; results bind to **source SHA**, not a hosted URL |

Do not recharacterize this acceptance as hosted-preview verified.

## Deferred residuals (not B2 reopeners)

| Residual | Classification |
|----------|----------------|
| Live service-role JWT-claim branch NOT TESTED (no key) | **Deferred live check** — disposable batteries cover the branch; retest when a scoped key is authorized |
| Job completion / report submit / ticket-closure RPCs absent live | **Future B4+ functionality**, not B2 defects |
| Auth error classifier fragile | Known limitation; do not treat as assignment regression |
| Support-created tickets skip auto-assign | Operational residual; Job-1 ensure-default path remains B2 scope |
| Component 35/35 Cursor-claimed, not Spark-run | Supporting claim only |

## Preserved security evidence (unchanged)

- Live security 18/18 PASS (11 deny + 7 legit)
- RLS T-1–T-6 PASS
- Disposable SEC 8/8 + independent 15/15 + union 8/8
- Hashes 13/13 MATCH
- Corrective package SHA `d4cfc8ce` — do not re-litigate

Sanitized Spark probes published under `scripts/service-workflow/` (`spark_independent_probes.sql`, `spark_forge_probes.sql`, journey helpers). Screenshot evidence: agent-store `slice0/evidence/b2-journey/`.

## What this unlocks

- Staging **development** continues from accepted B1/B2 behavior at `49c78969` (+ subsequent reviewed staging-permission fixes already applied under prior authorization).
- **B3 visit execution** may be implemented and frozen for Spark review. **No B3 staging apply** until that review passes.
