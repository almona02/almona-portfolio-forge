# Almona Portfolio Forge - Project Structure

*Auto-generated on 2025-09-03*

This document provides a comprehensive overview of the project file structure with descriptions for key files and directories.

## 📁 Complete Project Structure

```
├── .github
│   └── workflows
│       └── ci.yml
├── .kilocode
│   └── mcp.json
├── .storybook
│   ├── main.ts
│   ├── preview.ts
│   └── vitest.setup.ts
├── .tabby
│   └── config.toml
├── docs # Project documentation and guides
│   ├── generate-structure.js
│   ├── project-structure.md
│   └── README.md # Main project documentation and setup guide
├── locales # Internationalization translation files
│   ├── ar
│   │   └── services.json
│   └── en
│       ├── products.json
│       ├── services.json
│       └── shop.json
├── public # Static assets and files served directly
│   ├── documents
│   │   └── specs
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── DK-502.pdf
│   │       └── KM-212.pdf
│   ├── images
│   │   ├── machines
│   │   │   ├── adrenaline issue.png
│   │   │   ├── almona service page 01.jpg
│   │   │   ├── cutting-machine.jpg
│   │   │   ├── DC-421-PBS.jpg
│   │   │   ├── DK-502.jpg
│   │   │   ├── FR-221-S.jpg
│   │   │   ├── KD-402-S.jpg
│   │   │   ├── KM-212.jpg
│   │   │   ├── machine-accessories.jpg
│   │   │   ├── nvidia issue.png
│   │   │   ├── processing-center.jpg
│   │   │   └── welding-machine.jpg
│   │   └── profiles
│   │       ├── door-system.jpg
│   │       ├── sliding-system.jpg
│   │       └── window-system.jpg
│   ├── locales # Internationalization translation files
│   │   ├── ar
│   │   │   └── products.json
│   │   └── en
│   │       └── products.json
│   ├── models # Pydantic data models for API validation
│   │   ├── AR-Code-Object-Capture-app-1752786892 (1).glb
│   │   ├── fault-model.json
│   │   └── group1-shard1of1.bin
│   ├── favicon.ico
│   ├── logo.png
│   ├── logo.svg
│   ├── placeholder.svg
│   ├── robots.txt
│   └── service-worker.js
├── publicimagesmachines
├── publicimagesprofiles
├── python_backend # FastAPI backend with AI services
│   ├── ai_services # Machine learning and AI-powered features
│   │   ├── part_detection
│   │   │   ├── models # Pydantic data models for API validation
│   │   │   ├── v1
│   │   │   ├── v2
│   │   │   ├── inference.py
│   │   │   └── tasks.py
│   │   └── preprocessing
│   │       └── image_processor.py
│   ├── apis # FastAPI route handlers and endpoints
│   │   ├── v1
│   │   │   ├── __init__.py
│   │   │   └── part_detection.py
│   │   ├── v2
│   │   │   ├── __init__.py
│   │   │   ├── auth_fastapi.py
│   │   │   ├── auth.py
│   │   │   ├── notifications.py
│   │   │   ├── part_detection_fastapi.py
│   │   │   └── part_detection.py
│   │   ├── auth_routes_fixed.py
│   │   └── main.py
│   ├── core # Core application logic and configurations
│   │   ├── celery_app.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── email_service.py
│   │   ├── security.py
│   │   └── supabase_client.py
│   ├── models # Pydantic data models for API validation
│   │   ├── api_v1_models.py
│   │   ├── api_v2_models.py
│   │   ├── auth_models.py
│   │   └── notification_models.py
│   ├── monitoring
│   │   └── dashboard.json
│   ├── scripts # Build and utility scripts
│   │   └── register_models.py
│   ├── templates # Email notification templates
│   │   ├── message_notification.html
│   │   ├── ticket_assigned.html
│   │   ├── ticket_created.html
│   │   └── ticket_resolved.html
│   ├── tests # Comprehensive testing suite
│   │   ├── fixtures
│   │   ├── test_data
│   │   ├── benchmark.py
│   │   ├── cli_test.py
│   │   ├── conftest.py
│   │   ├── load_test.py
│   │   ├── run_tests.py
│   │   ├── security_test_fixed.py
│   │   ├── test_api_v2.py
│   │   ├── test_api.py
│   │   ├── test_chaos.py
│   │   ├── test_contracts.py
│   │   └── test_part_detection_v1.py
│   ├── .dockerignore
│   ├── docker-compose.gpu.yml
│   ├── docker-compose.mlflow.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Dockerfile.gpu
│   ├── Dockerfile.optimized
│   ├── EMAIL_NOTIFICATION_SERVICE.md
│   ├── requirements-enhanced.txt
│   ├── requirements.txt
│   └── TESTING_GUIDE.md
├── scripts # Build and utility scripts
│   └── importData.ts
├── src # React application source code
│   ├── assets
│   │   ├── images
│   │   ├── logo.png
│   │   └── Untitled (2).png
│   ├── components # Reusable React UI components
│   │   ├── 3d-model # 3D visualization and AR components
│   │   │   ├── EnhancedGLBViewer.tsx
│   │   │   ├── GLBViewer.tsx
│   │   │   ├── index.ts
│   │   │   ├── Machine3DButton.tsx
│   │   │   ├── ModelTest.tsx
│   │   │   ├── Products3DWrapper.tsx
│   │   │   └── README.md # Main project documentation and setup guide
│   │   ├── about # Company information and team components
│   │   │   ├── CompanyTimeline.test.tsx
│   │   │   ├── CompanyTimeline.tsx
│   │   │   ├── CompanyValues.tsx
│   │   │   ├── CustomerTestimonials.tsx
│   │   │   ├── TeamProfiles.tsx
│   │   │   ├── timelineData.ts
│   │   │   └── WorkflowDiagram.tsx
│   │   ├── auth # Authentication and user management
│   │   │   ├── CountryCodeSelect.js
│   │   │   ├── CountryCodeSelect.tsx
│   │   │   ├── FacebookLoginButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── SmsOtpModal.tsx
│   │   ├── comparison
│   │   │   ├── CompareBar.tsx
│   │   │   ├── CompareTable.tsx
│   │   │   ├── EfficiencyCalculator.tsx
│   │   │   └── LocalStandardsTable.tsx
│   │   ├── contact
│   │   │   ├── AuthForm.tsx
│   │   │   ├── IntelligentForm.tsx
│   │   │   ├── LiveAssistance.tsx
│   │   │   └── SupportPortal.tsx
│   │   ├── home
│   │   │   ├── AboutSection.tsx
│   │   │   ├── FeaturedProducts.tsx
│   │   │   ├── Hero.tsx
│   │   │   └── ServicesSection.tsx
│   │   ├── layout
│   │   │   ├── Footer.tsx
│   │   │   └── Navbar.tsx
│   │   ├── local
│   │   │   └── LogisticsPartners.tsx
│   │   ├── products
│   │   │   └── AdvancedFilters.tsx
│   │   ├── quotes # Quote request and management system
│   │   │   ├── QuoteAIHelper.tsx
│   │   │   ├── QuoteCalculator.tsx
│   │   │   ├── QuoteConfirmationPage.tsx
│   │   │   ├── QuoteRequestPage.tsx
│   │   │   ├── QuoteRequestStepper.tsx
│   │   │   ├── QuoteSummary.tsx
│   │   │   └── README.md # Main project documentation and setup guide
│   │   ├── services # Service management and customer portal
│   │   │   ├── CustomerPortal.tsx
│   │   │   ├── EgyptianIndustrialZones.tsx
│   │   │   ├── EgyptianTechnicalSupport.tsx
│   │   │   ├── ElectricBorder.css
│   │   │   ├── ElectricBorder.tsx
│   │   │   ├── FabricationStageCard.tsx
│   │   │   ├── MachineHealthCheck.tsx
│   │   │   ├── MachineRegistration.tsx
│   │   │   ├── MaintenanceDashboard.tsx
│   │   │   ├── MyMachines.tsx
│   │   │   ├── NileLogisticsService.tsx
│   │   │   ├── OperatorTrainingSection.tsx
│   │   │   ├── ScheduleMaintenance.tsx
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── Services.module.css
│   │   │   ├── ServicesGrid.tsx
│   │   │   └── TrainingLevelCard.tsx
│   │   ├── shop # E-commerce and product catalog
│   │   │   ├── 3d-configurator
│   │   │   ├── ai-advisor
│   │   │   ├── ar
│   │   │   ├── fabrication-report
│   │   │   ├── machine-recommendation
│   │   │   ├── DurabilityDetailsModal.tsx
│   │   │   ├── EgyptianSpecBadges.tsx
│   │   │   ├── EgyptianStandardsGuide.tsx
│   │   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   │   ├── EgyptPowerFilter.tsx
│   │   │   ├── EgyptProcurementWorkflow.tsx
│   │   │   ├── EquipmentComparisonTool.tsx
│   │   │   ├── FreightCalculator.tsx
│   │   │   ├── IndustrialProductCard.tsx
│   │   │   ├── NileFreightCalculator.tsx
│   │   │   ├── PriceRangeSlider.tsx
│   │   │   ├── ProductConfigurator.tsx
│   │   │   ├── ProductQuickView.tsx
│   │   │   ├── RecentlyViewedProducts.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ReviewList.tsx
│   │   ├── support # Customer support and ticketing
│   │   │   ├── AdminTicketDashboard.tsx
│   │   │   ├── TicketDetailView.tsx
│   │   │   ├── TicketMetrics.tsx
│   │   │   └── TicketStatusBadge.tsx
│   │   ├── ui
│   │   │   ├── alert.tsx
│   │   │   ├── ar-button.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── FormSkeleton.tsx
│   │   │   ├── icons.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── LazyImage.tsx
│   │   │   ├── PageSkeleton.tsx
│   │   │   ├── ProductCardSkeleton.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── SkeletonLoader.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   └── tooltip.tsx
│   │   ├── used-machines
│   │   │   ├── ContactVerification.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   ├── MachineSpecsForm.tsx
│   │   │   ├── SellUsedMachineForm.tsx
│   │   │   ├── UsedMachineCard.tsx
│   │   │   ├── UsedMachineDetails.tsx
│   │   │   └── UsedMachineFilters.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── SEO.tsx
│   ├── constants
│   │   ├── portfolioData.ts
│   │   ├── productsData.ts
│   │   ├── uniqueProductsData.ts
│   │   ├── yilmazMachines-corrected.ts
│   │   ├── yilmazMachines-fixed.ts
│   │   └── yilmazMachines.ts
│   ├── context
│   │   ├── AuthContext.tsx
│   │   ├── LoadingContext.tsx
│   │   └── QuoteContext.tsx
│   ├── data
│   │   ├── inventory.ts
│   │   └── usedMachines.ts
│   ├── features
│   │   └── shop # E-commerce and product catalog
│   │       └── configurator
│   ├── hocs
│   │   └── withErrorBoundary.tsx
│   ├── hooks
│   │   ├── __tests__
│   │   │   └── usePythonAPI.test.ts
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── usePythonAPI.ts
│   │   ├── useRecentlyViewed.ts
│   │   ├── useToast.ts
│   │   └── useTranslation.ts
│   ├── lib
│   │   ├── ai
│   │   │   ├── config.ts
│   │   │   ├── faultDetection.ts
│   │   │   ├── gemini.ts
│   │   │   └── SparePartsService.ts
│   │   ├── polyfills
│   │   │   ├── http.ts
│   │   │   ├── https.ts
│   │   │   ├── stream.ts
│   │   │   ├── url.ts
│   │   │   └── zlib.ts
│   │   ├── reports
│   │   │   ├── costCalculator.ts
│   │   │   ├── generateReport.ts
│   │   │   ├── pdfTemplate.ts
│   │   │   └── pricing.ts
│   │   ├── adminTicketApi.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── comparisonStorage.ts
│   │   ├── errorBoundaryPerformance.ts
│   │   ├── i18n.ts
│   │   ├── performance.ts
│   │   ├── polyfills.ts
│   │   ├── reviewsApi.ts
│   │   ├── serviceWorkerRegistration.ts
│   │   ├── smsService.ts
│   │   ├── supabase.ts
│   │   ├── ticketApi.ts
│   │   ├── utils.ts
│   │   └── yilmazScraper.ts
│   ├── pages
│   │   ├── machines
│   │   │   └── MachineDetail.tsx
│   │   ├── profiles
│   │   │   └── ProfileDetail.tsx
│   │   ├── Services
│   │   ├── workflows
│   │   │   └── WorkflowDetail.tsx
│   │   ├── About.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AIFeatures.tsx
│   │   ├── Contact.tsx
│   │   ├── CustomerPortal.tsx
│   │   ├── CustomerSupport.tsx
│   │   ├── FabricationServices.tsx
│   │   ├── FabricationWorkflowDetail.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── ModelViewerDemo.tsx
│   │   ├── ModelViewerTest.tsx
│   │   ├── NotFound.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Products.tsx
│   │   ├── QuoteConfirmationPage.tsx
│   │   ├── QuotePage.tsx
│   │   ├── QuoteRequestPage.tsx
│   │   ├── Register.tsx
│   │   ├── SellUsedMachine.tsx
│   │   ├── Services.test.tsx
│   │   ├── Services.tsx
│   │   ├── Shop-enhanced.tsx
│   │   ├── Shop.tsx
│   │   ├── SpareParts.tsx
│   │   ├── UsedMachineDetail.tsx
│   │   └── UsedMachines.tsx
│   ├── shared
│   │   └── ui
│   │       ├── ui
│   │       ├── CircuitDivider.tsx
│   │       ├── GlowFilter.tsx
│   │       ├── Hexagon.tsx
│   │       └── NeonButton.tsx
│   ├── stories
│   │   ├── assets
│   │   │   ├── accessibility.png
│   │   │   ├── accessibility.svg
│   │   │   ├── addon-library.png
│   │   │   ├── assets.png
│   │   │   ├── avif-test-image.avif
│   │   │   ├── context.png
│   │   │   ├── discord.svg
│   │   │   ├── docs.png
│   │   │   ├── figma-plugin.png
│   │   │   ├── github.svg
│   │   │   ├── share.png
│   │   │   ├── styling.png
│   │   │   ├── testing.png
│   │   │   ├── theming.png
│   │   │   ├── tutorials.svg
│   │   │   └── youtube.svg
│   │   ├── button.css
│   │   ├── Button.stories.ts
│   │   ├── Button.tsx
│   │   ├── Configure.mdx
│   │   ├── header.css
│   │   ├── Header.stories.ts
│   │   ├── Header.tsx
│   │   ├── page.css
│   │   ├── Page.stories.ts
│   │   └── Page.tsx
│   ├── types
│   │   ├── certification.ts
│   │   ├── database.ts
│   │   ├── gtag.d.ts
│   │   ├── i18n.ts
│   │   ├── maintenance.d.ts
│   │   ├── product.ts
│   │   ├── shop.ts
│   │   ├── tickets.ts
│   │   ├── unique-product.ts
│   │   └── vercelErrors.ts
│   ├── App.css
│   ├── App.tsx # Root React application component
│   ├── index.css
│   ├── logo.svg
│   ├── main.tsx # Application entry point and React DOM rendering
│   └── setupTests.ts
├── srcassetsimages
├── tabby_x86_64-windows-msvc
│   ├── llama-server.exe
│   └── tabby.exe
├── .blackboxrules # Project-specific AI assistant rules and guidelines
├── .gitignore # Git ignore patterns for version control
├── .vercelignore # Vercel deployment ignore patterns
├── CODE_PRINCIPLES_EVALUATION.md # Code quality evaluation and standards
├── components.json # shadcn/ui component configuration
├── database-schema.sql # Complete e-commerce database schema
├── DEVELOPMENT_GUIDE.md # Development guidelines and best practices
├── eslint.config.js # ESLint linting configuration
├── index.html # Main HTML template for the React application
├── MCP_SETUP.md # Model Context Protocol setup instructions
├── package.json # Node.js dependencies and scripts
├── postcss.config.js # PostCSS processing configuration
├── README.md # Main project documentation and setup guide
├── SECURITY_IMPROVEMENTS_SUMMARY.md # Security enhancements and fixes
├── service-ticketing-system-secure.sql # Secure service ticketing system schema
├── service-ticketing-system.sql
├── sql-validation-report.md
├── tailwind.config.ts # Tailwind CSS framework configuration
├── test-service-ticketing.sql
├── tsconfig.app.json
├── tsconfig.json # TypeScript compiler configuration
├── tsconfig.node.json
├── vercel.json # Vercel deployment configuration
├── vite.config.ts # Vite build tool configuration
├── vitest.config.ts # Vitest testing framework configuration
└── vitest.shims.d.ts

```

