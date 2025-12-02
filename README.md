# Almona Portfolio Forge

A comprehensive industrial machinery platform centered around **Fabricator Pro** - a complete aluminium/UPVC fabrication workflow system with **self-learning AI optimization**, CNC integration, and real-time analytics. Features advanced 3D/AR visualization, ML-powered services, remnant marketplace, e-commerce capabilities, and unified customer support for industrial clients across Egypt and the Middle East.

## 🚀 Overview
Almona Portfolio Forge is a full-stack industrial machinery platform centered around **Fabricator Pro** - a comprehensive aluminium/UPVC fabrication management system with **self-learning AI optimization**. The platform combines a React frontend with a Python FastAPI backend, offering end-to-end fabrication workflows, ML-powered optimization, CNC machine integration, and complete service management for industrial clients across Egypt and the Middle East.

**The Intelligent Core**: Fabricator Pro is not just a workflow system—it's a **self-learning platform** with a predictive AI core. The system operates on a continuous improvement loop: **Define** (profiles from data sheets), **Control** (optimization strategy), **Calibrate** (K-factor precision), **Reflect** (personal analytics), **Learn** (data collection), and **Predict** (AI suggestions). This virtuous cycle transforms the platform from a static tool into an intelligent partner that learns from every user action and continuously improves its predictions.

### 🧩 Core Domains
- **Products**: Rich machinery catalog with specifications, videos, and immersive 3D/AR galleries for preview, comparison, and interactive exploration.
- **Maintenance**: Unified ticketing system, machine passport records, and customer/technician portals for managing machines, service history, and support flows.
- **Fabricator**: Full-stack Fabricator Workflow Pro with ML-powered optimization, remnant marketplace, calibration wizard, and workshop analytics for aluminium/UPVC workshops.
- **Sales**: Smart industrial shop, B2B used-machines marketplace, quote workflows, and spare-parts sales for both new and used equipment.

The Admin Dashboard features a polished glass/opacity UI, live KPI cards, realtime sales charts, top products, and customer activity, powered by Supabase live queries and channels.

## ✨ Key Features

### 🏭 **Fabricator Pro Platform** (Industry 4.0 Manufacturing System)

#### **Core Workflow & Design**
- **AI Workflow Cockpit** (`FabricatorWorkflowPro`): End-to-end aluminium/UPVC fabrication pipeline with smart measuring, technical design, AI optimization, inventory check, production planning, and quality control
- **Smart Measuring Interface**: Digital measurement capture with AI assistance, validation against system constraints, and real-time dimension checking
- **SmartDrawCanvas**: Grid-based multi-unit window designer for complex structures. Define rows/cols and click cells to toggle types (Fixed, Sash, Panel) with intelligent mullion and transom insertion
- **SmartDrawTool**: Intelligent mullion/transom placement with constraint validation and automatic profile selection
- **System-Driven Design** (`SystemDrivenDesign`): Automatic profile selection based on system pack constraints and structural requirements
- **Design Interface**: Comprehensive design workspace with real-time validation and constraint checking
- **Project Cockpit** (`ProjectCockpit`): Centralized project management with customer linking, site management, and project metadata
- **Quote-to-Cut Workflow** (`QuoteToCutWorkflow`): Unified 4-step workflow from project setup to quote generation

#### **3D Visualization & Simulation**
- **Window3DGenerator**: High-fidelity 3D window generation with PBR materials (glass refraction, metal roughness), spacers, and muntin bars
- **Profile Cross-Section Viewer**: Real-time cross-section view of 3D models to inspect profile mating and internal geometry
- **Cut Simulation Viewer**: 2D/3D visualization of cuts with K-factors applied, corner zoom, and machining overlay
- **Production Preview Dialog**: Mandatory safety gate with visual 2D/3D preview showing exact cut lengths before production

#### **AI & Machine Learning Optimization**
- **ML-Powered Adaptive Solver**: Self-learning optimization engine with real-time pre-solver, progressive optimization, and ML-based algorithm prediction (2.5x faster, 12% better waste reduction)
- **Algorithm Predictor**: ML-based algorithm selection (greedy/linear/genetic) with 94% prediction accuracy
- **Remnant-First Genetic Optimizer**: Hybrid optimization combining remnant-first greedy strategy with genetic algorithm evolution (15-30% waste reduction, 75-90% remnant utilization)
- **Glass Nesting CP Solver**: Constraint programming solver for 2D glass pane optimization (85-95% utilization, 10-20% sheet reduction)
- **Hybrid Mass Production Optimizer**: Cross-project genetic algorithm with remnant-first strategy for unified waste minimization across multiple jobs
- **Optimization Equalizer** (`OptimizationEqualizer`): User empowerment over optimization strategy. Choose from presets (Maximum Savings, Fast Production, Remnant Reuse, Balanced) or fine-tune with weight sliders. Real-time impact preview shows estimated waste, bars used, and optimization time
- **AI Suggestion Panel** (`AISuggestionPanel`): Predictive AI that suggests optimal K-factors for new profiles based on collective user data with confidence scores and reasoning explanations

#### **Calibration & Quality Control**
- **Calibration Wizard** (`CalibrationWizard`): Break free from DXF dependency. Define any profile from supplier technical data sheets, visually calibrate K-factors for accurate miter joints, and define machining zones (hinge slots, lock pockets) with a visual editor
- **K-Factor Calculator**: Integrated calculator with real-time formulas and test cut simulation
- **Machining Zone Editor**: Visual editor for defining hinge slots, lock pockets, and other machining operations with precise coordinates and reusable macros
- **Profile Definition Wizard**: Multi-step wizard for creating profiles from supplier technical sheets with image upload, visual annotation, and dimension entry
- **CalibrationLearner AI**: Predictive ML model for K-factor suggestions. Multivariate regression trained on collective user data with confidence scoring, reasoning explanations, and continuous learning from user feedback
- **Quality Control** (`QualityControl`): Computer vision inspection with automated defect detection, AI-powered quality prediction, and preventive maintenance alerts
- **Pre-Production Visual Verification**: Mandatory safety gate that simulates all cuts and machining operations before production. Visual 2D/3D preview shows exact cut lengths with K-factors applied, validates calibration status, and prevents costly mistakes

#### **Inventory & Material Management**
- **Inventory Dashboard** (`InventoryDashboard`): Enhanced dashboard with remnant analytics, multi-location support, and Stock Intake by Invoice flow for system packs (ROCK 60, JUMBO 100)
- **Inventory Management** (`InventoryManagement`): Comprehensive stock management with real-time tracking, multi-location support, and stock movement history
- **Inventory Status Panel**: Real-time inventory status with low stock alerts and replenishment suggestions
- **Remnant Marketplace** (`RemnantMarketplacePreview`): Buy and sell excess materials between workshops with search, filtering, and transaction management
- **Remnant Manager**: Intelligent remnant tracking with utilization analytics and matching algorithms
- **Stock Movement Tracking**: Complete audit trail of all stock movements with user attribution

#### **Profile & Accessory Management**
- **Profile Management** (`ProfileManagement`): Supabase-backed profile libraries with pricing configurations, stock levels, remnants, and stock movement tracking
- **Accessory Management** (`AccessoryManagement`): Hardware catalog management with stock tracking, pricing, and supplier information
- **Profile Detail Card**: Comprehensive profile information display with specifications, pricing, and stock status
- **Virtualized Profile List**: Performance-optimized large profile listings with search and filtering
- **System Pack Selector**: Intelligent system pack selection with constraint preview and compatibility checking
- **Branded System Packs**: Regional system packs for ROCK 60, JUMBO 100, YILMAZ W60, CALUMINIUM PS, ASAŞ, KALE with embedded structural constraints

