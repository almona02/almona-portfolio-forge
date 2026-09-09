# DoWin (YilmazCAD) vs ALMONA Portfolio Forge — Dealer Audit

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Auditor context | Official Yilmaz dealer, Egypt — software shared by Yilmaz for audit |
| DoWin product | YilmazCAD 1.0.0 (installer folder: DoWin) |
| DoWin build | 17 June 2026, .NET 8 self-contained WPF, win-x64 |
| ALMONA repo | `almona-portfolio-forge` |
| Classification | Internal dealer review. Do **not** attach SQLCipher keys, DPAPI blobs, or decompiled binaries. |

This document is the third-party review copy of the live comparison. It does not contain database passwords.

---

## 1. Verdict

DoWin and ALMONA are complementary, not substitutes.

- **DoWin** is a Windows shop-floor CAD/CAM optimizer: 2D elevation, production plans, column-generation bar nesting, MDB/NCW machine export.
- **ALMONA** is a cloud fabricator + Egypt dealer layer: Arabic, local system packs, EGP quoting, remnant marketplace, Yilmaz after-sales (YDT).

**Recommended operating model**

| Layer | Owner | Why |
|-------|--------|-----|
| Design, bar nesting, CAM file | DoWin on the workshop PC | Native CAD, MIP nest, controller files the machine already accepts |
| Quote, BOM, Arabic UI, inventory, tax | ALMONA in office / field | Egypt packs, EGP, multi-user |
| Machine service and spare parts | ALMONA YDT + ticketing | DoWin has no after-sales |
| Hand-off | ALMONA ↔ DoWin via NCW / MDB / plan JSON | One production truth without cloning Yilmaz CAD |

Do **not** decompile or port DoWin solver code. Treat DoWin as a behavior spec. Reimplement published methods (Gilmore–Gomory, EN 13126 taxonomy, file formats ALMONA already generates).

---

## 2. Method and limits

### Inspected

- `C:\Program Files\DoWin` — installer, `YilmazCAD.deps.json`, `Configuration\*.json`, manuals (not copied), `template.mdb`
- `C:\YilmazSoftDatabase\DoWin_Designs.db` — SQLCipher 4.5.2, opened with DoWin’s own Windows DPAPI credential on the licensed PC (`%LOCALAPPDATA%\DoWin\database-credential.dpapi`). Passphrase is **not** recorded here.
- ALMONA source: `src/lib/fabricator`, `src/integrations/yilmaz`, system packs, remnant marketplace

### Not done

- No brute-force of SQLCipher
- Solver / CAD binaries were not decompiled
- DoWin user manuals were not reproduced
- No live nested job exists in the shop DB (fresh install)

### Database state (9 Sep 2026 15:53)

Fresh seed from first launch. 0 customers, 0 designs, 0 production plans, 0 optimization runs. Accuracy numbers below are **factory defaults** and catalog seed data, not measured nest results.

SQLCipher: community 4.5.2, page size 4096, KDF 256000 iterations, 21 tables, 19 EF Core 8.0.0 migrations (Jan–Jun 2026).

---

## 3. What Yilmaz shipped

Product name in binaries: **YilmazCAD**. Install folder: **DoWin**. Self-contained .NET 8 WPF, ~580 MB.

### Assemblies

| Assembly | Size (approx.) | Role |
|----------|----------------|------|
| `YilmazCAD.exe` / `YilmazCAD.dll` | 158 KB + 3.3 MB | WPF shell, Fluent Ribbon, licensing, machine export |
| `YilmazCAD.Core` | 503 KB | Domain: Customer, Design, Profile, CutPiece, ProductionPlan |
| `YilmazCAD.Optimization.Core` | 422 KB | Column generation + Google OR-Tools 9.14.6206 |
| `YilmazCAD.Rendering` | 395 KB | SkiaSharp 2D canvas overlay |

### Desktop workflow

ProjectStart → Design canvas (hit-test, live dimensions) → Frame / Sash / Mullion / Glass / Bead panels → ProductionPlan → SendToOptimization → CutPatternVisualizer → MachineSelection → MDB / NCW / SQLite.

### Stack (from `YilmazCAD.deps.json`)

