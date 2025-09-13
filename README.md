# Almona Portfolio Forge

A comprehensive, modern industrial machinery portfolio and e-commerce platform built for Almona, featuring advanced 3D/AR visualization, AI-powered services, and a complete customer support system.

## 🚀 Overview
Almona Portfolio Forge is a full-stack industrial machinery platform that combines a React frontend with a Python FastAPI backend, offering everything from product showcases to complete service management. The platform serves industrial clients across Egypt and the Middle East with specialized features for aluminum, UPVC, and steel fabrication industries.

## ✨ Key Features

### 🛒 **E-Commerce & Shop**
- **Product Catalog**: Comprehensive industrial machinery, spare parts, and raw materials
- **3D Product Viewer**: Interactive 3D models with AR capabilities
- **Smart Configurator**: AI-powered product configuration and recommendations
- **Quote System**: Advanced quoting with bulk pricing and custom configurations
- **Multi-Currency Support**: EGP, USD, EUR with real-time conversion
- **Inventory Management**: Real-time stock tracking and availability

### 🔧 **Service Management**
- **Service Ticketing System**: Professional SLA-based ticket management
- **Customer Portal**: Comprehensive dashboard for orders, quotes, and service history
- **Machine Registration**: Digital machine registry with maintenance tracking
- **Preventive Maintenance**: Automated scheduling and reminders
- **Emergency Services**: 24/7 emergency support with priority routing
- **Spare Parts Management**: Automated parts identification and ordering

### 🤖 **AI-Powered Features**
- **Equipment Advisor**: AI recommendations based on requirements
- **Part Detection**: Computer vision for spare parts identification
- **Predictive Maintenance**: ML-based maintenance predictions
- **Fault Detection**: Automated issue diagnosis from images/audio
- **Smart Search**: Intelligent product and documentation search

### 🌐 **Internationalization**
- **Multi-Language Support**: Arabic (RTL) and English (LTR)
- **Localized Content**: Region-specific pricing, regulations, and standards
- **Egyptian Standards**: Compliance with local industrial standards
- **Cultural Adaptation**: Tailored UX for Middle Eastern markets

### 📱 **Advanced UI/UX**
- **Responsive Design**: Optimized for all devices and screen sizes
- **Progressive Web App**: Offline capabilities and app-like experience
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- **Performance**: Optimized loading with lazy loading and caching

### 🔐 **Security & Authentication**
- **Multi-Factor Authentication**: SMS OTP and email verification
- **Role-Based Access Control**: Customer, Admin, Technician, Sales Rep roles
- **Row Level Security**: Database-level security policies
- **Audit Logging**: Comprehensive activity tracking
- **Data Protection**: GDPR compliant with data encryption

## 🛠 Technology Stack

### **Frontend**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with optimized bundling
- **Styling**: Tailwind CSS + shadcn/ui components
- **3D Graphics**: Three.js + @react-three/fiber
- **AR/VR**: @react-three/xr for WebXR support
- **State Management**: React Context + Zustand
- **Routing**: React Router v6 with lazy loading
- **Forms**: React Hook Form + Zod validation
- **Internationalization**: i18next with RTL support
- **Testing**: Vitest + React Testing Library + Playwright

### **Backend**
- **Framework**: FastAPI (Python 3.9+)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth with custom policies
- **AI Services**: TensorFlow.js + Hugging Face Transformers
- **Task Queue**: Celery with Redis
- **Email Service**: SendGrid with custom templates
- **File Storage**: Supabase Storage with CDN
- **Monitoring**: Custom dashboard with performance metrics

### **Infrastructure**
- **Deployment**: Vercel (Frontend) + Docker (Backend)
- **CDN**: Vercel Edge Network
- **Database**: Supabase with automatic backups
- **Monitoring**: Web Vitals + Custom analytics
- **CI/CD**: GitHub Actions with automated testing

## 📁 Project Structure