#### **Production & Scheduling**
- **Production Scheduler** (`ProductionScheduler`): CNC job sequencing with genetic algorithm optimization, machine queue management, and Gantt chart visualization
- **Production Command**: Production order management with status tracking and machine assignment
- **Production Label** (`ProductionLabel`): QR-enabled production labels for feedback loops. Generate printable labels with unique QR codes for production floor scanning
- **Mass Production Dashboard** (`MassProductionDashboard`): Cross-project optimization with unified waste KPIs, production scheduling, and batch processing
- **Machine Monitoring Dashboard**: Real-time machine status monitoring with performance metrics and alert management
- **Real-Time Monitoring** (`RealTimeMonitoring`): Live performance metrics, efficiency tracking, and production monitoring with OEE tracking

#### **CNC & Machine Integration**
- **Machine Export Manager**: Multi-brand CNC export support (Yilmaz, Elumatec SBZ 151, FOMM Ultra, Emmegi Quasar) with machine-specific profiles
- **DXF/G-Code Export**: Industry-standard DXF and G-code generation with barcode/QR-based cut lists
- **Machining Macro Library**: Parametric macro system with FANUC-style G-code templates (hinge slots, lock pockets, drainage slots, anchor slots)
- **Barcode/QR Generation**: Production-ready barcode and QR code generation for cut lists and production labels
- **Machine-Ready Export Profiles**: Pre-configured export profiles for different CNC machines and controllers

#### **Analytics & Performance**
- **Personal Analytics Dashboard** (`PersonalAnalyticsDashboard`): See your workshop's performance reflected back to you. Track calibration accuracy trends, compare strategy performance, monitor profile health status, and get actionable insights
- **Workshop Performance Widget**: Real-time OEE and performance metrics display with industry benchmarking
- **Virtualized Analytics List**: Performance-optimized analytics data display with filtering and sorting
- **Job Risk Indicator**: AI-powered risk assessment for production jobs with mitigation suggestions
- **Job Summary Panel**: Comprehensive job summary with optimization results, waste metrics, and cost analysis
- **Live Cost Console**: Real-time cost tracking with material, labor, and overhead calculations

#### **Commercial & Pricing**
- **Commercial Offer Panel** (`CommercialOfferPanel`): Quote and invoice management with conversion workflows, draft management, and customer linking
- **Pricing Configuration** (`PricingConfiguration`): Dynamic pricing with metal indexing, LME/LOCAL metal indices, live material estimates, and metal-price deviation alerts
- **Pricing Preview**: Real-time pricing preview with cost breakdown, margin analysis, and quote generation
- **Purchase Wizard**: Streamlined purchase order creation with supplier integration and approval workflows
- **Order Management** (`OrderManagement`): Complete order lifecycle management from quote to fulfillment

#### **Reporting & Documentation**
- **Quick Reports Panel** (`QuickReportsPanel`): Multi-format export (PDF/CSV/DXF) with QR/barcode support, localized for Turkish and Egyptian markets
- **Cutting List Reports**: Professional cutting reports with QR codes, barcodes, and print optimization
- **Accessories Reports**: Comprehensive accessory lists with quantities, pricing, and supplier information
- **Glass Reports**: Glass cutting optimization reports with nesting diagrams and utilization metrics
- **ROCK 60 Cutting Summary**: Specialized reports for ROCK 60 system packs
- **ROCK 60 Pricing Setup**: Pricing configuration for ROCK 60 system packs

#### **Workspace & Collaboration**
- **Fabricator Workspace Layout** (`FabricatorWorkspaceLayout`): Shared `/fabricator/*` workspace layout with persistent state across Projects, Customers, Inventory, and Commercial tabs
- **Workspace Snapshot Manager**: Workspace state persistence with conflict resolution and version history
- **Edit History Timeline**: Complete edit history with user attribution, timestamps, and change tracking
- **User Presence Indicator**: Real-time user presence tracking for collaborative editing
- **Live Cursor Overlay**: Collaborative cursor tracking for multi-user scenarios
- **Auto-Save Indicator**: Visual feedback for auto-save status and conflict resolution
- **Contextual Tooltips**: Intelligent help system with contextual guidance

#### **Onboarding & Training**
- **Fabricator Onboarding** (`FabricatorOnboarding`): Comprehensive onboarding system with step-by-step guidance
- **Onboarding Step Demos**: Interactive demonstrations for key workflow steps
- **Profile Importer**: Bulk profile import from Excel/CSV with validation and error handling
- **Setup Checklist**: Guided setup process for new workshops with progress tracking
- **Onboarding Video Player**: Video tutorials integrated into the onboarding flow

#### **Regional & Cultural Features**
- **Bosphorus Workflow Ribbon**: Visual bridge between Ottoman/Egyptian craftsmanship and modern YILMAZ technology
- **Anatolian Cockpit**: Turkish market-specific interface with regional preferences
- **Istanbul Skyline Footer**: Cultural branding elements for Turkish market
- **Elsherif Import Wizard**: Specialized import tool for Egyptian market suppliers

#### **Advanced Features**
- **Engineering Bay** (`EngineeringBay`): Advanced engineering tools and calculations
- **Feedback Button**: User feedback collection with analytics integration
- **Invoice Upload Dialog**: Bulk invoice processing with OCR and data extraction
- **Positions Grid**: Grid-based position management for multi-unit projects
- **Workflow Progress**: Visual progress tracking through the 7-step workflow pipeline

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

## 🔄 Application Workflows

### **Fabricator Pro Workflow** (`/fabricator-workflow`)

The Fabricator Pro module guides users through a closed-loop manufacturing process, ensuring reliability from design to production.

#### **Workflow Steps** (7-Step Pipeline):
1. **Smart Measuring** (`#measuring`): Digital measurement capture with AI assistance
2. **Technical Design** (`#design`): Component specification and system configuration
3. **3D Preview** (`#preview3d`): Visual model preview with PBR materials
4. **Cutting Optimization** (`#optimization`): AI-powered material optimization
5. **Inventory Check** (`#inventory`): Stock management and remnant matching
6. **Production Planning** (`#production`): Scheduling, machining, and CNC integration
7. **Quality Control** (`#quality`): Inspection, validation, and feedback collection

#### **Detailed Workflow Process**:

**1. System Configuration**
   - Select from branded System Packs (ROCK 60, JUMBO 100, CALUMINIUM PS, ASAŞ, KALE, etc.) or custom profiles
   - The system automatically loads relevant constraints (min/max dimensions) and profile roles
   - Branded system packs include embedded structural constraints and machining macros

**2. Smart Measuring & Design**
   - **Standard Mode**: Quick input for standard typologies (Sliding 2-Sash, Casement, etc.)
   - **Grid Mode**: Use the `SmartDrawCanvas` to design complex multi-unit structures by defining rows/cols and clicking cells to toggle types (Fixed, Sash, Panel)
   - **Validation**: Real-time input validation against system constraints prevents physically impossible designs
   - **System-Driven Design**: Automatic profile selection based on system pack constraints

**3. Advanced 3D Visualization**
   - **Realism**: View the unit with PBR materials (glass refraction, metal roughness), spacers, and muntin bars
   - **Interaction**: Animate sashes to check opening direction and clearance
   - **Cross-Section**: Use the "Section View" (Scissors tool) to inspect internal profile geometry and mating details in real-time
   - **AR Support**: WebXR integration for augmented reality preview

**4. Verification Gate ("Trust but Verify")**
   - A mandatory safety step displaying the explicit math: `Input Dimension - Deduction (K-Factor) = Cut Length`
   - Displays a **Calibration Confidence** score based on historical data
   - User must explicitly check "I verify" to proceed, recording a verification event in the analytics pipeline
   - Prevents costly production mistakes before generating cut lists

**5. Cutting Optimization**
   - **ML-Powered Algorithm Selection**: Automatic algorithm choice (greedy/linear/genetic) with 94% prediction accuracy
   - **Remnant-First Strategy**: Prioritizes available remnants before using new stock
   - **Hybrid Mass Production Optimizer**: Cross-project optimization with unified waste KPIs
   - **Optimization Equalizer**: User control over strategy with presets and weight sliders
   - **Real-Time Pre-Solver**: Instant feedback (<2s) for simple jobs

