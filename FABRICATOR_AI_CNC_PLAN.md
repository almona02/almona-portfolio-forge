# Fabricator Pro AI & CNC Integration Plan

This phase focuses on optimizing the AI capabilities for manufacturing efficiency and implementing the core CNC integration features, building on the secured infrastructure.

## 1. AI Model Optimization
- [ ] Create `python_backend/ai_services/optimization/model_converter.py`
    - Implement conversion of YOLOv8 models to ONNX format for faster CPU inference.
- [ ] Create `python_backend/ai_services/nesting/smart_nesting.py`
    - Implement 1D bin packing algorithm for profile cutting optimization (minimizing waste).
    - Integrate with `FabricatorProfiles` to use actual stock levels.

## 2. CNC Integration Core
- [ ] Create `python_backend/services/gcode_generator.py`
    - Implement G-code generation logic for supported machine types (starting with Yilmaz).
    - Use `CNCSecurity` to validate generated code before output.
- [ ] Create `migrations/YYYYMMDD_create_machine_profiles.sql`
    - Define table for storing machine configurations (post-processors parameters).
- [ ] Create `python_backend/apis/v2/machines.py`
    - Endpoints to manage machine profiles (CRUD).

## 3. Fabricator UI Enhancements
- [ ] Update `src/components/fabricator/ElsherifImportWizard.tsx`
    - Integrate the new `validate-cnc` endpoint.
    - specific handling for "clean" vs "warning" files.
- [ ] Create `src/components/fabricator/CuttingOptimizationPanel.tsx`
    - UI to select profiles, input cut list, and view nesting results.
    - Visualization of the cutting plan.

## 4. Infrastructure & Testing
- [ ] Create `python_backend/tests/test_nesting.py`
    - Unit tests for the nesting algorithm.
- [ ] Create `python_backend/tests/test_gcode.py`
    - Security and correctness tests for G-code generation.

