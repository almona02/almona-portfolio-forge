# Project Structure

```
├── .blackboxrules
├── .env
├── .env.example
├── .gitignore
├── .kilocode
│   └── mcp.json
├── bun.lockb
├── bundle-stats.html
├── components.json
├── cutting-machine.jpg
├── dist
│   ├── assets
│   │   ├── About-CZ1ME4EU.js
│   │   ├── ARViewer-D6TSR54h.js
│   │   ├── badge-CpAzPGdn.js
│   │   ├── button-DcG8XBCj.js
│   │   ├── Contact-TyuBD4P6.js
│   │   ├── EquipmentComparisonTool-C8JL6gBE.js
│   │   ├── FabricationWorkflowDetail-C1L4lmp4.js
│   │   ├── Footer-rDjaL3EA.js
│   │   ├── index-CsvUBfkn.js
│   │   ├── Index-CyocTQ4r.js
│   │   ├── index-z-wL19Ut.css
│   │   ├── input-CS_qXpR8.js
│   │   ├── MachineDetail-BpQ-277d.js
│   │   ├── NotFound-D7I4hG4B.js
│   │   ├── Portfolio-CRmaUsfN.js
│   │   ├── ProductCard-Bf6qsNV1.js
│   │   ├── Products-DsNw1VsF.js
│   │   ├── productsData-LdG5W47W.js
│   │   ├── ProfileDetail-CT3Xix3L.js
│   │   ├── progress-4-QCn-3B.js
│   │   ├── select-DDW2pMhd.js
│   │   ├── separator-DLnf0WKV.js
│   │   ├── Services-Cl0uZWBg.js
│   │   ├── Shop-D2SFZL6H.js
│   │   ├── table-YVQ9g2o8.js
│   │   ├── tabs-D72CCDn3.js
│   │   ├── UsedMachines-CNRKeAhS.js
│   │   ├── vendor-ai-QuL0289D.js
│   │   ├── vendor-ar-D7t66zgU.js
│   │   ├── vendor-other-DNEsCmsO.js
│   │   ├── vendor-react-CWPkF-8d.js
│   │   └── WorkflowDetail-CXQzz649.js
│   ├── documents
│   │   └── specs
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── DK-502.pdf
│   │       └── KM-212.pdf
│   ├── favicon.ico
│   ├── images
│   │   ├── machines
│   │   │   ├── cutting-machine.jpg
│   │   │   ├── DC-421-PBS.jpg
│   │   │   ├── DK-502.jpg
│   │   │   ├── FR-221-S.jpg
│   │   │   ├── KD-402-S.jpg
│   │   │   ├── KM-212.jpg
│   │   │   ├── machine-accessories.jpg
│   │   │   ├── processing-center.jpg
│   │   │   └── welding-machine.jpg
│   │   └── profiles
│   │       ├── door-system.jpg
│   │       ├── sliding-system.jpg
│   │       └── window-system.jpg
│   ├── index.html
│   ├── logo.png
│   ├── models
│   │   ├── fault-model.json
│   │   └── group1-shard1of1.bin
│   ├── placeholder.svg
│   ├── robots.txt
│   └── service-worker.js
├── docs
│   ├── generate-structure.js
│   └── project-structure.md
├── door-system.jpg
├── eslint.config.js
├── index.html
├── locales
│   ├── ar
│   │   └── services.json
│   └── en
│       └── services.json
├── machine-accessories.jpg
├── package-lock.json
├── package.json
├── postcss.config.js
├── processing-center.jpg
├── PROJECT_STRUCTURE.md
├── PROJECT_STRUCTURE_TREE.txt
├── public
│   ├── documents
│   │   └── specs
│   │       ├── cnc-cutting-machine.pdf
│   │       ├── DK-502.pdf
│   │       └── KM-212.pdf
│   ├── favicon.ico
│   ├── images
│   │   ├── machines
│   │   │   ├── cutting-machine.jpg
│   │   │   ├── DC-421-PBS.jpg
│   │   │   ├── DK-502.jpg
│   │   │   ├── FR-221-S.jpg
│   │   │   ├── KD-402-S.jpg
│   │   │   ├── KM-212.jpg
│   │   │   ├── machine-accessories.jpg
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
│   ├── models
│   │   ├── fault-model.json
│   │   └── group1-shard1of1.bin
│   ├── placeholder.svg
│   ├── robots.txt
│   └── service-worker.js
├── publicimagesmachines
├── publicimagesprofiles
├── README.md
├── sliding-system.jpg
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   └── images
│   ├── components
│   │   ├── about
│   │   │   ├── CompanyTimeline.test.tsx
│   │   │   ├── CompanyTimeline.tsx
│   │   │   └── WorkflowDiagram.tsx
│   │   ├── comparison
│   │   │   ├── CompareBar.tsx
│   │   │   ├── CompareDialog.tsx
│   │   │   ├── CompareTable.tsx
│   │   │   ├── EfficiencyCalculator.tsx
│   │   │   └── LocalStandardsTable.tsx
│   │   ├── contact
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
│   │   ├── SEO.tsx
│   │   ├── services
│   │   │   ├── CustomerPortal.tsx
│   │   │   ├── EgyptianIndustrialZones.tsx
│   │   │   ├── EgyptianTechnicalSupport.tsx
│   │   │   ├── MachineHealthCheck.tsx
│   │   │   ├── MachineRegistration.tsx
│   │   │   ├── MaintenanceDashboard.tsx
│   │   │   ├── NileLogisticsService.tsx
│   │   │   └── ServiceCard.tsx
│   │   ├── shop
│   │   │   ├── 3d-configurator
│   │   │   │   ├── ARViewer.tsx
│   │   │   │   ├── ModelLoader.tsx
│   │   │   │   └── ProductConfigurator.tsx
│   │   │   ├── ai-advisor
│   │   │   │   ├── AiEquipmentAdvisor.test.tsx
│   │   │   │   ├── AiEquipmentAdvisor.tsx
│   │   │   │   └── README.md
│   │   │   ├── ar
│   │   │   │   ├── machinePresets.ts
│   │   │   │   └── WorkspaceChecker.tsx
│   │   │   ├── EgyptianSpecBadges.tsx
│   │   │   ├── EgyptianStandardsGuide.tsx
│   │   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   │   ├── EgyptPowerFilter.tsx
│   │   │   ├── EgyptProcurementWorkflow.tsx
│   │   │   ├── EquipmentComparisonTool.tsx
│   │   │   ├── fabrication-report
│   │   │   │   └── FabricationReportGenerator.tsx
│   │   │   ├── IndustrialProductCard.tsx
│   │   │   └── NileFreightCalculator.tsx
│   │   ├── ui
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── ar-button.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── icons.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── ResponsiveImage.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── use-toast.ts
│   │   └── used-machines
│   │       ├── ContactVerification.tsx
│   │       ├── FileUploader.tsx
│   │       ├── MachineSpecsForm.tsx
│   │       ├── UsedMachineCard.tsx
│   │       ├── UsedMachineDetails.tsx
│   │       └── UsedMachineFilters.tsx
│   ├── constants
│   │   ├── portfolioData.ts
│   │   ├── productsData.ts
│   │   ├── uniqueProductsData.ts
│   │   └── yilmazMachines.ts
│   ├── data
│   │   └── usedMachines.ts
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── index.css
│   ├── lib
│   │   ├── ai
│   │   │   ├── config.ts
│   │   │   ├── faultDetection.ts
│   │   │   ├── gemini.ts
│   │   │   └── SparePartsService.ts
│   │   ├── i18n.ts
│   │   ├── performance.ts
│   │   ├── reports
│   │   │   ├── costCalculator.ts
│   │   │   ├── generateReport.ts
│   │   │   ├── pdfTemplate.ts
│   │   │   └── pricing.ts
│   │   ├── serviceWorkerRegistration.ts
│   │   ├── smsService.ts
│   │   ├── utils.ts
│   │   └── yilmazScraper.ts
│   ├── main.tsx
│   ├── pages
│   │   ├── About.tsx
│   │   ├── AIFeatures.tsx
│   │   ├── Contact.tsx
│   │   ├── FabricationWorkflowDetail.tsx
│   │   ├── Index.tsx
│   │   ├── machines
│   │   │   └── MachineDetail.tsx
│   │   ├── NotFound.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Products.tsx
│   │   ├── profiles
│   │   │   └── ProfileDetail.tsx
│   │   ├── Services
│   │   │   └── index.tsx
│   │   ├── services-new.tsx
│   │   ├── Services.test.tsx
│   │   ├── Services.tsx
│   │   ├── Shop.tsx
│   │   ├── UsedMachineDetail.tsx
│   │   ├── UsedMachines.tsx
│   │   └── workflows
│   │       └── WorkflowDetail.tsx
│   ├── setupTests.ts
│   ├── test-ar.html
│   ├── types
│   │   ├── gtag.d.ts
│   │   └── maintenance.d.ts
│   └── vite-env.d.ts
├── srcassetsimages
├── tailwind.config.ts
├── test-portfolio-data.js
├── test-portfolio-data.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── welding-machine.jpg
└── window-system.jpg

```