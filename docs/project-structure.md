# Almona Portfolio Forge - Project Structure

This document provides a comprehensive overview of the project structure, organized by feature areas and technical components.

## 📁 Root Directory Structure

```
almona-portfolio-forge/
├── 📄 Configuration Files
│   ├── .blackboxrules              # Project-specific AI assistant rules
│   ├── .gitignore                  # Git ignore patterns
│   ├── .vercelignore              # Vercel deployment ignore patterns
│   ├── components.json             # shadcn/ui component configuration
│   ├── eslint.config.js           # ESLint configuration
│   ├── postcss.config.js          # PostCSS configuration
│   ├── tailwind.config.ts         # Tailwind CSS configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── tsconfig.app.json          # App-specific TypeScript config
│   ├── tsconfig.node.json         # Node.js TypeScript config
│   ├── vite.config.ts             # Vite build configuration
│   ├── vitest.config.ts           # Vitest testing configuration
│   ├── vitest.shims.d.ts          # Vitest type definitions
│   └── vercel.json                # Vercel deployment configuration
├── 📦 Package Management
│   ├── package.json               # Node.js dependencies and scripts
│   └── package-lock.json          # Locked dependency versions
├── 🗄️ Database & Backend
│   ├── database-schema.sql        # Complete e-commerce database schema
│   ├── service-ticketing-system-secure.sql  # Service ticketing system
│   ├── service-ticketing-system.sql         # Legacy ticketing system
│   └── python_backend/            # FastAPI backend (detailed below)
├── 📚 Documentation
│   ├── docs/                      # Project documentation
│   ├── README.md                  # Main project documentation
│   ├── DEVELOPMENT_GUIDE.md       # Development guidelines
│   ├── MCP_SETUP.md              # Model Context Protocol setup
│   ├── CODE_PRINCIPLES_EVALUATION.md  # Code quality evaluation
│   └── SECURITY_IMPROVEMENTS_SUMMARY.md  # Security enhancements
├── 🌐 Frontend Application
│   ├── src/                       # React application source (detailed below)
│   ├── public/                    # Static assets and files
│   ├── locales/                   # Internationalization files
│   └── index.html                 # Main HTML template
└── 🛠️ Development Tools
    ├── scripts/                   # Build and utility scripts
    └── tabby_x86_64-windows-msvc/ # Development tools
```

## 🎨 Frontend Structure (`src/`)

### 🧩 Components (`src/components/`)

#### **3D Model & AR Components** (`src/components/3d-model/`)
Advanced 3D visualization and augmented reality features for industrial machinery.

```
3d-model/
├── EnhancedGLBViewer.tsx      # Advanced 3D model renderer with controls
├── GLBViewer.tsx              # Basic 3D model viewer component
├── Machine3DButton.tsx        # Trigger button for 3D model display
├── Model3DDialog.tsx          # Modal dialog for 3D model interaction
├── ModelTest.tsx              # 3D model testing component
├── Products3DWrapper.tsx      # Wrapper for product 3D integration
├── index.ts                   # Component exports
└── README.md                  # 3D component documentation
```

**Key Features:**
- WebGL-based 3D rendering with Three.js
- Interactive model controls (zoom, rotate, pan)
- AR mode for real-world visualization
- Performance optimization for mobile devices
- Model loading states and error handling

#### **About Company Components** (`src/components/about/`)
Company information, history, and team presentation components.

```
about/
├── CompanyTimeline.tsx        # Interactive company history timeline
├── CompanyTimeline.test.tsx   # Timeline component tests
├── CompanyValues.tsx          # Company values and mission display
├── CustomerTestimonials.tsx   # Customer testimonials carousel
├── TeamProfiles.tsx           # Team member profiles grid
├── WorkflowDiagram.tsx        # Business process visualization
└── timelineData.ts           # Timeline data configuration
```

**Key Features:**
- Animated timeline with milestone markers
- Responsive testimonials carousel
- Team member profile cards with social links
- Interactive workflow diagrams
- Localized content support

#### **Authentication Components** (`src/components/auth/`)
User authentication, registration, and access control components.

