# FP-024C.2 — Stock Mutation Provenance Audit

| Field | Value |
|-------|--------|
| Date | 12 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| HEAD at start | `2442a99` — `audit: record Fresh B blocked by stock state change` |
| PR #32 | Draft / **DO NOT MERGE** |
| Question | What action or workflow event caused warehouse stock quantities to change after Fresh A? |
| Physical-length score | **Unchanged at 6.0/10** |
| Production formulas | **FROZEN** |

---

## Verdict

```
FP-024C.1 = PAUSED BY STOCK_STATE_CHANGED
FP-024C.2 = STOCK MUTATION PROVENANCE AUDIT

Stock-update operation:
PROVEN at 2026-09-12 22:17:20 +03

Run Optimization mutates stock:
NOT_OBSERVED (contradicted)

PDF / machine export mutates stock:
NOT_OBSERVED on this timeline (contradicted)

User-visible trigger of the 22:17:20 update:
RESOLVED 13 Sep 2026 — POST_EXPORT STOCK UPDATE DIALOG
(was AMBIGUOUS; see the correction section below)

Offcut import:
NOT_OBSERVED

Manual Stock Management card edit path:
UNLOGGED — PROVEN FOR OBSERVED PATH (added 13 Sep 2026)

Log silence as proof of warehouse immutability:
REJECTED (see narrowing below)

Fresh B / Fresh C:
BLOCKED

90° CONTROL_FIXTURE:
GATED

Physical-length correctness:
6.0/10

Production formulas:
FROZEN

PR #32:
DRAFT / DO NOT MERGE
```

Do **not** restore warehouse quantities. Current post-Fresh-A stock is forensic evidence.

Do **not** call this optimizer nondeterminism.

---

## Correction added 13 September 2026 — `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED`

This audit originally treated the absence of a stock-update log line as evidence that no
warehouse mutation had occurred in a given window. That inference is now known to be unsound
for one proven path.

### What was observed

| Time (+03) | Event | Log evidence |
|------------|-------|--------------|
| 23:32:56 | DoWin restarted after operator shutdown | session start entries |
| 23:57:36 | Management Panel opened | `[RawMaterialsViewModel] [SERVICE_INIT]` and three sibling `SERVICE_INIT` lines |
| 23:57:36 – 23:58:45 | Manual `Deceuninck-ORTA-KAYIT-70` stock-card quantity edit, 0 → 100, saved | **none** |
| 23:58:45 | Independent `PrintWindow` capture of Stock Management showed ORTA 6500 ×100 | capture SHA-256 `c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012` |

`ExecuteStockUpdateCoreAsync` occurrences in `app-20260912.log` remained at **6** across the
edit, and the only lines appended after the watermark were the four `SERVICE_INIT` entries.
The operator subsequently confirmed the edit.

### Classification

```
MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED = PROVEN FOR OBSERVED PATH
```

Wording to use: *observed Stock Management card edit path can mutate quantity without the
optimization stock-update log event.* This is **not** generalized to every manual edit surface
in DoWin; only the observed path is proven.

### The two warehouse-write paths behave differently

| Path | Log signature |
|------|---------------|
| Optimization ribbon → Update Stock | `[OptimizationViewModel.ExecuteStockUpdateCoreAsync]` plus `N adet RawMaterial kaydı başarıyla güncellendi` |
| Management Panel → Stock Card edit → Save | **no trace** |

### What FP-024C.2 still proves, and what it no longer proves

Retained, because each rests on a positive log record or a direct UI observation rather than
on log silence alone:

- The **22:17:20 dedicated optimization stock-update event is directly logged and proven.**
- **Run Optimization at 21:55:16** had no observed stock mutation at that time, corroborated
  independently by the post-run UI still showing KASA qty **14**.
- **PDF export** had no observed mutation.
- **DC-600 `.dw` export** had no observed mutation.
- ~~The exact **user trigger of the 22:17:20 write remains AMBIGUOUS**.~~ **Resolved 13 September 2026** — the post-export Stock Update dialog. See the correction section below.

Withdrawn as a general rule:

- "No stock-update log line in window *X*, therefore no stock mutation in window *X*." Manual
  Stock Management edits are a separate, unlogged mutation path and are invisible to that test.

### Consequence for evidence code

