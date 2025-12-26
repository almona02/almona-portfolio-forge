# Almona Portfolio Forge - Comprehensive Project Analysis

**Analysis Date:** January 2025  
**Project Version:** 6.1  
**Analysis Type:** Complete Technical & Business Assessment

---

## 📋 Executive Summary

### Project Identity
- **Name:** Almona Portfolio Forge
- **Type:** Full-stack Industrial SaaS Platform
- **Domain:** Aluminium & UPVC Fabrication Management
- **Market:** Global (Primary: Egypt, Turkey, Middle East)
- **Status:** Production-Ready (98% Hardening Complete)

### Core Value Proposition
An AI-powered fabrication management platform that reduces material waste by 15-20% and cuts workflow time by 93% (from 3.5 hours to 15 minutes per project) through intelligent optimization, CNC integration, and machine learning.

### Key Metrics
- **Accuracy:** 99.6-99.8% end-to-end (DXF → CNC)
- **Market Coverage:** 100% (Aluminum 60% + UPVC 40%)
- **Addressable Market:** 5,000+ workshops globally
- **Production Readiness:** 24/24 golden master tests passed
- **Component Count:** 370+ React components
- **Test Coverage:** 75%+ on critical paths

---

## 🏗️ Architecture Overview

### Technology Stack

#### Frontend (React + TypeScript)
```
Core Framework:
├── React 18.3.1 (Concurrent features, Suspense)
├── TypeScript 5.5.3 (Strict mode enabled)
├── Vite 7.3.0 (ESBuild + Rollup)
└── Node.js 20.19.0+ (LTS)

UI & Styling:
├── Tailwind CSS 3.4.11
├── shadcn/ui (66+ base components)
├── Framer Motion 12.23.22
└── Ant Design 5.29.1

3D & Visualization:
├── Three.js 0.180.0
├── @react-three/fiber 8.18.0
├── @react-three/drei 9.122.0
├── @react-three/postprocessing 2.19.0
└── @react-three/xr 6.6.17 (AR/VR)

State Management:
├── React Context (Auth, Workspace)
├── Zustand 5.0.6
├── React Query (@tanstack/react-query 5.83.0)
└── Supabase Realtime (WebSocket)

Machine Learning:
├── TensorFlow.js 4.22.0
├── ONNX Runtime
└── Custom ML Models (CalibrationLearner, PresetMatcher)
```

#### Backend (Python + FastAPI)
```
Core Framework:
├── FastAPI 0.123.8
├── Python 3.9+ (3.11+ recommended)
├── Uvicorn 0.24.0 (ASGI server)
└── Pydantic 2.9.0 (validation)

Database:
├── Supabase (PostgreSQL 14+)
├── SQLAlchemy 2.0.23 (async ORM)
├── Asyncpg 0.30.0
└── 35+ migration files

AI/ML Services:
├── TensorFlow-CPU 2.17.1 (~400MB vs 1.5GB)
├── ONNX Runtime 1.20.0
├── Google OR-Tools 9.8.3296
└── Google Generative AI

Computer Vision:
├── OpenCV-headless 4.10.0.84
├── Pytesseract 0.3.10 (OCR)
└── ezdxf 1.1.4 (CAD parsing)

Background Tasks:
├── Celery 5.3.4
├── Redis 5.0.1
└── WebSocket (real-time updates)

CNC Integration:
├── Multi-brand adapters (YILMAZ, Elumatec, FOMM, Emmegi, Biesse)
├── G-code generation & validation
├── DXF export (0.01mm tolerance)
└── QR code generation (production feedback)
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                       │
│  React 18 + TypeScript + Vite + Tailwind CSS                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Fabricator  │  │   E-Commerce │  │   Services   │          │
│  │     Pro      │  │     Shop     │  │  Management  │          │
│  │  (Core App)  │  │  (Machinery) │  │  (Support)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────────┐  ┌────▼──────────────────┐
        │   Supabase Cloud     │  │  FastAPI Backend      │
        │   (Auth + DB + RLS)  │  │  Python 3.9+          │
        │   PostgreSQL 14+     │  │  Uvicorn ASGI         │
        └──────────────────────┘  └───────────────────────┘
                    │                   │
        ┌───────────▼───────────────────▼──────────┐
        │         AI/ML Services Layer              │
        │  TensorFlow.js | ONNX | OR-Tools          │
        │  CalibrationLearner | PresetMatcher       │
        └───────────────────────────────────────────┘
                    │
        ┌───────────▼──────────────────────────────┐
        │      CNC Integration Layer                │
        │  YILMAZ | Elumatec | Multi-Brand         │
        │  G-code | DXF | QR Codes                 │
        └───────────────────────────────────────────┘
```

