# 🏗️ PHASE 2: ARCHITECTURE DIAGRAM

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ CuttingList   │  │ Accessories  │  │ GlassReport  │        │
│  │   Report      │  │   Report     │  │              │        │
│  │               │  │              │  │              │        │
│  │ [PDF] [CSV]   │  │ [PDF] [CSV]  │  │ [PDF] [CSV]  │        │
│  │ [DXF]         │  │              │  │ [DXF]        │        │
│  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                   │                 │                │
│         └───────────────────┼─────────────────┘                │
│                             │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  ReportEngine     │                        │
│                    │  (Orchestrator)   │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   ExportService     │
                    │  ┌────────────────┐ │
                    │  │ Format Router  │ │
                    │  │ Batch Manager  │ │
                    │  │ Progress Track │ │
                    │  └────────────────┘ │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼──────┐    ┌──────────▼──────────┐  ┌───────▼──────┐
│     PDF      │    │        CSV           │  │     DXF      │
│  Generator   │    │     Generator        │  │  Generator   │
│              │    │                      │  │              │
│ - Templates  │    │ - Formatting        │  │ - Entities    │
│ - Branding   │    │ - Escaping          │  │ - Layers      │
│ - QR Codes   │    │ - Localization      │  │ - Dimensions  │
│ - Multi-lang │    │ - Multi-sheet       │  │ - Annotations │
└───────┬──────┘    └──────────┬──────────┘  └───────┬──────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ CuttingListGenerator│
                    │                     │
                    │ - Process Plans     │
                    │ - Calculate Stats   │
                    │ - Generate Diagrams │
                    │ - Format Data       │
                    └─────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼──────┐    ┌──────────▼──────────┐  ┌───────▼──────┐
│   Phase 1    │    │   Optimization      │  │   Project    │
│  Profiles    │    │   Engine            │  │   Data       │
│  & Pricing   │    │                     │  │              │
└──────────────┘    └─────────────────────┘  └──────────────┘
```

## Data Flow

```
┌─────────────┐
│   Project   │
│   Data      │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│ Optimization│─────▶│ Cutting Plan │
│   Result    │      │   Data       │
└─────────────┘      └──────┬───────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ CuttingList     │
                   │ Generator       │
                   │ (Process & Calc)│
                   └────────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PDF Format  │   │  CSV Format   │   │  DXF Format  │
│              │   │               │   │              │
│ - Structure  │   │ - Rows        │   │ - Entities   │
│ - Branding   │   │ - Headers     │   │ - Layers     │
│ - Diagrams   │   │ - Metadata    │   │ - Blocks     │
└──────┬───────┘   └──────┬────────┘   └──────┬───────┘
       │                  │                    │
       └──────────────────┼────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Blob/File  │
                   │   Download   │
                   └──────────────┘
```

## Component Hierarchy

```
FabricatorWorkflow
│
├── CuttingOptimizationEngine
│   └── OptimizationResult
│
├── ReportEngine
│   ├── ReportType Selector
│   ├── Format Selector (PDF/CSV/DXF)
│   └── Options Panel
│
└── Report Components
    ├── CuttingListReport
    │   ├── Cutting Diagram
    │   ├── Statistics Panel
    │   └── Export Buttons
    │
    ├── AccessoriesReport
    │   ├── Category Groups
    │   ├── Pricing Table
    │   └── Export Buttons
    │
    └── GlassReport
        ├── Glass Specifications
        ├── Area Calculations
        └── Export Buttons