| Library | Implication |
|---------|-------------|
| Google.OrTools + libscip + HiGHS | Industrial MIP cutting-stock |
| devDept.Eyeshot 2026 + ACadSharp + IxMilia.Dxf | DWG/DXF CAD |
| Xbim | IFC / BIM import path |
| DSTV.Net | Steel NC interchange (secondary) |
| System.Data.OleDb + `template.mdb` | Legacy Yilmaz Access controller files |
| SQLitePCLRaw `e_sqlcipher` | Encrypted local shop database |
| IntelliLock + Hardware.Info | License / machine binding |
| QuestPDF | Shop PDFs (cost, labels, preview) |

### Locales

17 locales including `tr`, `en`, `ru`, `zh-Hans`, `ja`. **No Arabic.**

### Default machines enabled in Settings

- DC-550 SKH: on
- DC-600: on
- CDC-600, CK-412, NCX: off

---

## 4. Shop database schema (opened)

### Tables and row counts

| Table | Rows | Role |
|-------|------|------|
| Settings | 1 | Global manufacturing constants |
| ProfileSystems | 2 | Deceuninck 70 PVC, Ak-Plast 60 aluminium |
| Profiles | 17 | Frame / sash / mullion / bead / steel / corner |
| ComponentGroups | 2 | Steel + corner options on Z sash |
| AccessoryCategories | 22 | EN 13126 tree |
| Accessories | 10 | Roto, Hoppe, Siegenia, GU, … |
| OperationTemplates | 17 | Drill / slot / pocket CAM |
| GlassTypes | 12 | IGU inner / outer / spacer / total |
| Customers, Designs, Projects, ProductionPlans, OptimizationRuns, RawMaterials, ImageTemplates, MachineExportRecords | 0 | Empty shop |

### EF migrations (product history)

1. InitialCreate (2026-01-09)
2. AddAccessoryTables
3. AddProfileSystemToAccessory
4. RemoveAccessorySeedData
5. AddCornerConnection
6. AddProductionPlans
7. AddImageTemplates
8. AddCostAndGlassTypes
9. AddGlassTypeThicknessFields
10. AddMachineListVisibilitySettings
11. AddMinimumReusableLength
12. AddIsReusableOffcutFlag
13. AddProfileDxfFields
14. AddOptimizationRunHistory
15. AddSashOffsetAndMullionOffset
16. ProfileSystemColorPalette
17. AddCustomerDatabase
18. AddImageTemplateOutputFormats
19. SoftDeleteProductionPlans (2026-06-03)

### `Designs` storage

Each design is `JsonData` (TEXT) plus optional `ProjectId` / `ProfileSystemId`. There is no live example in this install.

### `OptimizationRuns` metrics DoWin already stores

`DurationSeconds`, `OverallYieldRate`, `TotalUsedBars`, `TotalUsedLengthMm`, `TotalReusableOffcutLengthMm`.

---

## 5. Factory Settings — accuracy contract

Single row in `Settings`. This is the millimetre contract ALMONA must match.

| Field | DoWin default | ALMONA today |
|-------|---------------|-------------|
| WeldingWaste | **3.0 mm** | `burnOffMm` 3.0 — matches |
| SawThickness (kerf) | **4 mm** | **3 / 5 / 10 mm in three engines** |
| GlazingClearance | 2.5 mm | `GlassAllowanceSpec`, not one global |
| SashOffset | **7.0 mm** | missing as first-class field |
| PvcMullionOffset | 0.0 mm | missing |
| TrimCut | 0.0 mm | `endDeductionMm` 20 in `AlmonaCuttingEngine` |
| CompLessThan90Left / Right | 0 / 0 (tunable) | not modelled |
| CompGreaterThan90Left / Right | 0 / 0 (tunable) | not modelled |
| RobotSafetyLength | 0 | n/a |
| MinimumReusableLengthMm | **500** | 300 in `AlmonaCuttingEngine` |
| ProfileWasteMarginPercent | 0 | n/a |
| TaxRate | 0.20 (Turkish KDV) | Egyptian pricing / VAT |
| TrolleyCount / UnitCount | 10 / 4 | n/a |

### Kerf split in ALMONA (must be unified)

| File | Kerf used |
|------|-----------|
| `UPVCCuttingEngine.ts` | 3 mm |
| `LinearOptimizer.ts` | 5 mm |
| `BatchOptimizationService.ts` | 5 mm |
| `AlmonaCuttingEngine.ts` / `VisualCuttingPlan.tsx` | 10 mm |
| DoWin `SawThickness` | **4 mm** |

