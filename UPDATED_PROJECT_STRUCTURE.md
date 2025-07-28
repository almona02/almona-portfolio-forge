# Project Structure Documentation

This document provides a comprehensive overview of the ALMONA Industrial Solutions Platform directory structure, including both frontend and Python backend components.

## Root Directory Structure

```
almona-portfolio-forge/
├── .blackboxrules                    # Blackbox AI configuration
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
├── README.md                         # Project overview and setup
├── UPDATED_README.md                 # Updated documentation with Python backend
├── package.json                      # Frontend dependencies and scripts
├── python_backend/                   # NEW: Python backend directory
│   ├── apis/                         # FastAPI endpoints
│   │   └── main.py                   # Main FastAPI application
│   ├── ai_services/                  # AI/ML service modules
│   │   ├── part_detection/           # Part identification services
│   │   └── preprocessing/            # Data preprocessing utilities
│   ├── core/                         # Core backend configurations
│   │   ├── celery_app.py             # Celery configuration
│   │   └── config.py                 # Application configuration
│   ├── monitoring/                   # Monitoring and dashboards
│   │   └── dashboard.json            # Grafana dashboard configuration
│   ├── tests/                        # Test suites
│   │   ├── security_test.py          # Security vulnerability testing
│   │   ├── load_test.py              # Load testing with Locust
│   │   ├── benchmark.py              # Performance benchmarking
│   │   └── test_api.py               # API endpoint testing
│   ├── uploads/                      # File upload storage
│   ├── docker-compose.yml            # Docker container orchestration
│   ├── Dockerfile                    # Docker container configuration
│   ├── requirements.txt              # Python dependencies
│   └── TESTING_GUIDE.md              # Backend testing documentation
├── src/                              # Frontend source code
│   ├── components/                   # React components
│   ├── constants/                    # Application constants
│   ├── context/                      # React context providers
│   ├── data/                         # Static data files
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Utility libraries
│   ├── pages/                        # Page components
│   ├── types/                        # TypeScript type definitions
│   └── vite-env.d.ts                 # Vite environment types
├── public/                           # Static assets
├── docs/                             # Project documentation
├── locales/                          # Translation files
├── dist/                             # Production build output
├── tests/                            # Frontend test files
├── vitest.config.ts                  # Vitest testing configuration
├── vite.config.ts                    # Vite build configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Frontend dependencies
```

## Python Backend Detailed Structure

### apis/
FastAPI application structure with modular endpoints:
- **main.py**: Main FastAPI application entry point
- **routers/**: API route definitions
- **models/**: Pydantic models for request/response validation
- **middleware/**: Custom middleware for authentication, logging, etc.

### ai_services/
AI and machine learning service modules:
- **part_detection/**: Computer vision services for part identification
- **preprocessing/**: Data preprocessing utilities

### core/
Core backend infrastructure:
- **celery_app.py**: Celery configuration for async task processing
- **config.py**: Application configuration management

### monitoring/
Monitoring and observability:
- **dashboard.json**: Grafana dashboard configuration

### tests/
Comprehensive test suite:
- **security_test.py**: Security vulnerability testing
- **load_test.py**: Load testing with Locust
- **benchmark.py**: Performance benchmarking
- **test_api.py**: API endpoint testing

## Unified Test Commands
The project now supports unified testing across frontend and backend:

```bash
# Run all tests
npm run test:full

# Run security tests
npm run test:security

# Run load tests
npm run test:load

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend
```

## Environment Variables
Key environment variables for the integrated system:

### Frontend
- `VITE_API_URL`: Backend API endpoint
- `VITE_SMS_API_KEY`: SMS service API key
- `VITE_GOOGLE_ANALYTICS_ID`: Google Analytics tracking ID
- `VITE_MAPS_API_KEY`: Google Maps API key
- `VITE_AR_API_KEY`: AR/3D model service API key

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: JWT secret key
- `CELERY_BROKER_URL`: Celery message broker
- `AI_MODEL_PATH`: Path to trained AI models

## Docker Configuration
The Python backend includes Docker support:
- **Dockerfile**: Container configuration for the backend
- **docker-compose.yml**: Multi-service orchestration including:
  - PostgreSQL database
  - Redis cache
  - FastAPI application
  - Celery worker
  - Monitoring stack (Prometheus + Grafana)