### **Frontend Structure**
```
src/
├── components/           # Reusable UI components
│   ├── 3d-model/        # 3D viewers and AR components
│   ├── about/           # Company information components
│   ├── auth/            # Authentication components
│   ├── comparison/      # Product comparison tools
│   ├── contact/         # Contact and support forms
│   ├── home/            # Homepage sections
│   ├── layout/          # Navigation and layout components
│   ├── products/        # Product display components
│   ├── quotes/          # Quote management components
│   ├── services/        # Service-related components
│   ├── shop/            # E-commerce components
│   ├── support/         # Customer support components
│   ├── ui/              # Base UI components (shadcn/ui)
│   └── used-machines/   # Used machinery marketplace
├── pages/               # Route components
│   ├── machines/        # Machine detail pages
│   ├── profiles/        # User profile pages
│   ├── workflows/       # Process workflow pages
│   └── Services/        # Service management pages
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   ├── ai/             # AI service integrations
│   ├── reports/        # Report generation
│   └── polyfills/      # Browser compatibility
├── context/            # React context providers
├── constants/          # Static data and configurations
├── data/               # Mock data and fixtures
├── types/              # TypeScript type definitions
└── assets/             # Static assets and images
```

### **Backend Structure**
```
python_backend/
├── apis/               # API route handlers
│   ├── v1/            # Version 1 API endpoints
│   └── v2/            # Version 2 API endpoints
├── ai_services/       # AI and ML services
│   ├── part_detection/ # Computer vision for parts
│   └── preprocessing/ # Image processing utilities
├── core/              # Core application logic
├── models/            # Pydantic data models
├── templates/         # Email templates
├── tests/             # Comprehensive test suite
├── monitoring/        # Performance monitoring
└── uploads/           # File upload handling
```

## 🗄️ Database Schema

### **Core Tables**
- **profiles**: Extended user profiles with company information
- **products**: Industrial machinery, parts, and materials catalog
- **categories**: Hierarchical product categorization
- **quotes**: Quote management with approval workflow
- **orders**: Order processing and fulfillment tracking
- **service_tickets**: Professional ticketing system with SLA
- **notifications**: Real-time user notifications

### Unified Ticketing Expansion
The unified ticket model consolidates:
* Support Ticket (general support)
* Preventive Maintenance
* Scheduled Maintenance
* Emergency Service
* Product Quote Request
* Add To Quote (shop incremental)

These map into `service_tickets.category` (enum `ticket_category`) plus supplemental columns:
`scheduled_for`, `maintenance_metadata`, `digital_twin_code`, `machine_id`, `created_via`.

Digital twin codes auto-generate for maintenance/emergency categories through `trg_set_digital_twin_code` and `generate_digital_twin_code()`.

Migration script: `unify_tickets_migration.sql` (idempotent) performs:
1. Enum creation
2. Column additions
3. Trigger + function creation
4. Legacy `tickets` backfill
5. Reporting view `unified_ticket_overview`

Pydantic creation models (backend) in `python_backend/models/api_v2_models.py`:
`SupportTicketCreate`, `PreventiveMaintenanceTicketCreate`, `ScheduledMaintenanceTicketCreate`, `EmergencyServiceTicketCreate`, `ProductQuoteTicketCreate`, `AddToQuoteTicketCreate`.

Pending integration TODOs:
* Add FastAPI router for CRUD operations over unified tickets
* Extend frontend forms to pass `category` & metadata fields
* Add tests asserting digital twin generation for maintenance/emergency tickets
* Add analytics dashboards using `unified_ticket_overview`

### Customer Portal Quote Tracking
To let customers track quotations by either classic quote number or the machine/service digital twin context:

Added schema/migration: `add_quote_twin_linkage.sql` which provides:
* Columns on `quotes`: `digital_twin_code`, `related_service_ticket_id`, `machine_id`, `portal_reference`
* Trigger `trg_set_quote_digital_twin_code` to auto-populate `digital_twin_code` from a linked service ticket or machine
* Partial unique index on `digital_twin_code`
* Lookup function `portal_quote_lookup(query text)` (SECURITY INVOKER) applying RLS automatically

Portal integration flow:
1. User enters search text (quote number fragment, twin code, or custom portal reference)
2. Frontend calls Supabase RPC: `portal_quote_lookup`
3. Display returned quotes with badges: status, twin code, portal reference
4. (Optional) Link back to the originating service ticket using `related_service_ticket_id`

Recommended UI elements:
* Single search bar with helper text: “Search by Quote #, Twin Code, or Reference”
* Filters: status (draft/sent/accepted), date range
* Column set: Quote # | Twin Code | Amount | Status | Created | Reference