```
auth/
├── CountryCodeSelect.tsx      # Country code selector for phone numbers
├── CountryCodeSelect.js       # Legacy country code component
├── FacebookLoginButton.tsx    # Facebook OAuth integration
├── ProtectedRoute.tsx         # Route protection wrapper
└── SmsOtpModal.tsx           # SMS OTP verification modal
```

**Key Features:**
- Multi-factor authentication (MFA)
- Social login integration (Google, Facebook)
- SMS OTP verification
- Role-based route protection
- Session management

#### **Product Comparison Tools** (`src/components/comparison/`)
Advanced product comparison and analysis tools for industrial equipment.

```
comparison/
├── CompareBar.tsx             # Floating comparison bar
├── CompareDialog.tsx          # Full comparison modal
├── CompareTable.tsx           # Side-by-side comparison table
├── EfficiencyCalculator.tsx   # Equipment efficiency calculator
└── LocalStandardsTable.tsx   # Regional standards compliance table
```

**Key Features:**
- Multi-product comparison matrix
- Efficiency calculations and projections
- Standards compliance checking
- Export comparison reports
- Save comparison configurations

#### **Contact & Support Components** (`src/components/contact/`)
Customer communication and support interfaces.

```
contact/
├── AuthForm.tsx               # Contact form with authentication
├── IntelligentForm.tsx        # AI-powered smart contact form
├── LiveAssistance.tsx         # Real-time chat and video support
└── SupportPortal.tsx          # Comprehensive support dashboard
```

**Key Features:**
- Intelligent form auto-completion
- Live chat with file sharing
- Video call integration
- Multi-language support forms
- Automated routing based on inquiry type

#### **Homepage Components** (`src/components/home/`)
Landing page sections and hero components.

```
home/
├── AboutSection.tsx           # Company overview section
├── FeaturedProducts.tsx       # Featured products carousel
├── Hero.tsx                   # Main hero section with CTA
└── ServicesSection.tsx        # Services overview grid
```

**Key Features:**
- Animated hero with video backgrounds
- Product carousel with 3D previews
- Interactive service cards
- Performance-optimized loading
- Mobile-responsive design

#### **Layout Components** (`src/components/layout/`)
Core layout and navigation components.

```
layout/
├── Footer.tsx                 # Site footer with links and info
└── Navbar.tsx                 # Main navigation with mega menu
```

**Key Features:**
- Responsive mega menu navigation
- Multi-language navigation
- User account dropdown
- Shopping cart integration
- Mobile hamburger menu

#### **Product Components** (`src/components/products/`)
Product display and filtering components.

```
products/
└── AdvancedFilters.tsx        # Advanced product filtering interface
```

**Key Features:**
- Multi-criteria filtering
- Price range sliders
- Category hierarchies
- Search with autocomplete
- Filter persistence

#### **Quote Management** (`src/components/quotes/`)
Comprehensive quote request and management system.

```
quotes/
├── QuoteAIHelper.tsx          # AI-powered quote assistance
├── QuoteCalculator.tsx        # Quote calculation engine
├── QuoteConfirmationPage.tsx  # Quote confirmation display
├── QuoteRequestDialog.tsx     # Quote request modal
├── QuoteRequestPage.tsx       # Full quote request page
├── QuoteRequestStepper.tsx    # Multi-step quote process
├── QuoteSummary.tsx          # Quote summary component
└── README.md                 # Quote system documentation
```

**Key Features:**
- Multi-step quote wizard
- AI-powered recommendations
- Real-time price calculations
- PDF quote generation
- Quote approval workflow

#### **Service Components** (`src/components/services/`)
Service management and customer portal components.

```
services/
├── CustomerPortal.tsx                    # Main customer dashboard
├── EgyptianIndustrialZones.tsx          # Local industrial zones info
├── EgyptianTechnicalSupport.tsx         # Regional technical support
├── ElectricBorder.tsx                   # Animated UI element
├── EmergencyServiceDialog.tsx           # Emergency service request
├── EnhancedOperatorTrainingDialog.tsx   # Training program interface
├── FabricationStageCard.tsx             # Manufacturing stage display
├── MachineHealthCheck.tsx               # Equipment health monitoring
├── MachineRegistration.tsx              # Equipment registration form
├── MaintenanceDashboard.tsx             # Maintenance overview
├── MyMachines.tsx                       # User's registered machines
├── NileLogisticsService.tsx             # Regional logistics service
├── OperatorTrainingIncentiveDialog.tsx  # Training incentive programs
├── OperatorTrainingSection.tsx          # Training section display
├── PreventiveMaintenanceDialog.tsx      # Maintenance scheduling
├── ScheduleMaintenance.tsx              # Maintenance appointment booking
├── ServiceCard.tsx                      # Service offering card
├── Services.module.css                  # Service-specific styles
├── ServicesGrid.tsx                     # Services overview grid
└── TrainingLevelCard.tsx               # Training level display
```