`verifyWarehouseImmutability` in `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts`
now requires **both** a direct Stock Management quantity comparison and a log review. The UI
comparison is authoritative for detecting drift; the log is supplementary. Log silence can
neither override a UI mismatch nor substitute for a missing UI capture.

---

## Current stock evidence (preserve; do not edit)

Bound Fresh B Stock Management screenshot SHA-256  
`480646001d0ab21ba4812bb09614db5764c097207f8ec76b16e13a4ec6f46a56`

| Profile | Length | Quantity now |
|---------|--------|----------------|
| Deceuninck-CITA-20 | 6500 | **46** |
| Deceuninck-KANAT-70 | 6000 | **96** |
| Deceuninck-KASA-70 | 6000 | **13** |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **0** |
| Deceuninck-KOSE-METAL-05 | 6500 | 100 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 |

No replacement rows were created. No admin/database restore was performed.

---

## Fresh A stock delta

Pre-Fresh-A warehouse (failed pre-run / as-found, SHA-256 `5b5321c03b2b468c4ef5b750c325d202ed63b18d23f1e9c938ccc630a375bc4e`) versus post-Fresh-A warehouse above:

| Profile | Before | After | Δ | Fresh A used bars |
|---------|--------|-------|---|-------------------|
| CITA-20 6500 | 48 | 46 | **−2** | 2 |
| KANAT-70 6000 | 98 | 96 | **−2** | 2 |
| KASA-70 6000 | 14 | 13 | **−1** | 1 |
| ORTA-KAYIT-70 6500 | 0 | 0 | **0** | 1 used against qty 0 |

CITA/KANAT/KASA deltas match used-bar counts. ORTA stayed 0 because the stock-update arithmetic would have been −1 and was clamped to 0 (see log).

---

## DoWin workflow actions that can mutate stock

Licensed UI (Optimization ribbon, observed on Fresh A screenshots `41-opt-prerun.png` / `46-results-after-ok.png`) plus *DoWin User Manual* v1.0 (EN), chapter **Offcuts, Stock Update, and Maintenance**:

| Visible action | Expected to mutate warehouse? | Observed on Fresh A |
|----------------|-------------------------------|---------------------|
| Send to Optimization | No (creates an optimization run) | Logged `[USER_ACTION]` 21:53:52. No stock-update log. |
| Run Optimization | No, per manual: stock update is a later post-optimization action | Logged `[USER_ACTION]` 21:55:16. Success 21:55:16. **No stock-update log.** Post-run Stock Items still showed KASA qty **14**. |
| Save Optimization / history write | UNKNOWN as a named UI command | `OptimizationRun` Id=7 Status=`Success` at 21:55:16. No stock-update log. |
| Export as PDF | No, unless a later stock dialog is answered | PDF package timestamp `20260912_215949`. No stock-update log. No `[USER_ACTION]` PDF line in the session log. |
| Send to Machine / DC-600 `.dw` | Manual: “If the program asks to update stock after export, answer according to your production policy.” | Logged `[USER_ACTION] MDB Export` 22:02:57. **No stock-update log at that time.** |
| Close optimization / navigate away | UNKNOWN | No navigation log between 22:02:57 and 22:17:20. |
| **Update Stock** (ribbon) | **Yes.** Manual: confirmation dialog, then deduct used bars. Warning: do not run before physical production is confirmed. | Dedicated stock-update log at **22:17:20**. No `[USER_ACTION]` tag on that line (unlike Run / Send / Export). |
| **Add Offcuts to Stock** / Add reusable offcuts | **Yes** (import remainders) | **No** matching log. Fresh B warehouse shows no new CITA ~6160 or KANAT ~4161 remnant rows. |
| Manage Stock / Refresh Stock List | Manage can edit; Refresh should not deduct | Refresh/Manage were **not** clicked as a recorded USER_ACTION. Stock form Save was not used in Fresh B. |
| Production Status / production approval | Manual groups stock update with “machine export or production approval” | Production Status was **not** clicked in this audit (opening history could mutate). UNKNOWN whether a hidden status flag was set. |

Source of timestamps: operator log `Documents/DoWin/Logs/app-20260912.log` (product diagnostic log on the licensed PC). Not decompilation. Encrypted shop DB was not opened.

---

## Fresh A action timeline

All times **UTC+3**, 12 September 2026. Confirmation clicks that are not evidenced: **UNKNOWN**.