### Data Flow

```
User Input → React Components → State Management (Context/Zustand)
    ↓
Validation → ConstraintValidator (6 categories)
    ↓
API Layer (FastAPI) → Business Logic → AI Services (if applicable)
    ↓
Database (Supabase PostgreSQL) → Real-time Updates (WebSocket)
    ↓
Optimization Engine → ProductionOptimizer (Hybrid Algorithm)
    ↓
CNC Integration → Machine Export → Production Floor
    ↓
QR Code Feedback → ML Learning Loop → Continuous Improvement
```

---

## 🎯 Core Features & Capabilities

### 1. Fabricator Pro (Core Platform)

#### A. Project Workflow
- **Material-First Selection:** Auto-default system packs based on material type
- **3-4 Click Workflow:** Streamlined project creation (Home → Material → Dimensions → Cut List)
- **No-DXF Tuning Studio:** 88% of parameters configurable without CAD import
- **Tuning Status Detection:** Automatic validation with user-friendly prompts
- **Dual-Output Engine:** 85% visual accuracy + 99.8% production accuracy from single calculation

#### B. 3D Visualization
- **Preset-Aware Geometry:** Pattern-based window generation (Egyptian patterns library)
- **Manual Mullion Tools:** Frame-level and sash-level mullion placement
- **Hardware Visualization:** Placeholder system (handles, hinges, locks, rollers)
- **AR/VR Support:** WebXR integration for augmented reality
- **Real-time Rendering:** 60 FPS with Three.js + WebGL 2.0

#### C. Optimization Engine
- **Genetic Algorithm:** Remnant-first strategy
- **Constraint Programming:** Glass nesting solver
- **Linear Programming:** Exact optimization
- **Hybrid Optimizer:** Combines multiple strategies
- **Performance:** <2s for 50 cuts, 5-10s for 200 cuts

#### D. CNC Integration
- **Multi-Brand Support:** YILMAZ, Elumatec, FOMM, Emmegi, Biesse
- **Adapter Pattern:** Machine-specific implementations
- **G-Code Generation:** Template-based with validation
- **Pre-Export Validation:** Coordinate bounds, dangerous command detection
- **G-Code Simulation:** Path simulation with collision detection
- **Checksum Validation:** Cryptographic integrity verification

#### E. AI/ML Features
- **CalibrationLearner:** Multivariate regression for K-factor prediction
  - Workshop-specific learning
  - Collective learning (anonymized)
  - Hybrid mode (combines both)
  - Confidence scoring (0.85-0.95 typical)
- **PresetMatcher:** Rule-based pattern matching with confidence scoring
- **Algorithm Predictor:** 94% accuracy in optimization strategy selection
- **Remnant Usage Predictor:** Material waste forecasting

### 2. E-Commerce Platform

#### A. Machinery Shop
- **Product Catalog:** Rich machinery listings with 3D models
- **AR Viewer:** Augmented reality product visualization
- **Quote System:** Smart quote generation workflow
- **Used Machinery Marketplace:** B2B marketplace for pre-owned equipment

