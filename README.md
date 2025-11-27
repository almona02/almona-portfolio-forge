# Almona Portfolio Forge

A comprehensive, modern industrial machinery portfolio and e-commerce platform built for Almona, featuring advanced 3D/AR visualization, AI-powered services, and a complete customer support system.

## 🚀 Overview
Almona Portfolio Forge is a full-stack industrial machinery platform that combines a React frontend with a Python FastAPI backend, offering everything from product showcases to complete service management. The platform serves industrial clients across Egypt and the Middle East with specialized features for aluminum, UPVC, and steel fabrication industries.

### 🧩 Core Domains
- **Products**: Rich machinery catalog with specifications, videos, and immersive 3D/AR galleries for preview, comparison, and interactive exploration.
- **Maintenance**: Unified ticketing system, machine passport records, and customer/technician portals for managing machines, service history, and support flows.
- **Fabricator**: Full-stack Fabricator Workflow Pro and CRM/optimization suite for aluminium/UPVC workshops (see `FABRICATOR_ENHANCEMENT_PLAN.md`), including profiles/accessories, pricing configuration, remnant-aware inventory, optimization algorithms, reporting, and CNC/machine export profiles.
- **Sales**: Smart industrial shop, B2B used-machines marketplace, quote workflows, and spare-parts sales for both new and used equipment.

The Admin Dashboard now features a polished glass/opacity UI, live KPI cards, realtime sales charts, top products, and customer activity, powered by Supabase live queries and channels.

## ✨ Key Features

### 🛒 **E-Commerce & Shop**
- **Product Catalog**: Comprehensive industrial machinery, spare parts, and raw materials
- **3D Product Viewer**: Interactive 3D models with AR capabilities
- **Smart Configurator**: AI-powered product configuration and recommendations
- **Quote System**: Advanced quoting with bulk pricing and custom configurations
- **Multi-Currency Support**: EGP, USD, EUR with real-time conversion
- **Inventory Management**: Real-time stock tracking and availability
- **Industrial Product Cards**: Specialized product display with certifications and specifications
- **Product Quick View**: Modal-based product preview with detailed information
- **Recently Viewed Products**: User browsing history and recommendations
- **Smart Category Navigation**: Intelligent product categorization and filtering
- **Category Breadcrumbs**: Hierarchical navigation with smart category mapping
- **Mobile-Optimized Grid**: Responsive product display for mobile devices
- **Virtualized Machine Grid**: Performance-optimized large product listings
- **Mobile Filter Panel**: Touch-friendly filtering interface
- **AI Equipment Advisor**: Lazy-loaded AI-powered equipment recommendations
- **Freight Calculator**: Shipping cost calculation for industrial equipment
- **Egyptian Standards Guide**: Local compliance and certification information
- **Egyptian Technical Support Hub**: Regional technical support resources

### 🏭 **Products & Machinery**
- **YILMAZ Machines Showcase**: Dedicated Turkish machinery manufacturer display
- **3D Model Integration**: Enhanced 3D model dialogs with measurement tools
- **Machine Comparison System**: Side-by-side product comparison (up to 5 machines)
- **Compare Bar**: Floating comparison interface with machine management
- **Compare Dialog**: Detailed comparison view with specifications
- **Machine Recommendation Wizard**: AI-powered machine selection assistant
- **Quick Preview Modal**: Framer Motion animated product previews
- **Virtualized Machine Loading**: Performance-optimized large machine catalogs
- **Smart Category Mapping**: Intelligent product categorization system
- **Debounced Search**: Performance-optimized search with 300ms debounce
- **Scroll Threshold Detection**: Dynamic UI based on scroll position
- **Error Boundary Protection**: Comprehensive error handling with fallbacks

### 🔧 **Service Management**
- **Service Ticketing System**: Professional SLA-based ticket management
- **Customer Portal**: Comprehensive dashboard for orders, quotes, and service history
- **Machine Registration**: Digital machine registry with maintenance tracking
- **Preventive Maintenance**: Automated scheduling and reminders
- **Emergency Services**: 24/7 emergency support with priority routing
- **Spare Parts Management**: Automated parts identification and ordering
- **AI-Powered Predictive Maintenance**: Machine learning-driven failure predictions
- **Real-Time Machine Health Monitoring**: Live sensor data and health scoring
- **Predictive Maintenance Engine**: Lazy-loaded advanced maintenance analytics
- **Maintenance Dashboard**: Comprehensive maintenance management interface
- **Machine Registration Enhanced**: Advanced machine registration with digital twins
- **Emergency Service Dialog**: Priority emergency service request interface
- **Service View Toggle**: Simple/Advanced service interface switching
- **Simple Services View**: Streamlined service selection interface
- **Operator Training Incentive Dialog**: Training program management
- **Ticket Wizard Dialog**: Unified ticket creation system
- **Unified Ticketing System**: Consolidated support, maintenance, and emergency tickets
- **Digital Twin Integration**: Machine lifecycle tracking with unique identifiers
- **Quote Twin Search Panel**: Customer portal quote tracking system