## 🔄 Regenerating This File

To update this structure documentation, run:

```bash
npm run gen:structure
```

Or directly:

```bash
node docs/generate-structure.js
```

## 📝 Key Directory Descriptions

### **Frontend (src/)**
- **components/**: Reusable React UI components organized by feature
- **pages/**: Route components for different application pages
- **hooks/**: Custom React hooks for shared functionality
- **lib/**: Utility libraries and service integrations
- **context/**: React context providers for global state
- **types/**: TypeScript type definitions and interfaces

### **Backend (python_backend/)**
- **apis/**: FastAPI route handlers with versioned endpoints
- **ai_services/**: Machine learning and AI-powered features
- **core/**: Core application logic and configurations
- **models/**: Pydantic data models for API validation
- **tests/**: Comprehensive testing suite with multiple test types

### **Configuration**
- **Root level**: Build tools, linting, and deployment configuration
- **Database**: SQL schemas for e-commerce and service management
- **Internationalization**: Translation files for Arabic and English

## 🛠️ Development Notes

- The structure follows feature-based organization for better maintainability
- Components are grouped by business functionality (shop, services, support)
- Backend uses clean architecture with separated concerns
- Testing is comprehensive with unit, integration, and E2E tests
- Documentation is maintained alongside code for better developer experience

---

*This file is automatically generated. Do not edit manually.*
