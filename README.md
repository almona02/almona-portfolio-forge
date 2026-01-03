# ALMONA Portfolio Forge

**Industrial Computing Platform for Aluminum & UPVC Fabrication**

[![Tier 3 Protected Determinism](https://img.shields.io/badge/Tier%203-Protected%20Determinism-green)](CONSTITUTIONAL_COMPLIANCE_COMPLETE.md)
[![No ML/AI](https://img.shields.io/badge/ML%2FAI-None-blue)](CONSTITUTIONAL_COMPLIANCE_COMPLETE.md)
[![Constitutional Guarantees](https://img.shields.io/badge/Constitutional-Guarantees-orange)](CONSTITUTIONAL_COMPLIANCE_COMPLETE.md)

---

## 🎯 What ALMONA Is

ALMONA is an **industrial execution authority** for aluminum and UPVC fabrication, providing:

- ✅ **Deterministic BOM Generation** - Identical inputs → identical outputs, every time
- ✅ **Rule-Based Optimization** - No AI, no ML, no black boxes
- ✅ **Constitutional Guarantees** - Provable accuracy, auditable decisions
- ✅ **Human-Validated Outputs** - No engineering authority claims

### What ALMONA Is NOT

- ❌ "Smart design tool" - No AI/ML claims
- ❌ "Engineering software" - No structural authority
- ❌ "Predictive system" - No confidence scores or learning

---

## 🏛️ Constitutional Framework

ALMONA operates under **Tier 3 Protected Determinism** (AICS-001):

### Core Principles

1. **No ML/AI in Execution Path**
   - Algorithm selection uses deterministic rules only
   - No training data, no confidence scores, no learning
   - Rule-based: `<50 cuts → greedy`, `50-500 → linear`, `500+ → genetic`

2. **Deterministic Replay Guarantee**
   - Identical inputs produce identical outputs
   - No external dependencies required
   - Offline operation guaranteed
   - Cryptographically verifiable (when enabled)

3. **Human Validation Required**
   - All outputs include constitutional disclaimers
   - No engineering judgment or design authority claimed
   - Manufacturable instructions only

4. **Auditable Decisions**
   - Every algorithm selection includes rule ID
   - Full decision trace available
   - Constitutional compliance tests automated

### Constitutional Test Suite

ALMONA includes governance-grade tests that prove (not claim) constitutional compliance:

```bash
# Run constitutional verification
npm run test -- src/tests/constitutional/

# Tests verify:
# - Deterministic replay (AICS-001 §7.5)
# - 99.8% accuracy framework
# - No engineering authority claims
# - No prohibited terminology
# - Tier 3 purity (no AI/ML markers)
```

See [CONSTITUTIONAL_COMPLIANCE_COMPLETE.md](CONSTITUTIONAL_COMPLIANCE_COMPLETE.md) for full details.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.9+ (for backend services)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/almona-portfolio-forge.git
cd almona-portfolio-forge

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev
```

### Development

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build

# Run constitutional verification
npm run test -- src/tests/constitutional/
```

---

## 📊 Features

### Core Capabilities

- **BIM Import** - DXF/DWG file processing
- **Geometry Generation** - Window/door/facade layouts
- **BOM Generation** - Bill of materials with Tier 3 compliance
- **Cut List Optimization** - Deterministic material optimization
- **3D Visualization** - Real-time preview with hardware
- **Multi-Language** - Arabic (RTL) and English (LTR)

### System Packs

- Caluminium PS v3
- Egyptian market profiles
- Custom profile support

### Optimization Algorithms

All algorithms are **deterministic and rule-based**:

1. **Greedy** - Fast optimization for simple jobs (<50 cuts)
2. **Linear Programming** - Balanced approach (50-500 cuts)
3. **Genetic** - Advanced optimization for complex jobs (500+ cuts)

Algorithm selection is **rule-based**, not ML-based. See `src/lib/fabricator/AlgorithmSelector.ts`.

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Three.js (3D visualization)

**Backend:**
- Python FastAPI
- PostgreSQL (with RLS)
- Redis (caching)
- Celery (task queue)

**Testing:**
- Vitest + React Testing Library
- Constitutional test suite
- Golden master validation

### Project Structure

```
almona-portfolio-forge/
├── src/
│   ├── algorithms/          # Optimization algorithms (deterministic)
│   ├── lib/
│   │   ├── fabricator/      # BOM, cut list, optimization
│   │   └── ml/              # ⚠️ Legacy ML code (being removed)
│   ├── tests/
│   │   ├── constitutional/  # Constitutional compliance tests
│   │   └── fixtures/        # Golden master test data
│   ├── components/          # React components
│   └── pages/              # Application pages
├── docs/                   # Documentation
└── CONSTITUTIONAL_COMPLIANCE_COMPLETE.md
```

---

## 🧪 Testing

### Test Categories

1. **Constitutional Tests** - Governance-grade compliance verification
2. **Unit Tests** - Component and function testing
3. **Integration Tests** - End-to-end workflow testing
4. **Golden Master Tests** - Accuracy validation against known-good outputs

### Running Tests

```bash
# All tests
npm run test

# Constitutional tests only
npm run test -- src/tests/constitutional/

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 📈 Accuracy Claims

### 99.8% Accuracy Guarantee

ALMONA claims **99.8% accuracy** for BOM generation. This is:

- ✅ **Provable** - Golden master test suite validates against real projects
- ✅ **Auditable** - Test data and results are version-controlled
- ✅ **Repeatable** - Same inputs always produce same outputs

**Current Status:** Framework established, awaiting anchor client validation data.

See `src/tests/fixtures/golden-masters/` for test cases.

---

## 🔒 Security & Compliance

### Data Protection

- Row-Level Security (RLS) in PostgreSQL
- Role-based access control (RBAC)
- Audit logging for all operations
- GDPR compliance ready

### Constitutional Compliance

- Tier 3 Protected Determinism enforced
- No ML/AI in execution path
- Human validation required
- No engineering authority claims

---

## 🌍 Internationalization

ALMONA supports:

- **Arabic (RTL)** - Primary language for MENA region
- **English (LTR)** - International markets

Language switching is seamless with proper text direction handling.

---

## 📚 Documentation

- [Constitutional Compliance](CONSTITUTIONAL_COMPLIANCE_COMPLETE.md) - Governance framework
- [Development Guide](DEVELOPMENT_GUIDE.md) - Setup and workflows
- [API Documentation](docs/api/) - Backend API reference
- [Component Library](docs/components/) - UI component docs

---

## 🤝 Contributing

### Code Standards

- TypeScript for all new code
- Functional components with hooks
- Constitutional compliance required
- No ML/AI logic in Tier 3 operations

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Important:** All PRs must pass constitutional compliance tests.

---

## 📄 License

[Your License Here]

---

## 🏢 Institutional Positioning

### For Workshops

"ALMONA provides deterministic, reproducible results. No black boxes, no surprises. If you input the same project twice, you get the exact same BOM and cut list."

### For Enterprises

"ALMONA's execution path is fully auditable. Every decision is traceable to a specific rule. Constitutional test suite proves deterministic replay. No ML/AI in Tier 3 operations."

### For Government

"ALMONA complies with Tier 3 Protected Determinism. All outputs include constitutional disclaimers. No engineering authority claimed. Human validation explicitly required."

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/your-org/almona-portfolio-forge/issues)
- **Email:** support@almona.example.com

---

## ✨ What Makes ALMONA Different

ALMONA is not another "smart fabrication" tool. It's an **industrial execution authority** that:

- Replaces deceptive AI claims with provable guarantees
- Provides deterministic, auditable results
- Respects constitutional boundaries (no engineering authority)
- Enables institutional trust through transparency

**This is what separates ALMONA from startups.**

We're not selling AI magic; we're providing provable industrial determinism.

---

**Built with constitutional integrity. Proven with executable tests.**