**6. Production & Feedback**
   - **Production Label**: Generate a printable label with a unique QR code
   - **CNC Integration**: DXF and G-code exports for Yilmaz and multi-brand machines
   - **Feedback Loop**: Production floor staff scan the QR code to report fit status (Perfect vs. Adjust)
   - **Auto-Tuning**: The `CalibrationLearner` AI analyzes feedback and auto-suggests K-factor adjustments for future jobs

### **Fabricator Workspace** (`/fabricator/*`)

Shared workspace layout with persistent state across tabs:

- **Projects Tab** (`/fabricator/projects`): Manage all window units and positions
- **Customers Tab** (`/fabricator/customers`): Client management and customer portals
- **Inventory Tab** (`/fabricator/inventory`): Stock management, remnants, and analytics
- **Commercial Tab** (`/fabricator/commercial`): Quote and invoice management with conversion workflows

### **E-Commerce & Shop Workflow** (`/shop`)

1. **Product Browsing**: Virtualized machine grid with smart category navigation
2. **Product Comparison**: Compare up to 5 machines side-by-side
3. **AI Equipment Advisor**: Lazy-loaded AI-powered recommendations
4. **Quote Request**: Advanced quoting with bulk pricing and custom configurations
5. **Order Management**: Real-time order tracking and fulfillment

### **Service Management Workflow** (`/services`)

1. **Service Selection**: Simple/Advanced service interface switching
2. **Ticket Creation**: Unified ticket wizard for support, maintenance, and emergency services
3. **Machine Registration**: Digital machine registry with maintenance tracking
4. **Maintenance Dashboard**: Comprehensive maintenance management with predictive analytics
5. **Customer Portal**: Machine health dashboard and quote tracking

### **Used Machinery Marketplace Workflow** (`/used-machines`)

1. **Browse Marketplace**: Location, machine type, and condition-based filtering
2. **Machine Details**: Comprehensive specifications with verification badges
3. **Inspection Request**: Technical inspection booking system
4. **Sell Machine**: Multi-step selling form with image upload and condition assessment
5. **Transaction Management**: Secure transactions with logistical support

### 🤖 **AI-Powered Features**
- **ML Algorithm Predictor**: Machine learning-based algorithm selection (greedy/linear/genetic) with 94% prediction accuracy and automatic learning from optimization results
- **AI Quality Predictor**: Defect prediction, optimal cutting parameter suggestions, and preventive maintenance alerts based on historical cut quality data
- **Remnant Usage Predictor**: ML-based remnant reuse prediction with TensorFlow.js, automatic fallback to rule-based system, and confidence scoring
- **Training Data Collection**: Automatic collection of optimization results for continuous ML model improvement
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
- **Consumption Forecaster**: Material usage predictions with trend detection and stock level recommendations
- **Job Complexity Predictor**: Pre-emptive algorithm selection with complexity scoring and duration estimation

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
- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 7.1.7 with optimized bundling and code splitting
- **Styling**: Tailwind CSS 3.4.11 + shadcn/ui components (66 base components)
- **3D Graphics**: Three.js 0.180.0 + @react-three/fiber 8.18.0 + SwiftXR
- **AR/VR**: @react-three/xr 6.6.17 for WebXR support
- **State Management**: React Context + Zustand 5.0.6 + FabricatorWorkspaceContext
- **Routing**: React Router v6.26.2 with lazy loading and route prefetching
- **Forms**: React Hook Form 7.60.0 + Zod 3.25.76 validation
- **Internationalization**: i18next 25.3.2 with RTL support (56 translation files)
- **Testing**: Vitest 3.2.4 + React Testing Library 16.3.0 + Playwright 1.54.1
- **Machine Learning**: 
  - TensorFlow.js 4.22.0 for client-side ML models
  - Algorithm Predictor for optimization (94% accuracy)
  - Remnant Usage Predictor with TensorFlow.js
  - CalibrationLearner AI for K-factor suggestions
- **Reporting & Exports**: 
  - Modular export system for PDF/CSV/DXF cutting, accessories, and glass reports
  - QR/barcode generation with qrcode 1.5.4
  - Localization support (EN/TR/AR) with print optimization
  - PDF generation with pdf-lib 1.17.1
  - Excel export with exceljs 4.4.0
  - DXF export with dxf-writer 1.18.4
- **Fabricator Algorithms**: 
  - Enhanced adaptive solver with ML prediction
  - Hybrid mass optimizer with remnant-first strategy
  - RemnantFirstGeneticOptimizer (genetic algorithm)
  - GlassNestingCPSolver (constraint programming)
  - Linear programming and exact optimization
- **CNC Integration**: 
  - DXF/G-code export with machine-specific profiles
  - Yilmaz CNC connectors with network/USB protocols
  - Multi-brand support (Elumatec, FOMM, Emmegi)
  - Barcode/QR generation for cut lists
  - Machining macro library with FANUC-style templates
- **Real-time Analytics**: 
  - Supabase live queries and channels for dashboard KPIs
  - Workshop performance analytics with OEE tracking
  - Real-time monitoring with WebSocket subscriptions
- **Performance Optimizations**:
  - Virtualized grids (@tanstack/react-virtual 3.11.1)
  - Code splitting with manual chunks
  - Lazy loading for heavy components
  - PWA support with offline capabilities
  - **Web Workers**: Optimization algorithms (Genetic, Constraint Solver) offloaded to Web Workers to prevent UI freezing
  - **Type Safety**: TypeScript definitions generated from Python OpenAPI schema for end-to-end type safety

### **Backend**
- **Framework**: FastAPI (Python 3.9+) with async/await support
- **Database**: 
  - Supabase (PostgreSQL) with real-time subscriptions
  - Row-Level Security (RLS) policies for all tables
  - Audit logging with trigger-based change tracking
  - 35+ migration files for schema management
- **Authentication**: 
  - Supabase Auth with custom policies
  - Multi-factor authentication (MFA)
  - JWT token management
  - Role-based access control (RBAC)
- **AI Services**: 
  - TensorFlow.js for client-side ML
  - Hugging Face Transformers for predictive maintenance
  - Google Generative AI for equipment recommendations
  - ML model training pipeline with automated data collection
- **ML Training Pipeline**: 
  - Automated training data collection from optimization results
  - Model versioning and A/B testing support
  - Daily model retraining on successful calibrations
  - Confidence scoring and reasoning explanations
- **Fabricator Algorithms**: 
  - Enhanced adaptive solver with ML prediction
  - Hybrid mass optimizer with remnant-first strategy
  - Genetic algorithms with tournament selection
  - Constraint programming for glass nesting
  - Linear programming and exact optimization
- **CNC Integration**: 
  - DXF/G-code generation with machine-specific profiles
  - Yilmaz CNC connectors (network/USB protocols)
  - Multi-brand support (Elumatec SBZ 151, FOMM Ultra, Emmegi Quasar)
  - Barcode/QR code generation for cut lists
  - Machining macro library with parameterized G-code
- **Task Queue**: Celery with Redis for background processing
- **Email Service**: SendGrid with custom templates and localization
- **File Storage**: Supabase Storage with CDN and secure file handling
- **Monitoring**: 
  - Custom dashboard with performance metrics
  - OEE tracking and operator performance metrics
  - Real-time analytics with WebSocket subscriptions
  - Error tracking and logging
- **Reporting Engine**: 
  - Multi-format export system (PDF/CSV/DXF)
  - QR/barcode support with localization
  - Print optimization for shop-floor use
  - Batch processing with queue management

### **Infrastructure**
- **Deployment**: Vercel (Frontend) + Docker (Backend)
- **CDN**: Vercel Edge Network
- **Database**: Supabase with automatic backups
- **Monitoring**: Web Vitals + Custom analytics
- **CI/CD**: GitHub Actions with automated testing

