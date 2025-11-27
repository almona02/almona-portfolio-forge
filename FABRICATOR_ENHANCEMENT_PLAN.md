# Fabricator Platform Enhancement Plan
## Comprehensive Development Roadmap for Turkish & Egyptian Markets

**Version:** 1.0  
**Date:** 2024  
**Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines a comprehensive enhancement plan to transform the Almona fabricator platform into a powerful, user-empowered tool with advanced customization, robust reporting, and cutting-edge optimization algorithms. The plan focuses on competitive advantages for the Turkish and Egyptian markets, and on reaching parity with, then surpassing, major aluminium design / cutting / reporting systems (Orgadata / Logikal, KLAES, ERCOM 2000, etc.) for fabricators across Egypt, Turkey, MENA, and the Gulf.

---

## 🧭 Competitive Roadmap Overview (A / B / C)

This section condenses the competitive strategy into three pillars that map onto the detailed phases below.

### A. Core Parity With Big Systems (Short–Mid Term)

**Goal:** Match the core capabilities of leading aluminium fabrication systems.

- **Deeper profile system libraries**
  - Expand the existing ROCK 60 + ELSHERIF implementations into full system libraries for:
    - Major Turkish systems (Yılmaz, Kale, Asas, Winsa, etc.).
    - Key Egyptian systems (Alsalam PS small/big/jumbo, Alumil Egypt, others).
    - Gulf‑popular curtain wall / façade systems.
  - For each system:
    - Complete cutting rules (L/H-based formulas, allowances, angle rules).
    - Hardware kits and gaskets (codes, quantities, positions).
    - Stock lengths per supplier (typically 6000–7500 mm, capped at 8000 mm).
    - Finish options (powder coat, anodized, wood effect) and pricing per finish.
    - Verified catalog IDs and references to original technical manuals.
  - Extend the current `ROCK60_WINDOW_SYSTEM_TEMPLATE` into a **pluggable “system pack” architecture**:
    - Each pack encapsulates: profiles, accessories, cutting rules, glass rules, constraints, pricing presets.
    - Packs can be turned on/off per tenant/region.

- **Machine‑ready cutting, not just lists**
  - Move from human‑readable lists to **machine‑ready post‑processors**, similar to Logikal exports:
    - DXF per profile/element with reference points for machining centers.
    - CSV/XML/JSON outputs aligned with common saw / machining center formats (Elumatec, Fom, Emmegi, etc.).
    - Per‑machine export profiles (column mapping, units, rounding, tolerances, file naming).
  - Build on the existing `DXFExportGenerator`, `CSVExportGenerator`, `PDFExportGenerator`:
    - Add a small “machine profile” registry describing required fields and layout for each supported machine type.
    - Expose this through Fabricator Pro as “Export to [Machine XYZ]” options.

- **Richer constraints & structural validity**
  - Beyond the global 8000 mm max stock length (already enforced in the cutting engine), add per‑system rules:
    - Min/max sash widths/heights.
    - Max glass area/weight per hardware configuration.
    - Min overlaps, clearances, rebates per profile system.
    - Simple wind‑load/span presets per region (Egyptian codes, Turkish TSE, Gulf conditions).
  - Evolve `validateProject` into a **configurable rules engine per profile system**:
    - Rule sets live in `specifications` for each system pack.
    - Validation messages explain violations in everyday shop‑floor language.

- **Quoting & commercial layer**
  - Build on:
    - `OptimizationResult` cost breakdowns.
    - ROCK 60 pricing setup (`rock60_pricing`).
  - Extend to:
    - Full offer/quote generator:
      - Multi‑currency (EGP, TRY, SAR, AED, QAR, USD).
      - Margins, discounts, payment terms.
      - Option to lock offers to a metal price index/date.
    - Customer templates in the client portal with revision history.
    - “What‑if” pricing:
      - Change aluminium price per kg and re‑price all open jobs.
      - Sensitivity analysis (e.g. ±5 % aluminium, ±10 % glass).
    - Export offers as branded PDFs and, optionally, push summarized data into accounting/ERP.

### B. Regional Edge (Egypt / Turkey / MENA / Gulf)

**Goal:** Be the most natural, localized, and efficient daily tool for regional fabricators.

- **Regional defaults & UX**
  - Make **Egypt/Turkey/MENA/Gulf presets first‑class**:
    - Default currencies and VAT/tax handling per country.
    - Default wind zones and common building types (villa, tower, compound, mall).
    - Extend existing multi‑locale JSON to cover technical aluminium vocabulary in Arabic, Turkish, French, English.
  - Pre‑configure **common “recipes”**:
    - PS sliding (small/big/jumbo), tilt‑and‑turn, shopfront, curtain wall, sliding/folding doors.
    - Recipes should match how users speak: e.g. “PS jumbo balcony door with 5 cm border”.

- **Multi‑branch / multi‑workshop workflows**
  - Many regional companies have:
    - Head office (quoting/design).
    - One or more factories/workshops.
    - Site installation teams.
  - Build on Supabase + existing audit/backup tables to support:
    - Branch‑aware inventory (extend `inventory_locations` usage).
    - Role‑based dashboards:
      - Office: pipeline, quotations, approvals.
      - Factory: cutting lists, remnant usage, machine queues.
      - Site: installation status, punch lists, QA.
    - Project hand‑off chain: `Design → Cutting → Assembly → Glazing → Installation → Handover`, with status tracking.

- **Field‑friendly tools**
  - You already have `SmartMeasuringInterface` and mobile/AR documentation.
  - Next steps:
    - Offline‑first tablet app for site measurements:
      - Uses local storage / IndexedDB.
      - Syncs back to Supabase when online.
    - Simple site QA checklists integrated with `QualityControl`:
      - Photo capture and mark‑up per element.
      - Pin issues on a simple elevation drawing or 3D model.

### C. High‑End Optimization & Reporting (To Surpass Competitors)

**Goal:** Go beyond parity into optimization and insight that legacy tools struggle to provide.