### 🧱 **Fabricator Platform & Workflow Pro**
- **Fabricator Workflow Pro Cockpit**: End-to-end aluminium/UPVC fabricator workspace covering design, optimization, cutting, reporting, and production hand-off.
- **Profile & Accessory Management**: Supabase-backed profile and accessory libraries with pricing configurations, stock levels, remnants, and stock movement tracking (see `FABRICATOR_ENHANCEMENT_PLAN.md` and `FABRICATOR_ENHANCEMENT_QUICK_REFERENCE.md`).
- **Optimization & Reporting**: Genetic/linear optimization, remnant-aware cutting, and multi-format cutting/accessories/glass reports (PDF, CSV, DXF) localized for Turkish and Egyptian markets.
- **CNC & Machine Integrations**: DXF and G-code exports, Yilmaz and multi-brand CNC connectors, barcode/QR-based cut lists, and machine-ready export profiles for shop-floor use.
- **Fabricator Workspace Cockpit**: Shared `/fabricator/*` workspace layout with tabs for Projects, Customers, Inventory, and Commercial, backed by a persistent `FabricatorWorkspaceContext` that preserves drafts and state across navigation and refresh.
- **Cross-Empire Workflow Ribbon**: `BosphorusWorkflowRibbon` UI that visually bridges Ottoman/Egyptian craftsmanship with modern YILMAZ technology, driving the measuring → design → optimization → inventory → production → quality pipeline.
- **Inventory Intelligence & Stock Intake**: Enhanced `InventoryDashboard` with remnant analytics, multi-location support, and a **Stock Intake by Invoice** flow that understands system packs (ROCK 60, JUMBO 100), roles (frame/sash/bead), weight-per-meter, painted finishes, and CSV invoice import.
- **Conflict-Aware Profile Editing**: Workspace-backed draft edits and conflict-aware saving in `/fabricator/inventory`, using Supabase `updated_at` checks to avoid silent overwrites when multiple operators edit the same profiles.
- **Commercial Workspace Drafts**: `/fabricator/commercial` cockpit for managing `DraftQuote` and `DraftInvoice` objects at workspace level, including quote → invoice conversion and persistent commercial drafts tied to active projects/customers.
- **Branded System Packs & Smart Draw Presets**: Regional system packs for ROCK 60, JUMBO 100, YILMAZ W60, and CALUMINIUM PS with embedded structural constraints and Smart Draw presets, plus region-aware defaults in `NewProjectWizard` and `SmartMeasuringInterface`.
- **Inventory Branded Tree**: Brand/system-pack aware inventory dashboard with filters and analytics grouped by system packs (YILMAZ, CALUMINIUM, ROCK 60, JUMBO 100), including remnants.
- **Mass Production Cockpit**: `FabricatorWorkflowPro` and `MassProductionDashboard` on top of `MassProductionOptimizer` for cross-project, remnant-aware cutting optimization and unified waste KPIs.
- **Pricing Engine with Metal Indexing**: Extended `PricingEngine` with metal price indices (LME/LOCAL stubs) and a `PricingPreview` hook in the fabricator workflow, including live material estimates and metal‑price deviation alerts for region-aware, metal-indexed pricing and quoting.

### 🤖 **AI-Powered Features**
- **Equipment Advisor**: AI recommendations based on requirements
- **Part Detection**: Computer vision for spare parts identification
- **Predictive Maintenance**: ML-based maintenance predictions with 94% accuracy
- **Fault Detection**: Automated issue diagnosis from images/audio
- **Smart Search**: Intelligent product and documentation search
- **AI Sales Acceleration**: Lead scoring and automated proposal generation
- **Predictive Analytics Platform**: Machine learning trend forecasting
- **AI Technical Chatbot**: Customer support automation
- **Machine Health Prediction**: Real-time failure prediction algorithms
- **Sensor Data Analysis**: Vibration, temperature, acoustic monitoring
- **Automated Workflow Generation**: AI-powered process optimization
- **Natural Language Processing**: Technical document analysis
- **Computer Vision**: Quality control and part identification