| Time | Screen / action | Input state | Output artifact | Stock if observed | Confirmation clicked? | Known/suspected to mutate stock |
|------|-----------------|-------------|-----------------|-------------------|------------------------|----------------------------------|
| 21:19:21 | DoWin session start | — | Session `7404479a981c` | UNKNOWN | n/a | no |
| 21:20 | Management Panel (pre-run) | Saw live **5** | Settings SHA `ad9cbc0d…` | Warehouse as-found 48/98/14/0 | no | no |
| 21:24:58 | Language accidentally Russian | — | log: language `ru` | UNKNOWN | UNKNOWN | no |
| 21:25:15 | English restored | — | log: language `en` | UNKNOWN | UNKNOWN | no |
| ~21:34–21:37 | Saw 5→4 saved; re-entered | Weld 3 / Saw 4 / Trim 0 | Settings SHA `571dc804…` | not re-captured | Save All Changes **yes** (operator automation) | settings only |
| 21:42:00 | Project created | blank New Project | Project Id=2, No=100002, Name=`FP024C1_FRESH_A`, OrderNo=10002 | UNKNOWN | save **yes** | no |
| 21:45:49 | Design saved | 1000×1500 Deceuninck 70 | Design Id=2 Name=`FRESH_A` | UNKNOWN | `[USER_ACTION] Tasarım Kaydet` **yes** | no |
| 21:47:06 | Production plan saved | qty 1 | Plan Id=2 Name=`FRESH_A_PLAN` | UNKNOWN | save **yes** | no |
| 21:51:57 | Navigate Optimization | — | — | UNKNOWN | n/a | no |
| 21:53:52 | Send to Optimization | plan FRESH_A_PLAN | OptimizationRun Id=**7** created | optimizer stock 48/98/14/0 (screenshot `41-opt-prerun`) | `[USER_ACTION]` **yes** | **no** (log) |
| 21:55:16 | Run Optimization | 7 stock SKUs offered | Status=`Success`, yield 54.8%, 6 bars, 0 unplaced | Post-OK screenshot still KASA **14** | `[USER_ACTION] Optimizasyon Başlat` **yes**; Information OK **yes** | **no** (log + UI qty 14) |
| 21:57:19 | RunOptimization PERF:SLOW | — | duration accounting | UNKNOWN | UNKNOWN | no |
| 21:59:49 | PDF package (file timestamp) | — | Design Preview / Labels / Optimization Report | UNKNOWN | UNKNOWN (no PDF `[USER_ACTION]` line) | **no** (no stock-update log) |
| 22:02:57 | Send to Machine DC-600 | DC-600 selected | `.dw` + MachineExportRecord RunId=7 | UNKNOWN | `[USER_ACTION] MDB Export` **yes** | **no** at this timestamp |
| 22:02:57–22:17:20 | **14 min 23 s gap** | Optimization left open with Update Stock visible | none | UNKNOWN | **UNKNOWN** | — |
| **22:17:20** | **Stock update operation** | Fresh A cutting plan, 4 used SKUs | CITA 46, KANAT 96, KASA 13, ORTA clamped 0; “6 RawMaterial records updated” | **mutated** | **UNKNOWN** (no `[USER_ACTION]` tag) | **yes — PROVEN write** |
| 22:17:41 | Application shutdown | — | session end | already mutated | UNKNOWN who closed | shutdown itself not proven as the writer (21 s later) |
| 22:17:51 | New session | — | Session `81e63ec8d43f` | post-update | n/a | no |
| ~22:20+ | Fresh B pre-run Stock Management | — | SHA `48064600…` | 46/96/13/0 | no | observed only |

---

## History / status (read-only)

Fresh A project / plan / optimization were **not** reopened in this audit. Opening a history item was treated as a possible state trigger.

From the operator log and prior Fresh A screenshots only:

| Surface | Recorded value |
|---------|----------------|
| Project | Id=2, `FP024C1_FRESH_A`, order list `100002`, PDF Order No `10002` |
| Design | Id=2, `FRESH_A` |
| Production plan | Id=2, `FRESH_A_PLAN`, ItemCount=1 |
| OptimizationRun | Id=7, Status=`Success`, Yield=54.8% |
| Machine export | recorded for RunId=7, DC-600 |
| Project list Status column (Fresh B start screenshot) | blank / not a proven “approved” marker |
| Stock-update status | **occurred** at 22:17:20 |
| Warehouse-consumption marker | quantities written; no separate UI badge captured |
| Reusable-offcut marker | **NOT_OBSERVED** |

