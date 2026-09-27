# DoWin UI reference annotations (9 September 2026)

Behaviour and information-architecture notes from the licensed DoWin user manual and asdd production exports. **Not** a pixel specification. ALMONA keeps its own typography, tokens, Arabic/RTL, and web layout.

Copyrighted screenshots are **not** stored in this repository.

---

## Stable factory flow

```text
Project → Design → Production plan → Optimization → PDF / machine export
```

Downstream tabs stay unavailable until an active project exists. ALMONA should keep that gating even if the chrome looks different.

---

## Design

```text
┌──────────────────────────────────────────────────────────────────┐
│ RIBBON — Project | Design | Production | Optimization | Export     │
├──────────────┬─────────────────────────────────┬─────────────────┤
│ LEFT         │ CENTER                          │ RIGHT           │
│ Navigator    │ CAD canvas                       │ Properties      │
│ saved designs│ live W×H mm                     │ type / profile  │
│ system       │ opening direction                │ geometry mm     │
│ project meta │ frame / sash / mullion / bead   │ glass / angles  │
└──────────────┴─────────────────────────────────┴─────────────────┘
```

Visible data: finished width/height **mm**, selected object type, profile code, left/right angle.

ALMONA today: `DraftingWorkbench` + `DraftingWorkbenchLayout` (top bar, canvas, right tools). Keep Studio features; do not replace working hit-test/canvas to imitate DoWin.

---

## Production

```text
┌─────────────────────────────┬────────────────────────────────────┐
│ TOP LEFT                    │ TOP RIGHT                        │
│ Production plans            │ Selected design preview            │
│ name, qty, dates, status    │ W×H mm, system, material          │
├─────────────────────────────┼────────────────────────────────────┤
│ BOTTOM LEFT                 │ BOTTOM RIGHT                     │
│ Positions / designs in plan │ Physical cut list                 │
└─────────────────────────────┴────────────────────────────────────┘
```

Cut-list columns (units mm / deg): Assembly ID, Profile Code, Piece Name/Role, Category, Length (mm), Left Angle, Right Angle, Quantity or physical identity, Status.

Footer: total profile length, physical piece count.

ALMONA today: planning and optimization are mixed (`ProjectOptimizer`, `ProductionCommand`). A dedicated four-region plan workspace is **not** implemented in FP-024A.

---

## Optimization

```text
┌──────────────────────────────────────────────────────────────────┐
│ KPI — duration | bars | yield | used m | remaining | reusable | unplaced │
├──────────────────────────────┬───────────────────────────────────┤
│ Required parts               │ Stock                            │
│ code, role, L mm, angles, qty│ stock code, L mm, qty, source     │
├──────────────────────────────┴───────────────────────────────────┤
│ Tabs: Optimization results | Unplaced parts                    │
│ used stock, L mm, cut count, used, remaining, yield, qty, reusable │
├──────────────────────────────────────────────────────────────────┤
│ Bar visualizer — physical ID, assembly label, nominal, packed,    │
│ angles, kerf boundary; remaining = reusable vs scrap               │
└──────────────────────────────────────────────────────────────────┘
```

Unplaced parts must remain visible. Impossible jobs must not look like success.

ALMONA today: `VisualCuttingPlan` is a bar visualizer using canonical `barConsumedLengthMm` and `isReusableRemnantLength`. It is not yet a required-parts/stock cockpit.

---

## Export

```text
PDF:  [ ] cutting report  [ ] assembly/labels  [ ] design preview  [ ] cost/quote
Machine: family selector → capability check → format (MDB / G-code / NCW)
         settings snapshot/hash → operator confirm → persist export record
```

ALMONA: MDB via `YilmazCutListAdapter`; G-code via `YilmazGCodeGenerator`. NCW is **unsupported** (`evaluateMachineExportPreflight`). Unplaced physical cuts block export.

---

## Transferable ideas vs ALMONA identity

| Keep from DoWin (ideas) | Keep ALMONA |
|--------------------------|-------------|
| Task-specific screen regions | Fabricator tokens, Arabic/RTL, responsive web |
| Physical assembly labels through cut/assembly | Egypt SystemPacks, CRM/ERP, RealityOS |
| Explicit unplaced + settings provenance | IntelligenceGate / no ML in execution |
| Modular reports | ALMONA branding and terminology |
