# ALMONA Industrial Solutions - Complete Project Structure

## Project Overview
A comprehensive platform for Egyptian aluminum & UPVC fabricators featuring intelligent spare parts ordering, equipment comparison tools, AI-powered maintenance recommendations, and AR guides.

## 📁 Project Tree (Updated 2024)

```
almona-portfolio-forge/
├── 📁 Root Configuration Files
│   ├── .blackboxrules - Blackbox AI configuration
│   ├── .gitignore - Git ignore patterns
│   ├── .env.example - Environment variables template
│   ├── components.json - Shadcn/ui configuration
│   ├── package.json - Project dependencies & scripts
│   ├── tsconfig.json - TypeScript configuration
│   ├── vite.config.ts - Vite build configuration
│   ├── tailwind.config.ts - Tailwind CSS configuration
│   ├── postcss.config.js - PostCSS configuration
│   └── eslint.config.js - ESLint configuration

├── 📁 Documentation
│   ├── README.md - Main project documentation
│   ├── PROJECT_STRUCTURE.md - This file
│   ├── NEW_PROJECT_TREE.md - Detailed project tree
│   ├── CODE_PRINCIPLES_EVALUATION.md - Code quality standards
│   ├── RESTRUCTURING_PLAN.md - Migration strategy
│   └── 📁 docs/
│       ├── README.md - Documentation index
│       ├── project-structure.md - Detailed structure
│       └── generate-structure.js - Structure generator script

├── 📁 Source Code (src/)
│   ├── 📁 Components
│   │   ├── 📁 layout/ - Layout components
│   │   │   ├── Navbar.tsx - Main navigation
│   │   │   └── Footer.tsx - Site footer
│   │   ├── 📁 home/ - Homepage components
│   │   │   ├── Hero.tsx - Hero section
│   │   │   ├── AboutSection.tsx - About section
│   │   │   ├── FeaturedProducts.tsx - Featured products
│   │   │   └── ServicesSection.tsx - Services section
│   │   ├── 📁 products/ - Product components
│   │   │   ├── machines/ - Machine components
│   │   │   └── profiles/ - Profile components
│   │   ├── 📁 services/ - Service components
│   │   │   ├── MaintenanceDashboard.tsx - Maintenance system
│   │   │   ├── MachineHealthCheck.tsx - Health monitoring
│   │   │   └── CustomerPortal.tsx - Customer portal
│   │   ├── 📁 shop/ - E-commerce components
│   │   │   ├── 3d-configurator/ - 3D product configurator
│   │   │   ├── ai-advisor/ - AI equipment advisor
│   │   │   ├── ar/ - Augmented reality features
│   │   │   └── fabrication-report/ - Report generator
│   │   ├── 📁 used-machines/ - Used machines marketplace
│   │   │   ├── MachineSpecsForm.tsx - Machine listing form
│   │   │   ├── UsedMachineCard.tsx - Machine display card
│   │   │   └── UsedMachineDetails.tsx - Detailed view
│   │   └── 📁 ui/ - Reusable UI components
│   │       └── [shadcn/ui components...]
│   │
│   ├── 📁 Pages - Main application pages
│   │   ├── Index.tsx - Homepage
│   │   ├── About.tsx - About page
│   │   ├── Products.tsx - Products listing
│   │   ├── Services.tsx - Services page
│   │   ├── Shop.tsx - E-commerce shop
│   │   ├── UsedMachines.tsx - Used machines marketplace
│   │   ├── Contact.tsx - Contact page
│   │   └── Portfolio.tsx - Project portfolio
│   │
│   ├── 📁 Lib - Utility libraries
│   │   ├── ai/ - AI services
│   │   │   ├── faultDetection.ts - AI fault detection
│   │   │   └── SparePartsService.ts - Spare parts AI
│   │   ├── reports/ - Report generation
│   │   ├── utils.ts - General utilities
│   │   └── i18n.ts - Internationalization
│   │
│   ├── 📁 Constants - Application constants
│   │   ├── productsData.ts - Product data
│   │   ├── portfolioData.ts - Portfolio data
│   │   └── yilmazMachines.ts - Machine specifications
│   │
│   └── 📁 Types - TypeScript type definitions
│       ├── machine.ts - Machine types
│       ├── shop.ts - E-commerce types
│       └── maintenance.d.ts - Maintenance types

├── 📁 Public Assets (public/)
│   ├── 📁 images/
│   │   ├── machines/ - Machine images
│   │   └── profiles/ - Profile images
│   ├── 📁 documents/specs/ - Technical specifications
│   ├── 📁 models/ - 3D models & AI models
│   ├── 📁 locales/ - Translation files
│   └── service-worker.js - PWA service worker

├── 📁 Locales - Internationalization
│   ├── ar/ - Arabic translations
│   └── en/ - English translations

└── 📁 Build Outputs
    ├── dist/ - Production build
    └── bundle-stats.html - Bundle analysis
```

## 🚀 Key Features & Components

### AI-Powered Systems
- **Fault Detection**: TensorFlow.js based equipment monitoring
- **Spare Parts AI**: Google Cloud Vision for part identification
- **Predictive Maintenance**: ML-driven maintenance scheduling

### AR/VR Features
- **3D Product Configurator**: WebGL-based customization
- **AR Installation Guides**: WebXR implementation
- **Virtual Showroom**: Three.js powered visualization

### E-commerce Platform
- **Used Machines Marketplace**: Complete buying/selling system
- **Spare Parts Shop**: AI-enhanced product discovery
- **Equipment Comparison**: Side-by-side analysis tools

### Technical Highlights
- **Progressive Web App**: Service worker & offline support
- **Responsive Design**: Mobile-first approach
- **Performance Optimized**: Code splitting & lazy loading
- **SEO Ready**: Meta tags & structured data

## 🛠 Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test            # Run tests
npm run test:ui     # Run tests with UI

# Code Quality
npm run lint        # Run ESLint
npm run type-check  # TypeScript checking
```

## 📊 Project Statistics
- **Languages**: TypeScript, JavaScript, CSS
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Testing**: Vitest + React Testing Library
- **Build**: Vite + TypeScript
- **Deployment**: Static hosting ready

## 🔄 Recent Updates
- Added Used Machines marketplace
- Implemented AI fault detection system
- Enhanced AR/VR capabilities
- Improved mobile responsiveness
- Added comprehensive testing suite

---
*Last updated: December 2024*