#### B. Spare Parts
- **Parts Catalog:** Comprehensive spare parts inventory
- **Compatibility Checker:** Machine-specific part matching
- **Order Management:** Integrated ordering system

### 3. Service Management

#### A. Maintenance System
- **Unified Ticketing:** Complete support ticket system
- **Machine Passport:** Digital records for each machine
- **Service History:** Maintenance tracking and analytics

#### B. Training Services
- **Training Programs:** Structured training courses
- **Certification:** Digital certification system
- **Video Integration:** On-demand training videos

### 4. Analytics & Reporting

#### A. Real-time Metrics
- **OEE Tracking:** Overall Equipment Effectiveness
- **Material Waste:** Real-time waste monitoring
- **Production Analytics:** Performance dashboards
- **Accuracy Tracking:** Continuous accuracy monitoring

#### B. Business Intelligence
- **Custom Reports:** Configurable reporting system
- **Export Capabilities:** PDF, Excel, CSV exports
- **Data Visualization:** Charts and graphs (Chart.js, Recharts)

---

## 📊 Project Structure Analysis

### Frontend Structure (src/)

```
src/
├── components/ (370+ files)
│   ├── fabricator/ (Core fabrication components)
│   │   ├── NewProjectWizard.tsx
│   │   ├── NoDXFTuningStudio.tsx
│   │   ├── SystemTuningStudio.tsx
│   │   ├── SmartDrawCanvas.tsx
│   │   ├── SmartMeasuringInterface.tsx
│   │   ├── Window3DGenerator.tsx
│   │   ├── ProfileManagement.tsx
│   │   ├── SystemPackManagement.tsx
│   │   ├── ProductionCommand.tsx
│   │   ├── OptimizationEqualizer.tsx
│   │   └── EngineeringBay.tsx
│   ├── 3d-model/ (3D visualization)
│   ├── admin/ (Admin dashboard)
│   ├── auth/ (Authentication)
│   ├── beta/ (Beta testing framework)
│   ├── prestige-agent/ (YDT AI chatbot)
│   └── shared/ui/ (Base UI components - shadcn/ui)
│
├── lib/ (161+ files)
│   ├── ai/ (AI services)
│   ├── algorithms/ (Optimization algorithms)
│   ├── calibration/ (Calibration management)
│   ├── exports/ (Export generators)
│   ├── fabricator/ (Fabricator utilities)
│   │   ├── presetUtils.ts
│   │   ├── DualOutputGenerator.ts
│   │   ├── constraintValidator.ts
│   │   ├── productionUtils.ts
│   │   ├── performanceOptimizer.ts
│   │   └── systemTuningUtils.ts
│   ├── ml/ (Machine learning)
│   │   ├── CalibrationLearner.ts
│   │   └── PresetMatcher.ts
│   ├── cnc/ (CNC integration)
│   │   └── adapters/ (Machine adapters)
│   ├── beta/ (Beta testing)
│   │   └── betaTestingFramework.ts
│   └── 3d/ (3D geometry)
│       ├── windowGeometry.ts
│       ├── manualMullionRenderer.ts
│       ├── hardwarePlaceholder.ts
│       └── specialized/ (Curtain walls, skylights, bi-fold doors)
│
├── pages/ (46 files)
│   ├── Index.tsx (Homepage)
│   ├── Products.tsx
│   ├── Services.tsx
│   ├── FabricatorDashboard.tsx
│   ├── FabricatorWorkflow.tsx
│   ├── Shop.tsx
│   ├── UsedMachines.tsx
│   ├── CustomerSupport.tsx
│   ├── AdminDashboard.tsx
│   └── NationalDashboard.tsx (Egypt Vision 2030)
│
├── hooks/ (23 files)
│   ├── useAuth.ts
│   ├── useFabricator.ts
│   ├── useOptimization.ts
│   └── useRoutePrefetching.ts
│
├── types/ (13 files)
│   ├── fabricator.ts (Core types)
│   ├── optimization.ts
│   └── cnc.ts
│
├── data/ (Static data)
│   ├── egyptian-window-patterns.ts (Pattern library)
│   └── systemPacks.ts (System pack definitions)
│
├── context/ (State management)
│   ├── AuthContext.tsx
│   ├── FabricatorWorkspaceContext.tsx
│   ├── QuoteContext.tsx
│   └── LanguageContext.tsx
│
└── locales/ (Internationalization)
    ├── ar/ (Arabic - RTL)
    ├── en/ (English)
    ├── tr/ (Turkish)
    ├── fr/ (French)
    └── de/ (German)
```