A 20-piece bar packed with 10 mm kerf vs 4 mm kerf differs by 120 mm of assumed waste. Remnant keep/drop then diverges.

---

## 6. Profile and overlap model

Profile types in seed (integer `Type`): 1 Frame, 2 Sash, 3 Mullion, 4 GlazingBead, 20 SupportSheet, 21 CornerConnection.

### Deceuninck 70 Z sash (only profile with overlap filled)

| Field | mm | Meaning |
|-------|-----|---------|
| Thickness / Height | 60 / 70 | Z sash section |
| JoinAngle | 45 | Welded corner |
| YatayBasma | 12 | Horizontal overlap / rebate |
| DikeyBasma | 16 | Vertical overlap / rebate |
| YatayKaynak / DikeyKaynak | 6 / 6 | Weld allowance per axis |
| Component groups | Destek Sacı 1.5/2.0 mm; Köşe plastic/metal | Options on the sash |

Frame, mullion, bead, steel, and **all Ak-Plast aluminium** profiles have Basma/Kaynak **null**. Overlap is a sash-system property, not a global K-factor on width.

ALMONA currently uses `calculateKFactor` (`width × tan(angle/2)` + wall correction) as the primary sash correction. That is a different model.

### Seed catalog vs ALMONA packs

| DoWin seed | ALMONA system packs |
|------------|-------------------|
| Deceuninck 70 PVC, Ak-Plast 60 Alu only | ROCK 60, Panda 50/100, Caluminium PS, Anadolu W60, ASAS, Kale, Egyptian UPVC |

DoWin can attach DXF + PNG preview per profile (`DxfData`, `DxfPreviewPng`). Seed rows have those blobs null.

---

## 7. Hardware CAM

Accessories are not a price list. Each SKU has `PlacementRuleJson` and `OperationTemplates`.

### Operation type enum (from seed rows)

| Type | Meaning | Example |
|------|---------|---------|
| 0 | Drill | 12 mm spindle at Y=22.5, surface 2, depth 40; P1 = diameter |
| 1 | Slot | Drain 30×5×45 mm; vent 200×10×30 mm |
| 2 | Pocket | Hinge 18×13×14 mm; lock cartridge 92×16×20 |

**YMode:** 0 = fixed Y, 1 = ratio (vent at 0.5), 3 = geometry centre (lock).

**Multi-position placement:** hinge pair 150 mm from each end; dual drains 100 mm from each end, `AllowMultiple: true`.

ALMONA `YilmazGCodeGenerator` has drill/mill operations at machine-spec level; it does not yet bind EN 13126 SKUs to these templates.

---

## 8. Glass IGU model

12 seed types. Schema: `InnerThickness + SpacerWidth + OuterThickness = TotalThickness`.

Typical: 4+9+4 (total **17 mm**), 4+10.5+4 (total **18.5 mm**). Unit prices in seed are 0.0.

App setting `MinGlassProductionSize` = **50 mm** (`appsettings.json`).

---

## 9. Cut optimizer (architecture, not decompiled)

DoWin `YilmazCAD.Optimization.Core` is a textbook cutting-stock pipeline:

1. HeuristicSolvers seed initial patterns  
2. InitialPatternGenerator builds columns  
3. ColumnGenerationLoop prices new patterns (Gilmore–Gomory)  
4. FinalModelSolver integer-solves the master (OR-Tools / SCIP / HiGHS)  
5. SolutionRefiner local-improves the packing  
6. `GetCompensationForPart` applies saw / weld offsets  

ALMONA:

1. ApexEngineV6 computes frame/sash lengths (microns)  
2. AlgorithmSelector: greedy / linear / genetic (rule-based, AICS-001)  
3. LinearOptimizer: Best Fit Decreasing  
4. BatchOptimizationService pools a project  
5. AlmonaCuttingEngine remnant chaining  
6. EgyptianPatternOptimizer for common grids  

Column generation is linear programming, not ML. It can live in ALMONA’s Python backend as Tier 3 mathematics: fixed solver, fixed timeout, auditable pattern list, human accept on the cut sheet.

**Do this after lengths match.** A better nest on wrong piece lengths still scraps.

