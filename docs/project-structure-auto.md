# Almona Portfolio Forge - Project Structure

*Auto-generated on 2025-09-20*

This document provides a comprehensive overview of the project file structure with descriptions for key files and directories.

## 📁 Complete Project Structure

```
├── -p
├── .github
│   └── workflows
│       ├── ci.yml
│       ├── full-pipeline.yml
│       └── vercel-deploy.yml
├── .kilocode
│   └── mcp.json
├── .qodo
├── .storybook
│   ├── main.ts
│   ├── preview.ts
│   └── vitest.setup.ts
├── .tabby
│   └── config.toml
├── docs # Project documentation and guides
│   ├── generate-structure.js
│   ├── migrations_index.md
│   ├── project-structure-auto.md
│   ├── project-structure.md
│   ├── README.md # Main project documentation and setup guide
│   └── ticket-category-mapping.md
├── locales # Internationalization translation files
│   ├── ar
│   │   ├── services.json
│   │   └── translation.json
│   ├── en
│   │   ├── products.json
│   │   ├── services.json
│   │   ├── shop.json
│   │   └── translation.json
│   └── tr
│       └── services.json
├── migrations
│   ├── 001_initial_schema.sql
│   └── 002_supabase_nano_schema.sql
├── public # Static assets and files served directly
│   ├── documents
│   │   └── specs
│   │       ├── ACK-420-S.pdf
│   │       ├── CA-601.pdf
│   │       ├── CA-603.pdf
│   │       ├── CCL-1661.pdf
│   │       ├── CDC-600.pdf
│   │       ├── CK-412.pdf
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── CRM-250-S.pdf
│   │       ├── DC-421-MS.pdf
│   │       ├── DC-421-PBS.pdf
│   │       ├── DC-421-PSD.pdf
│   │       ├── DC-550-PB.pdf
│   │       ├── DC-550-SK.pdf
│   │       ├── DK-502.pdf
│   │       ├── FR-221-S.pdf
│   │       ├── FR-222.pdf
│   │       ├── FR-225-S.pdf
│   │       ├── FR-226-S.pdf
│   │       ├── KD-305.pdf
│   │       ├── KD-400-M.pdf
│   │       ├── KD-400.pdf
│   │       ├── KD-402-S.pdf
│   │       ├── KM-212.pdf
│   │       ├── KM-215S.pdf
│   │       ├── MK-450.pdf
│   │       ├── NCR-300.pdf
│   │       ├── PIM-6509.pdf
│   │       ├── SDT-275.pdf
│   │       ├── ST-264.pdf
│   │       ├── TK-503.pdf
│   │       └── TK-505.pdf
│   ├── images
│   │   ├── machines
│   │   │   ├── ACK-420-S.jpg
│   │   │   ├── ack-420-s.png
│   │   │   ├── adrenaline issue.png
│   │   │   ├── almona service page 01.jpg
│   │   │   ├── CA-601.jpg
│   │   │   ├── CCL-1661.jpg
│   │   │   ├── CDC-600.jpg
│   │   │   ├── CK-412.jpg
│   │   │   ├── CRM-250-S.jpg
│   │   │   ├── cutting-machine.jpg
│   │   │   ├── DC 421 MS.png
│   │   │   ├── DC 421 PBS.png
│   │   │   ├── DC 421 PSD.png
│   │   │   ├── DC 550 PB.png
│   │   │   ├── DC 550 SK SKH.png
│   │   │   ├── DC-421-PBS.jpg
│   │   │   ├── DC-421-PSD.jpg
│   │   │   ├── DK-502.jpg
│   │   │   ├── FR-221-S.jpg
│   │   │   ├── FR-221S.jpg
│   │   │   ├── FR-222.jpg
│   │   │   ├── FR-223.jpg
│   │   │   ├── FR-226-S.jpg
│   │   │   ├── KD 305 KY.png
│   │   │   ├── KD 400D.jpg
│   │   │   ├── KD 400M.jpg
│   │   │   ├── KD-305.jpg
│   │   │   ├── KD-402-S.jpg
│   │   │   ├── KM-212.jpg
│   │   │   ├── KM-215-S.jpg
│   │   │   ├── KM-215.png
│   │   │   ├── machine-accessories.jpg
│   │   │   ├── MK-450.jpg
│   │   │   ├── NCR-300.jpg
│   │   │   ├── PIM-6509.jpg
│   │   │   ├── processing-center.jpg
│   │   │   ├── SDT-275.jpg
│   │   │   ├── ST-264-22.jpg
│   │   │   ├── ST-264.jpg
│   │   │   ├── ST-264.png
│   │   │   ├── ST-2643.png
│   │   │   ├── TK-503.jpg
│   │   │   ├── TK-505.jpg
│   │   │   ├── TK-505.png
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
│   │   ├── group1-shard1of1.bin
│   │   └── model.usdz
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
│   │   ├── preprocessing
│   │   │   └── image_processor.py
│   │   ├── tests # Comprehensive testing suite
│   │   │   └── test_predictive_maintenance.py
│   │   └── predictive_maintenance.py
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
│   │   │   ├── part_detection.py
│   │   │   ├── quotes.py
│   │   │   ├── tickets.py
│   │   │   └── yilmaz_integration.py
│   │   ├── __init__.py
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
│   │   ├── migrate_tickets.py
│   │   └── register_models.py
│   ├── services # Service management and customer portal
│   │   └── unified_ticket_service.py
│   ├── temp_tests
│   │   └── test_yilmaz_integration_minimal.py
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
│   │   ├── test_part_detection_v1.py
│   │   └── test_yilmaz_integration.py
│   ├── .dockerignore
│   ├── dependencies.py
│   ├── docker-compose.gpu.yml
│   ├── docker-compose.mlflow.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Dockerfile.gpu
│   ├── Dockerfile.optimized
│   ├── Dockerfile.prod
│   ├── EMAIL_NOTIFICATION_SERVICE.md
│   ├── requirements-dev.txt
│   ├── requirements-enhanced.txt
│   ├── requirements-runtime.txt
│   ├── requirements-simple.txt
│   ├── requirements.txt
│   └── TESTING_GUIDE.md
├── scripts # Build and utility scripts
│   ├── i18n-audit.js
│   ├── importData.ts
│   ├── migrate.ts
│   ├── optimize-glb.mjs
│   └── optimize-gltf.ts
├── src # React application source code
│   ├── __tests__
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
│   │   │   ├── README.md # Main project documentation and setup guide
│   │   │   └── UniversalARViewer.tsx
│   │   ├── about # Company information and team components
│   │   │   ├── CompanyTimeline.test.tsx
│   │   │   ├── CompanyTimeline.tsx
│   │   │   ├── CompanyValues.tsx
│   │   │   ├── CustomerTestimonials.tsx
│   │   │   ├── TeamProfiles.tsx
│   │   │   ├── timelineData.ts
│   │   │   └── WorkflowDiagram.tsx
│   │   ├── admin
│   │   │   ├── panels
│   │   │   ├── CustomerActivity.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── RecentOrders.tsx
│   │   │   ├── SalesChart.tsx
│   │   │   ├── SparePartsImportPanel.tsx
│   │   │   └── TopProducts.tsx
│   │   ├── auth # Authentication and user management
│   │   │   ├── CountryCodeSelect.tsx
│   │   │   ├── FacebookLoginButton.tsx
│   │   │   ├── password-styles.css
│   │   │   ├── PasswordInput.jsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SignupForm.jsx
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
│   │   │   ├── QuoteTwinSearchPanel.tsx
│   │   │   └── README.md # Main project documentation and setup guide
│   │   ├── services # Service management and customer portal
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
│   │   │   ├── TrainingLevelCard.tsx
│   │   │   └── YilmazMachineRegistration.tsx
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
│   │   │   ├── IndustrialProductConfigurator.tsx
│   │   │   ├── NileFreightCalculator.tsx
│   │   │   ├── PriceRangeSlider.tsx
│   │   │   ├── ProductConfigurator.tsx
│   │   │   ├── ProductQuickView.tsx
│   │   │   ├── RecentlyViewedProducts.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ReviewList.tsx
│   │   ├── support # Customer support and ticketing
│   │   │   ├── AdminTicketDashboard.tsx
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TicketDetailView.tsx
│   │   │   ├── TicketForm.tsx
│   │   │   ├── TicketMetrics.tsx
│   │   │   ├── TicketSourceAnalytics.tsx
│   │   │   ├── TicketStatusBadge.tsx
│   │   │   └── TicketTableRow.tsx
│   │   ├── training
│   │   │   └── EnrollmentModal.tsx
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
│   │   ├── NotFound3DComponents.tsx
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
│   │   ├── index.ts
│   │   ├── inventory.ts
│   │   ├── trainingPrograms.ts
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
│   │   ├── useQuoteLookup.ts
│   │   ├── useRecentlyViewed.ts
│   │   ├── useReducedMotionPref.ts
│   │   ├── useScrollThreshold.ts
│   │   ├── useToast.ts
│   │   └── useTranslation.ts
│   ├── lib
│   │   ├── ai
│   │   │   ├── config.ts
│   │   │   ├── faultDetection.ts
│   │   │   ├── gemini.ts
│   │   │   └── SparePartsService.ts
│   │   ├── analytics
│   │   │   └── index.ts
│   │   ├── api
│   │   │   └── ticketsV2.ts
│   │   ├── clients
│   │   │   ├── categories.ts
│   │   │   ├── index.ts
│   │   │   ├── products.ts
│   │   │   ├── profiles.ts
│   │   │   └── warranties.ts
│   │   ├── data
│   │   │   ├── activityClient.ts
│   │   │   ├── clientCore.ts
│   │   │   ├── notificationsClient.ts
│   │   │   ├── ordersClient.ts
│   │   │   ├── profilesClient.ts
│   │   │   ├── quotesClient.ts
│   │   │   ├── reviewsClient.ts
│   │   │   ├── uploadClient.ts
│   │   │   ├── warrantyClient.ts
│   │   │   └── wishlistClient.ts
│   │   ├── password-validation
│   │   │   ├── advanced-password-validation.js
│   │   │   ├── common-passwords.js
│   │   │   ├── password-policy.js
│   │   │   └── password-validation.js
│   │   ├── permissions
│   │   │   ├── tickets.test.ts
│   │   │   └── tickets.ts
│   │   ├── polyfills
│   │   │   ├── http.ts
│   │   │   ├── https.ts
│   │   │   ├── stream.ts
│   │   │   ├── url.ts
│   │   │   └── zlib.ts
│   │   ├── reports
│   │   │   ├── comparisonPdf.ts
│   │   │   ├── costCalculator.ts
│   │   │   ├── generateReport.ts
│   │   │   ├── pdfTemplate.ts
│   │   │   └── pricing.ts
│   │   ├── ticketing
│   │   │   └── unifiedTicketing.ts
│   │   ├── tickets
│   │   │   └── style.ts
│   │   ├── validation
│   │   │   └── ticket.ts
│   │   ├── adminTicketApi.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── comparisonStorage.ts
│   │   ├── errorBoundaryPerformance.ts
│   │   ├── i18n.ts
│   │   ├── performance.ts
│   │   ├── polyfills.ts
│   │   ├── pricing.test.ts
│   │   ├── pricing.ts
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
│   │   ├── CreateTicketPage.tsx
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
│   │   ├── RegisterMachinePage.tsx
│   │   ├── SellUsedMachine.tsx
│   │   ├── Services.test.tsx
│   │   ├── Services.tsx
│   │   ├── Shop-enhanced.tsx
│   │   ├── Shop.tsx
│   │   ├── SpareParts.tsx
│   │   ├── SupportNewTicketMenu.tsx
│   │   ├── UsedMachineDetail.tsx
│   │   └── UsedMachines.tsx
│   ├── routes
│   │   ├── AppRoutes.tsx
│   │   └── TrainingServicesPage.tsx
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
│   │   ├── api.ts
│   │   ├── certification.ts
│   │   ├── customer-portal.ts
│   │   ├── database.ts
│   │   ├── gtag.d.ts
│   │   ├── i18n.ts
│   │   ├── index.ts
│   │   ├── machine.ts
│   │   ├── maintenance.d.ts
│   │   ├── model-viewer.d.ts
│   │   ├── product.ts
│   │   ├── shop.ts
│   │   ├── tickets.ts
│   │   ├── unique-product.ts
│   │   └── vercelErrors.ts
│   ├── utils
│   │   └── excelImport.ts
│   ├── App.css
│   ├── App.tsx # Root React application component
│   ├── i18n.ts
│   ├── index.css
│   ├── logo.svg
│   ├── main.tsx # Application entry point and React DOM rendering
│   ├── setupTests.ts
│   └── trigger-deploy.js
├── srcassetsimages
├── tabby_x86_64-windows-msvc
│   ├── llama-server.exe
│   └── tabby.exe
├── types
│   └── pg.d.ts
├── .blackboxrules # Project-specific AI assistant rules and guidelines
├── .gitignore # Git ignore patterns for version control
├── .vercel-redeploy
├── .vercelignore # Vercel deployment ignore patterns
├── add_index_for_fkey.sql
├── add_indexes_for_fkeys.sql
├── add_machine_model_column.sql
├── add_quote_twin_linkage.sql
├── add_support_role_enum.sql
├── CODE_PRINCIPLES_EVALUATION.md # Code quality evaluation and standards
├── components.json # shadcn/ui component configuration
├── consolidate_rls_policies.sql
├── create_machines_table.sql
├── create_tickets_table.sql
├── DATABASE_FIXES_SUMMARY.md
├── database-schema.sql # Complete e-commerce database schema
├── deploy-trigger.js
├── DEVELOPMENT_GUIDE.md # Development guidelines and best practices
├── drop_unused_indexes.sql
├── eslint.config.js # ESLint linting configuration
├── execute_final_fixes_simple.cjs
├── execute_final_linting_fixes.js
├── execute_rls_fixes.js
├── fix_anonymous_access_policies.sql
├── fix_anonymous_access.sql
├── fix_column_names.js
├── fix_customers_view.sql
├── fix_database_performance_part1.sql
├── fix_database_performance_part2.sql
├── fix_database_performance_part3.sql
├── fix_final_linting_issues.sql
├── fix_materialized_view_exposure.sql
├── fix_mutable_functions.sql
├── fix_recursive_rls.sql
├── fix_remaining_issues_final.sql
├── fix_remaining_rls_issues_corrected.sql
├── fix_remaining_rls_issues_final.sql
├── fix_remaining_rls_issues_patch2.sql
├── fix_remaining_rls_issues.sql
├── fix_rls_performance.sql
├── fix_rls_policies.sql
├── fix_security_issues.sql
├── fix_service_ticket_rls.sql
├── index.html # Main HTML template for the React application
├── manage_unused_indexes.sql
├── MCP_SETUP.md # Model Context Protocol setup instructions
├── migrate_legacy_tickets.sql
├── package.json # Node.js dependencies and scripts
├── postcss.config.js # PostCSS processing configuration
├── README.md # Main project documentation and setup guide
├── schema_enhancements_indexes_non_concurrent.sql
├── schema_enhancements_proposed.sql
├── schema_performance_enhancements.sql
├── SECURITY_IMPROVEMENTS_SUMMARY.md # Security enhancements and fixes
├── seed_support_profile.sql
├── service_ticket_rls_full.sql
├── service-ticketing-system-secure.sql # Secure service ticketing system schema
├── service-ticketing-system.sql
├── sql-validation-report.md
├── tailwind.config.ts # Tailwind CSS framework configuration
├── test-service-ticketing.sql
├── trigger-deploy.txt
├── tsconfig.app.json
├── tsconfig.json # TypeScript compiler configuration
├── tsconfig.node.json
├── unified_ticketing_migration_yilmaz.sql
├── unified_ticketing_migration.sql
├── unify_tickets_migration.sql
├── vercel.json # Vercel deployment configuration
├── vite.config.js
├── vite.config.ts # Vite build tool configuration
├── vitest.config.ts # Vitest testing framework configuration
├── vitest.shims.d.ts
└── warranty_management.sql

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
