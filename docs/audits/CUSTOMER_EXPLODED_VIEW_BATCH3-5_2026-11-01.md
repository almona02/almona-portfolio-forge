# Drafting 3D preview, assembly manifest and customer exploded view (Batches 3–5) — 2026-11-01

Branch `cursor-nov-yilmaz-export` (PR #122), continuing the Batch 1/2/6 notes in
`CUT_LEDGER_IDENTITY_BATCH1_2026-11-01.md`. AICS-001 §Tier 0 (drafting purity),
§Tier 3 (deterministic manufacturing truth): everything below is a *read model*
derived from persisted data. Explode, inspect and the part list never write to
the design, BOM or stock. No advisory inference is added.

## Reproduction (saved CALUMINIUM PS 2-sash sliding pose, FP-Y0RIPV pos 1 R9)

Reproduced with focused tests and a temporary local Vite harness rendering
`Window3DGenerator` with the R9 saved components (harness not committed). No
authenticated session was available, so the production route was not driven.

| Symptom at handoff (`6c49561b`) | Cause | Fix |
|---|---|---|
| 3D tab of a reloaded saved pose shows bare rectangles, no system / finish / parts | `authoritativeGridToDraftingState` hydrates with `materialAwareWindows: []`; `draftingToWindowUnit` returned `null` → `DraftingCanvas3D` fallback | adapter takes the saved position as authority (Batch 3) |
| Every frame / sash bar rendered as a spike pointing at the camera | `MiteredFramePart` extruded the cross-section along Z and applied the in-plane matrix unchanged; the BoxGeometry path that hid this had been disabled | `profileExtrusion.orientExtrudedPart` re-bases the extrusion (bar along X, face along Y, depth along Z; plates centred on depth) |
| Sashes drawn outside the frame (and exploded twice as far) | sash parts / glass / beads were baked in world coordinates **and** the sash group was placed at the cell centre → offset applied twice | sash geometry is now local to its group (`windowGeometry.generateGenericGeometries`) |
| Sliding sashes saved as `type: 'sash'` got casement hinges | `generateHardwarePlaceholders` only looked at the cell type | opening type of the unit decides (`normalizeOpeningType`) |
| Explode toggle and “3D Controls” overlapped at top-right; Reset did nothing | both absolutely positioned at `top-4 right-4`; `OrbitControls` had no ref | single toolbar; ref wired |
| Frame-level manual mullions drawn twice | pushed into `muntins` and again into `fixedSpacers` | drawn once |

## Batch 3 — drafting-workbench behaviour

- `draftingToWindowUnit(drafting, authoritative)` carries id, project, order/pos,
  revision, finish, system pack, glazing, hardware and the saved component ledger
  into the preview unit with an explicit `previewLedgerBinding`:
  `bound` (grid + size still match the saved revision), `design_edited` (ledger
  withheld — no stale codes), `no_saved_ledger`, `no_authority`.
- `DraftingWorkbench → DraftingWorkbenchTabs → DraftingPreview3D` pass the project;
  the preview shows system / finish / size / revision / ledger status and an
  explicit empty state for a saved pose without a grid.
- Exploded view covers frame, sashes, glass, beads/spacers/gaskets, tracks and
  guides, mullions/transoms/interlock and hardware. Offsets are relative to each
  object's assembled transform; the controller restores exactly when a key
  disappears (regeneration while exploded), and an explicit `invalidate()` makes
  the assemble pass run under `frameloop="demand"`. Browser check: explode →
  assemble → explode restores the identical assembled image; selection outline
  survives.
- Acceptance: met for the reproduced pose. Not verified: the authenticated
  production route (needs owner session).

## Batch 4 — exact customer part identities

- `lib/fabricator/assembly/assemblyManifest.ts` — one record per physical piece,
  shared by saved design, BOM and visual model. Identity: profile pieces use the
  BOM cut id `componentId:index`; glass / spacer / hardware occurrences use
  `occurrenceIdentity.buildOccurrenceId` (position id + revision + kind + cell).
  Fields: role, plain-language name and purpose, cell label (“Sash 1”), placement,
  catalogue code (explicit `UNKNOWN` when absent), supplier code, profile name,
  material, finish, design length / BOM cut length / angles, quantity, source,
  modelling (`mapped` / `unmodelled` / `pending`), BOM status (`in_bom` /
  `missing_from_bom` / `profile_mismatch` / `bom_unavailable` / `not_applicable`).
- Placement is read only from the saved component id conventions
  (`frame_<pos>_*`, `sash_<cell>_<pos>`, `bead_<cell>_<pos>`, `interlock_*`,
  `mullion_v_<n>_*`, `transom_h_<n>_*`, `design-track-*`). Anything else is listed
  but not placed, with the reason in `notes`. Mesh UUIDs are never used.
- `partRef.ts` — deterministic visual keys `kind|cell|placement|index`; the
  geometry generator tags every bar, plate, pane, spacer, bead, gasket, track,
  guide, divider and hardware placeholder; `visualPartRefs.collectVisualPartKeys`
  reports what was actually drawn so records are marked mapped / unmodelled.
- Inspector: clicking a mesh selects its manifest binding; the card shows the
  exact code of *that* member (two different frame profiles no longer collapse to
  “not assigned”). `AssemblyPartList`: searchable (name / code / cell), grouped,
  keyboard operable (arrows, Home/End, Enter, Escape), synced both ways with mesh
  selection; repeated pieces are distinct rows; unmodelled records and UNKNOWN
  codes are badged; drawn pieces without a record appear under “Visual only”.
- BOM agreement: `DraftingPreview3D` passes the workflow-store BOM only when the
  saved ledger is bound to the same position; cut ids are cross-checked
  (`ProfileBOMCalculator` real run in tests: 23/23 `in_bom`, stale BOM flags the
  missing occurrence only).
- Acceptance: met in tests and browser for the R9 pose; save/reload yields the
  same ids (JSON round-trip test).

## Batch 5 — customer exploded view (CALUMINIUM PS 2-sash sliding coverage)

| Part | Saved record | Drawn | Status |
|---|---|---|---|
| Outer frame ×4 (`PS-6601-FRAME`) | yes | yes | mapped |
| Sash members ×8 (`PS-6601-SASH`) | yes | yes | mapped |
| Interlock (`PS-6601-INTERLOCK`) | yes | yes (centre divider) | mapped |
| Tracks ×2 (`PS-6601-TRACK`) | yes | yes | mapped (PS is two-track; no third track invented) |
| Glazing beads ×8 (`PS-6601-BEAD`) | yes | yes | mapped |
| Glass ×2 | glazing spec | yes | mapped, code `UNKNOWN` until a glass code is saved |
| Spacer / gasket set ×2 | glazing spec | yes (spacer; gaskets only drawn for Katra) | mapped, code `UNKNOWN` |
| Rollers, handles, locks, corner keys, interlock kit | system pack `hardware_kits` | placeholders drawn (rollers ×2, handle, lock per sash; corner plates) | **listed as “specified by system”, no quantity, not placed until a BOM exists**; drawn placeholders are “visual only” until then. With a BOM, quantities that divide evenly per sash are placed (`hardware|<cell>|<type>|<n>`), corner keys per corner. |
| Top guide rails | none | yes | visual only (named) |
| Reinforcement / fasteners | not in PS design or pack | no | not listed (nothing to claim) |

- Customer / Workshop switch inside the 3D toolbar (available wherever
  `showControls` is on — drafting preview and Engineering Bay). Customer view:
  Assemble/Explode, Reset View, Parts, highlight, compact card (name, code,
  material, finish, purpose, quantity), plain-language preview note with the
  count of listed-but-not-drawn parts. Hidden in customer view: cut ids, design /
  BOM lengths, angles, BOM / model / source status, validation error highlights,
  constitutional disclaimer, quality card, advanced 3D controls. No costs are
  shown in either view (the manifest has no price fields).
- Not claimed: Dowin parity. No Dowin reference image or part list was available;
  nothing here asserts visual or BOM parity with Dowin.

## Tests

`draftingToWindowUnit.test.ts` (reload path, edited-design withholding),
`applyExplodedTransforms.test.ts`, `windowGeometry.assembly.test.ts` (bar
orientation, sash-local geometry, track/interlock refs), `assemblyManifest.test.ts`
(identities, no guessing, JSON stability, real BOM agreement, hardware placement,
system-pack listing, generated-geometry binding, PS coverage audit),
`WindowPartInspector.test.tsx`, `AssemblyPartList.test.tsx`,
`DraftingPreview3D.test.tsx`, `GuaranteeVerification.test.ts` (manifest is a read
model with cut-id identities).

## Still open (explicit)

- Live R9 re-record and the browser run against the authenticated production
  route (owner session required) — unchanged from Batch 1 notes.
- Server ledger (`derive_required_cuts_from_position` allowance / quantity
  semantics) — audited in Batch 1, intentionally not implemented here.
- Hardware BOM rows are only available after the BOM step; before that the
  customer view lists system-specified hardware without quantities.
- Preset-aware geometry (`presetId` paths) and the legacy single-sash path are not
  part-ref tagged; their meshes report as “visual part (preset geometry, not bound)”.
- Pre-existing detail-component lines (weather seals / drainage) still render as
  thin lines outside the frame in the harness; untouched.
