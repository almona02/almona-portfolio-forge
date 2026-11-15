# B7 — consolidated permission / audit hardening (authorized)

**Authorized after:** B6 closeout @ runtime `da2132b6` · Spark `ecc9e7c0` · type-fix `2d6b35ae`  
**Gates:** #155 frozen · #156 draft · **no merge · no production**  
**Scope:** Verification and correction of **existing** service-workflow authority — not new features, contracts, squads, parts fulfillment, or the routine editor.

## Mission

Harden and prove end-to-end that the completed machine → ticket → jobs → visits → report → review/issue → acknowledgment → closure journey enforces the right actors, denies the wrong ones, and audits every governed mutation atomically.

## Required verification matrix

1. **Journey trace** — Complete path: machine → ticket → jobs → visits → report → review/issue → acknowledgment → closure (activated workflow and documented legacy jobless edges).
2. **Role boundaries** — admin, support, assigned / historical / unrelated technician, owner, unrelated customer, sales, anonymous, trusted-backend (service_role) — each must match the frozen permission matrix.
3. **Surface consistency** — routes, getters, direct table access, RPCs, storage signing, and downloads must agree (no “UI allows / RPC denies” or inverse gaps without explicit fail-closed docs).
4. **Audit completeness** — every governed mutation: correct actor, record references, before/after state, atomic with the mutation (no orphan writes / silent skips).
5. **Bypass hunt** — no direct-write, bulk, legacy, or Python-backend path that mutates completed-workflow state outside governed RPCs.
6. **Visibility & immutability** — report-history visibility, customer-safe payloads, assignment separation, immutable safety / attendance / report / acknowledgment / disposition / audit records.
7. **Migration reconcile** — repository migrations vs staging applied stamps/chunks; document a reproducible release sequence (including prior truncated-apply lessons).
8. **Consolidated browser journey** — one exact deployed revision after any reviewed corrections; keep disposable / live API / deployed-browser layers separate.

## Execution rules

- Fix demonstrated defects in **small reviewable commits**.
- Local / disposable changes: **authorized now**.
- **Any new staging migration:** Spark targeted review **before** apply, under the established staging-only workflow (no production apply).
- Do not expand into new product contracts or B8+ scope under this authorization.
- Preserve access-holder vs Spark-independent attribution; do not re-label supporting runs as Spark PASS.

## Explicit non-actions

No merge · no production deployment · no #155 thaw · #156 remains draft until a separate release decision.