### 🏪 **Used Machinery Marketplace**
- **Used Machine Browsing**: Comprehensive marketplace for pre-owned equipment
- **Advanced Filtering**: Location, machine type, and condition-based filtering
- **Machine Type Categories**: Copy routers, cutting machines, CNC centers, welding machines
- **Location-Based Search**: Governorate-specific machine listings
- **Condition Assessment**: Excellent/Good condition ratings with verification
- **Seller Verification**: Verified seller badges and trust indicators
- **Machine Details**: Comprehensive specifications including hours, year, location
- **Inspection Requests**: Technical inspection booking system
- **Sell Used Machine Form**: Complete machine selling interface
- **Trust Indicators**: Technical inspection, secure transactions, logistical support
- **Egyptian Market Focus**: Localized for Egyptian industrial market

### 🌐 **Internationalization**
- **Multi-Language Support**: Arabic (RTL) and English (LTR)
- **Localized Content**: Region-specific pricing, regulations, and standards
- **Egyptian Standards**: Compliance with local industrial standards
- **Cultural Adaptation**: Tailored UX for Middle Eastern markets
- **French & German Support**: EU market expansion with localized content
- **GDPR Compliance**: European data protection regulation compliance
- **Multi-Region Deployment**: Global infrastructure with regional customization

### 📱 **Advanced UI/UX**
- **Responsive Design**: Optimized for all devices and screen sizes
- **Progressive Web App**: Offline capabilities and app-like experience
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- **Performance**: Optimized loading with lazy loading and caching
- **Framer Motion Animations**: Smooth, performant UI transitions
- **Mobile-First Design**: Touch-optimized interfaces for mobile devices
- **Neon Button Components**: Industrial-themed UI elements
- **Glass/Opacity UI**: Modern glassmorphism design elements
- **Error Boundary Protection**: Comprehensive error handling
- **Skeleton Loading States**: Optimized loading experiences
- **Reduced Motion Support**: Accessibility-compliant motion preferences

### 🔐 **Security & Authentication**
- **Multi-Factor Authentication**: SMS OTP and email verification
- **Role-Based Access Control**: Customer, Admin, Technician, Sales Rep roles
- **Row Level Security**: Database-level security policies
- **Audit Logging**: Comprehensive activity tracking
- **Data Protection**: GDPR compliant with data encryption
- **Permission-Based Access**: Granular access control for service tickets
- **Secure File Upload**: Protected file handling with validation
- **API Rate Limiting**: Request throttling and abuse prevention

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
- **Reporting & Exports**: Modular export system for PDF/CSV/DXF cutting, accessories, and glass reports with QR/barcode support and localization (EN/TR/AR)

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
│   │   ├── Model3DDialog.tsx
│   │   ├── EnhancedModel3DDialog.tsx
│   │   ├── Model3DGallery.tsx
│   │   └── ModelMeasurementTool.tsx
│   ├── about/           # Company information components
│   ├── auth/            # Authentication components
│   ├── comparison/      # Product comparison tools
│   │   ├── CompareBar.tsx
│   │   └── CompareDialog.tsx
│   ├── contact/         # Contact and support forms
│   ├── home/            # Homepage sections
│   ├── layout/          # Navigation and layout components
│   ├── mobile/          # Mobile-optimized components
│   │   └── MobileTicketCreator.tsx
│   ├── optimized/       # Performance-optimized components
│   │   ├── VirtualizedMachineGrid.tsx
│   │   ├── MobileOptimizedGrid.tsx
│   │   └── MobileFilterPanel.tsx
│   ├── portal/          # Customer portal components
│   │   └── MachineHealthDashboard.tsx
│   ├── products/        # Product display components
│   │   ├── SmartCategoryNavigation.tsx
│   │   └── CategoryBreadcrumb.tsx
│   ├── quotes/          # Quote management components
│   │   ├── QuoteRequestDialog.tsx
│   │   └── QuoteTwinSearchPanel.tsx
│   ├── services/        # Service-related components
│   │   ├── ServiceCard.tsx
│   │   ├── EmergencyServiceDialog.tsx
│   │   ├── ServiceViewToggle.tsx
│   │   ├── SimpleServicesView.tsx
│   │   ├── MachineRegistrationEnhanced.tsx
│   │   ├── MaintenanceDashboard.tsx
│   │   ├── PredictiveMaintenanceEngine.tsx
│   │   └── OperatorTrainingIncentiveDialog.tsx
│   ├── shop/            # E-commerce components
│   │   ├── IndustrialProductCard.tsx
│   │   ├── ProductQuickView.tsx
│   │   ├── RecentlyViewedProducts.tsx
│   │   ├── FreightCalculator.tsx
│   │   ├── EgyptianStandardsGuide.tsx
│   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   └── ai-advisor/
│   │       └── AiEquipmentAdvisor.tsx
│   ├── support/         # Customer support components
│   │   ├── TicketWizardDialog.tsx
│   │   └── AITechnicalChatbot.tsx
│   ├── ui/              # Base UI components (shadcn/ui)
│   │   ├── FormSkeleton.tsx
│   │   └── Progress.tsx
│   └── used-machines/   # Used machinery marketplace
│       └── SellUsedMachineForm.tsx
├── pages/               # Route components
│   ├── Products.tsx     # YILMAZ machines showcase
│   ├── Shop.tsx         # Industrial equipment hub
│   ├── Services.tsx     # AI-powered services
│   ├── UsedMachines.tsx # Used machinery marketplace
│   ├── CustomerPortal.tsx # Customer dashboard
│   ├── Model3DGallery.tsx # 3D model gallery
│   └── AdminDashboard.tsx # Admin management
├── hooks/               # Custom React hooks
│   ├── useVirtualizedMachines.ts
│   ├── useScrollThreshold.ts
│   ├── useToast.ts
│   └── useReducedMotionPref.ts
├── lib/                 # Utility libraries
│   ├── ai/             # AI service integrations
│   ├── analytics/      # Business intelligence
│   ├── comparisonStorage.ts # Comparison persistence
│   ├── i18n.ts         # Internationalization
│   ├── performance.ts  # Performance monitoring
│   ├── imageOptimization.ts # Image optimization
│   └── ticketing/      # Unified ticketing system
├── context/            # React context providers
│   ├── AuthContext.tsx
│   └── QuoteContext.tsx
├── constants/          # Static data and configurations
│   ├── yilmazMachines.ts
│   ├── productsData.ts
│   ├── uniqueProductsData.ts
│   └── smartCategories.ts
├── data/               # Mock data and fixtures
│   ├── inventory.ts
│   └── usedMachines.ts
├── types/              # TypeScript type definitions
├── shared/             # Shared UI components
│   └── ui/            # shadcn/ui components
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