---

## 10. Capability scores (qualitative 0–100)

Not timed benchmarks. Audit judgment only.

| Capability | DoWin | ALMONA |
|------------|------:|-------:|
| Cut optimizer | 92 | 54 |
| Native CAD / DXF | 88 | 48 |
| Hardware CNC ops | 86 | 38 |
| Machine CAM export | 82 | 72 |
| Shop-floor UX | 85 | 52 |
| Profile catalog | 42 | 78 |
| Welding compensation | 80 | 74 |
| Arabic / Egypt | 18 | 88 |
| Cloud / multi-user | 20 | 82 |
| After-sales / YDT | 12 | 84 |

---

## 11. Egypt gap (feedback to Yilmaz)

DoWin is a strong Turkish/EU shop CAD. Egypt will not adopt it as-is.

| Egypt need | DoWin | ALMONA |
|------------|-------|--------|
| Arabic UI + RTL | Missing | ar-EG, Cairo timezone default |
| Local systems | Deceuninck + Ak-Plast only | Panda, Caluminium, Egyptian UPVC |
| 6.5 m bars | RawMaterials.LengthMm | 6500 mm option in AlmonaCuttingEngine |
| EGP + VAT | Generic cost PDF, TaxRate 0.20 | EgyptianPricingEngine |
| Yilmaz service | None | YilmazEgyptRules + TechChecklist |
| Multi-shop remnants | Local offcuts (`IsReusableOffcut`) | RemnantMarketplace by governorate |
| Field sales quotes | Desktop, single-instance DB mutex | Browser |

Product requests for Yilmaz (not patches to their binaries): Arabic `ar-EG`; official Egypt system packs; documented NCW/JSON API; multi-operator LAN DB; mapping of `YatayKaynak` to Egypt 3 mm weld burn-off so shops do not double-compensate; optional LAN send to AIM/ALM/PIM.

---

## 12. Accuracy plan for ALMONA

**Definition of done:** millimetre length sent to a Yilmaz saw matches DoWin for the same elevation, system, and settings (±0.1 mm per piece). Nest quality is a later yield goal.

### Phase 0 — one settings object (1–2 days)

New canonical module: `src/lib/fabricator/ManufacturingSettings.ts` matching the DoWin `Settings` row.

| File | Change |
|------|--------|
| `UPVCCuttingEngine.ts` | kerf from settings (4), not 3 |
| `LinearOptimizer.ts` / `BatchOptimizationService.ts` | kerf 4, not 5 |
| `AlmonaCuttingEngine.ts` / `VisualCuttingPlan.tsx` | kerf 4, usable remnant 500, trimCut 0 not 20 |
| `src/tests/constitutional/GuaranteeVerification.test.ts` | lock constants; no silent drift |

AICS-001: these are deterministic constants, not ML.

### Phase 1 — length formula (3–5 days)

Replace K-factor-on-width as the only sash correction with DoWin’s split model:

| Term | Formula / source |
|------|------------------|
| Outer finished size | WindowUnit width/height |
| Sash rebate | finished − 2 × SashOffset (7 mm) |
| Horizontal piece | sashInner + YatayBasma + YatayKaynak + WeldingWaste |
| Vertical piece | sashInner + DikeyBasma + DikeyKaynak + WeldingWaste |
| Mullion (PVC) | + PvcMullionOffset (default 0) |
| Glass | daylight − 2 × GlazingClearance (2.5); reject under 50 mm |
| Bar packing | Σ(piece + SawThickness) + TrimCut; remnant ≥ 500 kept |
| Non-square angles | CompLessThan90 or CompGreaterThan90 on each end |

**Golden fixture:** Deceuninck 70 Z sash 12/16/6/6. Build one casement in DoWin, export the cut list, assert ALMONA within 0.1 mm. Until that design exists, unit-test against Settings + Profile rows.

**FP-024A checkpoint (9 Sep 2026):** Licensed asdd export ingested as a three-layer fixture (nominal / packed / machine). Beads have no MDB LENGTH so machine stays null. Glass and non-square angle remain UNPROVEN. Represented categories FAIL vs isolated ALMONA actuals. `dowinParityGatePasses` is **false**. Physical-length score stays **6.0/10**. See `docs/audits/FP-024A-EXTERNAL-DOWIN-GOLDEN-PARITY_2026-09-09.md`. PDFs/MDB are not in the repo.

