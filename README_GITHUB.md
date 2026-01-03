# Almona Portfolio Forge

**Full-Stack Industrial SaaS Platform for Aluminium & UPVC Fabrication**

[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20Supabase-green)](package.json)

> **Transform workshop planning**: 3.5 hours → 15 minutes • 15-20% material waste reduction • 99.8% accuracy

---

## 🎯 What This Is

Almona Portfolio Forge is a production-ready, full-stack industrial SaaS platform that optimizes aluminum and UPVC fabrication workflows through AI-powered optimization, CNC integration, and intelligent material management.

### Technical Classification

- **Deployment Model**: SaaS (Software as a Service)
- **Architecture**: Full-stack (React frontend + FastAPI backend)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **AI/ML**: TensorFlow.js, ONNX Runtime, Google OR-Tools
- **3D Visualization**: Three.js with WebXR support
- **CNC Integration**: Multi-brand support (YILMAZ, Elumatec, FOMM, Emmegi, Biesse)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >=20.19.0 <23.0.0
- **Python**: 3.9+ (3.11+ recommended)
- **PostgreSQL**: 14+ (via Supabase or local)
- **Redis**: 5.0.1+ (for Celery task queue)

### Installation

```bash
# Clone the repository
git clone https://github.com/almona/portfolio-forge.git
cd portfolio-forge

# Install frontend dependencies
npm install

# Set up Python backend
cd python_backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials, API keys, etc.

# Run development servers
npm run dev              # Frontend (port 3000)
python -m uvicorn apis.v2.app:app --reload --port 8002  # Backend
```

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Backend API
VITE_API_URL=http://localhost:8002

# Optional: AI Services
GOOGLE_AI_API_KEY=your_google_ai_key
HUGGINGFACE_API_KEY=your_hf_key

# Optional: Redis (for Celery)
REDIS_URL=redis://localhost:6379
```

---

## 🏗️ Technology Stack

### Frontend

- **React 18.3.1** - UI framework with Concurrent features
- **TypeScript 5.5.3** - Type safety
- **Vite 7.2.6** - Build tool and dev server
- **Tailwind CSS 3.4.11** - Utility-first styling
- **shadcn/ui** - 66+ base components
- **Ant Design 5.29.1** - Complex data tables/forms
- **Three.js 0.180.0** - 3D visualization
- **@react-three/fiber** - React renderer for Three.js
- **TensorFlow.js 4.22.0** - Client-side ML
- **React Query 5.83.0** - Data fetching/caching
- **Zustand 5.0.6** - Lightweight state management
- **i18next 25.3.2** - Internationalization (5 languages)

### Backend

- **FastAPI 0.123.8** - Modern Python web framework
- **Python 3.9+** - Runtime (3.11+ recommended)
- **Uvicorn 0.24.0** - ASGI server
- **Pydantic 2.9.0** - Data validation
- **SQLAlchemy 2.0.23** - Async ORM
- **Supabase** - PostgreSQL database + auth + storage
- **Celery 5.3.4** - Background task queue
- **Redis 5.0.1** - Message broker and caching

### AI/ML Services

- **TensorFlow-CPU 2.17.1** - ML model inference (~400MB)
- **ONNX Runtime 1.20.0** - Optimized inference
- **Google OR-Tools 9.8.3296** - Constraint programming
- **OpenCV-headless 4.10.0.84** - Computer vision
- **Pytesseract 0.3.10** - OCR
- **ezdxf 1.1.4** - CAD file parsing

### CNC Integration

- **Multi-brand adapters**: YILMAZ, Elumatec, FOMM, Emmegi, Biesse
- **G-code generation** with validation
- **DXF export** (0.01mm tolerance)
- **QR code generation** for production feedback

---

## 📊 Key Features

### 1. Fabricator Pro Workflow

- **Material-first selection** with auto-defaults
- **3-4 click workflow** (Home → Material → Dimensions → Cut List)
- **No-DXF Tuning Studio** (88% of parameters without CAD)
- **7-stage workflow**: Measuring → Design → 3D Preview → Optimization → Inventory → Production → Quality Control

### 2. Optimization Engine

- **Genetic Algorithm** - Remnant-first strategy
- **Constraint Programming** - Glass nesting solver
- **Linear Programming** - Exact optimization
- **Hybrid Optimizer** - Combines multiple strategies
- **Performance**: <2s for 50 cuts, 5-10s for 200 cuts

### 3. 3D Visualization

- **Pattern-based window generation** (Egyptian patterns library)
- **Real-time rendering** (60 FPS with Three.js)
- **AR/VR support** (WebXR integration)
- **Hardware visualization** (handles, hinges, locks, rollers)

### 4. AI/ML Features

- **CalibrationLearner** - K-factor prediction (workshop-specific + collective learning)
- **PresetMatcher** - Rule-based pattern matching
- **Algorithm Predictor** - 94% accuracy in strategy selection
- **Remnant Usage Predictor** - Material waste forecasting

### 5. SmartScan (OCR/CV)

- **DXF extraction** from images
- **Profile detection** and measurement
- **Batch processing** with queue management
- **SVG preview** and results display

---

## 📈 Performance Metrics

| Metric | Value | Validation |
|--------|-------|------------|
| **Time Savings** | 93% reduction | Real workshop data |
| **Material Waste Reduction** | 15-20% | Production validated |
| **Accuracy** | 99.8% | Dual-calculation verified |
| **Production Readiness** | ✅ Complete | 24/24 tests passing |
| **Component Count** | 370+ React components | Codebase analysis |
| **Test Coverage** | 75%+ on critical paths | Test suite analysis |

---

## 🧪 Testing

```bash
# Frontend tests
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Backend tests
npm run test:api          # Python API tests
npm run test:security     # Security tests
npm run test:performance  # Load tests