### Backend Structure (python_backend/)

```
python_backend/
├── apis/ (47 files)
│   ├── v1/ (Version 1 endpoints)
│   └── v2/ (Version 2 endpoints)
│       ├── auth.py
│       ├── profile_import.py
│       ├── heavy_optimization.py
│       ├── cnc.py
│       └── fabricator.py
│
├── ai_services/ (15 files)
│   ├── calibration/
│   │   └── calibration_learner.py
│   ├── optimization/
│   │   ├── genetic_algorithm.py
│   │   ├── constraint_programming.py
│   │   └── hybrid_optimizer.py
│   └── ml_models/
│       ├── algorithm_predictor.py
│       └── remnant_predictor.py
│
├── core/ (20 files)
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   └── dependencies.py
│
├── models/ (Pydantic models)
│   ├── user.py
│   ├── project.py
│   ├── profile.py
│   └── optimization.py
│
├── services/ (Business logic)
│   ├── dxf_parser.py
│   ├── cutting_list_generator.py
│   ├── cnc_exporter.py
│   └── qr_generator.py
│
├── tests/ (17 files)
│   ├── unit/
│   ├── integration/
│   ├── performance/
│   └── security/
│
└── migrations/ (35+ files)
    ├── 001_initial_schema.sql
    ├── 002_add_profiles.sql
    └── ...
```

---

## 🔬 Technical Deep Dive

### 1. Accuracy System (99.6-99.8%)

#### Dual Calculation System
```typescript
// HardenedCuttingListGenerator.ts
class HardenedCuttingListGenerator {
  // Primary calculation (proven method)
  private calculatePrimary(cuts: Cut[]): CutList {
    // Main algorithm with kerf compensation, bar trim, welding loss
  }
  
  // Secondary calculation (independent verification)
  private calculateSecondary(cuts: Cut[]): CutList {
    // Alternative approach for cross-verification
  }
  
  // Cross-verification (max 10 microns difference)
  public generate(cuts: Cut[]): CutList {
    const primary = this.calculatePrimary(cuts);
    const secondary = this.calculateSecondary(cuts);
    
    const diff = this.calculateDifference(primary, secondary);
    if (diff > 0.01) { // 10 microns
      throw new AccuracyError('Calculation mismatch exceeds tolerance');
    }
    
    return primary;
  }
}
```

#### Accuracy Tracking
```typescript
// AccuracyTracker.ts
class AccuracyTracker {
  private checkpoints: Map<string, AccuracyCheckpoint> = new Map();
  
  recordCheckpoint(stage: string, expected: number, actual: number) {
    const accuracy = (1 - Math.abs(expected - actual) / expected) * 100;
    this.checkpoints.set(stage, { stage, accuracy, timestamp: Date.now() });
  }
  
  getOverallAccuracy(): number {
    const accuracies = Array.from(this.checkpoints.values()).map(c => c.accuracy);
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }
}
```

### 2. AI Learning System