- **Strong optimization engine**
  - Continue Phase 4 plan:
    - Production‑ready GA for aluminium profiles (fast, robust, parameterized).
    - CP / exact solvers for glass nesting (2D sheet cutting).
    - Cross‑job “mass production” mode:
      - Aggregate all suitable open jobs.
      - Optimize cutting across them in one run.
      - Especially valuable for high‑volume MENA/Gulf operations where scrap reduction is critical.

- **Deep reporting & BI**
  - Build on `fabricator_query_metrics`, audit logs, backup snapshots:
    - Workshop KPIs:
      - Waste percentage.
      - Machine utilization.
      - Remnant usage vs. scrap.
      - Late jobs by branch or customer.
    - Cost KPIs:
      - Material vs hardware vs glass vs labor share.
      - Margin per project / customer segment.
    - Simple dashboards that factory managers can use daily (big numbers, clear trends).

- **Addictive daily UX**
  - Focus on:
    - Very fast job creation (templates, system presets, cloning).
    - One‑click: “Generate cutting, glass, accessories reports + export to machines”.
    - Minimal clicks from `Measurement → Design → Optimization → Inventory → Production → Quality`.
  - Make Fabricator Pro feel like a **cockpit, not a form**:
    - Use the existing step ribbon + side panels, but keep performance polished
      (code‑splitting, light initial bundle, responsive on mid‑range workshop PCs).

---

## ✅ Recent Implementation Status (Q4 2025 – Fabricator Workspace & Inventory)

This section captures the latest implemented features so the roadmap can be updated and future upgrades can build on a clear baseline.

- **Fabricator Workspace Cockpit (aligns with Phase 1.1 / Phase 5.2 / “Addictive daily UX”)**
  - Implemented `FabricatorWorkspaceContext` (`src/context/FabricatorWorkspaceContext.tsx`) as a persistent, app-wide workspace state:
    - Tracks `currentProject`, `currentCustomer`, `currentMeasurement`, `DraftQuote` / `DraftInvoice`, `profileEdits`, and `inventoryEdits`.
    - Auto-persists to `localStorage` (`fabricator-workspace-v1`) and hydrates on reload.
  - Added `FabricatorWorkspaceLayout` (`src/components/fabricator/FabricatorWorkspaceLayout.tsx`) and `/fabricator/*` routes in `src/App.tsx`:
    - Unified cockpit with tabs for **Projects**, **Customers**, **Inventory**, and **Commercial**.
    - Workspace state is shared across all tabs and is not lost during navigation.

- **Inventory Intelligence & Stock Intake (aligns with Phase 1.3 Visual Stock Management)**
  - Enhanced `InventoryDashboard` (`src/components/fabricator/InventoryDashboard.tsx`):
    - Remnant analytics via `RemnantManager` (available length, value, expiring stock, usage counts).
    - Stock alerts (`stock_alerts` via Supabase RPC), stock movement history, and multi‑location inventory selection (`inventory_locations`).
  - Implemented **Stock Intake by Invoice** in `InventoryDashboard`:
    - System pack and role‑aware selection (ROCK 60 / JUMBO 100, frame/sash/bead).
    - Auto‑derives default bar length and weight‑per‑meter from system packs (`ROCK60_WINDOW_SYSTEM_TEMPLATE`, `JUMBO100_WINDOW_SYSTEM_SPEC`) when not present on the profile.
    - “Painted” toggle with pack‑specific color dropdowns (RAL / JUMBO colors) and notes persisted into `stock_movements`.
    - CSV invoice import (`profile_code, quantity, unit, bar_length_m, invoice_no, supplier`) with mapping to existing profiles (by supplier/internal codes, profile numbers, or names).

- **Conflict‑Aware Profile Saving (aligns with Phase 5.2 Data Synchronization – “Conflict resolution UI”)**
  - Added profile draft edits to workspace state (`profileEdits` in `FabricatorWorkspaceContext`) and wired them into `InventoryPage` (`src/pages/Inventory.tsx`):
    - `inventoryWithEdits` merges workspace edits over live Supabase data.
    - “X unsaved profile change(s)” banner shows pending edits and offers **Save All** / **Discard** controls.
  - Implemented **conditional, conflict‑aware saving** for profile edits:
    - `handleSaveAllEdits` checks Supabase `updated_at` before writing; if no rows are updated, the profile is flagged as a conflict.
    - Conflicted profiles are listed in a dedicated warning card so operators know which items were not saved and can review/decide whether to retry or adjust.
  - This is the first concrete step toward the full conflict‑resolution UX described in Phase 5.2; next evolution will extend the same pattern to accessories, stock movements, and commercial drafts.

- **Commercial Workspace Drafts (aligns with Phase 1.2 Pricing/Quoting + “Quoting & commercial layer”)**
  - Introduced `DraftQuote` and `DraftInvoice` types in `src/types/fabricator.ts` and wired them into the workspace context.
  - Implemented `CommercialPage` (`src/pages/CommercialPage.tsx`):
    - Shows all workspace-level draft quotes and invoices with counts and quick actions.
    - Supports **quote → invoice conversion** (copying core commercial fields, generating an invoice number, and moving the item into `draftInvoices`).
    - Provides a dedicated commercial cockpit under `/fabricator/commercial` that shares context with the rest of the fabricator workflow.

- **Cross‑Empire Workflow UX (aligns with “Addictive daily UX” & regional positioning)**
  - Upgraded `BosphorusWorkflowRibbon` (`src/components/fabricator/BosphorusWorkflowRibbon.tsx`) to a **Cross‑Empire Innovation** ribbon:
    - Visual towers and bridge deck themed around Ottoman craft, Egyptian precision, and YILMAZ technology.
    - Empire‑aware step metadata (`empire`, `innovation`) and dynamic efficiency/waste/innovation metrics.
  - This becomes the visual “brand spine” for the Fabricator Workflow Pro experience and supports the homepage slogan:  
    **“Where Ancient Craft Meets YILMAZ Precision. Built on Empires. Tuned for Industry.”**

