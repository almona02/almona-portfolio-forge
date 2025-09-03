# Almona Portfolio Forge - Documentation

Welcome to the comprehensive documentation for Almona Portfolio Forge, a modern industrial machinery portfolio and e-commerce platform.

## 📚 Documentation Overview

This documentation provides complete information about the project structure, features, setup, and development guidelines.

### 📄 Available Documentation

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [README.md](../README.md) | Main project documentation with features and setup | Latest |
| [project-structure.md](./project-structure.md) | Comprehensive file structure with descriptions | Latest |
| [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) | Development guidelines and best practices | Current |
| [MCP_SETUP.md](../MCP_SETUP.md) | Model Context Protocol setup instructions | Current |
| [CODE_PRINCIPLES_EVALUATION.md](../CODE_PRINCIPLES_EVALUATION.md) | Code quality evaluation | Current |
| [SECURITY_IMPROVEMENTS_SUMMARY.md](../SECURITY_IMPROVEMENTS_SUMMARY.md) | Security enhancements | Current |

## 🚀 Quick Start

### For Developers
1. **Setup**: Follow the [README.md](../README.md) installation guide
2. **Structure**: Review [project-structure.md](./project-structure.md) for codebase organization
3. **Development**: Check [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) for coding standards

### For Project Managers
1. **Overview**: Start with [README.md](../README.md) for feature overview
2. **Architecture**: Review the technology stack and database schema
3. **Security**: Check [SECURITY_IMPROVEMENTS_SUMMARY.md](../SECURITY_IMPROVEMENTS_SUMMARY.md)

## 🏗️ Project Architecture

### **Frontend Architecture**
- **Framework**: React 18 + TypeScript + Vite
- **Components**: 100+ organized by feature areas
- **Pages**: 25+ application routes
- **Styling**: Tailwind CSS + shadcn/ui
- **3D/AR**: Three.js integration for industrial visualization

### **Backend Architecture**
- **API**: FastAPI with versioned endpoints
- **Database**: Supabase (PostgreSQL) with RLS
- **AI Services**: TensorFlow.js + Computer Vision
- **Authentication**: Multi-factor with role-based access
- **Testing**: Comprehensive test suite

### **Key Features**
- 🛒 **E-Commerce**: Complete industrial machinery catalog
- 🔧 **Service Management**: Professional ticketing system
- 🤖 **AI-Powered**: Equipment recommendations and part detection
- 🌐 **Multi-Language**: Arabic (RTL) and English (LTR)
- 📱 **Responsive**: Mobile-first design approach
- 🔐 **Secure**: Enterprise-grade security implementation

## 📊 Database Schema

### **Core Tables**
- **profiles**: User accounts with company information
- **products**: Industrial machinery and parts catalog
- **quotes**: Quote management with approval workflow
- **orders**: Order processing and fulfillment
- **service_tickets**: Professional support ticketing
- **notifications**: Real-time user notifications

### **Advanced Features**
- Row Level Security (RLS) policies
- Automated SLA management
- Multi-language content support
- Audit logging and compliance
- Real-time subscriptions

## 🛠️ Development Workflow

### **Getting Started**
```bash
# Clone and setup
git clone <repository-url>
cd almona-portfolio-forge
npm install

# Start development
npm run dev                    # Frontend (port 5173)
cd python_backend && uvicorn apis.main:app --reload  # Backend (port 8000)
```

### **Available Scripts**
```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run preview               # Preview production build

# Testing
npm run test                   # Run all tests
npm run test:watch            # Run tests in watch mode
npm run test:ui               # Run tests with UI
npm run test:coverage         # Run tests with coverage
npm run test:api              # Run backend API tests
npm run test:security         # Run security tests

# Documentation
npm run gen:structure         # Generate project structure
npm run docs:generate         # Generate all documentation

# Quality Assurance
npm run lint                  # Run ESLint
npm run type-check           # TypeScript type checking
npm run analyze              # Bundle analysis

# Deployment
npm run deploy:staging        # Deploy to staging
npm run deploy:production     # Deploy to production
```

## 🔧 Component Organization