### Phase 2 — CAM operations (~1 week)

- `OperationTemplate` on accessories (Drill / Slot / Pocket, Surface, YMode, P1/P2/Depth)
- Multi-position rules (hinge pairs, dual drains)
- Feed `YilmazGCodeGenerator`

Without this, accuracy stops at the saw.

### Phase 3 — nest quality (after lengths match)

- Column generation via public OR-Tools APIs in `python_backend`
- `AlgorithmSelector` algorithm `'column'`, operator accept on cut sheet
- Reusable offcuts into the next run (`RawMaterials.IsReusableOffcut`)
- `OptimizationRun` persistence: yield %, bars, reusable mm, duration
- NCW export beside CSV/MDB; machine flags DC-550 SKH + DC-600 default on

### Success bar

| Check | Pass |
|-------|--------|
| Kerf constant | Exactly one default (4 mm), overridable per machine |
| Deceuninck 70 sash pieces | ±0.1 mm vs DoWin cut list |
| Glass 4+9+4 | Total 17 mm, pane ≥ 50 mm |
| Remnant keep/drop | Same as DoWin at 500 mm |
| AICS-001 | No ML; settings table; operator accept on sheet |

---

## 13. ALMONA enhancement backlog (independent of DoWin source)

1. **P0** Single `ManufacturingSettings` (kerf 4, weld 3, sashOffset 7, glassClearance 2.5, remnant 500).
2. **P0** Per-profile Basma/Kaynak on SystemPack; Deceuninck Z sash 12/16/6/6 as first golden fixture.
3. **P1** Dual-end angles + CompLessThan90 / CompGreaterThan90 left/right.
4. **P1** Hardware OperationTemplates into G-code.
5. **P1** ProductionPlan + OptimizationRun entities.
6. **P1** NCW export; DC-550 SKH / DC-600 flags.
7. **P1** Feed reusable remnants into the next nest (not only marketplace).
8. **P2** GlassTypes Inner/Outer/Spacer/Total + 50 mm min pane.
9. **P2** DXF + PNG preview on profile SKU.
10. **P2** Column generation in Python backend (after Phase 1 golden test).

---

## 14. Bridge file formats

| Format | DoWin | ALMONA | Bridge use |
|--------|-------|--------|------------|
| MDB / Access | `MdbWriteHelper` + `template.mdb` | `YilmazCutListAdapter.generateMDB` | Primary CNC interchange |
| NCW | `NcwExportService` (Job/Bar/Cut/Work) | Missing | Add on ALMONA side |
| CSV | Not the main path | DC series saws | Keep for DC-421 |
| G-code | Not the primary path | `YilmazGCodeGenerator` AIM/ALM/PIM | Shops without DoWin |
| Encrypted SQLite | Shop DB | Supabase | Do not share the encrypted DB |

Suggested flow: quote in ALMONA → production plan JSON or NCW/MDB → DoWin nest + CAM → import `OptimizationRun` (bars, waste, offcuts) back to ALMONA. Do not re-nest in ALMONA after the operator has accepted DoWin’s sheet unless they explicitly re-optimize.

---

## 15. Legal / audit boundary

- Shop DB opened with DoWin’s own CurrentUser DPAPI credential on this licensed PC.
- SQLCipher passphrase and `database-credential.dpapi` contents are **not** in this file and must not be committed.
- Solver binaries were not decompiled.
- Independent column generation via public Google OR-Tools APIs is the clean implementation path.
- Do not copy Yilmaz CAD, Eyeshot licenses, or seed accessory artwork into ALMONA.

---

## 16. Sources

- `C:\Program Files\DoWin` (YilmazCAD.exe 17 Jun 2026)
- `C:\YilmazSoftDatabase\DoWin_Designs.db` (opened 9 Sep 2026)
- `C:\Program Files\DoWin\Configuration\appsettings.json`, `profiles.json`, `accessories.json`
- ALMONA: `src/lib/fabricator/AlmonaCuttingEngine.ts`, `UPVCCuttingEngine.ts`, `AlgorithmSelector.ts`, `src/integrations/yilmaz/*`

Interactive Cursor copy (same findings, tabbed UI): workspace canvases `dowin-vs-almona-audit.canvas.tsx`.