Security model: RLS on `quotes` ensures only the owner’s records appear; function is `SECURITY INVOKER`.

### Request Quote Flow & Digital Twin Integration

The Request Quote dialog now posts directly to the backend endpoint `POST /api/v2/quotes/create`.

Flow summary:
1. User completes the 4‑step quote request wizard (contact info, details, services, review).
2. On submit the frontend assembles a payload with contact fields, urgency, project description and minimal product/service line arrays.
3. Backend inserts into `public.quotes`; database trigger assigns `digital_twin_code` if linked to a service ticket / machine (or leaves NULL pending later association).
4. Response returns: `id`, `quote_number`, `digital_twin_code`, `portal_reference`, `status`, `total_amount`.
5. Dialog swaps to a confirmation panel showing the twin code (or "Pending assignment") and provides a "Track in Portal" CTA which routes to `/portal` where the user can search via the Quote Twin Search panel.

Important notes:
* Line items are not yet persisted into `quote_items` from this flow; only quote header is stored. Future enhancement: send structured items and batch insert into `quote_items` to enable granular pricing revisions.
* Digital twin assignment logic lives server‑side (trigger `set_quote_digital_twin_code`) ensuring consistent format and avoiding collisions.
* Portal search uses the `portal_quote_lookup(_query text)` function (SECURITY INVOKER) which applies RLS so users only see their own quotes.

Future enhancements:
* Persist full product/service lines into `quote_items` with configuration metadata.
* Expose `related_service_ticket_id` selection in the dialog when quote originates from a ticket context.
* Allow regenerating or manually linking a digital twin after machine registration.

### Next Potential Improvements
* Include `related_service_ticket_id` in `portal_quote_lookup` SELECT to enable direct navigation
* Add a format constraint: `ALTER TABLE public.quotes ADD CONSTRAINT quotes_dtc_format CHECK (digital_twin_code IS NULL OR digital_twin_code ~ '^DTC-[0-9]{4}-[A-Z0-9]{8}$');`
* Retrofill script for historical quotes with machine context but no twin code
* Analytics view summarizing: twin code → count(quotes), first/last quote timestamps, conversion rate
* Add materialized view for dashboard KPIs (refresh schedule every 15 min)

### **Advanced Features**
- **Row Level Security (RLS)**: Database-level access control
- **Audit Logging**: Complete activity tracking
- **SLA Management**: Automated service level agreements
- **Multi-Language Content**: Localized product information
- **Pricing Tiers**: Bulk pricing and customer-specific rates

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Python 3.9+ and pip
- Supabase account
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/almona-portfolio-forge.git
   cd almona-portfolio-forge
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd python_backend
   pip install -r requirements-enhanced.txt
   ```

4. **Environment Setup**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp python_backend/.env.example python_backend/.env
   
   # Configure your environment variables:
   # - Supabase URL and API keys
   # - Google Maps API key
   # - SendGrid API key
   # - AI service API keys
   ```

5. **Database Setup**
   ```bash
   # Run the database schema in Supabase SQL Editor
   # 1. Execute database-schema.sql
   # 2. Execute service-ticketing-system-secure.sql
   ```

### **Development**

1. **Start the frontend development server**
   ```bash
   npm run dev
   ```

2. **Start the backend server**
   ```bash
   cd python_backend
   uvicorn apis.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 📋 Available Scripts

### **Frontend Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run storybook` - Start Storybook
- `npm run gen:structure` - Generate project structure documentation

### **Backend Scripts**
- `npm run test:api` - Run backend API tests
- `npm run test:security` - Run security tests
- `npm run test:performance` - Run performance tests
- `npm run load-test` - Run load testing with Locust

### **Deployment Scripts**
- `npm run deploy:staging` - Deploy to staging environment
- `npm run deploy:production` - Deploy to production

## 🏗️ Architecture

### **Frontend Architecture**
- **Component-Based**: Modular, reusable components
- **Feature-Driven**: Organized by business functionality
- **Performance-Optimized**: Code splitting and lazy loading
- **Accessibility-First**: WCAG 2.1 AA compliance
- **Mobile-Responsive**: Progressive enhancement approach

### **Backend Architecture**
- **Microservices**: Modular API design
- **Event-Driven**: Real-time updates with WebSockets
- **Scalable**: Horizontal scaling with Docker
- **Secure**: Multi-layer security implementation
- **Observable**: Comprehensive monitoring and logging