**Key Features:**
- Comprehensive customer portal
- Machine registration and tracking
- Preventive maintenance scheduling
- Training program management
- Emergency service requests
- Regional service customization

#### **Shop & E-Commerce** (`src/components/shop/`)
Complete e-commerce functionality for industrial equipment.

```
shop/
├── 3d-configurator/                     # 3D product configuration
│   ├── ARViewer.tsx                     # AR product visualization
│   └── ModelLoader.tsx                  # 3D model loading component
├── ai-advisor/                          # AI-powered shopping assistance
│   ├── AiEquipmentAdvisor.tsx          # AI equipment recommendations
│   ├── AiEquipmentAdvisor.test.tsx     # AI advisor tests
│   └── README.md                       # AI advisor documentation
├── ar/                                  # Augmented reality features
│   ├── machinePresets.ts               # AR machine configurations
│   └── WorkspaceChecker.tsx            # AR workspace validation
├── fabrication-report/                  # Manufacturing reports
│   └── FabricationReportGenerator.tsx  # Automated report generation
├── machine-recommendation/              # Smart product recommendations
│   └── MachineRecommendationWizard.tsx # Recommendation wizard
├── DurabilityDetailsModal.tsx          # Product durability information
├── EgyptianSpecBadges.tsx             # Local specification badges
├── EgyptianStandardsGuide.tsx         # Regional standards guide
├── EgyptianTechnicalSupportHub.tsx    # Technical support hub
├── EgyptPowerFilter.tsx               # Power requirement filters
├── EgyptProcurementWorkflow.tsx       # Local procurement process
├── EquipmentComparisonTool.tsx        # Equipment comparison interface
├── FreightCalculator.tsx              # Shipping cost calculator
├── IndustrialProductCard.tsx          # Industrial product display card
├── NileFreightCalculator.tsx          # Regional freight calculator
├── PriceRangeSlider.tsx              # Price filtering slider
├── ProductConfigurator.tsx            # Advanced product configuration
├── ProductQuickView.tsx               # Quick product preview
├── RecentlyViewedProducts.tsx         # User browsing history
├── ReviewForm.tsx                     # Product review form
└── ReviewList.tsx                     # Product reviews display
```

**Key Features:**
- AI-powered product recommendations
- 3D product configuration
- AR visualization in real environments
- Advanced filtering and search
- Regional customization for Egypt
- Freight and shipping calculations
- Product reviews and ratings

#### **Customer Support** (`src/components/support/`)
Professional customer support and ticketing system.

```
support/
├── AdminTicketDashboard.tsx           # Admin ticket management
├── CreateTicketDialog.tsx             # New ticket creation
├── TicketAssignmentDialog.tsx         # Ticket assignment interface
├── TicketDetailView.tsx               # Detailed ticket view
├── TicketMetrics.tsx                  # Support metrics display
├── TicketStatusBadge.tsx             # Status indicator component
└── TicketStatusUpdateDialog.tsx       # Status update interface
```

**Key Features:**
- Professional ticketing system
- SLA management and tracking
- Automated ticket routing
- Real-time status updates
- Performance metrics dashboard
- Multi-language support

#### **UI Components** (`src/components/ui/`)
Base UI components and design system elements.

