# Spark — FR-1 backup/restore rehearsal + migration-order confirm

**Proposal:** [`FR1_BACKUP_RESTORE_REHEARSAL_PROPOSAL.md`](./FR1_BACKUP_RESTORE_REHEARSAL_PROPOSAL.md)  
**Freeze artifacts:** `e17858a5` · draft #158 · **no production apply**  
**Preserve:** content PASS on `d3ef35d4`

## 1. Confirm migration order (reconcile labels vs filenames)

Authoritative sequence:

```text
20261111010000 (A)
→ 20261111180000 (C MI)
→ 20261111190000 (D)
→ 20261111200000 (E)
→ 20261111201000 (B RLS)    ← after C/D/E, not immediately after A
→ 20261115190000 (F7-04)
→ 20261115190100 (F7-03)
```

Conceptual “Package B = RLS” is unchanged; only ordering vs MI C/D/E follows lexicographic filenames.

## 2. When rehearsal runs (after proposal acceptance)

Independently verify on the **disposable restored** DB:

1. Baseline proof (§5 of proposal): counts/relationships, grants/RLS/functions, migration history.  
2. Apply **missing** FR-1 versions only, in the order above, from `e17858a5`.  
3. Edge @ `e17858a5`; FR-1 probes / battery class checks.  
4. Outbound integrations disabled.

## Verdict format

```text
FR-1 rehearsal Spark: PASS | BLOCKED | ORDER-ACK-ONLY
Order ack: A→C→D→E→RLS→F7-04→F7-03 | conflict: <note>
Restore proof: <n/a until run> | pass/fail
Migration rehearse: <n/a until run> | pass/fail
Content evidence d3ef35d4: preserved
Production: NOT AUTHORIZED
```
