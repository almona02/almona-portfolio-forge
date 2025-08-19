# Project Structure

```
├── .blackboxrules
├── .env
├── .env.example
├── .github
│   └── workflows
│       └── ci.yml
├── .gitignore
├── .kilocode
│   └── mcp.json
├── .storybook
│   ├── main.ts
│   ├── preview.ts
│   └── vitest.setup.ts
├── .tabby
│   └── config.toml
├── .vercel
│   ├── project.json
│   └── README.txt
├── .vercelignore
├── .vscode
│   ├── extensions.json
│   ├── keybindings.json
│   ├── launch.json
│   ├── README.md
│   ├── settings.json
│   ├── snippets
│   │   ├── typescript.json
│   │   └── typescriptreact.json
│   └── tasks.json
├── CODE_PRINCIPLES_EVALUATION.md
├── components.json
├── DEVELOPMENT_GUIDE.md
├── dist
│   ├── assets
│   │   └── index-C-f3u-fY.js
│   ├── css
│   │   └── index-BC2Mipc2.css
│   ├── documents
│   │   └── specs
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── DK-502.pdf
│   │       └── KM-212.pdf
│   ├── favicon.ico
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
│   ├── index.html
│   ├── js
│   │   ├── About-CMSvcPpF.js
│   │   ├── alert-BrC4Xie7.js
│   │   ├── api-B_KoaTvy.js
│   │   ├── badge-wJFZ3vfH.js
│   │   ├── button-CgDQ2aIe.js
│   │   ├── card-C1X63v75.js
│   │   ├── Contact-B734dAFy.js
│   │   ├── CustomerPortal-BNhHRy57.js
│   │   ├── CustomerPortal-CyZEoDkP.js
│   │   ├── dialog-CGKF6Vn3.js
│   │   ├── EnhancedGLBViewer-DNVe6_Qc.js
│   │   ├── FabricationWorkflowDetail-CybTrv5s.js
│   │   ├── Footer-BTa_nj6T.js
│   │   ├── index-7EoCp0Pw.js
│   │   ├── Index-BabmbQph.js
│   │   ├── index-BgIt7OOo.js
│   │   ├── index-BWhDEG_i.js
│   │   ├── index-CpyTNQHI.js
│   │   ├── index-DCGUsFDU.js
│   │   ├── index.esm-CcjWKoAR.js
│   │   ├── input-2t7GqK60.js
│   │   ├── input-Aws9Tljy.js
│   │   ├── label-CNdMPcVI.js
│   │   ├── label-CoDoGYQS.js
│   │   ├── Login-B4vRv33-.js
│   │   ├── MachineDetail-DmNPdo26.js
│   │   ├── MachineRegistration-CW57wn45.js
│   │   ├── MaintenanceDashboard-C0GHfYE3.js
│   │   ├── Model3DDialog-B2oYtNJX.js
│   │   ├── ModelViewerDemo-Dsn0IPRh.js
│   │   ├── ModelViewerTest-A0Cwjiyc.js
│   │   ├── neon-button-DdcYzzqb.js
│   │   ├── NotFound-lkKJ_Mq6.js
│   │   ├── Portfolio-DsbehIdf.js
│   │   ├── ProductCard-DF5_ySON.js
│   │   ├── Products-Cc_fTYzs.js
│   │   ├── productsData-BzYpB75u.js
│   │   ├── ProfileDetail-CyrlDFvj.js
│   │   ├── progress-iZfLhLBp.js
│   │   ├── ProtectedRoute-YbMMv5I4.js
│   │   ├── proxy-ezEZdRL5.js
│   │   ├── QuoteConfirmationPage-BO0VkJHb.js
│   │   ├── QuotePage-C-hpeKUC.js
│   │   ├── react-vendor-DxtCPKSl.js
│   │   ├── Register-BWAY1LO2.js
│   │   ├── resolve-elements-juiWZL7b.js
│   │   ├── reviewsApi-BPSfy7-g.js
│   │   ├── select-D67cBFwM.js
│   │   ├── SellUsedMachine-CKFo2g64.js
│   │   ├── separator-Cp1sOUXM.js
│   │   ├── Services-KJLclekx.js
│   │   ├── Shop-enhanced-Cz_dGnXF.js
│   │   ├── slider-BgZYDAgz.js
│   │   ├── table-CltWO_jO.js
│   │   ├── tabs-6Ce311t9.js
│   │   ├── tabs-B-pgHmm-.js
│   │   ├── textarea-DynjFwqt.js
│   │   ├── three-vendor-BCrm2bao.js
│   │   ├── ui-vendor-jySz9Bz6.js
│   │   ├── UsedMachines-BtMU19A0.js
│   │   ├── useRecentlyViewed-DLOKeCra.js
│   │   ├── useTranslation-BvP4dzzc.js
│   │   ├── WorkflowDetail-BzNlcAkd.js
│   │   ├── yilmazMachines-D_be-R9I.js
│   │   ├── zod-BWORdfEk.js
│   │   └── __vite-browser-external-IEDOrHhg.js
│   ├── locales
│   │   ├── ar
│   │   │   └── products.json
│   │   └── en
│   │       └── products.json
│   ├── logo.png
│   ├── models
│   │   ├── AR-Code-Object-Capture-app-1752786892 (1).glb
│   │   ├── fault-model.json
│   │   └── group1-shard1of1.bin
│   ├── placeholder.svg
│   ├── robots.txt
│   ├── service-worker.js
│   └── stats.json
├── docs
│   ├── generate-structure.js
│   └── README.md
├── eslint.config.js
├── index.html
├── locales
│   ├── ar
│   │   └── services.json
│   └── en
│       ├── products.json
│       └── services.json
├── MCP_SETUP.md
├── package.json
├── postcss.config.js
├── project_structure.txt
├── public
│   ├── documents
│   │   └── specs
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── DK-502.pdf
│   │       └── KM-212.pdf
│   ├── favicon.ico
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
│   ├── locales
│   │   ├── ar
│   │   │   └── products.json
│   │   └── en
│   │       └── products.json
│   ├── logo.png
│   ├── logo.svg
│   ├── models
│   │   ├── AR-Code-Object-Capture-app-1752786892 (1).glb
│   │   ├── fault-model.json
│   │   └── group1-shard1of1.bin
│   ├── placeholder.svg
│   ├── robots.txt
│   └── service-worker.js
├── publicimagesmachines
├── publicimagesprofiles
├── python_backend
│   ├── .dockerignore
│   ├── .env.example
│   ├── ai_services
│   │   ├── part_detection
│   │   │   ├── inference.py
│   │   │   ├── models
│   │   │   │   └── model.pt
│   │   │   ├── tasks.py
│   │   │   ├── v1
│   │   │   │   ├── inference.py
│   │   │   │   ├── model.py
│   │   │   │   ├── utils.py
│   │   │   │   └── __init__.py
│   │   │   ├── v2
│   │   │   │   ├── inference.py
│   │   │   │   ├── model.py
│   │   │   │   ├── utils.py
│   │   │   │   └── __init__.py
│   │   │   └── __pycache__
│   │   │       └── inference.cpython-311.pyc
│   │   └── preprocessing
│   │       └── image_processor.py
│   ├── apis
│   │   ├── auth_routes_fixed.py
│   │   ├── main.py
│   │   ├── v1
│   │   │   ├── part_detection.py
│   │   │   └── __init__.py
│   │   └── v2
│   │       ├── auth.py
│   │       ├── auth_fastapi.py
│   │       ├── part_detection.py
│   │       ├── part_detection_fastapi.py
│   │       └── __init__.py
│   ├── core
│   │   ├── celery_app.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── docker-compose.gpu.yml
│   ├── docker-compose.mlflow.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Dockerfile.gpu
│   ├── Dockerfile.optimized
│   ├── models
│   │   ├── api_v1_models.py
│   │   ├── api_v2_models.py
│   │   └── auth_models.py
│   ├── monitoring
│   │   └── dashboard.json
│   ├── requirements-enhanced.txt
│   ├── requirements.txt
│   ├── scripts
│   │   └── register_models.py
│   ├── TESTING_GUIDE.md
│   ├── tests
│   │   ├── benchmark.py
│   │   ├── cli_test.py
│   │   ├── conftest.py
│   │   ├── fixtures
│   │   ├── load_test.py
│   │   ├── run_tests.py
│   │   ├── security_test_fixed.py
│   │   ├── test_api.py
│   │   ├── test_api_v2.py
│   │   ├── test_chaos.py
│   │   ├── test_contracts.py
│   │   ├── test_data
│   │   └── test_part_detection_v1.py
│   └── uploads
├── README.md
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   ├── almona-new-logo.svg
│   │   └── images
│   ├── components
│   │   ├── 3d-model
│   │   │   ├── EnhancedGLBViewer.tsx
│   │   │   ├── GLBViewer.tsx
│   │   │   ├── index.ts
│   │   │   ├── Machine3DButton.tsx
│   │   │   ├── Model3DDialog.tsx
│   │   │   ├── ModelTest.tsx
│   │   │   ├── Products3DWrapper.tsx
│   │   │   └── README.md
│   │   ├── about
│   │   │   ├── CompanyTimeline.test.tsx
│   │   │   ├── CompanyTimeline.tsx
│   │   │   ├── CompanyValues.tsx
│   │   │   ├── CustomerTestimonials.tsx
│   │   │   ├── TeamProfiles.tsx
│   │   │   ├── timelineData.ts
│   │   │   └── WorkflowDiagram.tsx
│   │   ├── auth
│   │   │   ├── CountryCodeSelect.js
│   │   │   ├── CountryCodeSelect.tsx
│   │   │   ├── FacebookLoginButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── SmsOtpModal.tsx
│   │   ├── comparison
│   │   │   ├── CompareBar.tsx
│   │   │   ├── CompareDialog.tsx
│   │   │   ├── CompareTable.tsx
│   │   │   ├── EfficiencyCalculator.tsx
│   │   │   └── LocalStandardsTable.tsx
│   │   ├── contact
│   │   │   ├── AuthForm.tsx
│   │   │   ├── IntelligentForm.tsx
│   │   │   ├── LiveAssistance.tsx
│   │   │   └── SupportPortal.tsx
│   │   ├── ErrorBoundary.tsx
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
│   │   ├── quotes
│   │   │   ├── QuoteAIHelper.tsx
│   │   │   ├── QuoteCalculator.tsx
│   │   │   ├── QuoteConfirmationPage.tsx
│   │   │   ├── QuoteRequestDialog.tsx
│   │   │   ├── QuoteRequestPage.tsx
│   │   │   ├── QuoteRequestStepper.tsx
│   │   │   ├── QuoteSummary.tsx
│   │   │   └── README.md
│   │   ├── SEO.tsx
│   │   ├── services
│   │   │   ├── CustomerPortal.tsx
│   │   │   ├── EgyptianIndustrialZones.tsx
│   │   │   ├── EgyptianTechnicalSupport.tsx
│   │   │   ├── EmergencyServiceDialog.tsx
│   │   │   ├── EnhancedOperatorTrainingDialog.tsx
│   │   │   ├── FabricationStageCard.tsx
│   │   │   ├── MachineHealthCheck.tsx
│   │   │   ├── MachineRegistration.tsx
│   │   │   ├── MaintenanceDashboard.tsx
│   │   │   ├── MyMachines.tsx
│   │   │   ├── NileLogisticsService.tsx
│   │   │   ├── OperatorTrainingIncentiveDialog.tsx
│   │   │   ├── OperatorTrainingSection.tsx
│   │   │   ├── PreventiveMaintenanceDialog.tsx
│   │   │   ├── ScheduleMaintenance.tsx
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── Services.module.css
│   │   │   ├── ServicesGrid.tsx
│   │   │   └── TrainingLevelCard.tsx
│   │   ├── shop
│   │   │   ├── 3d-configurator
│   │   │   │   ├── ARViewer.tsx
│   │   │   │   └── ModelLoader.tsx
│   │   │   ├── ai-advisor
│   │   │   │   ├── AiEquipmentAdvisor.test.tsx
│   │   │   │   ├── AiEquipmentAdvisor.tsx
│   │   │   │   └── README.md
│   │   │   ├── ar
│   │   │   │   ├── machinePresets.ts
│   │   │   │   └── WorkspaceChecker.tsx
│   │   │   ├── DurabilityDetailsModal.tsx
│   │   │   ├── EgyptianSpecBadges.tsx
│   │   │   ├── EgyptianStandardsGuide.tsx
│   │   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   │   ├── EgyptPowerFilter.tsx
│   │   │   ├── EgyptProcurementWorkflow.tsx
│   │   │   ├── EquipmentComparisonTool.tsx
│   │   │   ├── fabrication-report
│   │   │   │   └── FabricationReportGenerator.tsx
│   │   │   ├── FreightCalculator.tsx
│   │   │   ├── IndustrialProductCard.tsx
│   │   │   ├── machine-recommendation
│   │   │   │   └── MachineRecommendationWizard.tsx
│   │   │   ├── NileFreightCalculator.tsx
│   │   │   ├── PriceRangeSlider.tsx
│   │   │   ├── ProductQuickView.tsx
│   │   │   ├── RecentlyViewedProducts.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ReviewList.tsx
│   │   ├── ui
│   │   │   ├── alert.tsx
│   │   │   ├── ar-button.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── icons.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── LazyImage.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── tooltip.tsx
│   │   └── used-machines
│   │       ├── ContactVerification.tsx
│   │       ├── FileUploader.tsx
│   │       ├── MachineSpecsForm.tsx
│   │       ├── SellUsedMachineForm.tsx
│   │       ├── UsedMachineCard.tsx
│   │       ├── UsedMachineDetails.tsx
│   │       └── UsedMachineFilters.tsx
│   ├── constants
│   │   ├── portfolioData.ts
│   │   ├── productsData.ts
│   │   ├── uniqueProductsData.ts
│   │   ├── yilmazMachines-corrected.ts
│   │   ├── yilmazMachines-fixed.ts
│   │   └── yilmazMachines.ts
│   ├── context
│   │   ├── AuthContext.tsx
│   │   └── QuoteContext.tsx
│   ├── data
│   │   ├── inventory.ts
│   │   └── usedMachines.ts
│   ├── features
│   │   └── shop
│   │       └── configurator
│   │           └── components
│   │               ├── ARViewer.tsx
│   │               ├── ModelLoader.tsx
│   │               └── ProductConfigurator.tsx
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── usePythonAPI.ts
│   │   ├── useRecentlyViewed.ts
│   │   ├── useToast.ts
│   │   ├── useTranslation.ts
│   │   └── __tests__
│   │       └── usePythonAPI.test.ts
│   ├── index.css
│   ├── lib
│   │   ├── ai
│   │   │   ├── config.ts
│   │   │   ├── faultDetection.ts
│   │   │   ├── gemini.ts
│   │   │   └── SparePartsService.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── comparisonStorage.ts
│   │   ├── i18n.ts
│   │   ├── performance.ts
│   │   ├── reports
│   │   │   ├── costCalculator.ts
│   │   │   ├── generateReport.ts
│   │   │   ├── pdfTemplate.ts
│   │   │   └── pricing.ts
│   │   ├── reviewsApi.ts
│   │   ├── serviceWorkerRegistration.ts
│   │   ├── smsService.ts
│   │   ├── supabase.js
│   │   ├── utils.ts
│   │   └── yilmazScraper.ts
│   ├── logo.svg
│   ├── main.tsx
│   ├── pages
│   │   ├── About.tsx
│   │   ├── AIFeatures.tsx
│   │   ├── Contact.tsx
│   │   ├── CustomerPortal.tsx
│   │   ├── FabricationWorkflowDetail.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── machines
│   │   │   └── MachineDetail.tsx
│   │   ├── ModelViewerDemo.tsx
│   │   ├── ModelViewerTest.tsx
│   │   ├── NotFound.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Products.tsx
│   │   ├── profiles
│   │   │   └── ProfileDetail.tsx
│   │   ├── QuoteConfirmationPage.tsx
│   │   ├── QuotePage.tsx
│   │   ├── QuoteRequestPage.tsx
│   │   ├── Register.tsx
│   │   ├── SellUsedMachine.tsx
│   │   ├── Services
│   │   ├── Services.test.tsx
│   │   ├── Services.tsx
│   │   ├── Shop-enhanced.tsx
│   │   ├── Shop.tsx
│   │   ├── UsedMachineDetail.tsx
│   │   ├── UsedMachines.tsx
│   │   └── workflows
│   │       └── WorkflowDetail.tsx
│   ├── setupTests.ts
│   ├── shared
│   │   └── ui
│   │       ├── CircuitDivider.tsx
│   │       ├── GlowFilter.tsx
│   │       ├── Hexagon.tsx
│   │       ├── NeonButton.tsx
│   │       └── ui
│   │           ├── accordion.tsx
│   │           ├── alert-dialog.tsx
│   │           ├── alert.tsx
│   │           ├── ar-button.tsx
│   │           ├── aspect-ratio.tsx
│   │           ├── avatar.tsx
│   │           ├── badge.tsx
│   │           ├── badgeVariants.ts
│   │           ├── breadcrumb.tsx
│   │           ├── button.tsx
│   │           ├── buttonVariants.ts
│   │           ├── calendar.tsx
│   │           ├── card.tsx
│   │           ├── carousel.tsx
│   │           ├── chart.tsx
│   │           ├── checkbox.tsx
│   │           ├── collapsible.tsx
│   │           ├── command.tsx
│   │           ├── context-menu.tsx
│   │           ├── dialog.tsx
│   │           ├── drawer.tsx
│   │           ├── dropdown-menu.tsx
│   │           ├── form.ts
│   │           ├── form.tsx
│   │           ├── formContext.ts
│   │           ├── GlowFilter.tsx
│   │           ├── hover-card.tsx
│   │           ├── icons.tsx
│   │           ├── input-otp.tsx
│   │           ├── input.tsx
│   │           ├── label.tsx
│   │           ├── menubar.tsx
│   │           ├── MultiSelect.tsx
│   │           ├── navigation-menu-style.ts
│   │           ├── navigation-menu.tsx
│   │           ├── neon-button.tsx
│   │           ├── pagination.tsx
│   │           ├── popover.tsx
│   │           ├── ProductCard.tsx
│   │           ├── progress.tsx
│   │           ├── ProjectCard.tsx
│   │           ├── radio-group.tsx
│   │           ├── resizable.tsx
│   │           ├── ResponsiveImage.tsx
│   │           ├── scroll-area.tsx
│   │           ├── select.tsx
│   │           ├── separator.tsx
│   │           ├── sheet.tsx
│   │           ├── sidebar.ts
│   │           ├── sidebar.tsx
│   │           ├── skeleton.tsx
│   │           ├── slider.tsx
│   │           ├── sonner.ts
│   │           ├── sonner.tsx
│   │           ├── switch.tsx
│   │           ├── table.tsx
│   │           ├── tabs.tsx
│   │           ├── textarea.tsx
│   │           ├── toast.tsx
│   │           ├── toaster.tsx
│   │           ├── toggle-group.tsx
│   │           ├── toggle.tsx
│   │           ├── toggleVariants.ts
│   │           ├── tooltip.tsx
│   │           └── use-toast.ts
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
│   │   ├── gtag.d.ts
│   │   ├── i18n.ts
│   │   ├── machine.ts
│   │   ├── maintenance.d.ts
│   │   ├── product.ts
│   │   ├── shop.ts
│   │   ├── unique-product.ts
│   │   └── vercelErrors.ts
│   └── vite-env.d.ts
├── srcassetsimages
├── tabby_x86_64-windows-msvc
│   ├── llama-server.exe
│   └── tabby.exe
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── vitest.shims.d.ts
└── yarn.lock

```