Limitation: production-plan “approved” vs “optimized” UI flags remain **UNPROVEN** because Production Status was not clicked.

---

## Cause-class matrix

| Class | Verdict | Why |
|-------|---------|-----|
| A. `OPTIMIZATION_RUN_MUTATES_STOCK` | **NOT_OBSERVED** | Run at 21:55:16 succeeded with no stock-update log. After Information OK, Stock Items still showed KASA **14**. |
| B. `EXPORT_MUTATES_STOCK` | **NOT_OBSERVED** | PDF ~21:59 and DC-600 export 22:02:57 have no stock-update log. Manual allows a *later* “ask to update stock after export”; that ask was **not** observed at export time. |
| C. `IMPLICIT_CONFIRMATION_OR_STATUS_TRANSITION` | **SUPPORTED** | A dedicated stock-update ran 14 minutes after export, matching the ribbon **Update Stock** / manual confirmation workflow. Shutdown followed 21 s later — close-on-exit is **not** simultaneous, so it is not proven as the sole trigger. No `[USER_ACTION]` tag on the update line. |
| D. `UNOBSERVED_OPERATOR_OR_APPLICATION_EVENT` | **SUPPORTED** for the click | Who invoked 22:17:20 (human, accidental UI automation, or unlogged confirm) is **UNKNOWN**. |

**Proven:** warehouse write at 22:17:20 to CITA 46 / KANAT 96 / KASA 13 / ORTA 0.  
**Not proven:** that Run or Export themselves deducted stock.  
**Not proven:** the exact confirmation click.

---

## Offcut / remnant side effect

Fresh A remainders that could be reusable (min offcut 500): CITA ~6160.3, KANAT ~4161.4, plus smaller pieces.

| Check | Result |
|-------|--------|
| Dedicated remnant UI during Fresh A | UNPROVEN / not visible |
| Add Offcuts / Add reusable offcuts log | **NOT_OBSERVED** |
| New warehouse rows at those lengths (Fresh B stock screen) | **NOT_OBSERVED** |
| Stock-update log imported remainders | **NOT_OBSERVED** (quantities decremented on existing cards only) |

This is consistent with crossing a **stock-commit** boundary (used bars deducted) **without** crossing an **offcut-import** boundary.

---

## EXPECTED_PRODUCT_BEHAVIOR vs OBSERVED_FRESH_A_BEHAVIOR

### EXPECTED_PRODUCT_BEHAVIOR

From *DoWin User Manual* v1.0 EN (licensed file not committed):

- Standard flow step 9: “After production approval, update stock or import reusable offcuts.”
- Update stock: after machine export **or** production approval, use **Update Stock**, confirm quantities, deduct used bars, refresh list.
- Add reusable offcuts: separate confirm, including minimum offcut-length threshold.
- Warning: “Stock update and reusable-offcut import modify warehouse data. Do not run these actions before physical production is confirmed.”
- Machine export: “If the program asks to update stock after export, answer according to your production policy.”

### OBSERVED_FRESH_A_BEHAVIOR

- Operator intent: optimizer evidence only; **do not** Approve Production / Update Stock / Add Offcuts.
- Run and machine export completed **without** a contemporaneous stock write.
- ~14 minutes later, a stock-update operation **did** deduct used bars (and clamped ORTA at 0).
- Reusable offcuts were **not** imported.
- Exact confirm dialog at 22:17:20 was **not** screenshot-captured.

The manual describes stock update as an explicit post-optimization warehouse action. Fresh A’s *intent* matched that isolation. The *warehouse result* matches a later stock-update execution, not the solve/export timestamps.

---

## Limitations

- Encrypted shop database was not opened.
- DoWin was not decompiled.
- Fresh A history UI was not re-opened (possible mutation risk).
- PDF export has a file timestamp but no matching `[USER_ACTION]` log line.
- Stock-update log line has no `[USER_ACTION]` tag. ~~so ribbon click vs other invoke is AMBIGUOUS.~~ **Explained 13 September 2026**: the confirmation is a modal dialog, not a ribbon command, and dialog confirmations are not `[USER_ACTION]`-tagged.
- “6 RawMaterial records updated” vs four used profile codes: extra rows UNKNOWN (not treated as remnant import).
- GPU overlay on later Management Panel screenshots does not affect quantities.