```
ui/
├── alert.tsx                          # Alert and notification components
├── ar-button.tsx                      # AR activation button
├── avatar.tsx                         # User avatar component
├── badge.tsx                          # Status and category badges
├── button.tsx                         # Button component variants
├── card.tsx                           # Card layout component
├── checkbox.tsx                       # Checkbox input component
├── data-table.tsx                     # Data table with sorting/filtering
├── dialog.tsx                         # Modal dialog component
├── FormSkeleton.tsx                   # Form loading skeletons
├── icons.tsx                          # Custom icon components
├── input.tsx                          # Input field component
├── label.tsx                          # Form label component
├── LazyImage.tsx                      # Lazy-loaded image component
├── PageSkeleton.tsx                   # Page loading skeletons
├── ProductCardSkeleton.tsx            # Product card loading state
├── scroll-area.tsx                    # Custom scroll area
├── select.tsx                         # Select dropdown component
├── skeleton.tsx                       # Loading skeleton components
├── SkeletonLoader.tsx                 # Generic skeleton loader
├── slider.tsx                         # Range slider component
├── tabs.tsx                           # Tab navigation component
├── toast.tsx                          # Toast notification system
└── tooltip.tsx                        # Tooltip component
```

#### **Used Machines Marketplace** (`src/components/used-machines/`)
Secondary marketplace for pre-owned industrial equipment.

```
used-machines/
├── ContactVerification.tsx            # Contact verification step
├── FileUploader.tsx                   # File upload component
├── MachineSpecsForm.tsx              # Machine specifications form
├── SellUsedMachineForm.tsx           # Multi-step selling form
├── UsedMachineCard.tsx               # Used machine display card
├── UsedMachineDetails.tsx            # Detailed machine information
└── UsedMachineFilters.tsx            # Filtering interface
```

**Key Features:**
- Multi-step machine listing process
- Image upload with validation
- Condition assessment tools
- Price estimation algorithms
- Verification and approval workflow

### 📄 Pages (`src/pages/`)

#### **Main Application Pages**
```
pages/
├── About.tsx                          # Company information page
├── AdminDashboard.tsx                 # Administrative dashboard
├── AIFeatures.tsx                     # AI capabilities showcase
├── Contact.tsx                        # Contact and inquiry page
├── CustomerPortal.tsx                 # Customer account portal
├── CustomerSupport.tsx                # Support ticket interface
├── FabricationServices.tsx            # Fabrication services page
├── FabricationWorkflowDetail.tsx      # Detailed workflow information
├── Index.tsx                          # Homepage/landing page
├── Login.tsx                          # User authentication page
├── ModelViewerDemo.tsx                # 3D model demonstration
├── ModelViewerTest.tsx                # 3D model testing page
├── NotFound.tsx                       # 404 error page
├── Portfolio.tsx                      # Company portfolio showcase
├── Products.tsx                       # Product catalog page
├── QuoteConfirmationPage.tsx          # Quote confirmation display
├── QuotePage.tsx                      # Quote management page
├── QuoteRequestPage.tsx               # Quote request interface
├── Register.tsx                       # User registration page
├── SellUsedMachine.tsx               # Used machine listing page
├── Services.tsx                       # Services overview page
├── Services.test.tsx                  # Services page tests
├── Shop.tsx                          # Main e-commerce page
├── Shop-enhanced.tsx                  # Enhanced shop with AI features
├── SpareParts.tsx                     # Spare parts catalog
├── UsedMachineDetail.tsx             # Used machine details page
└── UsedMachines.tsx                   # Used machines marketplace
```

#### **Specialized Page Directories**
```
pages/
├── machines/                          # Machine-specific pages
│   └── MachineDetail.tsx             # Individual machine details
├── profiles/                          # User profile pages
│   └── ProfileDetail.tsx             # User profile display
├── Services/                          # Service-related pages
└── workflows/                         # Process workflow pages
    └── WorkflowDetail.tsx            # Workflow documentation
```

### 🔧 Hooks (`src/hooks/`)
Custom React hooks for shared functionality.

```
hooks/
├── use-mobile.tsx                     # Mobile device detection
├── use-toast.ts                       # Toast notification management
├── usePythonAPI.ts                    # Python backend API integration
├── useRecentlyViewed.ts              # Recently viewed products tracking
├── useToast.ts                        # Toast system hook
├── useTranslation.ts                  # Internationalization hook
└── __tests__/                         # Hook testing
    └── usePythonAPI.test.ts          # API hook tests
```

### 📚 Libraries (`src/lib/`)
Utility libraries and service integrations.