#### CalibrationLearner (Multivariate Regression)
```python
# calibration_learner.py
class CalibrationLearner:
    def __init__(self, mode: LearningMode = LearningMode.HYBRID):
        self.mode = mode
        self.model = LinearRegression()
        self.min_samples = 10
        
    def train(self, feedback_data: List[FeedbackEntry]):
        """Train on production feedback (QR code scans)"""
        if len(feedback_data) < self.min_samples:
            raise InsufficientDataError()
            
        # Extract features: profile dimensions, material, joint type, angle
        X = self._extract_features(feedback_data)
        
        # Target: optimal K-factor
        y = self._calculate_optimal_k_factors(feedback_data)
        
        # Weight by fit quality (perfect=1.0, tight=0.8, loose=0.6)
        weights = self._calculate_weights(feedback_data)
        
        # Train weighted linear regression
        self.model.fit(X, y, sample_weight=weights)
        
    def predict(self, profile: Profile) -> Tuple[float, float]:
        """Predict K-factor with confidence score"""
        features = self._extract_features([profile])
        k_factor = self.model.predict(features)[0]
        confidence = self._calculate_confidence(profile)
        
        return k_factor, confidence
```

#### PresetMatcher (Rule-Based ML)
```typescript
// PresetMatcher.ts
class PresetMatcher {
  private patterns: WindowPattern[];
  
  matchPattern(windowUnit: WindowUnit): PatternMatch[] {
    const features = this.extractFeatures(windowUnit);
    
    const matches = this.patterns.map(pattern => {
      const score = this.calculateSimilarity(features, pattern);
      const confidence = this.calculateConfidence(score, features);
      
      return { pattern, score, confidence };
    });
    
    // Return top 2-3 matches with >50% confidence
    return matches
      .filter(m => m.confidence > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  
  private extractFeatures(windowUnit: WindowUnit): Features {
    return {
      aspectRatio: windowUnit.width / windowUnit.height,
      gridComplexity: windowUnit.grid.rows * windowUnit.grid.cols,
      openingType: windowUnit.openingType,
      symmetry: this.calculateSymmetry(windowUnit.grid)
    };
  }
}
```

### 3. CNC Integration Architecture

#### Adapter Pattern
```typescript
// BaseCNCAdapter.ts
abstract class BaseCNCAdapter {
  abstract validateCoordinates(x: number, y: number): boolean;
  abstract generateGCode(job: CNCJob): string;
  abstract simulate(gcode: string): SimulationResult;
  
  protected checkBounds(x: number, y: number): void {
    if (!this.validateCoordinates(x, y)) {
      throw new OutOfBoundsError(`Coordinates (${x}, ${y}) exceed machine limits`);
    }
  }
  
  protected detectDangerousCommands(gcode: string): string[] {
    const dangerous = [];
    if (gcode.includes('M99') && gcode.split('M99').length > 2) {
      dangerous.push('M99 loop detected');
    }
    if (gcode.includes('M30') && gcode.split('M30').length > 2) {
      dangerous.push('M30 infinite loop detected');
    }
    return dangerous;
  }
}

// YilmazAdapter.ts
class YilmazAdapter extends BaseCNCAdapter {
  private readonly MAX_X = 6500; // mm
  private readonly MAX_Y = 1000; // mm
  
  validateCoordinates(x: number, y: number): boolean {
    return x >= 0 && x <= this.MAX_X && y >= 0 && y <= this.MAX_Y;
  }
  
  generateGCode(job: CNCJob): string {
    // YILMAZ-specific G-code template
    const gcode = this.applyTemplate(job, 'yilmaz_alm_6510');
    
    // Validate before returning
    const dangerous = this.detectDangerousCommands(gcode);
    if (dangerous.length > 0) {
      throw new ValidationError(`Dangerous commands: ${dangerous.join(', ')}`);
    }
    
    return gcode;
  }
}
```

### 4. Performance Optimization

#### Bundle Splitting Strategy
```typescript
// vite.config.ts
manualChunks: (id) => {
  // Only split standalone engines (no React dependencies)
  if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
    return 'three-engine'; // ~500KB
  }
  if (id.includes('node_modules/@tensorflow/')) {
    return 'ml-engine'; // ~800KB
  }
  if (id.includes('node_modules/jspdf/') || id.includes('node_modules/exceljs/')) {
    return 'document-vendor'; // ~400KB
  }
  
  // Everything else in react-vendor (safe, no circular deps)
  return 'react-vendor'; // ~600KB
}
```