- **Branded System Packs & Smart Draw Presets (aligns with Phase 1.1 / 3.1 / Roadmap A – Core Parity)**
  - Introduced strongly-typed `SystemPack` and `SystemPackSmartDrawPreset` in `src/data/systemPacks.ts` and wired them into:
    - `SmartMeasuringInterface` (system-pack aware profile role selection).
    - `SmartDrawTool` (pack-specific min/max panel widths and typical panel presets).
  - Implemented concrete, region-aware packs:
    - `ROCK60_SYSTEM_PACK` and `JUMBO100_SYSTEM_PACK` with constraints and Smart Draw presets.
    - `YILMAZ_W60_PACK` (Turkish) and `CALUMINIUM_PS_PACK` (Egyptian) as first TR/EG system stubs with constraints and Smart Draw hints.
  - Updated `NewProjectWizard` and `SmartMeasuringInterface` to select system packs by region (Turkey → YILMAZ W60, Egypt → CALUMINIUM PS / ROCK 60).

- **Inventory Branded Tree (aligns with Phase 1.3 Visual Stock Management & Regional Edge)**
  - Extended `InventoryDashboard` to derive `inventoryBrandTrees` from `SYSTEM_PACKS`, `profile.systemBrand`, and `profile.specifications.window_system`.
  - Added system-pack aware filters and quick buttons for ROCK 60, JUMBO100, YILMAZ W60, CALUMINIUM PS, applied consistently to:
    - Main inventory listing.
    - Remnant lists and analytics.
  - This effectively delivers the “branded tree” UX for inventory, letting operators browse stock and remnants by familiar system packs.

- **Mass Production Mode Foundation (aligns with Phase 4.4 Mass Production Mode)**
  - Implemented `MassProductionOptimizer` (`src/algorithms/massProductionOptimizer.ts`) with:
    - Cross-project aggregation, GA-based optimisation, and remnant-aware cutting via `RemnantManager`.
    - `UnifiedCuttingPlan` output capturing baseline vs mass-mode waste, remnant usage, and timing/options metadata.
  - Added an operator-facing `MassProductionDashboard` and wrapped it in `FabricatorWorkflowPro` (`/fabricator-workflow/pro` route) to:
    - Select optimised jobs from the shared jobs store.
    - Run cross-project optimisation and visualise waste improvements.
  - Extended `WindowUnit` with `massProductionMeta` (in `src/types/fabricator.ts`) for tracking which units were included in mass-production runs and which cross-project remnants were used.

- **Pricing Engine Metal Indexing & Preview (aligns with Phase 1.2 Pricing/Quoting & Phase 2 Reporting)**
  - Extended the existing `PricingEngine` (`src/lib/pricing/PricingEngine.ts`) to support a `MetalPriceIndex`:
    - Allows aluminium base costs to be adjusted by LME or local metal indices before applying markups/discounts.
    - Added `applyMetalIndex` helper, stub indices for Turkey (`LME_TURKEY`) and Egypt (`LOCAL_EGYPT`), and a `checkMetalPriceAlert` helper for surfacing metal-price deviation alerts.
  - Introduced a `PricingPreview` component (`src/components/fabricator/PricingPreview.tsx`) and wired it into the right-hand context panel of `FabricatorWorkflow`:
    - Uses `PricingEngine` with region-aware defaults to compute a live, metal-indexed material estimate for the active project and show metal price alerts (info/medium/high) when volatility crosses configured thresholds.
  - This delivers the technical core for dynamic, metal-indexed pricing and on-screen profitability awareness, while deferring the full admin-facing Pricing Configuration UI to a later iteration.

---

## 🎯 Phase 1: User-Centric Customization & Data Management

### 1.1 Dynamic Profile & Accessory Management

**Objective:** Give users full control over their production data with intuitive interfaces for managing profiles and accessories.

#### 1.1.1 Profile Management Interface
- **Location:** `src/components/fabricator/ProfileManagement.tsx` (new)
- **Features:**
  - Add/Edit/Remove profiles with full CRUD operations
  - Profile properties:
    - Dimensions (width, height, thickness)
    - Material type (aluminum/UPVC)
    - Color selection with visual picker
    - Cost per meter
    - Cutting allowance (kerf width)
    - Grain direction (for materials that require it)
    - Supplier information
    - Stock quantity tracking
    - Min/max stock levels
  - Profile library with search and filtering
  - Import/Export profiles (JSON, CSV)
  - Bulk operations (update prices, stock levels)
  - Profile templates for common systems (Yilmaz, local brands)

#### 1.1.2 Accessory Management Interface
- **Location:** `src/components/fabricator/AccessoryManagement.tsx` (new)
- **Features:**
  - Hardware catalog management:
    - Locks, hinges, handles
    - Seals, spacers, corners
    - Custom accessory types
  - Properties per accessory:
    - Name, type, category
    - Unit price and markup
    - Base cost
    - Supplier/SKU
    - Compatible materials
    - Regional availability (Turkey/Egypt)
  - Visual accessory library with images
  - Compatibility matrix (which accessories work with which profiles)
  - Bulk pricing updates

#### 1.1.3 Database Schema Updates
- **Migration:** `migrations/004_fabricator_profiles_accessories.sql` (new)
- **Tables:**
  ```sql
  -- User-defined profiles
  CREATE TABLE fabricator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    material TEXT NOT NULL, -- 'aluminum' | 'upvc'
    width DECIMAL(8,2) NOT NULL,
    height DECIMAL(8,2) NOT NULL,
    thickness DECIMAL(8,2),
    color TEXT,
    cost_per_meter DECIMAL(10,2) NOT NULL,
    cutting_allowance DECIMAL(5,2) DEFAULT 3.0,
    grain_direction TEXT, -- 'horizontal' | 'vertical' | null
    supplier TEXT,
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    max_stock_level DECIMAL(10,2),
    system_brand TEXT, -- 'Yilmaz', 'Local Brand', etc.
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- User-defined accessories
  CREATE TABLE fabricator_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'hinge' | 'lock' | 'handle' | 'seal' | etc.
    category TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    base_cost DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 30.0,
    supplier TEXT,
    sku TEXT,
    description TEXT,
    compatible_materials TEXT[], -- ['aluminum', 'upvc']
    region TEXT[], -- ['turkey', 'egypt', 'global']
    image_url TEXT,
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Profile-Accessory compatibility
  CREATE TABLE profile_accessory_compatibility (
    profile_id UUID REFERENCES fabricator_profiles(id) ON DELETE CASCADE,
    accessory_id UUID REFERENCES fabricator_accessories(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, accessory_id)
  );
  ```