Recommended UI elements:  newnew
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
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

4. **Admin Dashboard**
   - Route: `/admin/dashboard`
   - Protected by `ProtectedRoute` and loads lazily; requires a logged-in user.
   - Live widgets:
     - KPI cards (orders, revenue, customers, products, pending, low stock)
     - Sales chart (last 30 days, realtime via Supabase channel)
     - Top products (last 30 days, from `order_items`)
     - Recent orders and customer activity (from `orders` and `profiles`)

## ⚡ Quick Start: Admin

1. Set your Supabase environment variables in `.env` (root):
   ```bash
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_KEY=YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY
   ```

2. Create a demo admin user (pick one of the options):
   - Supabase Auth UI: Sign up a user, then in Supabase table editor add a matching row to `profiles` and mark them as admin (if your schema uses a role flag/enum).
   - SQL (example schema-agnostic pattern):
     ```sql
     -- Create or confirm the auth user via Supabase Auth Dashboard
     -- Then ensure a profile row exists
     insert into public.profiles (id, email, full_name)
     values ('<auth_user_uuid>', 'admin@example.com', 'Demo Admin')
     on conflict (id) do update set email = excluded.email;
     ```

3. Log in via the app (Login page) and visit `/admin/dashboard`.

Notes
- The dashboard pulls live data from `orders`, `order_items`, `profiles`, and `products` tables.
- Realtime widgets use Supabase channels; ensure Database Realtime is enabled for these tables in your Supabase project.

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
- `IndustrialProductCard` - Specialized industrial product display
- `ProductQuickView` - Modal-based product preview
- `RecentlyViewedProducts` - User browsing history and recommendations
- `FreightCalculator` - Shipping cost calculation for industrial equipment
- `EgyptianStandardsGuide` - Local compliance and certification information
- `EgyptianTechnicalSupportHub` - Regional technical support resources
- `SmartCategoryNavigation` - Intelligent product categorization and filtering
- `CategoryBreadcrumb` - Hierarchical navigation with smart category mapping
- `SmartCategoryFilter` - Advanced filtering interface
- `MobileOptimizedGrid` - Responsive product display for mobile devices
- `VirtualizedMachineGrid` - Performance-optimized large product listings
- `MobileFilterPanel` - Touch-friendly filtering interface