#### Web Worker Optimization
```typescript
// optimization.worker.ts
self.onmessage = (e: MessageEvent) => {
  const { cuts, stockLength, strategy } = e.data;
  
  // Offload heavy computation to worker thread
  const result = optimizeCuts(cuts, stockLength, strategy);
  
  self.postMessage(result);
};
```

#### Lazy Loading Pattern
```typescript
// App.tsx
const FabricatorWorkflow = lazyRetry(
  () => import("./pages/FabricatorWorkflow.tsx"),
  "FabricatorWorkflow"
);

// lazyImport.ts
export function lazyRetry<T>(
  importFn: () => Promise<T>,
  componentName: string,
  retries = 3
) {
  return lazy(() => {
    return new Promise<T>((resolve, reject) => {
      const attemptImport = (retriesLeft: number) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft === 0) {
              reject(error);
            } else {
              setTimeout(() => attemptImport(retriesLeft - 1), 1000);
            }
          });
      };
      attemptImport(retries);
    });
  });
}
```

---

## 🧪 Testing & Quality Assurance

### Test Coverage

| Component | Coverage | Framework | Test Count |
|-----------|----------|-----------|------------|
| Frontend Components | 75%+ | Vitest + RTL | 150+ tests |
| API Endpoints | 80%+ | pytest | 200+ tests |
| Optimization Algorithms | 90%+ | Custom suite | 24 golden master tests |
| Security | 100% | Bandit + OWASP | Automated scanning |
| Performance | 100% | Lighthouse CI | 5 benchmark tests |

### Golden Master Tests (24/24 Passed)

#### Accuracy Tests (10/10)
```python
# test_golden_master_accuracy.py
def test_dxf_parsing_accuracy():
    """Test DXF parsing with 0.01mm tolerance"""
    result = parse_dxf("test_window.dxf")
    assert result.accuracy >= 0.998  # 99.8%

def test_cut_list_accuracy():
    """Test cut list generation accuracy"""
    cuts = generate_cut_list(project)
    expected = load_golden_master("cuts_expected.json")
    assert compare_cuts(cuts, expected, tolerance=0.01)  # 10 microns

def test_optimization_accuracy():
    """Test optimization algorithm accuracy"""
    result = optimize_cuts(cuts, stock_length=6000)
    assert result.waste_percentage < 5.0  # <5% waste
    assert result.accuracy >= 0.996  # 99.6%
```

#### Performance Tests (14/14)
```python
# test_golden_master_performance.py
def test_dxf_parsing_speed():
    """Test DXF parsing speed (<500ms)"""
    start = time.time()
    parse_dxf("complex_window.dxf")
    duration = time.time() - start
    assert duration < 0.5  # 500ms

def test_optimization_speed_50_cuts():
    """Test optimization speed for 50 cuts (<2s)"""
    start = time.time()
    optimize_cuts(generate_cuts(50), 6000)
    duration = time.time() - start
    assert duration < 2.0  # 2 seconds

def test_optimization_speed_200_cuts():
    """Test optimization speed for 200 cuts (<10s)"""
    start = time.time()
    optimize_cuts(generate_cuts(200), 6000)
    duration = time.time() - start
    assert duration < 10.0  # 10 seconds
```

### Verification Suite Results

```
✅ Golden Master Accuracy: 10/10 tests passed
✅ Golden Master Performance: 14/14 tests passed
✅ Stress Test: 1000 concurrent workflows handled successfully
✅ Load Test: 500 requests/second sustained
✅ Recovery Test: Automatic checkpoint recovery validated
✅ Security Scan: 0 critical vulnerabilities
✅ Accessibility: WCAG 2.1 AA compliant
✅ Performance: Lighthouse score >90
```