## 📁 Project Structure

### **Frontend Structure**
```
almona-portfolio-forge/
├── src/
│   ├── components/              # Reusable UI components (370+ files)
│   │   ├── 3d-model/           # 3D viewers and AR components
│   │   │   ├── Enhanced3DViewer.tsx
│   │   │   ├── EnhancedModel3DDialog.tsx
│   │   │   ├── Model3DDialog.tsx
│   │   │   ├── Model3DGallery.tsx
│   │   │   ├── ModelMeasurementTool.tsx
│   │   │   ├── SwiftXRManager.tsx
│   │   │   └── UniversalARViewer.tsx
│   │   ├── fabricator/         # Fabricator Pro components (75+ files)
│   │   │   ├── __tests__/
│   │   │   │   └── Reliability.test.tsx   # Critical dimension validation tests
│   │   │   ├── AccessoryManagement.tsx
│   │   │   ├── AnatolianCockpit.tsx
│   │   │   ├── AISuggestionPanel.tsx
│   │   │   ├── BosphorusWorkflowRibbon.tsx
│   │   │   ├── CalibrationWizard.tsx
│   │   │   ├── CommercialOfferPanel.tsx
│   │   │   ├── CutSimulationViewer.tsx
│   │   │   ├── CuttingOptimizationEngine.tsx
│   │   │   ├── DesignInterface.tsx
│   │   │   ├── FabricatorOnboarding.tsx
│   │   │   ├── FabricatorWorkflowPro.tsx
│   │   │   ├── FabricatorWorkspaceLayout.tsx
│   │   │   ├── InventoryDashboard.tsx
│   │   │   ├── InventoryManagement.tsx
│   │   │   ├── KFactorCalculator.tsx
│   │   │   ├── MachiningZoneEditor.tsx
│   │   │   ├── MassProductionDashboard.tsx
│   │   │   ├── NewProjectWizard.tsx
│   │   │   ├── OptimizationEqualizer.tsx
│   │   │   ├── PersonalAnalyticsDashboard.tsx
│   │   │   ├── PricingConfiguration.tsx
│   │   │   ├── PricingPreview.tsx
│   │   │   ├── ProductionLabel.tsx        # QR-enabled production labels
│   │   │   ├── ProductionPreviewDialog.tsx
│   │   │   ├── ProductionScheduler.tsx
│   │   │   ├── ProfileCrossSectionViewer.tsx
│   │   │   ├── ProfileDefinitionWizard.tsx
│   │   │   ├── ProfileManagement.tsx
│   │   │   ├── QualityControl.tsx
│   │   │   ├── QuickReportsPanel.tsx
│   │   │   ├── RealTimeMonitoring.tsx
│   │   │   ├── RemnantMarketplacePreview.tsx
│   │   │   ├── SmartDrawCanvas.tsx        # Grid-based multi-unit designer
│   │   │   ├── SmartDrawTool.tsx
│   │   │   ├── SmartMeasuringInterface.tsx
│   │   │   ├── TechnicalCalculator.tsx
│   │   │   ├── Window3DGenerator.tsx
│   │   │   ├── WorkflowProgress.tsx
│   │   │   └── WorkshopPerformanceWidget.tsx
│   │   ├── admin/              # Admin dashboard components (18 files)
│   │   ├── about/              # Company information components
│   │   ├── ai/                 # AI-powered components
│   │   ├── analytics/          # Analytics and reporting (8 files)
│   │   ├── auth/               # Authentication components
│   │   ├── charts/             # Chart components
│   │   │   ├── MaterialUtilizationChart.tsx
│   │   │   └── RemnantLifespanChart.tsx
│   │   ├── comparison/         # Product comparison tools
│   │   │   ├── CompareBar.tsx
│   │   │   ├── CompareDialog.tsx
│   │   │   └── CompareTable.tsx
│   │   ├── compliance/         # Compliance and standards
│   │   ├── contact/            # Contact and support forms (5 files)
│   │   ├── currency/           # Multi-currency support
│   │   ├── dashboard/          # Dashboard components (5 files)
│   │   ├── enterprise/         # Enterprise features
│   │   │   ├── EnterpriseClientActivation.tsx
│   │   │   └── WhiteLabelPortal.tsx
│   │   ├── home/               # Homepage sections (6 files)
│   │   ├── iot/                # IoT and monitoring
│   │   ├── layout/             # Navigation and layout components (9 files)
│   │   │   ├── IndustrialNavbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── RegionAwareLayout.tsx
│   │   ├── marketplace/        # Marketplace components
│   │   ├── mobile/             # Mobile-optimized components
│   │   ├── monitoring/         # System monitoring
│   │   ├── optimized/          # Performance-optimized components (7 files)
│   │   │   ├── VirtualizedMachineGrid.tsx
│   │   │   ├── MobileOptimizedGrid.tsx
│   │   │   └── MobileFilterPanel.tsx
│   │   ├── portal/             # Customer portal components
│   │   ├── products/           # Product display components (9 files)
│   │   │   ├── SmartCategoryNavigation.tsx
│   │   │   └── CategoryBreadcrumb.tsx
│   │   ├── quotes/             # Quote management components (9 files)
│   │   │   ├── QuoteRequestDialog.tsx
│   │   │   ├── QuoteTwinSearchPanel.tsx
│   │   │   └── QuoteCalculator.tsx
│   │   ├── regional/           # Region-specific components
│   │   │   ├── egyptian/       # Egyptian-specific components
│   │   │   └── turkish/        # Turkish-specific components
│   │   ├── reports/            # Reporting components (2 files)
│   │   ├── sales/                # Sales components
│   │   ├── search/             # Search functionality (2 files)
│   │   ├── services/           # Service-related components (32 files)
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── EmergencyServiceDialog.tsx
│   │   │   ├── ServiceViewToggle.tsx
│   │   │   ├── SimpleServicesView.tsx
│   │   │   ├── MachineRegistrationEnhanced.tsx
│   │   │   ├── MaintenanceDashboard.tsx
│   │   │   ├── PredictiveMaintenanceEngine.tsx
│   │   │   └── OperatorTrainingIncentiveDialog.tsx
│   │   ├── settings/           # Settings and configuration
│   │   ├── shared/             # Shared components
│   │   ├── shop/               # E-commerce components (27 files)
│   │   │   ├── IndustrialProductCard.tsx
│   │   │   ├── ProductQuickView.tsx
│   │   │   ├── RecentlyViewedProducts.tsx
│   │   │   ├── FreightCalculator.tsx
│   │   │   ├── EgyptianStandardsGuide.tsx
│   │   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   │   └── ai-advisor/
│   │   │       └── AiEquipmentAdvisor.tsx
│   │   ├── support/            # Customer support components (13 files)
│   │   │   ├── TicketWizardDialog.tsx
│   │   │   └── AITechnicalChatbot.tsx
│   │   ├── swiftxr/            # SwiftXR AR integration
│   │   ├── training/           # Training components (2 files)
│   │   ├── ui/                 # Base UI components (shadcn/ui) (66 files)
│   │   │   ├── loading/        # Loading state components
│   │   │   ├── FormSkeleton.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── [shadcn/ui components]
│   │   ├── used-machines/      # Used machinery marketplace (10+ files)
│   │   │   ├── SellUsedMachineForm.tsx
│   │   │   ├── UsedMachineCard.tsx
│   │   │   └── UsedMachineFilters.tsx
│   │   └── workflows/          # Workflow components
│   ├── pages/                  # Route components (46 files)
│   │   ├── About.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── CustomerPortal.tsx
│   │   ├── FabricatorDashboard.tsx
│   │   ├── FabricatorWorkflow.tsx
│   │   ├── FabricationServices.tsx
│   │   ├── FabricationWorkflowDetail.tsx
│   │   ├── FabricatorBrandingSettings.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── Model3DGallery.tsx
│   │   ├── Products.tsx
│   │   ├── Projects.tsx
│   │   ├── QuotePage.tsx
│   │   ├── Register.tsx
│   │   ├── Services.tsx
│   │   ├── Shop.tsx
│   │   ├── UsedMachines.tsx
│   │   ├── machines/           # Machine-specific pages
│   │   │   └── MachineDetail.tsx
│   │   ├── profiles/           # Profile management pages
│   │   │   └── ProfileDetail.tsx
│   │   └── workflows/          # Workflow sub-pages
│   │       └── WorkflowDetail.tsx
│   ├── hooks/                   # Custom React hooks (23 files)
│   │   ├── useVirtualizedMachines.ts
│   │   ├── useScrollThreshold.ts
│   │   ├── useToast.ts
│   │   ├── useReducedMotionPref.ts
│   │   ├── usePythonAPI.ts
│   │   ├── useAutoSave.ts
│   │   └── [other custom hooks]
│   ├── lib/                     # Utility libraries (161 files)
│   │   ├── 3d/                  # 3D utilities
│   │   │   └── windowGeometry.ts
│   │   ├── ai/                  # AI service integrations (6 files)
│   │   │   ├── DesignAISuggestor.ts
│   │   │   ├── EquipmentRecommendationEngine.ts
│   │   │   └── SparePartsService.ts
│   │   ├── analytics/           # Business intelligence (15 files)
│   │   │   ├── CalibrationAnalytics.ts
│   │   │   ├── ConsumptionForecaster.ts
│   │   │   ├── CostOptimizer.ts
│   │   │   ├── FeatureEngineer.ts
│   │   │   ├── JobComplexityPredictor.ts
│   │   │   ├── PersonalAnalytics.ts
│   │   │   ├── PerformanceBenchmarker.ts
│   │   │   └── WorkshopPerformanceAnalytics.ts
│   │   ├── api/                 # API clients (2 files)
│   │   ├── calibration/         # Calibration management (3 files)
│   │   │   ├── CalibrationManager.ts
│   │   │   ├── EnhancedCalibrationManager.ts
│   │   │   └── KFactorEngine.ts
│   │   ├── clients/             # Supabase clients (5 files)
│   │   ├── cnc/                 # CNC integration
│   │   │   └── CNCIntegration.ts
│   │   ├── data/                # Data clients (11 files)
│   │   │   ├── activityClient.ts
│   │   │   ├── catalogClient.ts
│   │   │   └── ordersClient.ts
│   │   ├── exports/             # Export generators (14 files)
│   │   │   ├── CSVExportGenerator.ts
│   │   │   ├── DXFExportGenerator.ts
│   │   │   ├── PDFExportGenerator.ts
│   │   │   ├── QRBarcodeGenerator.ts
│   │   │   ├── MachineExportManager.ts    # NEW: Multi-brand CNC exports
│   │   │   └── machiningMacros.ts         # NEW: Parametric G-code macros
│   │   ├── localization/        # Localization utilities (4 files)
│   │   │   ├── formatUtils.ts   # NEW: Regional formatting
│   │   │   └── printStyles.ts   # NEW: Print optimization
│   │   ├── inventory/           # Inventory management (6 files)
│   │   │   ├── RemnantManager.ts
│   │   │   ├── RemnantMarketplace.ts
│   │   │   └── RemnantPredictor.ts
│   │   ├── ml/                  # Machine learning (5 files)
│   │   │   ├── AlgorithmPredictor.ts
│   │   │   ├── CalibrationLearner.ts
│   │   │   ├── ModelTrainer.ts
│   │   │   ├── RemnantUsagePredictor.ts
│   │   │   └── TrainingDataCollector.ts
│   │   ├── optimization/       # Optimization strategies
│   │   │   └── OptimizationPresets.ts
│   │   ├── profile/             # Profile management (2 files)
│   │   │   ├── ProfileDataSheetParser.ts
│   │   │   └── ProfileDefinitionManager.ts
│   │   ├── simulation/          # Cut simulation
│   │   │   └── CutSimulator.ts
│   │   ├── quality/             # Quality prediction
│   │   │   └── AIQualityPredictor.ts
│   │   ├── regional/           # Regional localization
│   │   │   └── RegionalLocalizationEngine.ts
│   │   ├── localization/        # Localization utilities (4 files)
│   │   │   ├── formatUtils.ts   # NEW: Regional formatting
│   │   │   └── printStyles.ts   # NEW: Print optimization
│   │   ├── reports/             # Report generation (6 files)
│   │   ├── supplychain/         # Supply chain intelligence
│   │   │   └── SupplyChainIntelligence.ts
│   │   ├── ticketing/           # Unified ticketing system
│   │   ├── workspace/           # Workspace synchronization
│   │   │   └── WorkspaceSyncService.ts
│   │   ├── supabase.ts          # Supabase client
│   │   ├── i18n.ts              # Internationalization
│   │   └── utils.ts             # Utility functions
│   ├── algorithms/              # Optimization algorithms (15+ files)
│   │   ├── adaptiveSolver.ts
│   │   ├── EnhancedAdaptiveSolver.ts
│   │   ├── HybridMassOptimizer.ts
│   │   ├── RemnantFirstGeneticOptimizer.ts  # NEW: Remnant-first GA
│   │   ├── GlassNestingCPSolver.ts          # NEW: Constraint programming
│   │   ├── linearProgramming.ts
│   │   ├── remnantManagement.ts
│   │   ├── simulatedAnnealing.ts
│   │   ├── smartDraw.ts
│   │   └── productionScheduling/
│   │       └── geneticScheduleOptimizer.ts
│   ├── analytics/               # Analytics utilities (5 files)
│   │   ├── CostOptimizer.ts
│   │   └── PredictiveAnalytics.ts
│   ├── context/                 # React context providers (5 files)
│   │   ├── AuthContext.tsx
│   │   ├── FabricatorWorkspaceContext.tsx
│   │   └── QuoteContext.tsx
│   ├── contexts/                # Additional contexts (2 files)
│   ├── constants/               # Static data and configurations (9 files)
│   │   ├── yilmazMachines.ts
│   │   ├── productsData.ts
│   │   └── smartCategories.ts
│   ├── data/                    # Mock data and fixtures
│   │   ├── profileSystems/      # Profile system definitions (10+ files)
│   │   │   ├── egyptian/        # Egyptian market systems
│   │   │   │   └── caluminium/  # Caluminium PS systems
│   │   │   │       └── ps.ts     # PS 5600, 4800, 6600, 9600, 100
│   │   │   └── turkish/         # Turkish market systems
│   │   │       ├── asas/        # ASAŞ systems
│   │   │       │   └── asasCW100.ts  # RWT75, R50, REFD77
│   │   │       └── kale/        # Kale systems
│   │   │           └── kale70.ts # Enhanced Kale 70
│   │   ├── supplierProfiles/    # Supplier profile data
│   │   │   ├── profileDatabase.ts
│   │   │   └── supplierAPI.ts
│   │   ├── systemPacks.ts       # System pack registry
│   │   └── usedMachines.ts
│   ├── types/                   # TypeScript type definitions (13 files)
│   │   ├── fabricator.ts
│   │   ├── database.ts
│   │   ├── product.ts
│   │   └── index.ts
│   ├── shared/                  # Shared UI components (70 files)
│   │   └── ui/                  # shadcn/ui components (66 files)
│   │       ├── CircuitDivider.tsx
│   │       ├── NeonButton.tsx
│   │       └── ui/              # Base UI components
│   ├── assets/                  # Static assets and images
│   ├── cloud/                   # Cloud integration (5 files)
│   ├── compliance/              # Compliance utilities (5 files)
│   ├── config/                  # Configuration files
│   │   └── regionalConfig.ts
│   ├── hocs/                    # Higher-order components
│   │   └── withErrorBoundary.tsx
│   ├── integrations/            # Third-party integrations (14 files)
│   │   ├── cnc/                 # CNC machine connectors
│   │   │   ├── BiesseCNC.ts
│   │   │   ├── ElumatecCNC.ts
│   │   │   └── YilmazCNC.ts
│   │   └── yilmaz/              # Yilmaz-specific integrations
│   │       ├── YilmazCNC.ts
│   │       └── YilmazGCodeGenerator.ts
│   ├── localization/            # Localization utilities (4 files)
│   ├── machine-connectors/      # CNC machine connectors (4 files)
│   │   ├── YilmazNetworkProtocol.ts
│   │   └── YilmazUSBBridge.ts
│   ├── modules/                  # Feature modules (28 files)
│   ├── optimization/            # Cutting optimization (4 files)
│   ├── routes/                   # Routing configuration (2 files)
│   │   ├── AppRoutes.tsx
│   │   └── TrainingServicesPage.tsx
│   ├── services/                 # Service layer (5 files)
│   │   ├── SearchAnalyticsTracker.ts
│   │   └── RelatedMachinesEngine.ts
│   ├── store/                    # State management
│   │   └── jobsStore.ts
│   ├── stories/                  # Storybook stories (26 files)
│   ├── styles/                   # Styling utilities
│   │   └── mobile-scaling.css
│   ├── tests/                    # Test files (8 files)
│   │   ├── integration/         # Integration tests
│   │   ├── performance/         # Performance tests
│   │   └── deployment/           # Deployment tests
│   └── utils/                    # Utility functions (4 files)
│       ├── excelImport.ts
│       └── priceUtils.ts
├── python_backend/               # Python FastAPI backend
│   ├── apis/                    # API route handlers (47 files)
│   │   ├── v1/                   # Version 1 API endpoints
│   │   └── v2/                   # Version 2 API endpoints
│   ├── ai_services/             # AI and ML services (15 files)
│   │   ├── part_detection/      # Computer vision for parts
│   │   │   ├── inference.py
│   │   │   ├── v1/               # Version 1 models
│   │   │   └── v2/               # Version 2 models
│   │   ├── preprocessing/       # Image processing utilities
│   │   ├── predictive_maintenance.py
│   │   └── recommendation_engine.py
│   ├── core/                    # Core application logic (20 files)
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── monitoring.py
│   ├── models/                   # Pydantic data models (4 files)
│   │   ├── api_v1_models.py
│   │   └── api_v2_models.py
│   ├── services/                 # Business logic services
│   │   └── unified_ticket_service.py
│   ├── tasks/                    # Background tasks (4 files)
│   │   ├── notification_tasks.py
│   │   └── quote_tasks.py
│   ├── templates/                # Email templates (4 files)
│   ├── tests/                    # Comprehensive test suite (17 files)
│   │   ├── test_api.py
│   │   ├── test_integration.py
│   │   └── test_performance.py
│   ├── monitoring/               # Performance monitoring
│   ├── scripts/                  # Utility scripts (2 files)
│   └── uploads/                  # File upload handling
├── migrations/                   # Database migrations (35+ SQL files)
│   ├── 019_fix_audit_trigger_record_id.sql      # NEW: UUID type fix
│   ├── 020_fix_fabricator_accessories_insert_policy.sql  # NEW: RLS policy
│   └── 021_fix_stock_movements_insert_policy.sql  # NEW: RLS policy fix
├── docs/                         # Documentation (21 files)
├── public/                       # Static public assets (100 files)
├── locales/                      # Translation files (56 JSON files)
├── scripts/                      # Build and utility scripts (21 files)
├── k8s/                          # Kubernetes deployment configs
│   ├── eu-production/            # EU production configs
│   └── monitoring/               # Monitoring configs
└── [config files]                # Root-level configuration files
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── vercel.json
```

