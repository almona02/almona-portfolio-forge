# ALMONA Industrial Solutions Platform

## Overview
A comprehensive platform for Egyptian aluminum & UPVC fabricators featuring:
- Intelligent spare parts ordering system
- Equipment comparison tools
- AI-powered maintenance recommendations
- Augmented Reality guides
- **NEW**: Python backend integration for advanced AI services and API management

## Technical Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Custom Hooks
- **Build**: Vite with optimization for production

### Backend (NEW)
- **Python Backend**: FastAPI + SQLAlchemy + Celery
- **AI Services**: TensorFlow + OpenCV + scikit-learn
- **Database**: PostgreSQL with Redis for caching
- **Monitoring**: Prometheus + Grafana dashboards
- **Testing**: Pytest + Locust for load testing

## Key Features

### Smart Spare Parts System
- **AI Part Finder**: Identify parts via image, voice, or description
- **Predictive Inventory**: AI-driven demand forecasting
- **AR Installation Guides**: Step-by-step part replacement
- **Dynamic Pricing**: Genuine, local, and 3D-printable options

### Python Backend Integration
- **Unified API**: Single endpoint for all AI services
- **Real-time Processing**: Async task handling with Celery
- **Scalable Architecture**: Microservices with Docker containers
- **Comprehensive Testing**: Unit, integration, and load tests

### Security & Monitoring
- **AIAction Security Scanning**: Automated vulnerability detection
- **Performance Monitoring**: Real-time metrics and alerts
- **Load Testing**: Scalability validation with Locust
- **Security Testing**: Comprehensive security test suite

## Development Setup

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Backend Setup
```bash
# Navigate to Python backend
cd python_backend

# Install dependencies
pip install -r requirements.txt

# Start development server
python -m uvicorn apis.main:app --reload

# Run tests
python -m pytest tests/
```

### Unified Test Commands
```bash
# Run all tests (frontend + backend)
npm run test:full

# Run security tests
npm run test:security

# Run load tests
npm run test:load

# Run specific test suites
npm run test:frontend
npm run test:backend
```

## Project Structure
See [docs/project-structure.md](docs/project-structure.md) for complete directory layout including Python backend integration.

## Python Backend Directory Structure
```
python_backend/
├── apis/                 # FastAPI endpoints
├── ai_services/          # AI/ML services
├── core/                 # Core configurations
├── monitoring/           # Grafana dashboards
├── tests/                # Test suites
│   ├── security_test.py  # Security testing
│   ├── load_test.py      # Load testing
│   └── benchmark.py      # Performance testing
├── uploads/              # File upload handling
└── docker-compose.yml    # Container orchestration
```

## Deployment
- **Frontend**: Vercel/Netlify with CI/CD pipeline
- **Backend**: Docker containers with Kubernetes
- **Monitoring**: Prometheus + Grafana dashboards
- **Security**: Automated security scanning in CI/CD

## Contributing
Pull requests are welcome. For major changes, please open an issue first.

## Security Features
- **AIAction Security Scanning**: Automated vulnerability detection
- **Code Analysis**: Static analysis for security risks
- **Dependency Scanning**: Automated dependency vulnerability checks
- **Penetration Testing**: Regular security assessments