### **Data Flow**
1. **User Interaction** → React Components
2. **State Management** → Context/Zustand
3. **API Calls** → FastAPI Backend
4. **Data Processing** → AI Services (if applicable)
5. **Database Operations** → Supabase with RLS
6. **Real-time Updates** → WebSocket subscriptions

## 🔧 Key Components

### **Shop & E-Commerce**
- `ProductConfigurator` - Advanced product configuration
- `FreightCalculator` - Shipping cost calculation
- `QuoteRequestStepper` - Multi-step quote process
- `EquipmentComparisonTool` - Side-by-side comparisons
- `RecentlyViewedProducts` - User browsing history

### **3D & AR Features**
- `EnhancedGLBViewer` - 3D model rendering
- `ARViewer` - Augmented reality integration
- `Machine3DButton` - 3D model triggers
- `WorkspaceChecker` - AR space validation

### **Service Management**
- `AdminTicketDashboard` - Service ticket management
- `CreateTicketDialog` - Ticket creation interface
- `TicketDetailView` - Comprehensive ticket details
- `MaintenanceDashboard` - Preventive maintenance
- `MachineRegistration` - Equipment registration

### **AI & Smart Features**
- `AiEquipmentAdvisor` - AI-powered recommendations
- `MachineRecommendationWizard` - Smart product finder
- `FabricationReportGenerator` - Automated reporting
- `IntelligentForm` - Smart form assistance

## 🌍 Internationalization

### **Supported Languages**
- **Arabic (العربية)**: Right-to-left (RTL) layout
- **English**: Left-to-right (LTR) layout

### **Localization Features**
- Dynamic language switching
- RTL/LTR layout adaptation
- Localized number and date formats
- Region-specific content
- Cultural UI adaptations

### **Content Management**
- JSON-based translation files
- Dynamic content loading
- Fallback language support
- Professional translation workflow

## 🔒 Security Features

### **Authentication & Authorization**
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Session management with JWT
- OAuth integration (Google, Facebook)
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

## 📊 Performance & Monitoring

### **Performance Optimizations**
- Code splitting and lazy loading
- Image optimization and WebP support
- CDN integration for static assets
- Service worker for offline functionality
- Database query optimization

### **Monitoring & Analytics**
- Web Vitals tracking
- Custom performance metrics
- Error tracking and reporting
- User behavior analytics
- Real-time system monitoring

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

### **Production Deployment**
- **Frontend**: Vercel with automatic deployments
- **Backend**: Docker containers with orchestration
- **Database**: Supabase with automatic backups
- **CDN**: Global content delivery network
- **Monitoring**: Real-time performance tracking

### **Environment Configuration**
- **Development**: Local development with hot reloading
- **Staging**: Pre-production testing environment
- **Production**: Optimized production deployment
- **Testing**: Isolated testing environment

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow coding standards** and maintain consistency
3. **Write comprehensive tests** for new features
4. **Update documentation** for any changes
5. **Submit a pull request** with detailed description

### **Development Workflow**
1. Create feature branch from `main`
2. Implement feature with tests
3. Run linting and type checking
4. Test across devices and browsers
5. Create pull request with description
6. Code review and approval
7. Merge to main branch
8. Deploy to staging for final testing
9. Deploy to production

## 📝 License

This project is proprietary software developed for Almona Industrial Solutions. All rights reserved.

## 📞 Support

For technical support or questions:
- **Email**: support@almona.com
- **Phone**: +20 xxx xxx xxxx
- **Documentation**: [Internal Wiki]
- **Issue Tracker**: GitHub Issues

## 🔄 Recent Updates

### **Version 2.0.0** (Latest)
- ✅ **Service Ticketing System**: Professional SLA-based support system
- ✅ **AI-Powered Services**: Equipment advisor and part detection
- ✅ **Enhanced Security**: Row Level Security and audit logging
- ✅ **Multi-Language Support**: Complete Arabic/English localization
- ✅ **Performance Improvements**: 40% faster loading times
- ✅ **Mobile Optimization**: Enhanced mobile experience

### **Database Schema Updates**
- Complete e-commerce schema with products, orders, quotes
- Service ticketing system with SLA management
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

**Built with ❤️ for Almona Industrial Solutions**
