# ALMONA Portfolio Forge - Codebase Analysis
**Generated from actual code inspection (no README files)**

**Date:** January 27, 2026  
**Analysis Method:** Direct code examination, file structure analysis, dependency inspection

---

## 🎯 Application Overview

**ALMONA Portfolio Forge** is an industrial fabrication management system for aluminum and UPVC window/door manufacturing. It's a full-stack web application that provides end-to-end workflow management from design to production.

### Core Purpose (Inferred from Code)
- **BOM (Bill of Materials) Generation** - Automated calculation of profiles, hardware, glass, and accessories
- **Cutting Optimization** - Material waste reduction through multiple optimization algorithms
- **CNC Integration** - G-code generation for multiple machine brands (YILMAZ, Elumatec, FOMM, Emmegi, Biesse)
- **Workflow Management** - Complete fabrication workflow from measurement to quality control
- **3D Visualization** - Interactive 3D preview of window/door designs
- **Inventory Management** - Stock tracking and remnant management
- **Production Planning** - Scheduling and machining coordination

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 7.2.6
- **State Management:** Zustand 5.0.6
- **Routing:** React Router DOM 6.26.2
- **UI Libraries:**
  - Ant Design 5.29.1 (primary component library)
  - Radix UI (headless components)
  - Tailwind CSS 3.4.11
- **3D Graphics:** Three.js 0.180.0 + React Three Fiber 8.18.0
- **Data Fetching:** TanStack Query 5.83.0
- **Forms:** React Hook Form 7.60.0 + Zod 3.25.76
- **Internationalization:** i18next 25.3.2

### Backend Stack
- **Framework:** FastAPI 0.123.8
- **Server:** Uvicorn 0.24.0
- **Database:** PostgreSQL (via Supabase 2.8.0)
- **ORM:** SQLAlchemy 2.0.23 (async)
- **Task Queue:** Celery 5.3.4 + Redis 5.0.1
- **Authentication:** JWT (python-jose 3.4.0)
- **CAD Processing:** ezdxf 1.1.4
- **Validation:** Pydantic 2.9.0

### Infrastructure
- **Database:** Supabase (PostgreSQL)
- **Caching:** Redis
- **File Storage:** Supabase Storage (inferred)
- **Deployment:** Vercel (frontend), Railway/Docker (backend)
- **Monitoring:** OpenTelemetry, Prometheus, Sentry

---

## 📁 Project Structure