#### 1.1.4 API Endpoints
- **Location:** `python_backend/apis/fabricator_profiles.py` (new)
- **Endpoints:**
  - `GET /api/v2/fabricator/profiles` - List user profiles
  - `POST /api/v2/fabricator/profiles` - Create profile
  - `PUT /api/v2/fabricator/profiles/{id}` - Update profile
  - `DELETE /api/v2/fabricator/profiles/{id}` - Delete profile
  - `GET /api/v2/fabricator/accessories` - List accessories
  - `POST /api/v2/fabricator/accessories` - Create accessory
  - `PUT /api/v2/fabricator/accessories/{id}` - Update accessory
  - `DELETE /api/v2/fabricator/accessories/{id}` - Delete accessory

**Estimated Effort:** 3-4 weeks  
**Dependencies:** Database migration, Supabase setup

---

### 1.2 Integrated Pricing Configuration

**Objective:** Centralized pricing system that integrates with quoting engine and all reports.

#### 1.2.1 Pricing Configuration Page
- **Location:** `src/components/fabricator/PricingConfiguration.tsx` (new)
- **Features:**
  - Material price management:
    - Base cost per profile/material
    - Markup percentages
    - Regional pricing (Turkey vs Egypt)
    - Currency support (TRY, EGP, USD)
    - Price history tracking
  - Accessory pricing:
    - Base costs
    - Markup rules
    - Quantity discounts
  - Labor cost configuration:
    - Hourly rates
    - Operation-specific rates
    - Regional adjustments
  - Price update workflows:
    - Bulk updates
    - Scheduled updates
    - Import from CSV/Excel

#### 1.2.2 Pricing Integration
- **Location:** `src/lib/pricing/PricingEngine.ts` (new)
- **Features:**
  - Real-time price calculation
  - Integration with quoting engine
  - Automatic price updates in reports
  - Price validation and alerts
  - Cost breakdown generation