### **Key Directory Descriptions**

**Frontend (`src/`):**
- **`components/`**: 370+ React components organized by feature domain
- **`lib/`**: 161 utility libraries for AI, analytics, exports, inventory, ML, etc.
- **`algorithms/`**: 13 optimization algorithms for cutting and production
- **`pages/`**: 46 route components for different application pages
- **`hooks/`**: 23 custom React hooks for reusable logic
- **`types/`**: 13 TypeScript type definition files
- **`shared/ui/`**: 70 shared UI components including shadcn/ui base components

**Backend (`python_backend/`):**
- **`apis/`**: FastAPI route handlers with v1 and v2 endpoints
- **`ai_services/`**: ML models and AI services for part detection and predictions
- **`core/`**: Core application logic, database, security, and monitoring
- **`models/`**: Pydantic data models for API validation
- **`tests/`**: Comprehensive test suite with integration and performance tests

**Configuration & Infrastructure:**
- **`migrations/`**: 35 SQL migration files for database schema
- **`k8s/`**: Kubernetes deployment configurations
- **`locales/`**: 56 JSON translation files for internationalization
- **`public/`**: 100 static assets (images, PDFs, etc.)

## 🗄️ Database Schema

### **Core Tables**
- **profiles**: Extended user profiles with company information
- **products**: Industrial machinery, parts, and materials catalog
- **categories**: Hierarchical product categorization
- **quotes**: Quote management with approval workflow
- **orders**: Order processing and fulfillment tracking
- **service_tickets**: Professional ticketing system with SLA
- **notifications**: Real-time user notifications
- **material_remnants**: Remnant tracking with multi-location support
- **remnant_marketplace_listings**: Marketplace listings for buying/selling remnants
- **remnant_marketplace_transactions**: Marketplace transaction records
- **workshop_metrics**: Daily OEE and performance metrics
- **operator_metrics**: Operator performance tracking
- **optimization_training_data**: ML model training data collection
- **calibration_analytics**: Verification events, test results, and production feedback logging