### Frontend (`src/`)
```
src/
├── algorithms/          # Optimization algorithms (greedy, genetic, linear programming)
├── components/         # React components (792 files)
│   ├── fabricator/     # Core fabrication UI components
│   ├── ui/             # Shared UI components
│   └── ...
├── lib/                # Core business logic (520 files)
│   ├── fabricator/     # Fabrication engine
│   │   ├── bom/        # BOM calculators (profiles, hardware, glass, accessories)
│   │   ├── optimization/ # Cutting optimization
│   │   └── ...
│   ├── algorithms/     # Algorithm selection and execution
│   ├── 3d/            # 3D rendering and visualization
│   ├── ydt/           # YDT intelligence system
│   └── ...
├── pages/              # Route pages (84 files)
├── routes/             # Route definitions
├── services/           # API clients (44 files)
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Backend (`python_backend/`)
```
python_backend/
├── apis/v2/           # FastAPI v2 endpoints
│   ├── fabricator.py  # Fabrication endpoints
│   ├── workflows.py   # Workflow management
│   └── ...
├── core/              # Core services
│   ├── database.py   # Database connection
│   ├── security.py   # Security middleware
│   └── ...
├── services/          # Business logic services
├── models/            # Pydantic models
├── tasks/             # Celery background tasks
└── tests/             # Test suite
```

---

## 🔧 Core Features (From Code Analysis)

### 1. BOM Generation System
**Location:** `src/lib/fabricator/bom/`

**Components:**
- `ProfileBOMCalculator.ts` - Profile cutting calculations
- `HardwareBOMCalculator.ts` - Hardware requirements
- `GlassBOMCalculator.ts` - Glass cutting lists
- `AccessoriesBOMCalculator.ts` - Accessories and seals
- `CostCalculator.ts` - Cost calculation with Egyptian market pricing
- `AssemblySequenceGenerator.ts` - Assembly step generation

**Key Features:**
- Deterministic BOM generation (99.8% accuracy claimed)
- Pattern-based calculations (Egyptian patterns)
- System pack integration
- Replay tracking for auditability

### 2. Cutting Optimization Engine
**Location:** `src/algorithms/` and `src/lib/fabricator/OptimizationEngine.ts`

**Algorithms Implemented:**
- **Greedy Heuristic** (`greedyHeuristic.ts`) - For simple jobs (<50 cuts)
- **Linear Programming** (`linearProgramming.ts`) - For medium jobs (50-500 cuts)
- **Genetic Algorithm** (`geneticOptimization.ts`) - For complex jobs (500+ cuts)
- **Hybrid Mass Optimizer** (`HybridMassOptimizer.ts`) - Multi-project optimization
- **Remnant-First Optimizer** (`RemnantFirstGeneticOptimizer.ts`) - Remnant utilization

**Algorithm Selection:**
- Rule-based selection (no ML/AI)
- Located in `src/lib/fabricator/AlgorithmSelector.ts`
- Deterministic thresholds:
  - <50 cuts → Greedy
  - 50-500 cuts → Linear Programming
  - 500+ cuts → Genetic Algorithm

### 3. DXF Import & Processing
**Location:** `src/lib/import/`, `python_backend/core/cad_ingest.py`

**Capabilities:**
- DXF file parsing (ezdxf library)
- Multi-profile extraction
- Auto-configuration from DXF
- Smart scan assembly
- Pattern detection

### 4. 3D Visualization
**Location:** `src/lib/3d/`, `src/components/fabricator/Window3DGenerator.tsx`

**Technology:**
- Three.js for 3D rendering
- React Three Fiber for React integration
- Hardware model library
- Interactive preview with rotation/zoom
- AR/XR support (SwiftXR)

### 5. Workflow Management
**Location:** `src/pages/fabricator/workflow/`

**Workflow Steps:**
1. **Measuring** (`MeasuringPage.tsx`) - Digital measurement capture
2. **Design** (`DesignPage.tsx`) - Engineering bay / technical design
3. **3D Preview** (`Preview3DPage.tsx`) - Visual model preview
4. **Optimization** (`OptimizationPage.tsx`) - Cutting plan optimization
5. **Inventory** (`InventoryPage.tsx`) - Stock check
6. **Production** (`ProductionPage.tsx`) - CNC command generation
7. **Quality Control** (`QualityControlPage.tsx`) - Final verification

### 6. CNC Integration
**Location:** `src/lib/cnc/`

**Supported Machines:**
- YILMAZ
- Elumatec
- FOMM
- Emmegi
- Biesse

**Features:**
- Machine-specific G-code generation
- DXF export
- Barcode/QR code generation for production labels
- Machine calibration support

### 7. Inventory Management
**Location:** `src/lib/inventory/`

**Features:**
- Stock tracking
- Remnant management
- Cross-project remnant pool
- Remnant marketplace (planned)
- Real-time inventory updates

### 8. YDT Intelligence System
**Location:** `src/lib/ydt/`

**Components:**
- `YDTCoreService.ts` - Core intelligence service
- `IntelligenceGate.ts` - Constitutional compliance gate
- `YDTBusinessLayer.ts` - Business logic layer
- Parsers for knowledge base
- 164 chapters, 878 components, 281 parts (from code comments)

**Purpose:** Egyptian market intelligence and pattern recognition (with constitutional constraints)

### 9. Constitutional Framework
**Location:** `src/lib/constitutional/`, `.cursorrules`

**Key Principles:**
- **Tier 3 Protected Determinism** (AICS-001)
- No ML/AI in execution paths
- Deterministic algorithm selection
- Human validation required
- Auditable decisions

**Implementation:**
- `AlgorithmSelector.ts` - Rule-based selection only
- `IntelligenceGate.ts` - Gates AI/ML usage
- Constitutional tests in test suite

---

## 🗄️ Database Schema (Inferred)

### Core Tables (from migrations)
- `profiles` - User profiles with company info
- `products` - Product catalog (machines, parts, materials)
- `categories` - Product categorization
- `quotes` - Quote management
- `orders` - Order processing
- `service_tickets` - Support ticketing system
- `projects` - Fabrication projects
- `drafts` - Design drafts
- `inventory` - Stock management
- `customers` - Customer management
- `workflows` - Workflow definitions
- `production_jobs` - Production scheduling

### Specialized Tables
- `candidate_facts` - YDT learning system
- `fact_verifications` - YDT verification
- `user_trust_scores` - Trust scoring
- `calibration_data` - Machine calibration
- `cnc_safety_logs` - Safety logging

---

## 🔐 Security Features

### Authentication
- JWT token-based auth
- OAuth2 social login (Facebook, Google)
- SMS OTP support
- Multi-method authentication

### Security Middleware
- Rate limiting (Redis-backed)
- API key management
- CORS configuration
- File validation (DXF/G-code security checks)
- Security logging

### Database Security
- Row Level Security (RLS) enabled
- Policy-based access control
- Encrypted sensitive data

---

## 📊 Performance Optimizations

### Frontend
- Code splitting with lazy loading
- Route prefetching
- Bundle optimization
- Image optimization (WebP)
- Service worker (PWA support)
- Virtual scrolling for large lists
- Memoization for expensive computations

### Backend
- Async database operations
- Connection pooling
- Query optimization
- Caching with Redis
- Background task processing (Celery)
- Rate limiting

### Monitoring
- Performance dashboard (dev mode)
- OpenTelemetry instrumentation
- Prometheus metrics
- Error tracking (Sentry)

---

## 🧪 Testing Infrastructure

### Frontend Tests
- Vitest 3.2.4
- Testing Library
- Constitutional tests
- Golden master tests
- Performance tests

### Backend Tests
- Pytest 7.4.3
- API tests
- Security tests
- Load tests (Locust)
- Integration tests

---

## 🌍 Internationalization

- i18next for translations
- Multi-language support
- Regional features (Egypt-focused)
- Currency support (USD, EGP, EUR, GBP)

---

## 📱 Mobile Support

- Mobile-responsive design
- Fabricator mobile app (`fabricator-mobile/`)
- PWA capabilities
- Touch-optimized UI

---

## 🔄 Workflow Architecture

### Studio-Based Architecture
**Location:** `src/layouts/studio/`

**Studios:**
1. **Command Center** - Dashboard
2. **Project Studio** - Project management
3. **Design Studio** - Engineering bay
4. **Production Studio** - Production dashboard
5. **Data Studio** - System packs, tuning

### Route-Based Workflow
**Location:** `src/pages/fabricator/workflow/`

Sequential workflow pages with state persistence across steps.

---

## 🎨 UI/UX Features

### Design System
- Dark Gold Prestige theme
- Ant Design components
- Custom UI components (Radix UI)
- Responsive layouts
- Accessibility support

### User Experience
- Command palette (Cmd+K)
- Keyboard shortcuts
- Loading states
- Error boundaries
- Toast notifications
- Modal dialogs

---

## 🔌 Integrations

### External Services
- Supabase (database, auth, storage)
- Stripe (payments)
- Vercel Analytics
- Sentry (error tracking)

### Machine Integrations
- YILMAZ machines
- Elumatec machines
- Multi-brand CNC support

---

## 📈 Business Features

### Commercial
- Quote generation
- Invoice management
- Payment processing (Stripe)
- Cost calculation
- Pricing configuration

### Reporting
- Production reports
- Analytics dashboard
- Trust dashboard
- Performance metrics

### Customer Management
- Customer portal
- Support tickets
- Machine registration
- Warranty management

---

## 🚀 Deployment

### Frontend
- Vite build
- Vercel deployment
- CDN optimization
- Environment-based config

### Backend
- Docker containers
- Railway deployment
- Kubernetes configs (`k8s/`)
- Multiple Dockerfiles for different environments

---

## 🔍 Code Quality

### TypeScript
- Strict type checking (relaxed in some areas)
- Path aliases (`@/*`)
- Type definitions for all major entities

### Python
- Type hints
- Pydantic models
- Black formatting
- Flake8 linting
- MyPy type checking

### Documentation
- Inline code comments
- Constitutional documentation
- Architecture diagrams

---

## ⚠️ Observations & Potential Issues

### Strengths
1. **Comprehensive Feature Set** - Complete fabrication workflow
2. **Modern Tech Stack** - Current versions, good practices
3. **Type Safety** - TypeScript + Pydantic
4. **Performance Focus** - Multiple optimization strategies
5. **Constitutional Framework** - Clear constraints and guarantees

### Areas of Concern
1. **Large Codebase** - 1916 files in `src/`, potential maintenance burden
2. **Complex Dependencies** - Many external libraries
3. **Mixed Patterns** - Multiple architectural approaches (studio vs route-based)
4. **Documentation** - Heavy reliance on markdown files vs inline docs
5. **Testing Coverage** - Unknown coverage percentage

### Technical Debt Indicators
- Multiple Dockerfiles (optimization attempts)
- Archive folder with old code
- Multiple migration files
- Commented-out ML dependencies in requirements.txt
- Multiple optimization strategies (may indicate performance issues)

---

## 📝 Key Files to Understand

### Frontend Core
- `src/App.tsx` - Main application entry
- `src/lib/fabricator/AlgorithmSelector.ts` - Algorithm selection logic
- `src/lib/fabricator/bom/ProfileBOMCalculator.ts` - BOM generation
- `src/algorithms/geneticOptimization.ts` - Optimization algorithm
- `src/components/fabricator/drafting/DraftingWorkbench.tsx` - Main design interface

### Backend Core
- `python_backend/apis/v2/fabricator.py` - Main API endpoints
- `python_backend/core/database.py` - Database connection
- `python_backend/core/config.py` - Configuration
- `python_backend/services/` - Business logic services

### Configuration
- `package.json` - Frontend dependencies and scripts
- `python_backend/requirements.txt` - Backend dependencies
- `tsconfig.json` - TypeScript configuration
- `.cursorrules` - Development rules

---

## 🎯 Conclusion

ALMONA Portfolio Forge is a **sophisticated industrial fabrication management system** with:

- **Strong technical foundation** - Modern stack, type safety, good architecture
- **Comprehensive features** - End-to-end workflow coverage
- **Performance focus** - Multiple optimization strategies
- **Constitutional framework** - Clear constraints and guarantees
- **Production-ready** - Deployed and in use

The codebase shows signs of active development with multiple architectural approaches being tried. The constitutional framework (AICS-001) is a unique differentiator, enforcing deterministic behavior and auditability.

**Estimated Complexity:** High  
**Maturity Level:** Production-ready with ongoing development  
**Maintenance Burden:** Medium-High (large codebase, many dependencies)

---

*This analysis is based solely on code inspection. No README or documentation files were consulted.*
