# Phase 2: Egyptian Standard Library & Frontend Integration

This phase focuses on populating the parametric library with standard Egyptian window/door types and integrating them into the frontend.

## 1. Parametric Templates (Data Population)
Create `scripts/seed_egyptian_library.py`:
- A script to populate `fabricator_system_packs` with real-world Egyptian systems (e.g., Alumil M11000, PS9600).
- Insert ~20 standard parametric models into `parametric_models` (Sliding 2-sash, Casement, Turn-Tilt).
- Define standard dimensions and variants in `model_variants`.

## 2. Frontend Integration (React)
- **API Service**: Create `src/services/fabricatorService.ts` to consume the new V2 endpoints.
- **Model Browser**: Create `src/components/fabricator/ModelLibraryPanel.tsx` - a sidebar to browse and drag-and-drop models.
- **SmartDraw Integration**: Update `SmartDrawCanvas.tsx` to handle dropped models:
    - Fetch geometry/properties on drop.
    - Visualize the parametric model (start with a placeholder box or basic geometry if GLB not ready).

## 3. Thermal Analysis UI
- **Analysis Panel**: Create `src/components/fabricator/ThermalAnalysisPanel.tsx`.
- **Integration**: Trigger `POST /fabricator/thermal/calculate` when profile systems change.
- **Visualization**: Display U-values and compliance status (Red/Green badge).

## 4. Grid Pricing UI
- **Pricing Display**: Update the existing pricing component to query `GET /fabricator/pricing/grid` when dimensions change.