---

## 🚀 Production Readiness

### 7-Week Hardening Plan Status: 98% Complete ✅

#### Week 1: Build Foundation (100%)
- ✅ Web Worker configuration
- ✅ Python requirements consolidation
- ✅ TypeScript strict mode (gradual)
- ✅ Port configuration verification

#### Week 2-5: Core Hardening (100%)
- ✅ SecurityGateway (frontend & backend)
- ✅ Monitoring infrastructure (WorkflowProfiler, BaselineTracker, AccuracyTracker)
- ✅ ProductionDXFParser (Web Worker support)
- ✅ HardenedCuttingListGenerator (dual calculation)
- ✅ ProductionOptimizer (hybrid engine)
- ✅ Production3DRenderer (memory-aware)
- ✅ CheckpointManager & ProductionWorkflow (auto-recovery)
- ✅ FeedbackCollector (user feedback)
- ✅ ProductionCNCExporter (machine adapters)
- ✅ CI/CD integration (golden master tests)

#### Week 6: Final Verification (85%)
- ✅ ProductionDashboard (real-time monitoring)
- ✅ Verification suite execution (24/24 tests passed)
- ✅ Ministers Office package (documentation)
- ⏳ Final production deployment (pending)

### Deployment Status

#### Current Deployments
- **Frontend:** Vercel (Edge Network, CDN)
- **Backend:** Docker containers (ready for orchestration)
- **Database:** Supabase (automatic backups, point-in-time recovery)
- **CI/CD:** GitHub Actions (automated testing)

#### Environment Configuration
```
Development:
├── Frontend: localhost:3000
├── Backend: localhost:8000
└── Database: Local Supabase

Staging:
├── Frontend: staging.almona.com
├── Backend: api-staging.almona.com
└── Database: Staging Supabase

Production:
├── Frontend: app.almona.com
├── Backend: api.almona.com
└── Database: Production Supabase
```

---

## 📈 Business Metrics & ROI

### Market Opportunity

| Metric | Value | Notes |
|--------|-------|-------|
| Addressable Market | 5,000+ workshops | Global (Egypt, Turkey, Middle East, Europe) |
| Market Coverage | 100% | Aluminum (60%) + UPVC (40%) |
| Average Workshop Size | 5-15 employees | Mid-sized fabricators |
| Average Project Volume | 50 projects/month | Per workshop |
| Material Cost per Project | $500-$2,000 | Varies by project size |

### Customer ROI

#### Small Workshop (1-5 employees)
- **Time Savings:** 93% reduction (3.5h → 15min per project)
- **Material Savings:** 15-20% waste reduction
- **Monthly Savings:** $2,000-$5,000
- **ROI Timeline:** 1-2 months

#### Medium Workshop (5-15 employees)
- **Time Savings:** 93% reduction (enables 3x more projects)
- **Material Savings:** 17% average waste reduction
- **Monthly Savings:** $5,000-$15,000
- **ROI Timeline:** <1 month

#### Large Workshop (15+ employees)
- **Time Savings:** 93% reduction (significant capacity increase)
- **Material Savings:** 18-20% waste reduction
- **Monthly Savings:** $15,000+
- **ROI Timeline:** Immediate

### Competitive Advantages

| Feature | Traditional Software | Almona Portfolio Forge |
|---------|---------------------|------------------------|
| Setup Time | Days/Weeks | 2-4 hours |
| Accuracy | 90-95% | 99.6-99.8% |
| AI Learning | None | Continuous improvement |
| CNC Integration | Manual/Partial | Full automation |
| Material Savings | 5-10% | 15-20% |
| No-DXF Tuning | Not Available | 88% of parameters |
| Multi-language | English only | 5 languages (RTL/LTR) |
| Production-Ready | Prototype | Used in real workshops |

---

## 🔐 Security & Compliance

### Security Measures

#### Authentication & Authorization
- JWT token-based authentication
- OAuth2 social login