### **Unified Ticketing System**
The unified ticket model consolidates support, maintenance, and emergency tickets with digital twin integration. See migration scripts for full implementation details.

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
   # 3. Execute migrations/010_remnant_marketplace_and_analytics.sql (for v3.2.0 features)
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

### **Architecture Diagram**

```mermaid
graph TD
    Client[React Frontend] -->|Auth & Realtime| Supabase
    Client -->|Complex Logic & ML| PythonAPI[FastAPI Backend]
    PythonAPI -->|Async Tasks| Celery
    Celery -->|Optimization| Workers
    Client -->|WebXR| AR[AR/VR Viewer]
    
    subgraph "Fabricator Core"
    Inputs[Data Sheets] --> Calibration[AI Calibration]
    Calibration --> Solver[ML Adaptive Solver]
    Solver --> CNC[G-Code Export]
    end
```

### **Data Flow**
1. **User Interaction** → React Components
2. **State Management** → Context/Zustand
3. **API Calls** → FastAPI Backend
4. **Data Processing** → AI Services (if applicable)
5. **Database Operations** → Supabase with RLS
6. **Real-time Updates** → WebSocket subscriptions

## 🔧 Key Components

### **Fabricator Pro Platform**
- `FabricatorWorkflowPro` - Main workflow cockpit with AI optimization pipeline
- `FabricatorWorkspaceLayout` - Shared workspace layout with persistent state
- `FabricatorDashboard` - Enhanced dashboard with performance widgets and marketplace preview
- `BosphorusWorkflowRibbon` - Visual workflow bridge between craftsmanship and technology
- `CuttingOptimizationEngine` - Advanced genetic/constraint programming algorithms
- `CalibrationWizard` - Visual calibration dashboard with real-time simulation and learning
- `MassProductionDashboard` - Cross-project optimization with waste KPIs
- `InventoryDashboard` - Enhanced inventory with remnant analytics and stock intake
- `ProfileManagement` - User-defined profile libraries with pricing configurations
- `AccessoryManagement` - Hardware catalog management with stock tracking
- `PricingConfiguration` - Dynamic pricing with metal indexing and LME tracking
- `CommercialOfferPanel` - Quote and invoice management with conversion workflows
- `NewProjectWizard` - Smart project creation with branded system packs
- `SmartMeasuringInterface` - AI-powered measurement and design interface
- `SmartDrawTool` - Intelligent mullion/transom placement with constraints
- `SmartDrawCanvas` - Grid-based multi-unit window designer
- `ProductionLabel` - QR-enabled production labels for feedback loops
- `QualityControl` - Computer vision inspection and defect detection
- `ProductionScheduler` - CNC job sequencing and machine-ready exports
- `RealTimeMonitoring` - Live performance metrics and efficiency tracking
- `QuickReportsPanel` - Multi-format export (PDF/CSV/DXF) with QR/barcode support
- `WorkshopPerformanceWidget` - Real-time OEE and performance metrics display
- `RemnantMarketplacePreview` - Quick marketplace access and listing management

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
- `AlgorithmPredictor` - ML-based algorithm selection for optimization (greedy/linear/genetic)
- `AIQualityPredictor` - Defect prediction and optimal cutting parameter suggestions
- `RemnantUsagePredictor` - ML-based remnant reuse prediction with TensorFlow.js
- `TrainingDataCollector` - Automatic collection of optimization results for ML training
- `ConsumptionForecaster` - Material usage predictions with trend detection
- `JobComplexityPredictor` - Pre-emptive algorithm selection with complexity scoring
- `WorkshopPerformanceAnalytics` - OEE tracking, operator metrics, and industry benchmarking
- `AiEquipmentAdvisor` - AI-powered equipment recommendations
- `MachineRecommendationWizard` - Smart product finder with AI
- `PredictiveMaintenanceEngine` - ML-based maintenance predictions
- `MachineHealthPrediction` - Real-time failure prediction algorithms
- `SensorDataAnalysis` - Vibration, temperature, acoustic monitoring
- `AutomatedWorkflowGeneration` - AI-powered process optimization
- `NaturalLanguageProcessing` - Technical document analysis
- **CalibrationLearner** - Auto-tuning K-factors based on production feedback

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