```

## Export Service Flow

```
User Action: "Export Cutting List as PDF"
│
▼
ExportService.export(data, 'pdf', options)
│
├── Validate data
├── Check format support
├── Load template (if custom)
│
▼
PDFExportGenerator.generateCuttingList(data, options)
│
├── Initialize PDF document
├── Add header (with branding)
├── Process cutting plan data
│   └── CuttingListGenerator.processCuttingPlan()
├── Generate diagrams
├── Add statistics
├── Add QR code
├── Add footer
│
▼
Return Blob
│
▼
Download to user's device
```

## Batch Export Flow

```
User Action: "Export 5 Projects as PDF"
│
▼
ExportService.exportBatch(projects, 'pdf', options)
│
├── Initialize progress tracking
│
├── For each project:
│   ├── Update progress (20%, 40%, ...)
│   ├── Process project data
│   ├── Generate PDF
│   └── Add to results array
│
▼
Return Blob[]
│
▼
Zip files (optional) or download individually
```

## Localization Flow

```
User selects language: "Arabic"
│
▼
i18next.setLanguage('ar')
│
▼
Report Component
│
├── Load translations: locales/ar/reports.json
├── Apply RTL layout
├── Use translated strings
└── Format numbers/dates (Arabic locale)
│
▼
Export Service
│
├── Use translated labels in PDF/CSV
├── Apply RTL text direction (PDF)
└── Use localized date/number formats
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    Phase 1 Integration                   │
│                                                         │
│  ┌──────────────┐              ┌──────────────┐        │
│  │   Profile    │              │   Pricing   │        │
│  │  Management  │──────────────▶│   Engine    │        │
│  └──────┬───────┘              └──────┬───────┘        │
│         │                             │                │
│         └─────────────┬──────────────┘                │
│                       │                                 │
│                       ▼                                 │
│              ┌─────────────────┐                        │
│              │  Report System  │                        │
│              │  (Phase 2)      │                        │
│              └─────────────────┘                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Cutting Optimization Integration          │
│                                                         │
│  CuttingOptimizationEngine                              │
│         │                                               │
│         ▼                                               │
│  OptimizationResult                                     │
│         │                                               │
│         ▼                                               │
│  CuttingListReport                                      │
│         │                                               │
│         ▼                                               │
│  ExportService                                         │
└─────────────────────────────────────────────────────────┘
```

## File Dependencies

```
ExportService.ts
├── types.ts
├── PDFExportGenerator.ts
│   ├── pdf-lib (external)
│   └── CuttingListGenerator.ts
├── CSVExportGenerator.ts
│   └── CuttingListGenerator.ts
└── DXFExportGenerator.ts
    ├── dxf-writer (external)
    └── CuttingListGenerator.ts

CuttingListReport.tsx
├── ExportService.ts
├── CuttingListGenerator.ts
├── useTranslation (i18next)
└── types/fabricator.ts

AccessoriesReport.tsx
├── ExportService.ts
├── PricingEngine.ts (Phase 1)
└── types/fabricator.ts

GlassReport.tsx
├── ExportService.ts
└── types/fabricator.ts
```

## Technology Stack

```
Frontend Framework
├── React 18.3
├── TypeScript 5.5
└── Vite 7.1

PDF Generation
└── pdf-lib 1.17

CSV Generation
└── Native JavaScript (with proper escaping)

DXF Generation
└── dxf-writer 1.0 (or custom implementation)

QR Codes
└── qrcode 1.5

Localization
├── i18next 25.3
└── react-i18next 15.6

UI Components
└── Radix UI + Tailwind CSS
```

## Performance Considerations

```
Large Projects (>100 cuts)
│
├── Lazy load PDF library
├── Stream data processing
├── Progress callbacks
└── Web Workers (if needed)

Batch Exports (>10 projects)
│
├── Queue management
├── Progress tracking
├── Memory management
└── Error recovery

RTL Support (Arabic)
│
├── Font embedding
├── Text direction handling
└── Table column reversal
```

---

**This architecture ensures:**
- ✅ Modularity - Each component has a single responsibility
- ✅ Scalability - Easy to add new formats or report types
- ✅ Maintainability - Clear separation of concerns
- ✅ Testability - Each layer can be tested independently
- ✅ Performance - Optimized for large datasets
- ✅ Internationalization - Built-in multi-language support

