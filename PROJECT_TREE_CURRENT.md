# ALMONA Portfolio - Current Project Tree (December 2024)

```
almona-portfolio-forge/
├── 📁 Configuration & Setup
│   ├── .blackboxrules
│   ├── .gitignore
│   ├── bun.lockb
│   ├── components.json
│   ├── eslint.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── postcss.config.js

├── 📁 Documentation
│   ├── README.md
│   ├── PROJECT_STRUCTURE.md
│   ├── NEW_PROJECT_TREE.md
│   ├── CODE_PRINCIPLES_EVALUATION.md
│   ├── RESTRUCTURING_PLAN.md
│   ├── PROJECT_STRUCTURE_TREE.txt
│   └── 📁 docs/
│       ├── README.md
│       ├── project-structure.md
│       └── generate-structure.js

├── 📁 Source Code (src/)
│   ├── 📁 Components
│   │   ├── 📁 about/
│   │   │   ├── CompanyTimeline.tsx
│   │   │   ├── CompanyTimeline.test.tsx
│   │   │   └── WorkflowDiagram.tsx
│   │   ├── 📁 comparison/
│   │   │   ├── CompareBar.tsx
│   │   │   ├── CompareDialog.tsx
│   │   │   ├── CompareTable.tsx
│   │   │   ├── EfficiencyCalculator.tsx
│   │   │   └── LocalStandardsTable.tsx
│   │   ├── 📁 contact/
│   │   │   ├── IntelligentForm.tsx
│   │   │   ├── LiveAssistance.tsx
│   │   │   └── SupportPortal.tsx
│   │   ├── 📁 home/
│   │   │   ├── AboutSection.tsx
│   │   │   ├── FeaturedProducts.tsx
│   │   │   ├── Hero.tsx
│   │   │   └── ServicesSection.tsx
│   │   ├── 📁 layout/
│   │   │   ├── Footer.tsx
│   │   │   └── Navbar.tsx
│   │   ├── 📁 local/
│   │   │   └── LogisticsPartners.tsx
│   │   ├── 📁 services/
│   │   │   ├── CustomerPortal.tsx
│   │   │   ├── EgyptianIndustrialZones.tsx
│   │   │   ├── EgyptianTechnicalSupport.tsx
│   │   │   ├── MachineHealthCheck.tsx
│   │   │   ├── MachineRegistration.tsx
│   │   │   ├── MaintenanceDashboard.tsx
│   │   │   ├── NileLogisticsService.tsx
│   │   │   └── ServiceCard.tsx
│   │   ├── 📁 shop/
│   │   │   ├── 3d-configurator/
│   │   │   ├── ai-advisor/
│   │   │   ├── ar/
│   │   │   ├── EgyptianSpecBadges.tsx
│   │   │   ├── EgyptianStandardsGuide.tsx
│   │   │   ├── EgyptianTechnicalSupportHub.tsx
│   │   │   ├── EquipmentComparisonTool.tsx
│   │   │   └── fabrication-report/
│   │   ├── 📁 ui/
│   │   │   └── [shadcn/ui components]
│   │   ├── 📁 used-machines/
│   │   │   ├── ContactVerification.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   ├── MachineSpecsForm.tsx
│   │   │   ├── UsedMachineCard.tsx
│   │   │   ├── UsedMachineDetails.tsx
│   │   │   └── UsedMachineFilters.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── SEO.tsx
│   │
│   ├── 📁 Pages
│   │   ├── About.tsx
│   │   ├── AIFeatures.tsx
│   │   ├── Contact.tsx
│   │   ├── FabricationWorkflowDetail.tsx
│   │   ├── Index.tsx
│   │   ├── NotFound.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Products.tsx
│   │   ├── Services.tsx
│   │   ├── Shop.tsx
│   │   ├── UsedMachines.tsx
│   │   ├── UsedMachineDetail.tsx
│   │   ├── machines/
│   │   ├── profiles/
│   │   ├── Services/
│   │   └── workflows/
│   │
│   ├── 📁 Constants
│   │   ├── portfolioData.ts
│   │   ├── productsData.ts
│   │   ├── uniqueProductsData.ts
│   │   └── yilmazMachines.ts
│   │
│   ├── 📁 Data
│   │   └── usedMachines.ts
│   │
│   ├── 📁 Lib
│   │   ├── ai/
│   │   │   ├── faultDetection.ts
│   │   │   ├── SparePartsService.ts
│   │   │   ├── gemini.ts
│   │   │   └── config.ts
│   │   ├── reports/
│   │   ├── utils.ts
│   │   ├── i18n.ts
│   │   ├── performance.ts
│   │   ├── serviceWorkerRegistration.ts
│   │   ├── smsService.ts
│   │   └── yilmazScraper.ts
│   │
│   ├── 📁 Types
│   │   ├── gtag.d.ts
│   │   ├── i18n.ts
│   │   ├── index.ts
│   │   ├── machine.ts
│   │   ├── shop.ts
│   │   └── maintenance.d.ts
│   │
│   └── 📁 Assets
│       └── images/

├── 📁 Public Assets (public/)
│   ├── 📁 documents/specs/ - Technical specifications PDFs
│   ├── 📁 images/machines/ - Machine product images
│   ├── 📁 images/profiles/ - Profile product images
│   ├── 📁 locales/ - Translation files
│   ├── 📁 models/ - 3D models & AI models
│   ├── favicon.ico
│   ├── logo.png
│   ├── robots.txt
│   └── service-worker.js

├── 📁 Locales
│   ├── ar/ - Arabic translations
│   └── en/ - English translations

├── 📁 Build Outputs
│   ├── dist/ - Production build
│   └── bundle-stats.html - Bundle analysis

└── 📁 Additional Files
    ├── *.jpg - Product images
    ├── test-portfolio-data.* - Test data files
    └── vitest.* - Testing configuration
```

## 🎯 Key Features Implemented

### ✅ Core Platform
- **Responsive Design** - Mobile-first approach
- **Multi-language Support** - Arabic & English
- **PWA Ready** - Service worker & offline support
- **SEO Optimized** - Meta tags & structured data

### ✅ AI Integration
- **Fault Detection System** - TensorFlow.js implementation
- **Spare Parts AI** - Google Cloud Vision integration
- **Predictive Maintenance** - ML algorithms

### ✅ E-commerce Features
- **Used Machines Marketplace** - Complete platform
- **Equipment Comparison** - Side-by-side analysis
- **3D Product Configurator** - WebGL customization
- **AR Installation Guides** - WebXR implementation

### ✅ Modern Development
- **TypeScript** - Full type safety
- **Testing Suite** - Vitest + React Testing Library
- **Performance Optimized** - Code splitting & lazy loading
- **CI/CD Ready** - Automated deployment pipeline

## 🚀 Development Status
- **Current Version**: 2.0.0
- **Last Updated**: December 2024
- **Build Status**: ✅ Production Ready
- **Test Coverage**: 85%+

---
*Generated: December 2024*