### **Math Verification (Regression Testing)**
Industrial software requires rigorous regression testing for optimization algorithms.
- **Golden Master Testing**: Automated verification against a set of "Golden Master" inputs (complex window lists) and expected outputs (cut lists).
- **Deviation Alerts**: Scripts to alert if optimization results deviate by > 0.01% from the Golden Master.
- **Constraint Validation**: Automated checks to ensure no physical constraints (min/max dimensions, hardware limits) are violated in generated designs.

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

## 🔮 Industry 4.0 Roadmap

Future enhancements focused on smart manufacturing and connected systems.

### **1. IoT Direct Connection (MQTT)**
- **Direct Machine Feedback**: Subscribe to MQTT topics from networked CNC machines (e.g., Yilmaz) to receive "Cut Complete" signals automatically.
- **Real-Time Status**: Live machine status updates (Idle, Running, Error) directly on the Fabricator Dashboard.
- **Remote Command**: Push cut lists directly to machines without USB transfer.

### **2. Augmented Reality (AR) Assembly Overlay**
- **Assembly Guidance**: AR overlay for assembly tables showing exactly where profiles and hardware fit.
- **Visual QA**: Overlay expected dimensions and tolerances on physical frames for visual quality assurance.
- **Training**: Interactive AR training modules for new assembly staff.

### **3. Sustainability & Carbon Footprint**
- **CO2 Saved Metric**: Real-time calculation of CO2 saved based on recycled aluminium and remnant usage.
- **Sustainability Reports**: Automated generation of sustainability reports for EU export compliance.
- **Energy Monitoring**: Integration with smart meters to track energy consumption per job.

## 🔄 Recent Updates

### **Version 5.1 - Advanced Algorithms & Data Refinement** (Latest - Nov 2024)
Major enhancements to optimization algorithms and system pack data based on deep market research.

#### **Advanced Optimization Algorithms**
- ✅ **Remnant-First Genetic Algorithm Optimizer** (`RemnantFirstGeneticOptimizer.ts`): Hybrid optimization combining remnant-first greedy strategy with genetic algorithm evolution. Features:
  - Configurable remnant utilization thresholds (default: 70%)
  - Tournament selection with elitism preservation
  - Three mutation strategies: swap cuts, re-pack bars, split/merge
  - Early termination on convergence detection
  - Performance: 15-30% waste reduction vs. baseline, 75-90% remnant utilization
  - Handles 50-200 cuts in 1-5 seconds

- ✅ **Constraint Programming Glass Nesting Solver** (`GlassNestingCPSolver.ts`): 2D bin packing solver for glass pane optimization:
  - Boundary and non-overlap constraints with configurable spacing (default: 3mm)
  - Optional 90-degree rotation support
  - Priority-based placement with grouping support
  - Sheet reduction optimization
  - Performance: 85-95% utilization for rectangular panes, 10-20% sheet reduction vs. greedy
  - Handles 20-50 panes in 100-500ms

#### **System Pack Data Refinement**
- ✅ **Caluminium PS System Enhancements**: Added complete PS system variants:
  - PS 6600 Sliding (Frame: 97.15mm, Sash: 66mm, Weight: 0.900 kg/m)
  - PS 9600 Sliding (Frame: 97.15mm, Sash: 115.6mm, Weight: 1.130 kg/m)
  - PS 4800 Hinged (Frame: 78.5mm, Sash: 78.5mm, Weight: 0.726 kg/m)
  - PS 5600 Hinged (Frame: 85.0mm, Sash: 72.0mm, Weight: 0.815 kg/m)
  - PS 100 Curtain Wall (Mullion: 54x100mm, Weight: 2.859 kg/m, Ix: 252.5 cm⁴)

- ✅ **ASAŞ Turkish Systems**: Added three new system packs:
  - **ASAŞ Rescara RWT75 Window System**: 75mm frame depth, 48-58mm glazing, Uf = 1.752 W/m²K
  - **ASAŞ Rescara R50 Facade System**: 50mm profile width, 6 mullion variants (80-200mm depth)
  - **ASAŞ REFD77 Folding Door System**: 77mm frame depth, max 3.5m vent height, 120kg capacity

- ✅ **Kale 70 Enhancements**: Updated specifications:
  - Sash weight capacity increased to 130kg (from 120kg)
  - Enhanced machining macros with FANUC-style G-code templates
  - Advanced multi-point locking system integration
  - Proprietary hardware adjustment capabilities

- ✅ **Jumbo 100 System Refinement**: Added comprehensive technical specifications:
  - Performance classes (Air Permeability: Class 3, Water Tightness: Class 8A, Wind Load: Class B2)
  - Frame depth range: 74mm to 134mm
  - Maximum glazing thickness: 26mm
  - Critical CNC machining notes

- ✅ **Machining Macro Library**: Created parametric macro system (`machiningMacros.ts`):
  - Generic Hinge Slot Macro (O9010)
  - Multi-Point Lock Pocket Macro (O9011)
  - Drainage Slot Macro (O9012)
  - Anchor Slot Macro (O9013)
  - FANUC-style G-code templates with parameter substitution

#### **Database Migrations & Fixes**
- ✅ **Migration 019**: Fixed audit trigger `record_id` type casting issue (UUID handling)
- ✅ **Migration 020**: Added missing INSERT policy for `fabricator_accessories` table
- ✅ **Migration 021**: Fixed `stock_movements` INSERT policy with NULL check for `auth.uid()`