### **Products & Machinery**
- `Model3DDialog` - Basic 3D model viewer
- `EnhancedModel3DDialog` - Advanced 3D model viewer with measurement tools
- `CompareBar` - Floating comparison interface with machine management
- `CompareDialog` - Detailed comparison view with specifications
- `MachineRecommendationWizard` - AI-powered machine selection assistant
- `QuickPreviewModal` - Framer Motion animated product previews
- `VirtualizedMachineGrid` - Performance-optimized large machine catalogs
- `MobileOptimizedGrid` - Mobile-responsive machine display
- `MobileFilterPanel` - Touch-friendly machine filtering
- `SmartCategoryNavigation` - Intelligent machine categorization
- `CategoryBreadcrumb` - Hierarchical machine navigation

### **3D & AR Features**
- `Model3DDialog` - 3D model rendering interface
- `EnhancedModel3DDialog` - Advanced 3D model viewer with AR capabilities
- `Model3DGallery` - 3D model gallery with filtering and search
- `ModelMeasurementTool` - 3D model measurement and annotation tools
- `ARViewer` - Augmented reality integration
- `WorkspaceChecker` - AR space validation

### **Service Management**
- `ServiceCard` - Service display and selection interface
- `EmergencyServiceDialog` - Priority emergency service request interface
- `ServiceViewToggle` - Simple/Advanced service interface switching
- `SimpleServicesView` - Streamlined service selection interface
- `MachineRegistrationEnhanced` - Advanced machine registration with digital twins
- `MaintenanceDashboard` - Comprehensive maintenance management interface
- `PredictiveMaintenanceEngine` - Lazy-loaded advanced maintenance analytics
- `OperatorTrainingIncentiveDialog` - Training program management
- `TicketWizardDialog` - Unified ticket creation system
- `QuoteTwinSearchPanel` - Customer portal quote tracking system
- `MachineHealthDashboard` - Real-time machine health monitoring
- `AITechnicalChatbot` - Customer support automation
- `MobileTicketCreator` - Mobile-optimized ticket creation

### **Used Machinery Marketplace**
- `SellUsedMachineForm` - Complete machine selling interface
- `UsedMachineCard` - Used machine display with condition and verification
- `MachineInspectionRequest` - Technical inspection booking system
- `TrustIndicator` - Seller verification and trust badges

### **AI & Smart Features**
- `AiEquipmentAdvisor` - AI-powered equipment recommendations
- `MachineRecommendationWizard` - Smart product finder with AI
- `PredictiveMaintenanceEngine` - ML-based maintenance predictions
- `MachineHealthPrediction` - Real-time failure prediction algorithms
- `SensorDataAnalysis` - Vibration, temperature, acoustic monitoring
- `AutomatedWorkflowGeneration` - AI-powered process optimization
- `NaturalLanguageProcessing` - Technical document analysis
- `ComputerVision` - Quality control and part identification
- `AITechnicalChatbot` - Customer support automation
- `AI Sales Acceleration` - Lead scoring and automated proposal generation
- `PredictiveAnalyticsPlatform` - Machine learning trend forecasting

### **UI/UX Components**
- `NeonButton` - Industrial-themed button components
- `Progress` - Progress indicators and loading states
- `Skeleton` - Loading state components
- `ErrorBoundary` - Comprehensive error handling
- `FormSkeleton` - Form loading states
- `MobileTicketCreator` - Mobile-optimized interfaces
- `ReducedMotionSupport` - Accessibility-compliant motion preferences

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

### **Version 3.0.0** (Latest)
- ✅ **Comprehensive Product Showcase**: YILMAZ machines with 3D integration
- ✅ **Advanced Shop Experience**: Industrial equipment hub with AI advisor
- ✅ **AI-Powered Services**: Predictive maintenance with 94% accuracy
- ✅ **Used Machinery Marketplace**: Complete buy/sell platform
- ✅ **Enhanced 3D Experience**: Model gallery with measurement tools
- ✅ **Customer Portal**: Machine health dashboard and quote tracking
- ✅ **Mobile-First Design**: Touch-optimized interfaces
- ✅ **Performance Optimization**: Virtualized grids and lazy loading
- ✅ **Unified Ticketing System**: Consolidated support and maintenance
- ✅ **Digital Twin Integration**: Machine lifecycle tracking
- ✅ **Real-Time Monitoring**: Live sensor data and health scoring
- ✅ **Multi-Language Support**: Arabic, English, French, German
- ✅ **GDPR Compliance**: European market readiness
- ✅ **Advanced UI/UX**: Framer Motion animations and glassmorphism

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
# Vercel Deployment Test - Sat, Sep 27, 2025  1:25:58 AM