```
lib/
├── ai/                                # AI service integrations
│   ├── config.ts                     # AI configuration
│   ├── faultDetection.ts             # Fault detection algorithms
│   ├── gemini.ts                     # Google Gemini AI integration
│   └── SparePartsService.ts          # Spare parts AI service
├── polyfills/                         # Browser compatibility
├── reports/                           # Report generation
│   ├── costCalculator.ts             # Cost calculation utilities
│   ├── generateReport.ts             # Report generation engine
│   ├── pdfTemplate.ts               # PDF template system
│   └── pricing.ts                    # Pricing calculation logic
├── adminTicketApi.ts                  # Admin ticket API client
├── api.ts                            # Main API client
├── auth.ts                           # Authentication utilities
├── comparisonStorage.ts              # Comparison data persistence
├── errorBoundaryPerformance.ts       # Error boundary performance
├── i18n.ts                           # Internationalization setup
├── performance.ts                     # Performance monitoring
├── polyfills.ts                      # Browser polyfills
├── reviewsApi.ts                     # Reviews API client
└── serviceWorkerRegistration.ts      # PWA service worker
```

### 🎯 Context (`src/context/`)
React context providers for global state management.

```
context/
├── AuthContext.tsx                    # Authentication state management
├── LoadingContext.tsx                 # Global loading state
└── QuoteContext.tsx                   # Quote management state
```

### 📊 Data & Constants (`src/constants/` & `src/data/`)
Static data, configurations, and mock data.

```
constants/
├── portfolioData.ts                   # Portfolio project data
├── productsData.ts                    # Product catalog data
├── uniqueProductsData.ts             # Unique product configurations
├── yilmazMachines.ts                 # Yilmaz machine catalog
├── yilmazMachines-corrected.ts       # Corrected machine data
└── yilmazMachines-fixed.ts           # Fixed machine data

data/
├── inventory.ts                       # Inventory management data
└── usedMachines.ts                   # Used machines data
```

### 🎨 Shared UI (`src/shared/`)
Shared UI components and utilities.

```
shared/
└── ui/
    ├── CircuitDivider.tsx            # Animated circuit divider
    ├── GlowFilter.tsx                # SVG glow filter effect
    ├── Hexagon.tsx                   # Hexagonal UI element
    ├── NeonButton.tsx                # Neon-styled button component
    └── ui/                           # Extended shadcn/ui components
        ├── accordion.tsx             # Accordion component
        ├── alert-dialog.tsx          # Alert dialog component
        ├── aspect-ratio.tsx          # Aspect ratio container
        ├── breadcrumb.tsx            # Breadcrumb navigation
        ├── calendar.tsx              # Calendar component
        ├── carousel.tsx              # Image/content carousel
        ├── chart.tsx                 # Chart components
        ├── collapsible.tsx           # Collapsible content
        ├── command.tsx               # Command palette
        ├── context-menu.tsx          # Context menu component
        ├── drawer.tsx                # Drawer/sidebar component
        ├── dropdown-menu.tsx         # Dropdown menu
        ├── form.tsx                  # Form components
        ├── hover-card.tsx            # Hover card component
        ├── input-otp.tsx             # OTP input component
        ├── menubar.tsx               # Menu bar component
        ├── MultiSelect.tsx           # Multi-select component
        ├── navigation-menu.tsx       # Navigation menu
        ├── pagination.tsx            # Pagination component
        ├── popover.tsx               # Popover component
        ├── ProductCard.tsx           # Product card component
        ├── progress.tsx              # Progress indicator
        ├── ProjectCard.tsx           # Project card component
        ├── radio-group.tsx           # Radio button group
        ├── resizable.tsx             # Resizable panels
        ├── ResponsiveImage.tsx       # Responsive image component
        ├── separator.tsx             # Visual separator
        ├── sheet.tsx                 # Sheet/modal component
        ├── sidebar.tsx               # Sidebar component
        ├── sonner.tsx                # Toast notifications
        ├── switch.tsx                # Toggle switch
        ├── table.tsx                 # Data table component
        ├── textarea.tsx              # Textarea input
        ├── toggle.tsx                # Toggle button
        ├── toggle-group.tsx          # Toggle button group
        └── use-toast.ts              # Toast hook
```

### 🎭 Stories (`src/stories/`)
Storybook component documentation and testing.