---

## ALMONA implication (do not implement here)

A production optimizer must **not** silently mutate warehouse truth because a solve or export occurred.

ALMONA today:

- `StockConfirmDialog` states that nothing is written until confirm, and the dialog does not change stock semantics by itself.
- `ProductionCockpit` can open that dialog (`Confirm stock consumption`) but does **not** pass `onConfirm` to any inventory API.
- There is **no** wired canonical event `PRODUCTION_CONFIRMED` / `STOCK_COMMIT_APPROVED` on the optimizer path.

**Future finding (not started):** `FP-026 STOCK_COMMIT_BOUNDARY` — bind warehouse mutation to an explicit authoritative confirm event; keep solve/export read-only. Do not implement in this audit.

---

## Gating

| Item | Status |
|------|--------|
| Fresh B | **BLOCKED** — stock no longer matches Fresh A; do not restore quantities yet |
| Fresh C | **BLOCKED** |
| 90° CONTROL_FIXTURE | **GATED** |
| Subsequent A/B/C method | **not chosen** (disposable test stock / clone workspace / isolated rows / supported restore — future decision only) |
| FP-016 / FP-017 / FP-025B | **not started** |

---

## Formula freeze

This audit is documentation only. No edits to `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, production formulas, K-factor, Cut identity, or CNC lengths.


---

## Correction added 13 September 2026 — the write trigger is resolved

FP-024C.3 RUN_A exposed the trigger that FP-024C.2 could only classify as `AMBIGUOUS`.

**Send to Machine raises a modal dialog after a successful export:**

> **Stock Update**
> Export to machine completed successfully. Would you like to deduct the used stock quantities from your inventory?
>  [ Yes ] [ No ]

Answering **Yes** commits the warehouse write. Answering **No** does not.

### Two-armed comparison on the same trigger

| Arm | Export logged | Answer | `ExecuteStockUpdateCoreAsync` | Warehouse |
|-----|---------------|--------|-------------------------------|-----------|
| Fresh A, 12 Sep | `MDB Export` 22:02:57 | **Yes** (inferred) | **22:17:20** | Written — CITA 48→46, KANAT 98→96, KASA 14→13 |
| RUN_A, 13 Sep | `MDB Export` 01:05:22 | **No** (observed) | *none in the entire session log* | Unchanged — byte-identical to baseline V2 |

### What this explains that was previously unexplained

1. **The 14 min 23 s gap.** The interval between export and write was never explained by any logged command. It is the dialog sitting open, waiting for an answer.
2. **The missing `[USER_ACTION]` tag.** DoWin tags ribbon commands, not modal confirmations. The write looked untriggered because the trigger is not a ribbon command.
3. **Why shutdown looked suspicious.** The shutdown 21 s after the write was a coincidence of timing — the operator answered the dialog and then closed the application. RUN_A independently clears shutdown as a writer: DoWin was closed and relaunched after the RUN_A export and the warehouse did not change.

### Classification

`SUPPORTED_BY_CONTROLLED_COMPARISON`, not `PROVEN`. The Fresh A **Yes** was not directly observed; it is inferred from the proven write plus the now-observed dialog on an identical export path. The RUN_A **No** arm *is* directly observed. Hypothesis C (`IMPLICIT_CONFIRMATION_OR_STATUS_TRANSITION`) is upgraded from `SUPPORTED` to the identified mechanism; hypotheses A, B and D are withdrawn as unnecessary.

### This vindicates the recorded FP-026 concern

`FP-026 STOCK_COMMIT_BOUNDARY` was recorded on the suspicion that DoWin commits stock at an ill-defined boundary. It does: the commit is bound to a machine export and gated only by an easily mis-clicked modal. ALMONA must not copy this. A stock commit belongs to an explicit, auditable inventory transaction, not to a dialog raised as a side effect of writing a machine file.

### Offcut policy surface (related, discovered in the same session)

The proven 22:17:20 write deducted whole bars and created **no** remnant rows, despite leaving remainders of 5080, 4161 and 965 mm — all far above the observed **Minimum Offcut Length of 500 mm**. The reason is that *Add Offcuts to Stock* is a **separate explicit ribbon action**, not part of the stock deduction.

This is the *policy* surface only. It does **not** prove the offcut inventory is empty, and the offcut/remnant axis stays **UNPROVEN** in both FP-024C.1 and FP-024C.3.