### **By Feature Area**
- **Shop & E-Commerce** (`src/components/shop/`)
  - Product catalog and configuration
  - Shopping cart and checkout
  - AI-powered recommendations
  - Freight calculations

- **Services** (`src/components/services/`)
  - Customer portal and dashboard
  - Machine registration and tracking
  - Maintenance scheduling
  - Training programs

- **Support** (`src/components/support/`)
  - Professional ticketing system
  - SLA management
  - Real-time chat support
  - Knowledge base

- **3D & AR** (`src/components/3d-model/`)
  - Interactive 3D viewers
  - Augmented reality features
  - Model configuration tools
  - Performance optimization

## 🌍 Internationalization

### **Supported Languages**
- **Arabic (العربية)**: Right-to-left layout with cultural adaptations
- **English**: Left-to-right layout with international standards

### **Localization Features**
- Dynamic language switching
- RTL/LTR layout adaptation
- Localized number and date formats
- Region-specific content (Egyptian standards)
- Cultural UI adaptations

## 🔐 Security Implementation

### **Authentication & Authorization**
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Social login integration
- Session management with JWT
- Password security policies

### **Data Protection**
- Row Level Security (RLS) policies
- Data encryption at rest and in transit
- GDPR compliance features
- Audit logging and monitoring
- Secure file upload handling

### **API Security**
- Rate limiting and throttling
- Input validation and sanitization
- CORS policy configuration
- API key management
- Request/response logging

## 📈 Performance & Monitoring

### **Frontend Optimization**
- Code splitting and lazy loading
- Image optimization with WebP
- Service worker for offline functionality
- Bundle size optimization
- Web Vitals tracking

### **Backend Performance**
- Database query optimization
- Caching strategies
- Background task processing
- Load balancing ready
- Performance monitoring

## 🧪 Testing Strategy

### **Frontend Testing**
- **Unit Tests**: Component logic and utilities
- **Integration Tests**: User workflows and API integration
- **E2E Tests**: Complete user journeys with Playwright
- **Visual Tests**: Component snapshots with Storybook
- **Accessibility Tests**: WCAG compliance validation

### **Backend Testing**
- **API Tests**: Endpoint functionality and validation
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Load testing and benchmarking
- **Contract Tests**: API contract validation
- **Chaos Tests**: System resilience testing

## 🚀 Deployment

### **Production Environment**
- **Frontend**: Vercel with global CDN
- **Backend**: Docker containers with orchestration
- **Database**: Supabase with automatic backups
- **Monitoring**: Real-time performance tracking
- **Security**: SSL/TLS encryption and security headers

### **CI/CD Pipeline**
- Automated testing on pull requests
- Code quality checks and linting
- Security vulnerability scanning
- Automated deployment to staging
- Manual approval for production

## 📞 Support & Maintenance

### **Development Support**
- **Documentation**: Comprehensive guides and API docs
- **Code Standards**: ESLint and Prettier configuration
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error boundaries
- **Logging**: Structured logging for debugging

### **Production Support**
- **Monitoring**: Real-time system monitoring
- **Alerting**: Automated issue detection
- **Backup**: Regular database backups
- **Updates**: Automated dependency updates
- **Security**: Regular security audits

## 🔄 Recent Updates

### **Version 2.0.0** (Latest)
- ✅ Complete documentation overhaul
- ✅ Service ticketing system with SLA management
- ✅ AI-powered equipment recommendations
- ✅ Enhanced security with RLS policies
- ✅ Multi-language support (Arabic/English)
- ✅ Performance improvements (40% faster)
- ✅ Mobile optimization and PWA features

### **Database Schema Updates**
- Complete e-commerce schema implementation
- Service ticketing system with automated workflows
- User profiles with company information
- Audit logging and security policies
- Multi-language content support

### **Backend API Enhancements**
- FastAPI v2 endpoints with improved performance
- AI services integration for part detection
- Email notification system with templates
- Comprehensive testing suite
- Docker optimization for production

---

**For technical support or questions, please refer to the main [README.md](../README.md) or contact the development team.**

*Last updated: $(date)*