### **Version 5.0 - The Reliability & Realism Update** (Nov 2024)
A massive overhaul of the Fabricator Pro module focusing on visual fidelity, data reliability, and closing the loop between design and production.
- ✅ **Visual Realism (PBR)**: High-fidelity 3D rendering with Physically Based Rendering materials (glass refraction, metal roughness), spacer bars, and muntin grids.
- ✅ **Reliability (Verification Gate)**: New "Trust but Verify" workflow step displaying explicit math (`Input - Deduction = Cut Length`) and calibration confidence scores.
- ✅ **Multi-Unit Grid Design**: Introduced `SmartDrawCanvas` for designing complex multi-unit windows using a grid system (Rows/Cols) with intelligent mullion and transom insertion.
- ✅ **Advanced Animation**: Interactive sash opening and closing (Standard and Grid modes) to verify opening direction and clearance.
- ✅ **Real-Time Cross-Section**: "Scissors" tool providing a live cross-section view of the 3D model to inspect profile mating and internal geometry.
- ✅ **Production Loop (QR Labels)**: Generate printable labels (`ProductionLabel`) with QR codes. Scanning the code links to a feedback form that auto-tunes the system's K-factors via `CalibrationLearner`.

### **Version 4.0 - The Intelligent Engine**
- ✅ **Profile Calibration Wizard**: Complete profile definition system from technical data sheets without DXF dependency. Visual cross-section viewer with annotation support, K-Factor Calculator with real-time formulas, and initial calibration setup.
- ✅ **Pre-Production Visual Verification**: Mandatory safety gate with 2D/3D cut simulation, calibration status validation, and visual confirmation before generating cut lists or G-code. Prevents costly production mistakes.
- ✅ **Optimization Equalizer**: User control over optimization strategy with presets (Maximum Savings, Fast Production, Remnant Reuse, Balanced) and fine-grained weight sliders. Real-time impact preview and strategy persistence.
- ✅ **Personal Analytics Dashboard**: Comprehensive insights dashboard showing calibration trends, strategy performance comparisons, profile health status, and efficiency metrics. Makes data collection visible and actionable.
- ✅ **CalibrationLearner AI**: Predictive ML model for K-factor suggestions. Multivariate regression trained on collective user data with confidence scoring, reasoning explanations, and continuous learning from user feedback.
- ✅ **Calibration Analytics Infrastructure**: Complete data collection system tracking test results, adjustments, and job outcomes. Powers ML training with structured data and pattern recognition.
- ✅ **K-Factor Engine**: Mathematical calculation engine for cutting deductions with joint type presets, validation, and adjustment suggestions.
- ✅ **Cut Simulation System**: 2D/3D visualization of cuts with K-factors applied, corner zoom, and machining overlay.
- ✅ **Profile Definition from Data Sheets**: Multi-step wizard for creating profiles from supplier technical sheets with image upload, visual annotation, and dimension entry.
- ✅ **Machining Zone Editor**: Visual editor for defining hinge slots, lock pockets, and other machining operations with precise coordinates and reusable macros.

### **Version 3.2.0** (Strategic Enhancements)
- ✅ **ML-Powered Adaptive Solver**: Self-learning optimization with 2.5x speed improvement and 12% better waste reduction
- ✅ **Algorithm Predictor**: ML-based algorithm selection (greedy/linear/genetic) with 94% prediction accuracy
- ✅ **Hybrid Mass Production Optimizer**: Cross-project genetic algorithm with remnant-first strategy
- ✅ **Remnant Marketplace**: Buy/sell excess materials between workshops with transaction management
- ✅ **Calibration Wizard**: Visual calibration dashboard with real-time simulation and self-learning system
- ✅ **AI Quality Predictor**: Defect prediction, optimal parameter suggestions, and preventive maintenance alerts
- ✅ **Workshop Performance Analytics**: OEE tracking, operator metrics, capacity planning, and industry benchmarking
- ✅ **Training Data Collection**: Automatic collection of optimization results for continuous ML improvement
- ✅ **Enhanced Dashboard**: Real-time performance widgets, marketplace preview, and system health indicators
- ✅ **Real-Time Pre-Solver**: Instant feedback (<2s) for simple jobs with progressive optimization
- ✅ **Result Caching**: Intelligent caching of optimization patterns for recurring window types

### **Version 3.1.0**
- ✅ **Fabricator Pro Platform**: Complete aluminium/UPVC workflow with AI optimization
- ✅ **Advanced Cutting Algorithms**: Genetic, constraint programming, and exact optimization
- ✅ **CNC Machine Integration**: DXF/G-code exports with Yilmaz and multi-brand connectors
- ✅ **Mass Production Mode**: Cross-project optimization with unified waste KPIs
- ✅ **Profile & Accessory Management**: Supabase-backed libraries with pricing and stock tracking
- ✅ **Bosphorus Workflow Ribbon**: Ottoman/Egyptian craftsmanship meets modern technology
- ✅ **Real-Time Analytics Dashboard**: Live performance metrics and efficiency monitoring
- ✅ **Quality Control AI**: Computer vision inspection with automated defect detection
- ✅ **Commercial Workspace**: Quote-to-invoice conversion with persistent drafts
- ✅ **Branded System Packs**: ROCK 60, JUMBO 100, YILMAZ W60, CALUMINIUM PS support
- ✅ **Metal Price Indexing**: LME/LOCAL indices with live material cost tracking
- ✅ **Multi-Format Reporting**: PDF/CSV/DXF exports with QR/barcode localization
- ✅ **SwiftXR AR Integration**: Advanced 3D model viewing and measurement
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
- **E-Commerce Schema**: Complete schema with products, orders, quotes, order_items
- **Service Ticketing System**: Unified ticketing with SLA management, digital twin integration
- **User Profiles**: Extended profiles with company information, roles, and preferences
- **Audit Logging**: Comprehensive activity tracking with `fabricator_audit_logs` table
- **Security Policies**: Row-Level Security (RLS) for all tables with proper NULL checks
- **Multi-Language Content**: Localized product information and translations
- **Remnant Marketplace**: 
  - `remnant_marketplace_listings`: Buy/sell listings with search and filtering
  - `remnant_marketplace_transactions`: Transaction records with status tracking
- **Workshop Analytics**: 
  - `workshop_metrics`: Daily OEE and performance metrics
  - `operator_metrics`: Operator performance tracking
  - `optimization_training_data`: ML model training data collection
- **Calibration Analytics**: 
  - `calibration_analytics`: Verification events, test results, and production feedback
  - Powers ML training with structured data and pattern recognition
- **Fabricator Tables**:
  - `fabricator_profiles`: User-defined profile libraries with pricing
  - `fabricator_accessories`: Hardware catalog with stock tracking
  - `material_remnants`: Remnant tracking with multi-location support
  - `stock_movements`: Stock movement tracking with audit trail
  - `fabricator_projects`: Project management with customer linking
  - `fabricator_jobs`: Job definitions with optimization results
- **Recent Migrations** (Nov 2024):
  - Migration 019: Fixed audit trigger `record_id` UUID type casting
  - Migration 020: Added missing INSERT policy for `fabricator_accessories`
  - Migration 021: Fixed `stock_movements` INSERT policy with NULL check

### **Backend API Enhancements**
- **FastAPI v2 Endpoints**: Improved performance with async/await
- **AI Services Integration**: 
  - Part detection with computer vision
  - Predictive maintenance with 94% accuracy
  - Equipment recommendation engine
  - Natural language processing for technical documents
- **Email Notification System**: 
  - SendGrid integration with custom templates
  - Localization support (EN/TR/AR)
  - Automated notifications for tickets, quotes, orders
- **Comprehensive Testing Suite**: 
  - Unit tests with pytest
  - Integration tests for API endpoints
  - Security tests for authentication/authorization
  - Performance/load tests with Locust
- **Docker Optimization**: Production-ready containers with multi-stage builds
- **ML Training Pipeline**: 
  - Automated data collection from optimization results
  - Model versioning and A/B testing support
  - Daily retraining on successful calibrations
- **Performance Analytics**: 
  - Workshop metrics and benchmarking APIs
  - OEE tracking and operator performance
  - Real-time dashboard updates

---

**Built with ❤️ for Almona Industrial Solutions**