```
stories/
├── assets/                           # Storybook assets
├── Button.stories.ts                 # Button component stories
├── Button.tsx                        # Button component
├── Configure.mdx                     # Storybook configuration docs
├── Header.stories.ts                 # Header component stories
├── Header.tsx                        # Header component
├── Page.stories.ts                   # Page component stories
├── Page.tsx                          # Page component
├── button.css                        # Button styles
├── header.css                        # Header styles
└── page.css                          # Page styles
```

### 🏷️ Types (`src/types/`)
TypeScript type definitions and interfaces.

```
types/
├── certification.ts                   # Certification type definitions
├── gtag.d.ts                         # Google Analytics types
├── i18n.ts                           # Internationalization types
├── machine.ts                        # Machine/equipment types
├── maintenance.d.ts                  # Maintenance system types
├── product.ts                        # Product catalog types
├── shop.ts                           # E-commerce types
├── unique-product.ts                 # Unique product types
└── vercelErrors.ts                   # Vercel error types
```

## 🐍 Backend Structure (`python_backend/`)

### 🚀 API Endpoints (`python_backend/apis/`)
FastAPI route handlers and API versioning.

```
apis/
├── main.py                           # Main FastAPI application
├── auth_routes_fixed.py              # Authentication routes
├── v1/                               # API Version 1
│   ├── __init__.py                   # V1 package initialization
│   └── part_detection.py            # Part detection endpoints
└── v2/                               # API Version 2 (Enhanced)
    ├── __init__.py                   # V2 package initialization
    ├── auth.py                       # Authentication endpoints
    ├── auth_fastapi.py               # FastAPI auth integration
    ├── notifications.py              # Notification endpoints
    ├── part_detection.py             # Enhanced part detection
    └── part_detection_fastapi.py     # FastAPI part detection
```

**API Features:**
- RESTful API design with OpenAPI documentation
- Versioned endpoints for backward compatibility
- Authentication and authorization
- Real-time notifications
- File upload handling
- Rate limiting and throttling

### 🤖 AI Services (`python_backend/ai_services/`)
Machine learning and AI-powered features.

```
ai_services/
├── part_detection/                   # Computer vision for spare parts
│   ├── inference.py                  # Main inference engine
│   ├── tasks.py                      # Celery background tasks
│   ├── models/                       # Trained ML models
│   │   └── model.pt                  # PyTorch model file
│   ├── v1/                          # Version 1 implementation
│   │   ├── __init__.py              # Package initialization
│   │   ├── inference.py             # V1 inference logic
│   │   ├── model.py                 # V1 model handling
│   │   └── utils.py                 # V1 utilities
│   └── v2/                          # Version 2 (Enhanced)
│       ├── __init__.py              # Package initialization
│       ├── inference.py             # V2 inference logic
│       ├── model.py                 # V2 model handling
│       └── utils.py                 # V2 utilities
└── preprocessing/                    # Image and data preprocessing
    └── image_processor.py           # Image processing utilities
```

**AI Capabilities:**
- Computer vision for spare parts identification
- Equipment recommendation algorithms
- Predictive maintenance models
- Fault detection from images/audio
- Natural language processing for support

### ⚙️ Core Services (`python_backend/core/`)
Core application logic and configurations.

```
core/
├── celery_app.py                     # Celery task queue configuration
├── config.py                         # Application configuration
├── database.py                       # Database connection and ORM
├── email_service.py                  # Email notification service
├── security.py                       # Security utilities and middleware
└── supabase_client.py               # Supabase client configuration
```

**Core Features:**
- Database connection pooling
- Email templating and delivery
- Security middleware and validation
- Configuration management
- Background task processing

### 📋 Data Models (`python_backend/models/`)
Pydantic data models for API validation.

```
models/
├── api_v1_models.py                  # V1 API data models
├── api_v2_models.py                  # V2 API data models
├── auth_models.py                    # Authentication models
└── notification_models.py           # Notification system models
```

**Model Features:**
- Request/response validation
- Data serialization/deserialization
- Type safety and documentation
- Automatic API documentation generation

### 🧪 Testing Suite (`python_backend/tests/`)
Comprehensive testing framework.