# Golden master tests
npm run test:golden-master
```

---

## 📦 Build & Deployment

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview  # Preview production build
```

### Docker Deployment

```bash
# Backend
cd python_backend
docker build -t almona-backend .
docker run -p 8002:8002 almona-backend

# Frontend (if needed)
docker build -f Dockerfile.frontend.realistic -t almona-frontend .
```

### Railway Deployment

```bash
# Configure Railway environment variables
npm run railway:env

# Deploy
railway up
```

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](README.md) | Institutional overview | All audiences |
| [Institutional Overview](docs/INSTITUTIONAL_OVERVIEW.md) | Constitutional architecture | Academic reviewers, auditors |
| [AICS-001 Specification](docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md) | Canonical specification | Engineers, architects |
| [Technical Architecture](docs/ARCHITECTURE.md) | System design | Developers, architects |
| [API Reference](docs/API.md) | Endpoints & integration | Developers, integrators |
| [Deployment Guide](docs/DEPLOYMENT.md) | Installation & setup | DevOps, administrators |

---

## 🔧 Development

### Project Structure

```
almona-portfolio-forge/
├── src/                    # Frontend React application
│   ├── components/         # 370+ React components
│   ├── lib/                # Core business logic
│   ├── pages/              # Route pages
│   └── services/           # API clients
├── python_backend/         # FastAPI backend
│   ├── apis/v2/            # API endpoints
│   ├── services/           # Business logic
│   └── models/             # Database models
├── docs/                   # Documentation
└── tests/                  # Test suites
```

### Key Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run analyze:bundle   # Bundle analysis
npm run test             # Run tests
```

---

## 🤝 Contributing

We welcome contributions! Please read our [Contribution Guidelines](CONTRIBUTING.md) to get started.

**Key Contribution Areas**:
- AI safety & validation envelopes
- CNC machine adapters
- Deterministic constraint validators
- Performance optimizations
- Internationalization (i18n)

---

## 📞 Support

- **Technical Questions**: [technical@almona.com](mailto:technical@almona.com)
- **Workshop Support**: [workshops@almona.com](mailto:workshops@almona.com)
- **GitHub Issues**: [Create an issue](https://github.com/almona/portfolio-forge/issues)

---

## 📄 License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🏛️ Institutional Context

> **Note**: This technical README describes the implementation and deployment model. For institutional identity, governance principles, and constitutional architecture, see [README.md](README.md) and [docs/INSTITUTIONAL_OVERVIEW.md](docs/INSTITUTIONAL_OVERVIEW.md).

**Status**: 🟢 **Production-Ready** - Used by real workshops today

**Last Updated**: 2025-02-20