#### 1.2.3 Database Schema
- **Migration:** `migrations/005_pricing_configuration.sql` (new)
- **Tables:**
  ```sql
  CREATE TABLE pricing_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES fabricator_profiles(id) ON DELETE SET NULL,
    accessory_id UUID REFERENCES fabricator_accessories(id) ON DELETE SET NULL,
    base_cost DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 30.0,
    final_price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EGP',
    region TEXT, -- 'turkey' | 'egypt' | 'global'
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

**Estimated Effort:** 2-3 weeks  
**Dependencies:** Profile/Accessory management (1.1)

---

### 1.3 Visual Stock Management

**Objective:** Real-time inventory dashboard with visual tracking and remnant management.

#### 1.3.1 Enhanced Inventory Dashboard
- **Location:** `src/components/fabricator/InventoryDashboard.tsx` (enhance existing)
- **Features:**
  - Real-time stock levels visualization
  - Stock alerts (low stock, out of stock)
  - Usage tracking per project
  - Remnant material management:
    - Track leftover materials from cuts
    - Remnant repository for future jobs
    - Automatic remnant matching
    - Remnant utilization suggestions
  - Stock movement history
  - Inventory reports:
    - Stock valuation
    - Turnover rates
    - Reorder recommendations

#### 1.3.2 Remnant Management System
- **Location:** `src/lib/inventory/RemnantManager.ts` (enhance existing)
- **Features:**
  - Automatic remnant creation after cuts
  - Remnant search and matching
  - Remnant optimization in cutting plans
  - Remnant expiration tracking
  - Remnant utilization analytics

#### 1.3.3 Database Schema
- **Migration:** `migrations/006_remnant_management.sql` (new)
- **Tables:**
  ```sql
  CREATE TABLE material_remnants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES fabricator_profiles(id) ON DELETE CASCADE,
    length DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    source_project_id UUID, -- Reference to project that created this remnant
    source_cut_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    used_in_project_id UUID,
    status TEXT DEFAULT 'available', -- 'available' | 'reserved' | 'used' | 'expired'
    expiration_date TIMESTAMPTZ,
    notes TEXT
  );

  CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES fabricator_profiles(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'in' | 'out' | 'adjustment' | 'remnant_created' | 'remnant_used'
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT 'meters',
    project_id UUID,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
  );
  ```

**Estimated Effort:** 2-3 weeks  
**Dependencies:** Profile management (1.1)

---

## 📊 Phase 2: Advanced Reporting & Export Capabilities

### 2.1 Cutting List Report

**Objective:** Comprehensive cutting list report for shop-floor use.

#### 2.1.1 Enhanced Cutting List Report
- **Location:** `src/modules/reporting/CuttingListReport.tsx` (enhance existing)
- **Features:**
  - Detailed profile cutting instructions:
    - Profile name, material, color
    - Stock length used
    - All cuts with lengths and angles
    - Cut sequence/order
    - Waste per stock piece
    - Utilization percentage
  - Visual cutting diagrams
  - Barcode/QR code for tracking
  - Machine-specific instructions
  - Multi-format export:
    - PDF (print-ready)
    - CSV (for spreadsheets)
    - DXF (for CAD integration)

#### 2.1.2 Report Generation Service
- **Location:** `src/lib/reports/CuttingListGenerator.ts` (new)
- **Features:**
  - PDF generation with jsPDF/pdf-lib
  - CSV export with proper formatting
  - DXF export for CAD systems
  - Customizable templates
  - Multi-language support (EN, AR, TR)

**Estimated Effort:** 2 weeks  
**Dependencies:** Cutting optimization engine

---

### 2.2 Accessories Report

**Objective:** Detailed hardware and accessories list for procurement.

#### 2.2.1 Accessories Report Generator
- **Location:** `src/modules/reporting/AccessoriesReport.tsx` (new)
- **Features:**
  - Complete hardware list:
    - Item name, type, quantity
    - Unit price and total cost
    - Supplier information
    - SKU/part numbers
    - Installation instructions
  - Grouped by category (locks, hinges, handles, etc.)
  - Procurement checklist
  - Export formats: PDF, CSV

**Estimated Effort:** 1-2 weeks

---

### 2.3 Glass Report

**Objective:** Detailed glazing report for glass workshop.

#### 2.3.1 Glass Report Generator
- **Location:** `src/modules/reporting/GlassReport.tsx` (new)
- **Features:**
  - Glass specifications per window:
    - Glass type (single, double, triple pane)
    - Thickness
    - Dimensions (width × height)
    - Quantity
    - Special requirements (tinted, laminated, etc.)
  - Total glass area calculation
  - Cutting optimization for glass sheets
  - Export formats: PDF, CSV, DXF

**Estimated Effort:** 1-2 weeks

---

### 2.4 Multi-Format Export System

**Objective:** Unified export system supporting PDF, CSV, and DXF formats.

#### 2.4.1 Export Service Architecture
- **Location:** `src/lib/exports/ExportService.ts` (new)
- **Features:**
  - Unified export interface
  - Format-specific generators:
    - PDF: `PDFExportGenerator.ts`
    - CSV: `CSVExportGenerator.ts`
    - DXF: `DXFExportGenerator.ts`
  - Batch export capabilities
  - Export templates
  - Progress tracking for large exports

#### 2.4.2 DXF Export Implementation
- **Location:** `src/lib/exports/DXFExportGenerator.ts` (new)
- **Features:**
  - DXF file generation (AutoCAD compatible)
  - Cutting patterns as DXF entities
  - Layer organization
  - Dimension annotations
  - Machine-readable format

**Estimated Effort:** 2-3 weeks

---

## 🚀 Phase 3: Advanced Design & Visualization Features

### 3.1 Rich Visual Design Canvas

**Objective:** Enhanced 3D visualization with brand-specific profile systems.

#### 3.1.1 Profile System Library
- **Location:** `src/data/profileSystems/` (new directory)
- **Features:**
  - Pre-defined profile systems:
    - Yilmaz profiles (Turkish market)
    - Local Egyptian brands
    - Standard aluminum/UPVC systems
  - Profile specifications:
    - Dimensions
    - Colors available
    - Material properties
    - Visual representations
  - Profile system selector in design interface

#### 3.1.2 Enhanced 3D Visualization
- **Location:** `src/components/fabricator/Window3DGenerator.tsx` (enhance existing)
- **Features:**
  - True-to-life color rendering
  - Profile-specific geometry
  - Material properties visualization
  - Brand-specific styling
  - Real-time preview updates

**Estimated Effort:** 2-3 weeks

---

### 3.2 Intelligent Mullion & Transom Drawing

**Objective:** Smart drawing tool for complex facades and multi-pane windows.

#### 3.2.1 Smart Draw Tool
- **Location:** `src/components/fabricator/SmartDrawTool.tsx` (new)
- **Features:**
  - Place first and last element
  - Automatic calculation of intermediate elements
  - Equal distance distribution
  - Custom spacing options
  - Visual feedback during drawing
  - Undo/redo support
  - Grid snapping
  - Alignment guides

#### 3.2.2 Algorithm Implementation
- **Location:** `src/algorithms/smartDraw.ts` (new)
- **Features:**
  - Distance calculation
  - Element spacing algorithm
  - Validation (min/max distances)
  - Optimization suggestions

**Estimated Effort:** 2 weeks

---

## 🧠 Phase 4: Advanced Optimization Algorithms

### 4.1 Genetic Algorithm Implementation

**Objective:** Implement GA for 1D profile cutting optimization.

#### 4.1.1 GA Optimizer Enhancement
- **Location:** `src/algorithms/geneticOptimization.ts` (enhance existing)
- **Features:**
  - Enhanced genetic operators:
    - Advanced crossover strategies
    - Mutation operators
    - Selection mechanisms
  - Constraint handling:
    - Profile compatibility
    - Stock length limits
    - Cutting angle constraints
  - Performance optimization:
    - Parallel processing
    - Early termination
    - Adaptive parameters
  - Benchmarking against known problems

**Estimated Effort:** 3-4 weeks

---

### 4.2 Constraint Programming for 2D Glass Nesting

**Objective:** Implement CP for glass sheet optimization.

#### 4.2.1 CP Optimizer
- **Location:** `src/algorithms/constraintProgramming.ts` (new)
- **Features:**
  - 2D nesting problem formulation
  - Constraint definitions:
    - No overlap
    - Sheet boundaries
    - Flexible item sizing
    - Rotation constraints
  - Solver integration (consider OR-Tools or custom solver)
  - Visualization of nesting results

**Estimated Effort:** 4-5 weeks

---

### 4.3 Improved Exact Algorithms

**Objective:** Faster exact algorithms for guaranteed optimal solutions.

#### 4.3.1 Exact Algorithm Library
- **Location:** `src/algorithms/exactAlgorithms.ts` (new)
- **Features:**
  - Dynamic programming for 1D cutting
  - Branch-and-bound for 2D nesting
  - Pruning strategies
  - Memory optimization
  - Performance benchmarking

**Estimated Effort:** 3-4 weeks

---

### 4.4 Mass Production Mode

**Objective:** Cross-project optimization for high-volume users.

#### 4.4.1 Mass Production Optimizer
- **Location:** `src/algorithms/massProductionOptimizer.ts` (new)
- **Features:**
  - Multi-project aggregation
  - Centralized remnant repository
  - Cross-project optimization
  - Batch processing
  - Resource allocation
  - Production scheduling integration

#### 4.4.2 UI for Mass Production
- **Location:** `src/components/fabricator/MassProductionMode.tsx` (new)
- **Features:**
  - Project selection interface
  - Optimization settings
  - Progress tracking
  - Results visualization
  - Export capabilities

**Estimated Effort:** 3-4 weeks

---

## 📡 Phase 5: Database & System Integration

### 5.1 Supabase Compatibility

**Objective:** Ensure seamless integration with Supabase PostgreSQL.

#### 5.1.1 Database Schema Updates
- **Location:** `migrations/007_supabase_fabricator_schema.sql` (new)
- **Features:**
  - All fabricator tables with proper types
  - RLS (Row Level Security) policies
  - Indexes for performance
  - Triggers for data integrity
  - Functions for complex queries

#### 5.1.2 Supabase Client Integration
- **Location:** `src/lib/supabase/fabricatorClient.ts` (new)
- **Features:**
  - Type-safe database client
  - Real-time subscriptions
  - Batch operations
  - Error handling
  - Connection pooling

**Estimated Effort:** 2 weeks

---

### 5.2 Data Synchronization

**Objective:** Cloud sync for multi-location fabricators.

#### 5.2.1 Sync Service
- **Location:** `src/lib/sync/SyncService.ts` (new)
- **Features:**
  - Local database (IndexedDB/SQLite)
  - Cloud sync (Supabase)
  - Conflict resolution
  - Offline support
  - Sync status tracking
  - Incremental sync

#### 5.2.2 Sync UI
- **Location:** `src/components/fabricator/SyncStatus.tsx` (new)
- **Features:**
  - Sync status indicator
  - Manual sync trigger
  - Conflict resolution UI
  - Sync history

**Estimated Effort:** 3-4 weeks

---

## 🔍 Phase 6: Deep Search & Integration

### 6.1 Academic Benchmark Integration

**Objective:** Validate optimization algorithms against known benchmarks.

#### 6.1.1 Benchmark Suite
- **Location:** `src/algorithms/benchmarks/` (new directory)
- **Features:**
  - Standard benchmark instances
  - Performance testing framework
  - Results comparison
  - Algorithm validation

**Estimated Effort:** 2-3 weeks

---

### 6.2 Commercial API Integration Research

**Objective:** Investigate integration with specialized optimization engines.

#### 6.2.1 API Research & Evaluation
- **Tasks:**
  - Research TMachines ActiveX 2D engine
  - Research SmartCut API
  - Evaluate integration feasibility
  - Cost-benefit analysis
  - Implementation plan (if viable)

**Estimated Effort:** 1-2 weeks (research phase)

---

### 6.3 Local Market Data Collection

**Objective:** Digitize technical specifications for Turkish and Egyptian profile brands.

#### 6.3.1 Profile Database
- **Location:** `src/data/marketProfiles/` (new directory)
- **Features:**
  - Yilmaz profile specifications
  - Turkish market profiles
  - Egyptian market profiles
  - Technical specification sheets
  - Cutting allowances
  - Material properties

#### 6.3.2 Data Import Tools
- **Location:** `src/lib/import/ProfileImporter.ts` (new)
- **Features:**
  - CSV/Excel import
  - Specification sheet parser
  - Data validation
  - Bulk import

**Estimated Effort:** Ongoing (data collection)

---

## 📅 Implementation Timeline

### Phase 1: User-Centric Customization (Weeks 1-8)
- Week 1-4: Profile & Accessory Management
- Week 5-7: Pricing Configuration
- Week 8: Visual Stock Management

### Phase 2: Advanced Reporting (Weeks 9-13)
- Week 9-10: Cutting List Report
- Week 11: Accessories Report
- Week 12: Glass Report
- Week 13: Multi-Format Export

### Phase 3: Design & Visualization (Weeks 14-17)
- Week 14-15: Rich Visual Canvas
- Week 16-17: Smart Draw Tool

### Phase 4: Optimization Algorithms (Weeks 18-30)
- Week 18-21: Genetic Algorithm Enhancement
- Week 22-26: Constraint Programming
- Week 27-30: Exact Algorithms & Mass Production

### Phase 5: Database Integration (Weeks 31-35)
- Week 31-32: Supabase Compatibility
- Week 33-35: Data Synchronization

### Phase 6: Deep Search & Integration (Weeks 36-40)
- Week 36-38: Academic Benchmarks
- Week 39: Commercial API Research
- Week 40+: Local Market Data (ongoing)

**Total Estimated Timeline:** 40+ weeks (10+ months)

---

## 🎯 Success Metrics

### User Engagement
- Profile library usage (profiles created per user)
- Accessory catalog adoption
- Report generation frequency
- Export format preferences

### Performance
- Optimization algorithm efficiency (waste reduction %)
- Report generation time
- Database query performance
- Sync reliability

### Business Impact
- User retention
- Feature adoption rate
- Customer satisfaction scores
- Market competitiveness

---

## 🔧 Technical Considerations

### Technology Stack
- **Frontend:** React, TypeScript, Three.js (3D visualization)
- **Backend:** Python (FastAPI), Supabase (PostgreSQL)
- **Export Libraries:** jsPDF/pdf-lib (PDF), custom (CSV), dxf-writer (DXF)
- **Optimization:** Custom algorithms, potential OR-Tools integration

### Performance Requirements
- Report generation: < 5 seconds for standard projects
- Optimization: < 30 seconds for typical cutting plans
- Database queries: < 100ms for standard operations
- Sync: Real-time with < 1 second latency

### Security & Privacy
- Row-level security (RLS) for user data
- Encrypted data transmission
- Secure API endpoints
- Data backup and recovery

---

## 📝 Next Steps

1. **Review & Approval:** Stakeholder review of this plan
2. **Resource Allocation:** Assign development team
3. **Phase 1 Kickoff:** Begin Profile & Accessory Management
4. **Weekly Progress Reviews:** Track implementation progress
5. **User Testing:** Beta testing after each phase

---

## 📚 References & Resources

- Industry software analysis
- Academic papers on cutting optimization
- Turkish/Egyptian market research
- Supabase documentation
- Three.js documentation
- DXF format specifications

---

**Document Owner:** Development Team  
**Last Updated:** 2024  
**Next Review:** After Phase 1 completion

---

## 🔁 Mapping Competitive Roadmap (A/B/C) to Phases

To keep older phases and the new competitive plan aligned and to surface missing pieces clearly:

- **A. Core parity with big systems**
  - System libraries and system packs:
    - Mapped to **Phase 1.1** (Profile/Accessory Management) and **Phase 3.1** (Profile System Library).
    - Missing: more branded packs (Turkish/Egyptian/Gulf), full cutting and hardware rules, catalog validation.
  - Machine‑ready exports:
    - Mapped to **Phase 2.1 / 2.4** (Cutting List, Export System + DXF).
    - Missing: per‑machine export profiles and field mapping for saws/machining centers.
  - Rich constraints:
    - Mapped to **Phase 4.3** (Improved Exact Algorithms) and existing `validateProject` usage.
    - Missing: per‑system constraint configs and regional structural presets.
  - Quoting & commercial:
    - Mapped to **Phase 1.2** (pricing) and **Phase 2** (reporting).
    - Missing: full quoting UX, offer PDFs, and ERP/accounting integration.

- **B. Regional edge (Egypt/Turkey/MENA/Gulf)**
  - Regional defaults & UX:
    - Spread across **Phase 1** (data models), **Phase 3** (visualization), plus localization work.
    - Missing: country presets, tax/VAT handling, and deep technical localization for all supported languages.
  - Multi‑branch workflows:
    - Mapped to **Phase 5.2** (Data Synchronization) and Supabase schema (locations, audit, backups).
    - Missing: branch‑aware UI, role definitions, and explicit project lifecycle states across departments.
  - Field tools:
    - Touches **Phase 3** (visuals) and **Phase 5.2** (sync/offline).
    - Missing: offline tablet app and richer `QualityControl` flows with photos/markup.

- **C. High‑end optimization & reporting**
  - Strong optimization engine:
    - Directly mapped to **Phase 4** (GA, CP, exact algorithms, mass production).
    - Missing: production‑grade implementations, parameter tuning, and operator‑friendly UIs for batch optimization.
  - Deep reporting & BI:
    - Built on **Phase 2** (reports) and **Phase 5.1/5.2** (Supabase schema, metrics, sync).
    - Missing: interactive dashboards, KPI cards, and exportable BI views.
  - Addictive UX:
    - Cross‑cutting: depends on delivering the high‑priority flows in Phases 1–4 and then polishing UX iteratively.

This combined plan is now the single source of truth for both the original phased roadmap and the updated competitive strategy for Egypt/Turkey/MENA/Gulf aluminium fabricators.

---

## 🏆 Almona Fabricator Platform: Ultimate Competitive Domination Plan

This addendum refines the competitive positioning of the existing phases into a **6‑month, execution‑ready roadmap** focused on beating both **European benchmarks** (Orgadata/Logikal, Klaes, ERCOM 2000) and **regional players** (Technosoft/Herofis, ECOTAL, Fenestra+).

### 🎯 Competitive Intelligence Summary

- **High‑End European Systems (Benchmarks)**
  - Orgadata/Logikal: 18,000+ users, 400+ supplier integrations, strong ERP connectivity.
  - Klaes: Mature constraint engines, extensive European system libraries.
  - ERCOM 2000: Legacy desktop systems with 20+ years of profile data.
  - **Weakness:** Slow to adapt to regional needs, expensive for local fabricators, desktop UX.

- **Regional Players (Targets)**
  - Technosoft / Herofis: Local market knowledge but weak optimization.
  - ECOTAL: Regional presence but limited cloud capabilities.
  - Fenestra+: PVC focus, different product category.

- **Your Unbeatable Advantages (From This Repo)**
  - Multi‑algorithm optimization: GA + LP + simulated annealing (`src/algorithms/*`).
  - Cloud‑native architecture: Supabase + FastAPI + React.
  - Regional system intelligence: Turkish/Egyptian profiles and localization.
  - Machine‑ready exports: DXF/CSV/PDF with QR/Barcode (`src/lib/exports/*`).
  - Real‑time 3D visualization: WebGL/Three.js‑based fabricator views.

---

### 🚀 6‑Month Domination Roadmap (Overlay on Phases 3–5)

#### Quarter 1 (Months 1–3): Optimization Supremacy

- **Priority 1 – Mass Production Optimizer (Phase 4.4 fast‑track)**
  - **Location:** `src/algorithms/massProductionOptimizer.ts` (already defined in Phase 4.4 as new).
  - **Goal:** Cross‑project optimization over multiple `WindowUnit[]` / project IDs using **remnant‑first** strategy.
  - **Requirements:**
    - Aggregate multiple projects for batch optimization.
    - Integrate with `GeneticOptimizer` and `RemnantManager` (`src/lib/inventory/RemnantManager.ts`).
    - Core method: `optimizeAcrossProjects(projectIds: string[], options: OptimizationOptions)`.
    - Output: unified cutting plan with cross‑project remnant usage tracking.
  - **KPI:** 12–15 % waste reduction vs single‑job optimization.

- **Priority 2 – Smart Draw Tool for Facades (Phase 3.2 delivery)**
  - **Location:**
    - `src/components/fabricator/SmartDrawTool.tsx` (new, already planned in Phase 3.2.1).
    - `src/algorithms/smartDraw.ts` (new, Phase 3.2.2).
  - **Features:**
    - Place first/last mullion/transom and auto‑calculate intermediates with equal spacing.
    - Grid snapping with profile‑system constraints.
    - Real‑time validation via `validateProject` / future `validateProjectWithConstraints`.
    - Canvas/WebGL‑based visual feedback, undo/redo, alignment guides.
  - **KPI:** 60 % faster façade design vs manual placement (Klaes/ERCOM baseline).

- **Priority 3 – Enhanced Turkish System Packs (Phase 3.1 + 6.3)**
  - **Location:** `src/data/profileSystems/turkish/` (new directory from Phase 3.1.1).
  - **Immediate targets:**
    - YILMAZ Window 60 series: complete cutting rules, hardware kits, structural limits.
    - KALE aluminium systems: commercial/window/facade systems with TRY pricing presets.
    - ASAS commercial series: curtain wall focus.
  - **Deliverable:** Each pack includes profiles, gaskets, cutting rules, hardware, constraints, and presets.

#### Quarter 2 (Months 4–6): Regional Market Domination

- **Priority 4 – Egyptian System Intelligence (Phase 3.1 + 6.3 for Egypt)**
  - **Location:** `src/data/profileSystems/egyptian/` (complements `src/data/marketProfiles/`).
  - **Target systems:**
    - CALUMINIUM PS profiles (sliding) – complete pack.
    - CALUMINIUM NC profiles (sliding + hinged).
  - **Extras:**
    - Egyptian wind‑load presets and span rules (see structural codes below).
    - Local supplier pricing (CALUMINIUM, Alumetalo) in EGP with FX helpers.

- **Priority 5 – Production Scheduling MVP (Phase 5.2 extension)**
  - **Location:**
    - `src/components/fabricator/ProductionScheduler.tsx` (new).
    - `src/lib/production/SchedulingEngine.ts` (new).
  - **Features:**
    - Machine queue optimization from cutting plans.
    - Installation team calendar and project hand‑off states.
    - Workshop KPI dashboard: idle time, queue length, due jobs.
  - **Goal:** Move workshops from Excel into optimized, visual scheduling.

- **Priority 6 – Enhanced Quoting with Metal Indexing (Phase 1.2 + Phase 2)**
  - **Location:**
    - `src/lib/pricing/PricingEngine.ts` (new in Phase 1.2.2).
    - `src/components/fabricator/PricingConfiguration.tsx` (Phase 1.2.1).
  - **New features:**
    - LME aluminium price integration and caching.
    - TRY/EGP volatility hedging helpers and customer‑specific tiers.
    - Ability to lock offers to a metal price index/date (already mentioned in Phase 1.2).

---

### 🛠 Execution‑Level Implementation Commands

These commands **map directly** onto existing phases and should be treated as concrete Cursor/IDE tasks.

#### Phase 1 (Week 1–2): Immediate Execution

- **Mass Production Optimizer Foundation**
  - **Create/implement:** `src/algorithms/massProductionOptimizer.ts`
  - **Spec:**
    - Class: `MassProductionOptimizer` (can extend existing `BaseOptimizer` / GA utilities).
    - Core method: `async optimizeAcrossProjects(projectIds: string[], options: OptimizationOptions)`.
    - Integration: call `RemnantManager.optimizeWithRemnants()` where applicable.
    - Output: `UnifiedCuttingPlan` with waste % vs single‑project baseline.

- **Smart Draw Core Algorithm**
  - **Create:** `src/algorithms/smartDraw.ts`
  - **Export functions:**
    - `calculateEqualSpacing(startPos: number, endPos: number, elementCount: number): number[]`
    - `validateGridConstraints(positions: number[], systemConstraints: ProfileSystem): ValidationResult`
    - `generateMullionTransomLayout(boundary: Rectangle, system: ProfileSystem): MullionTransomLayout`

- **Smart Draw UI**
  - **Create:** `src/components/fabricator/SmartDrawTool.tsx`
  - **Features:** canvas‑based UI, drag first/last elements, equal spacing preview, integration with `smartDraw.ts` and `validateProject`, export into existing `WindowUnit` / project model.

#### Phase 2 (Week 3–4): Turkish System Expansion

- **Expand YILMAZ System Pack**
  - **Update:** `src/data/profileSystems/turkish/yilmaz.ts`
  - **Add:**
    - YILMAZ W60 Window system.
    - YILMAZ CW100 curtain wall.
    - YILMAZ D80 door system.
  - Each with cutting rules, hardware kits, structural limits, and pricing presets.

- **Add KALE Aluminium Systems**
  - **Create:** `src/data/profileSystems/turkish/kale.ts`
  - Include commercial window/facade systems with TRY‑based pricing and supplier metadata.

#### Phase 3 (Week 5–6): Egyptian Market Focus

- **Implement CALUMINIUM Systems**
  - **Create:** `src/data/profileSystems/egyptian/caluminium.ts` (or subfolder).
  - Implement:
    - CALUMINIUM PS profiles (complete implementation).
    - CALUMINIUM NC sliding systems.
  - Include Egyptian wind‑load calculations and EGP pricing with local suppliers.

---

### 💡 Competitive Differentiators to Accelerate

1. **Intelligent Remnant Banking**
   - **Enhance:** `src/lib/inventory/RemnantManager.ts`
   - **Add methods:**
     - `findCrossProjectRemnantMatches(projectIds: string[]): RemnantMatch[]`
     - `automaticRemnantAllocation(plan: CuttingPlan): CuttingPlanWithRemnants`
     - `remnantUtilizationAnalytics(): RemnantStats`

2. **Machine‑Aware Export Profiles**
   - **Enhance:** `src/lib/exports/DXFExportGenerator.ts`
   - **Add machine profiles for:**
     - Elumatec SQ series saws.
     - FOM / Emmegi machining centers.
     - Local Turkish/Egyptian CNC brands where specs are available.
   - Each profile defines layers, units, reference points, naming, and QR/Barcode linkage.

3. **Regional Structural Intelligence**
   - **Create:** `src/data/regional/structuralCodes.ts`
   - Include:
     - Turkish TSE wind‑load/span presets.
     - Egyptian building code façade/opening requirements.
     - Gulf region façade specs for future expansion.
   - Integrate into `validateProject` / future rules engine (Phase 4.3).

---

### 📊 Success Metrics & Validation Targets

- **Quarter 1 (Months 1–3)**
  - Mass Production Mode: 12–15 % waste reduction vs single‑project optimization.
  - Smart Draw Tool: 60 % faster façade design completion.
  - Turkish Systems: At least 3 major brand implementations (YILMAZ, KALE, ASAS) live.
  - Adoption: 25 % of existing fabricator users using new optimization features.

- **Quarter 2 (Months 4–6)**
  - Egyptian Systems: Complete PS/NC implementation for CALUMINIUM.
  - Production Scheduling: 30 % reduction in machine idle time for pilot workshops.
  - Metal Indexing: Demonstrated price stability during TRY/EGP volatility.
  - Market Share: 15 % new customer acquisition in target regions.

---

### 🔥 Immediate 90‑Day Execution Priorities

- **Weeks 1–2:** Implement `MassProductionOptimizer` + `SmartDrawTool` (algorithms + UI + integration).
- **Weeks 3–4:** Expand Turkish system packs (YILMAZ + KALE + ASAS) with full rules and presets.
- **Weeks 5–6:** Implement CALUMINIUM Egyptian systems and structural presets.
- **Weeks 7–8:** Ship Production Scheduling MVP.
- **Weeks 9–12:** Enhance quoting/pricing with metal price integration and volatility tooling.