```
tests/
├── benchmark.py                      # Performance benchmarking
├── cli_test.py                       # Command-line interface tests
├── conftest.py                       # Test configuration
├── load_test.py                      # Load testing with Locust
├── run_tests.py                      # Test runner
├── security_test_fixed.py           # Security vulnerability tests
├── test_api.py                       # API endpoint tests
├── test_api_v2.py                    # V2 API tests
├── test_chaos.py                     # Chaos engineering tests
├── test_contracts.py                # API contract tests
├── test_part_detection_v1.py        # Part detection V1 tests
├── fixtures/                         # Test fixtures and data
└── test_data/                        # Test datasets
```

**Testing Features:**
- Unit and integration tests
- Performance and load testing
- Security vulnerability scanning
- API contract validation
- Chaos engineering tests

### 📧 Templates (`python_backend/templates/`)
Email notification templates.

```
templates/
├── message_notification.html         # General message notifications
├── ticket_assigned.html             # Ticket assignment notifications
├── ticket_created.html              # New ticket notifications
└── ticket_resolved.html             # Ticket resolution notifications
```

### 📊 Monitoring (`python_backend/monitoring/`)
Performance monitoring and observability.

```
monitoring/
└── dashboard.json                    # Monitoring dashboard configuration
```

### 🐳 Deployment (`python_backend/`)
Docker and deployment configurations.

```
├── Dockerfile                        # Standard Docker image
├── Dockerfile.gpu                    # GPU-enabled Docker image
├── Dockerfile.optimized              # Production-optimized image
├── docker-compose.yml               # Development environment
├── docker-compose.gpu.yml           # GPU development environment
├── docker-compose.mlflow.yml        # MLflow tracking environment
├── requirements.txt                  # Python dependencies
├── requirements-enhanced.txt         # Enhanced dependencies with AI
└── .dockerignore                     # Docker ignore patterns
```

## 🌐 Static Assets (`public/`)

### 📁 Public Directory Structure
```
public/
├── 📄 Core Files
│   ├── favicon.ico                   # Site favicon
│   ├── logo.png                      # Company logo (PNG)
│   ├── logo.svg                      # Company logo (SVG)
│   ├── placeholder.svg               # Placeholder image
│   ├── robots.txt                    # Search engine directives
│   └── service-worker.js             # Progressive Web App service worker
├── 📋 Documentation
│   └── documents/
│       └── specs/                    # Technical specifications
├── 🖼️ Images
│   ├── images/
│   │   ├── machines/                 # Industrial machinery images
│   │   └── profiles/                 # User profile images
├── 🌍 Localization
│   └── locales/
│       ├── ar/                       # Arabic translations
│       └── en/                       # English translations
└── 🎮 3D Models
    └── models/
        ├── AR-Code-Object-Capture-app-1752786892 (1).glb  # 3D model file
        ├── fault-model.json          # Fault detection model
        └── group1-shard1of1.bin      # Model binary data
```

## 🌍 Internationalization (`locales/`)

### 📝 Translation Files
```
locales/
├── ar/                               # Arabic (العربية) translations
│   └── services.json                 # Service-related translations
└── en/                               # English translations
    ├── products.json                 # Product catalog translations
    ├── services.json                 # Service-related translations
    └── shop.json                     # E-commerce translations
```

**Localization Features:**
- Right-to-left (RTL) layout support for Arabic
- Dynamic language switching
- Localized number and date formats
- Cultural adaptations for Middle Eastern markets
- Professional translation workflow

## 📚 Documentation (`docs/`)

### 📖 Documentation Structure
```
docs/
├── generate-structure.js             # Automated structure generation
├── project-structure.md              # This file - comprehensive structure
└── README.md                         # Documentation overview
```

## 🛠️ Development Tools & Scripts

### 📜 Build Scripts (`scripts/`)
```
scripts/
└── importData.ts                     # Data import utilities
```

### 🔧 Development Tools
```
tabby_x86_64-windows-msvc/           # AI coding assistant
├── llama-server.exe                 # Local AI server
└── tabby.exe                        # Tabby AI assistant
```

## 🗄️ Database Schema Overview

### **Core E-Commerce Tables**
- **profiles**: Extended user profiles with company information
- **products**: Industrial machinery, parts, and materials catalog
- **categories**: Hierarchical
