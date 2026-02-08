import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider } from "next-themes";
import React, { Suspense, lazy, memo, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import SEO from "./components/SEO";
import { ABTestProvider } from "./components/analytics/ABTestProvider";
import { WelcomeToast } from "./components/auth/WelcomeToast";
import { FabricatorCutoverListener } from "./components/fabricator/FabricatorCutoverListener";
import { ConstitutionalStatusListener } from "./components/fabricator/constitutional/ConstitutionalStatusListener";
import RegionAwareLayout from "./components/layout/RegionAwareLayout";
import { ChunkLoadingErrorBoundary } from "./components/ui/ChunkLoadingErrorBoundary";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { KeyboardInitializer } from "./components/ui/KeyboardInitializer";
import { PageLoadingWrapper } from "./components/ui/PageLoadingWrapper";
import { CommandPalette } from "./components/ui/command-palette";
import { Prestige3DLoader } from "./components/ui/loading/Prestige3DLoader";
import { AuthProvider } from "./context/AuthContext.tsx";
import { FabricatorWorkspaceProvider } from "./context/FabricatorWorkspaceContext";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { LoadingProvider } from "./context/LoadingContext.tsx";
import { QuoteProvider } from "./context/QuoteContext.tsx";
import { useRoutePrefetching } from "./hooks/useRoutePrefetching";
import { fabricatorRoutes } from "./lib/fabricator/routes";
import { lazyRetry } from "./utils/lazyImport";
// Lazy load PerformanceDashboard to avoid loading it in production
const PerformanceDashboard = lazy(() => import("./components/dev/PerformanceDashboard").then(m => ({ default: m.PerformanceDashboard })));

// Core pages (essential) - loaded immediately (lightweight)
const Index = lazy(() => import("./pages/Index.tsx"));
const Products = lazy(() => import("./pages/Products.tsx"));
const Services = lazyRetry(() => import("./pages/Services.tsx"), "Services"); // Heavy page
const Contact = lazy(() => import("./pages/Contact.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// 3D Gallery - lazy loaded
const Model3DGallery = lazy(() => import("./pages/Model3DGallery.tsx"));
const AdvancedModelViewer = lazy(() => import("./pages/AdvancedModelViewer.tsx"));

// Test components - lazy loaded
const LocalizationTest = lazy(() => import("./components/test/LocalizationTest.tsx"));
const TestScannerPage = lazy(() => import("./pages/TestScanner.tsx"));
const SmartScanAssembly = lazy(() => import("./pages/SmartScanAssembly.tsx"));

// Shop and e-commerce - lazy loaded with retry (HEAVY ROUTES)
const Shop = lazyRetry(() => import("./pages/Shop"), "Shop");
const UsedMachines = lazyRetry(() => import("./pages/UsedMachines.tsx"), "UsedMachines");
const UsedMachineDetailPage = lazyRetry(() => import("./pages/UsedMachineDetail.tsx"), "UsedMachineDetail");
const SellUsedMachine = lazyRetry(() => import("./pages/SellUsedMachine.tsx"), "SellUsedMachine");
const SpareParts = lazyRetry(() => import("./pages/SpareParts.tsx"), "SpareParts");

// Product details - lazy loaded
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail.tsx"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail.tsx"));

// New Yilmaz Dealer Pages - lazy loaded
const YilmazDealer = lazy(() => import("./pages/YilmazDealer.tsx"));
const DigitalTwinDashboard = lazy(() => import("./pages/machines/DigitalTwinDashboard.tsx"));
const YilmazService = lazy(() => import("./pages/YilmazService.tsx"));
const YilmazTraining = lazy(() => import("./pages/YilmazTraining.tsx"));
const YilmazMachineDashboard = lazy(() => import("./pages/YilmazMachineDashboard.tsx"));
const YilmazAnalytics = lazy(() => import("./components/predictive/YilmazAnalytics.tsx").then(m => ({ default: m.YilmazAnalytics })));

// Digital Egypt Initiative - lazy loaded
const DigitalEgypt = lazy(() => import("./pages/DigitalEgypt.tsx"));

// Workflow and fabrication - lazy loaded with retry (HEAVY ROUTES)
const WorkflowDetail = lazyRetry(() => import("./pages/workflows/WorkflowDetail.tsx"), "WorkflowDetail");
const WorkflowBuilderPage = lazyRetry(() => import("./pages/WorkflowBuilderPage.tsx"), "WorkflowBuilderPage");
const FabricationWorkflowDetail = lazyRetry(() => import("./pages/FabricationWorkflowDetail.tsx"), "FabricationWorkflowDetail");
const FabricationServices = lazyRetry(() => import("./pages/FabricationServices.tsx"), "FabricationServices");
const _FabricatorWorkflow = lazyRetry(() => import("./pages/FabricatorWorkflow.tsx"), "FabricatorWorkflow");
const _FabricatorDashboard = lazyRetry(() => import("./pages/FabricatorDashboard.tsx"), "FabricatorDashboard");
const InventoryPage = lazy(() => import("./pages/Inventory.tsx"));
const FabricatorReportsPage = lazy(() => import("./pages/FabricatorReports.tsx"));
const ProjectsPage = lazy(() => import("./pages/Projects.tsx"));
const PublicOptimizer = lazy(() => import("./pages/PublicOptimizer.tsx"));
const EngineeringBayWrapper = lazy(() => import("./components/fabricator/EngineeringBayWrapper").then(m => ({ default: m.EngineeringBayWrapper })));
// const DesignWorkflowWrapper = lazy(() => import("./components/fabricator/workflow/DesignWorkflowWrapper.tsx").then(m => ({ default: m.DesignWorkflowWrapper })));
const _DraftingWorkbench = lazy(() => import("./components/fabricator/drafting/DraftingWorkbench.tsx").then(m => ({ default: m.DraftingWorkbench })));
const ProfileStudioLite = lazy(() => import("./components/fabricator/tuning/ProfileStudioLite.tsx").then(m => ({ default: m.ProfileStudioLite })));
const SystemPackTuningStudio = lazy(() => import("./components/fabricator/SystemPackTuningStudio.tsx").then(m => ({ default: m.SystemPackTuningStudio })));
const NoDXFTuningStudio = lazy(() => import("./components/fabricator/NoDXFTuningStudio.tsx").then(m => ({ default: m.NoDXFTuningStudio })));
const CommercialPage = lazy(() => import("./pages/CommercialPage.tsx"));
const SystemPacksPage = lazy(() => import("./pages/SystemPacksPage.tsx").then(m => ({ default: m.SystemPacksPage })));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));
const ProductionDashboard = lazy(() => import("./components/fabricator/ProductionDashboard.tsx").then(m => ({ default: m.ProductionDashboard })));
const ProjectStudioWrapper = lazy(() => import("./pages/fabricator/ProjectStudioWrapper"));

// NEW: Workflow Page Components - Route-Based Architecture
const _UnifiedDesignPage = lazy(() => import("./pages/fabricator/workflow/UnifiedDesignPage").then(m => ({ default: m.UnifiedDesignPage })));
const OptimizationPage = lazy(() => import("./pages/fabricator/workflow/OptimizationPage").then(m => ({ default: m.OptimizationPage })));
const _InventoryWorkflowPage = lazy(() => import("./pages/fabricator/workflow/InventoryPage").then(m => ({ default: m.InventoryPage })));
const ProductionPage = lazy(() => import("./pages/fabricator/workflow/ProductionPage").then(m => ({ default: m.ProductionPage })));
const _QualityControlWorkflowPage = lazy(() => import("./pages/fabricator/workflow/QualityControlPage").then(m => ({ default: m.QualityControlPage })));
const _DebugWorkflowPage = lazy(() => import("./pages/DebugWorkflowPage").then(m => ({ default: m.DebugWorkflowPage })));

// Phase 5: Pre-Pilot Hardening - lazy loaded
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.tsx"));
const PilotSurveyPage = lazy(() => import("./pages/PilotSurveyPage.tsx"));
const FeedbackDashboardPage = lazy(() => import("./pages/FeedbackDashboardPage.tsx"));
const PilotMonitoringPage = lazy(() => import("./pages/PilotMonitoringPage.tsx"));
const EarlyAccessFeedbackPage = lazy(() => import("./components/feedback/EarlyAccessFeedback.tsx").then(m => ({ default: m.EarlyAccessFeedback })));
const BetaFeedbackPortalPage = lazy(() => import("./components/feedback/BetaFeedbackPortal.tsx").then(m => ({ default: m.BetaFeedbackPortal })));
const BetaDashboardPage = lazy(() => import("./components/admin/BetaDashboard.tsx").then(m => ({ default: m.BetaDashboard })));

// Quote system - lazy loaded
const QuotePage = lazy(() => import("./pages/QuotePage.tsx"));
const QuoteConfirmationPage = lazy(() => import("./pages/QuoteConfirmationPage.tsx"));

// 3D model viewers - lazy loaded (heavy components)
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo.tsx"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest.tsx"));
const SwiftXRTest = lazy(() => import("./pages/SwiftXRTest.tsx"));

// Authentication - lazy loaded with retry (HEAVY ROUTES)
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const CustomerPortal = lazyRetry(() => import("./pages/CustomerPortal.tsx"), "CustomerPortal");
const ClientPortalPage = lazyRetry(() => import("./pages/ClientPortalPage.tsx"), "ClientPortalPage");
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));

// Admin and support - lazy loaded with retry (HEAVY ROUTES)
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard.tsx"), "AdminDashboard");
const CreateTicketPage = lazyRetry(() => import("./pages/CreateTicketPage.tsx"), "CreateTicketPage");
const RegisterMachinePage = lazyRetry(() => import("./pages/RegisterMachinePage.tsx"), "RegisterMachinePage");
const CustomerSupport = lazyRetry(() => import("./pages/CustomerSupport.tsx"), "CustomerSupport");
const RegionalFeaturesDemo = lazyRetry(() => import("./pages/RegionalFeaturesDemo.tsx"), "RegionalFeaturesDemo");
const AIRecommendationDemo = lazyRetry(() => import("./pages/AIRecommendationDemo.tsx"), "AIRecommendationDemo");
const BatchCutListDemo = lazyRetry(() => import("./pages/BatchCutListDemo.tsx"), "BatchCutListDemo");

// Ticket Details - lazy loaded
const TicketDetailPage = lazy(() => import("./pages/TicketDetailPage.tsx"));

// Executive Trust Dashboard - Phase 4: Precision Upgrade Plan
const ExecutiveTrustDashboard = lazy(() => import("./components/trust/ExecutiveTrustDashboard.tsx").then(m => ({ default: m.ExecutiveTrustDashboard })));

// Global Settings Page - Gold Tier Preferences
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx").then(m => ({ default: m.SettingsPage })));

// National Service Dashboard - Egypt Vision 2030
const NationalDashboard = lazy(() => import("./pages/NationalDashboard.tsx"));

// YDT Agent - lazy loaded
const AlmonaPrestigeChatbot = lazy(() => import("./components/prestige-agent/AlmonaPrestigeChatbot.tsx").then(m => ({ default: m.AlmonaPrestigeChatbot })));

// Phase 1 Refactor: Studio-Based Architecture
const StudioLayout = lazy(() => import("./layouts/studio/StudioLayout.tsx"));
// const CommandCenterLayout = lazy(() => import("./layouts/studio/CommandCenterLayout.tsx")); // Replaced by Dashboard
const ProjectStudioLayout = lazy(() => import("./layouts/studio/ProjectStudioLayout.tsx"));
const DesignStudioLayout = lazy(() => import("./layouts/studio/DesignStudioLayout.tsx"));
const ProductionStudioLayout = lazy(() => import("./layouts/studio/ProductionStudioLayout.tsx"));
const DataStudioLayout = lazy(() => import("./layouts/studio/DataStudioLayout.tsx"));

// Redirect component for /fabricator-workflow: canonical target is studio (Fabricator Pro consolidation).
const FabricatorWorkflowRedirect: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isNewProject = searchParams.get('new') === 'true';
  const target = isNewProject ? fabricatorRoutes.newProjectWizard() : fabricatorRoutes.studioProjects();
  return <Navigate to={target + location.search} replace />;
};

/**
 * Redirect legacy /fabricator/engineering-bay (with ID, query param, or bare).
 * Handles:
 *   /fabricator/engineering-bay/:id
 *   /fabricator/engineering-bay?id=xxx
 *   /fabricator/engineering-bay?jobId=xxx
 *   /fabricator/engineering-bay           (bare → projects list)
 */
const LegacyEngineeringBayRedirect: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const searchParams = new URLSearchParams(location.search);
  const poseId = params.id || searchParams.get('id') || searchParams.get('jobId') || searchParams.get('poseId');
  if (poseId) {
    return <Navigate to={fabricatorRoutes.poseDesign(poseId, poseId)} replace />;
  }
  return <Navigate to={fabricatorRoutes.studioProjects()} replace />;
};

// Redirect /fabricator/workflow/* to canonical studio pose-centric routes.
const FabricatorWorkflowToStudioRedirect: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const rest = path.replace(/^\/fabricator\/workflow\/?/, '') || '';
  const parts = rest.split('/').filter(Boolean);
  // design/:projectId, optimization/:projectId, engineering-bay/:jobId (jobId = poseId), etc.
  if (parts[0] === 'design' && parts[1]) {
    const projectId = parts[1];
    return <Navigate to={fabricatorRoutes.poseDesign(projectId, projectId)} replace />;
  }
  if (parts[0] === 'optimization' && parts[1]) {
    const projectId = parts[1];
    return <Navigate to={fabricatorRoutes.poseOptimization(projectId, projectId)} replace />;
  }
  if (parts[0] === 'production' && parts[1]) {
    const projectId = parts[1];
    return <Navigate to={fabricatorRoutes.poseProduction(projectId, projectId)} replace />;
  }
  if (parts[0] === 'engineering-bay' && parts[1]) {
    const poseId = parts[1];
    return <Navigate to={fabricatorRoutes.poseDesign(poseId, poseId)} replace />;
  }
  return <Navigate to={fabricatorRoutes.studioProjects()} replace />;
};

const queryClient = new QueryClient();
const isProd = import.meta.env.PROD;
// Only enable Vercel Analytics/Speed Insights when actually deployed on Vercel
const isVercel = typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('vercel.com') ||
  import.meta.env.VITE_VERCEL === 'true'
);

// Optimized loading components
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <PageLoadingWrapper message={message} variant="fullscreen">
    <div />
  </PageLoadingWrapper>
);

const getLoadingComponent = (path: string) => {
  if (path.includes('/admin')) return <LoadingSpinner message="Loading admin dashboard..." />;
  if (path.includes('/shop') || path.includes('/products') || path.includes('/usedmachines'))
    return <LoadingSpinner message="Loading shop..." />;
  if (path.includes('/3d') || path.includes('/quote') || path.includes('/model'))
    return <LoadingSpinner message="Loading 3D models..." />;
  if (path.includes('/login') || path.includes('/register') || path.includes('/portal'))
    return <LoadingSpinner message="Loading authentication..." />;
  return <LoadingSpinner message={`Loading ${path === '/' ? 'home' : path.replace('/', '').replace('-', ' ')}...`} />;
};

// Lightweight helper to activate route prefetching hook
// Phase 1.5: Enhanced with critical Egypt route prefetching
const RoutePrefetchingHelper = () => {
  const { prefetchRoute } = useRoutePrefetching();

  // Prefetch critical Egypt workflow routes after initial load
  useEffect(() => {
    // Wait for initial render to complete before prefetching
    const timer = setTimeout(() => {
      const criticalRoutes = [
        '/fabricator/studio/projects',
        '/fabricator/studio/data/tuning-no-dxf',
        '/egyptian-project-wizard'
      ];

      criticalRoutes.forEach(route => prefetchRoute(route));

      if (import.meta.env.DEV) {
        console.log('[Almona Egypt] Critical routes prefetched');
      }
    }, 3000); // 3 seconds after initial load

    return () => clearTimeout(timer);
  }, [prefetchRoute]);

  return null;
};

// Global error handler for dynamic import failures - DISABLED AUTO-RELOAD (too aggressive)
// Only log errors, don't auto-reload on first load
const GlobalDynamicImportGuard = () => {
  useEffect(() => {
    const handler = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message || ev.reason || '').toLowerCase();
      // Only handle specific chunk/module loading errors, not all rejections
      if (msg.includes('failed to fetch dynamically imported module') ||
        (msg.includes('loading chunk') && msg.includes('failed'))) {
        console.warn('Dynamic import failed:', msg);
        // Don't auto-reload - let user decide or use manual retry
        // Auto-reload was causing double page loads on first visit
        // The lazyRetry utility in lazyImport.ts handles retries more gracefully
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  return null;
};

// Memoize App component to prevent unnecessary re-renders
const App = memo(() => {
  return (
    <ChunkLoadingErrorBoundary>
      <ErrorBoundary>
        <Prestige3DLoader show3DAnimation={false}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              <TooltipProvider>
                <SEO />
                <Toaster />
                <Sonner />
                <AuthProvider>
                  <LoadingProvider>
                    <ABTestProvider>
                      <LanguageProvider>
                        <QuoteProvider>
                          <FabricatorWorkspaceProvider>
                            <BrowserRouter
                              future={{
                                v7_startTransition: true,
                                v7_relativeSplatPath: true,
                              }}
                            >
                              <GlobalDynamicImportGuard />
                              <RoutePrefetchingHelper />
                              <FabricatorCutoverListener />
                              <WelcomeToast />
                              <ConstitutionalStatusListener />
                              {/* Phase 2: Global Keyboard Shortcuts Handler - Replaced with KeyboardManager */}
                              <KeyboardInitializer />
                              <CommandPalette />
                              {/* Defer analytics to avoid blocking initial render - only on Vercel */}
                              {isProd && isVercel && (
                                <Suspense fallback={null}>
                                  <Analytics />
                                </Suspense>
                              )}
                              <RegionAwareLayout showRegionalFeatures={true} enableRegionSwitching={true}>
                                <Routes>
                                  {/* Core pages */}
                                  <Route path="/" element={<Suspense fallback={getLoadingComponent('/')}><Index /></Suspense>} />
                                  <Route path="/settings" element={<Suspense fallback={getLoadingComponent('/settings')}><SettingsPage /></Suspense>} />
                                  <Route path="/about" element={<Suspense fallback={getLoadingComponent('/about')}><About /></Suspense>} />
                                  <Route path="/contact" element={<Suspense fallback={getLoadingComponent('/contact')}><Contact /></Suspense>} />

                                  {/* Test routes */}
                                  <Route path="/test/localization" element={<Suspense fallback={getLoadingComponent('/test/localization')}><LocalizationTest /></Suspense>} />
                                  <Route path="/test-scanner" element={<Suspense fallback={getLoadingComponent('/test-scanner')}><TestScannerPage /></Suspense>} />
                                  <Route path="/smart-scan" element={<Suspense fallback={getLoadingComponent('/smart-scan')}><SmartScanAssembly /></Suspense>} />
                                  <Route path="/smart-scan-assembly" element={<Suspense fallback={getLoadingComponent('/smart-scan-assembly')}><SmartScanAssembly /></Suspense>} />
                                  <Route path="/test/swiftxr" element={<Suspense fallback={getLoadingComponent('/test/swiftxr')}><SwiftXRTest /></Suspense>} />

                                  {/* Yilmaz Dealer Pages */}
                                  <Route path="/yilmaz-machines-egypt" element={<Suspense fallback={getLoadingComponent('/yilmaz')}><YilmazDealer /></Suspense>} />
                                  <Route path="/dealer-verification" element={<Suspense fallback={getLoadingComponent('/yilmaz')}><YilmazDealer /></Suspense>} />
                                  <Route path="/dealer-verification-en" element={<Suspense fallback={getLoadingComponent('/yilmaz')}><YilmazDealer /></Suspense>} />
                                  <Route path="/yilmaz-service-egypt" element={<Suspense fallback={getLoadingComponent('/yilmaz')}><YilmazService /></Suspense>} />

                                  <Route path="/yilmaz-training-egypt" element={<Suspense fallback={getLoadingComponent('/yilmaz')}><YilmazTraining /></Suspense>} />
                                  <Route path="/yilmaz-maintenance" element={<Suspense fallback={getLoadingComponent('/yilmaz-maintenance')}><YilmazMachineDashboard /></Suspense>} />
                                  <Route path="/yilmaz-analytics" element={<Suspense fallback={getLoadingComponent('/yilmaz-analytics')}><YilmazAnalytics /></Suspense>} />

                                  {/* Alias for CNC machines to Products */}
                                  <Route path="/yilmaz-cnc-machines" element={<Navigate to="/products/machines?category=processing-centers" replace />} />

                                  {/* Digital Egypt Initiative */}
                                  <Route path="/digital-egypt" element={<Suspense fallback={getLoadingComponent('/digital-egypt')}><DigitalEgypt /></Suspense>} />
                                  <Route path="/digital-egypt/smart-manufacturing" element={<Navigate to="/digital-egypt" replace />} />

                                  {/* Products specific routes first - 3D gallery before general */}
                                  <Route path="/products/3d-gallery" element={<Suspense fallback={getLoadingComponent('/products/3d-gallery')}><Model3DGallery /></Suspense>} />
                                  <Route path="/products/machines" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/configurator" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/ar-viewer" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/profiles" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/machines/:machineId" element={<Suspense fallback={getLoadingComponent('/products')}><MachineDetail /></Suspense>} />
                                  <Route path="/products/profiles/:profileId" element={<Suspense fallback={getLoadingComponent('/products')}><ProfileDetail /></Suspense>} />
                                  <Route path="/machines/:machineId" element={<Suspense fallback={getLoadingComponent('/machines')}><DigitalTwinDashboard /></Suspense>} />

                                  {/* Egyptian Market Routes */}
                                  <Route path="/products/upvc/windows" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/upvc/doors" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                                  <Route path="/products/aluminum/thermal-break" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />

                                  {/* General products route last */}
                                  <Route path="/products" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />

                                  {/* Services */}
                                  <Route path="/services" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                                  <Route path="/services/ai-advisor" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                                  <Route path="/services/sales" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                                  <Route path="/services/spare-parts" element={<Suspense fallback={getLoadingComponent('/services')}><SpareParts /></Suspense>} />
                                  <Route path="/services/consulting" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                                  <Route path="/services/egypt/maintenance-centers" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                                  <Route path="/services/training" element={<Suspense fallback={getLoadingComponent('/services')}><TrainingServicesPage /></Suspense>} />

                                  {/* Support Ticket Routes */}
                                  <Route path="/support/tickets/:ticketId" element={<Suspense fallback={getLoadingComponent('/support')}><TicketDetailPage /></Suspense>} />

                                  {/* Workflows */}
                                  <Route path="/workflows/upvc-fabrication" element={<Suspense fallback={getLoadingComponent('/workflows')}><WorkflowDetail /></Suspense>} />
                                  <Route path="/workflows/fabrication-detail" element={<Suspense fallback={getLoadingComponent('/workflows')}><FabricationWorkflowDetail /></Suspense>} />
                                  <Route path="/workflows/builder" element={<Suspense fallback={getLoadingComponent('/workflows/builder')}><WorkflowBuilderPage /></Suspense>} />
                                  <Route path="/workflows/builder/:workflowId" element={<Suspense fallback={getLoadingComponent('/workflows/builder')}><WorkflowBuilderPage /></Suspense>} />
                                  <Route path="/fabrication-services" element={<Suspense fallback={getLoadingComponent('/fabrication')}><FabricationServices /></Suspense>} />
                                  {/* Fabricator Workflow Page - NEW ROUTE-BASED ARCHITECTURE */}
                                  <Route
                                    path="/fabricator-workflow"
                                    element={<FabricatorWorkflowRedirect />}
                                  />
                                  {/* Legacy fabricator routes - redirect to studio (canonical) */}
                                  <Route path="/fabricator-workflow/pro" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />

                                  {/* Canonical Fabricator: studio-only hierarchy */}
                                  <Route path="/fabricator/studio" element={<Suspense fallback={getLoadingComponent('Studio Layout')}><StudioLayout /></Suspense>}>
                                    <Route index element={<Navigate to="command" replace />} />

                                    {/* 1. Command Center */}
                                    <Route path="command" element={<Suspense fallback={getLoadingComponent('Command Center')}><_FabricatorDashboard /></Suspense>} />

                                    {/* 2. Project Studio List (canonical path: projects) */}
                                    <Route path="projects" element={<Suspense fallback={getLoadingComponent('Project Studio')}><ProjectStudioLayout /></Suspense>}>
                                      <Route index element={<ProjectsPage />} />
                                    </Route>

                                    {/* 2b. Project Studio Workspace (Full Screen) */}
                                    <Route path="projects/:projectId" element={<Suspense fallback={getLoadingComponent('Project Workspace')}><ProjectStudioWrapper /></Suspense>} />

                                    {/* 2c. Pose-centric: design, optimization, commercial, production */}
                                    <Route path="projects/:projectId/positions/:poseId/design" element={<Suspense fallback={getLoadingComponent('Engineering Bay')}><EngineeringBayWrapper /></Suspense>} />
                                    <Route path="projects/:projectId/positions/:poseId/optimization" element={<Suspense fallback={getLoadingComponent('Optimization')}><OptimizationPage /></Suspense>} />
                                    <Route path="projects/:projectId/positions/:poseId/commercial" element={<Suspense fallback={getLoadingComponent('Commercial')}><CommercialPage /></Suspense>} />
                                    <Route path="projects/:projectId/positions/:poseId/production" element={<Suspense fallback={getLoadingComponent('Production')}><ProductionPage /></Suspense>} />

                                    {/* 3. Design Studio (legacy flat design - redirect from old nav) */}
                                    <Route path="design/*" element={<Suspense fallback={getLoadingComponent('Design Studio')}><DesignStudioLayout /></Suspense>}>
                                      <Route index element={<Suspense fallback={getLoadingComponent('Engineering Bay')}><EngineeringBayWrapper /></Suspense>} />
                                      <Route path=":projectId" element={<Suspense fallback={getLoadingComponent('Engineering Bay')}><EngineeringBayWrapper /></Suspense>} />
                                    </Route>

                                    {/* 4. Production Studio */}
                                    <Route path="production/*" element={<Suspense fallback={getLoadingComponent('Production Studio')}><ProductionStudioLayout /></Suspense>}>
                                      <Route index element={<Suspense fallback={getLoadingComponent('Production Dashboard')}><ProductionDashboard /></Suspense>} />
                                    </Route>

                                    {/* 5. Data Studio */}
                                    <Route path="data/*" element={<Suspense fallback={getLoadingComponent('Data Studio')}><DataStudioLayout /></Suspense>}>
                                      <Route index element={<Suspense fallback={getLoadingComponent('System Packs')}><SystemPacksPage /></Suspense>} />
                                      <Route path="tuning" element={<Suspense fallback={getLoadingComponent('Tuning Studio')}><SystemPackTuningStudio /></Suspense>} />
                                      <Route path="tuning-no-dxf" element={<Suspense fallback={getLoadingComponent('Tuning Studio')}><NoDXFTuningStudio /></Suspense>} />
                                      <Route path="profiles" element={<Suspense fallback={getLoadingComponent('Profile Studio')}><ProfileStudioLite /></Suspense>} />
                                    </Route>
                                    {/* 6. Reports */}
                                    <Route path="reports" element={<Suspense fallback={getLoadingComponent('Reports')}><ProtectedRoute><FabricatorReportsPage /></ProtectedRoute></Suspense>} />
                                    <Route path="reports/*" element={<Suspense fallback={getLoadingComponent('Reports')}><ProtectedRoute><FabricatorReportsPage /></ProtectedRoute></Suspense>} />
                                  </Route>

                                  {/* Legacy /fabricator/workflow/* → studio (canonical) */}
                                  <Route path="/fabricator/workflow" element={<FabricatorWorkflowToStudioRedirect />} />
                                  <Route path="/fabricator/workflow/*" element={<FabricatorWorkflowToStudioRedirect />} />

                                  {/* Legacy /fabricator/* (non-studio) → studio equivalents (301-style redirects) */}
                                  <Route path="/fabricator/projects" element={<Navigate to={fabricatorRoutes.studioProjects()} replace />} />
                                  <Route path="/fabricator/customers" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/inventory" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/profiles" element={<Navigate to={fabricatorRoutes.studioData('profiles')} replace />} />
                                  <Route path="/fabricator/commercial" element={<Navigate to={fabricatorRoutes.studioProjects()} replace />} />
                                  <Route path="/fabricator/system-packs" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/pricing" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/reports" element={<Navigate to={fabricatorRoutes.studioReports()} replace />} />
                                  <Route path="/fabricator/settings/branding" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator/profile-studio" element={<Navigate to={fabricatorRoutes.studioData('profiles')} replace />} />
                                  <Route path="/fabricator/system-pack-studio" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/turkish-gallery" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/tuning-studio" element={<Navigate to={fabricatorRoutes.studioData('tuning')} replace />} />
                                  <Route path="/fabricator/tuning-studio-no-dxf" element={<Navigate to={fabricatorRoutes.studioData('tuning-no-dxf')} replace />} />
                                  <Route path="/fabricator/smart-wizard" element={<Navigate to={fabricatorRoutes.studioProjects()} replace />} />
                                  <Route path="/fabricator/pattern-library" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/machine-testing" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/validation" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator/bent-profile-designer" element={<Navigate to={fabricatorRoutes.studioData()} replace />} />
                                  <Route path="/fabricator/onboarding" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator/activity-timeline" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator/payment-test" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />
                                  <Route path="/fabricator/reports-dashboard" element={<Navigate to={fabricatorRoutes.studioReports()} replace />} />

                                  {/* Legacy Engineering Bay & Positions — critical for old bookmarks */}
                                  <Route path="/fabricator/engineering-bay/:id" element={<LegacyEngineeringBayRedirect />} />
                                  <Route path="/fabricator/engineering-bay" element={<LegacyEngineeringBayRedirect />} />
                                  <Route path="/fabricator/positions/:id" element={<LegacyEngineeringBayRedirect />} />
                                  <Route path="/fabricator/positions" element={<Navigate to={fabricatorRoutes.studioProjects()} replace />} />

                                  {/* Catch-all: any remaining /fabricator/* goes to command center */}
                                  <Route path="/fabricator/*" element={<Navigate to={fabricatorRoutes.studioCommand()} replace />} />

                                  {/* Production Dashboard - Kiosk Mode & Supervisor View */}
                                  <Route
                                    path="/production"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/production')}>
                                        <ProductionDashboard />
                                      </Suspense>
                                    }
                                  />

                                  {/* Phase 5: Pre-Pilot Hardening Routes */}
                                  <Route
                                    path="/onboarding"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/onboarding')}>
                                        <OnboardingPage />
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/pilot/survey"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/pilot/survey')}>
                                        <PilotSurveyPage />
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/admin/feedback"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/admin/feedback')}>
                                        <ProtectedRoute>
                                          <FeedbackDashboardPage />
                                        </ProtectedRoute>
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/admin/pilot-monitoring"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/admin/pilot-monitoring')}>
                                        <ProtectedRoute>
                                          <PilotMonitoringPage />
                                        </ProtectedRoute>
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/early-access/feedback"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/early-access/feedback')}>
                                        <EarlyAccessFeedbackPage />
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/beta/feedback"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/beta/feedback')}>
                                        <BetaFeedbackPortalPage />
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/admin/beta-dashboard"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/admin/beta-dashboard')}>
                                        <ProtectedRoute>
                                          <BetaDashboardPage />
                                        </ProtectedRoute>
                                      </Suspense>
                                    }
                                  />

                                  {/* Shop & E-commerce */}
                                  <Route path="/shop" element={<Suspense fallback={getLoadingComponent('/shop')}><Shop /></Suspense>} />
                                  <Route path="/optimizer" element={<Suspense fallback={getLoadingComponent('/optimizer')}><PublicOptimizer /></Suspense>} />
                                  <Route path="/usedmachines" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><UsedMachines /></Suspense>} />
                                  <Route path="/usedmachines/:id" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><UsedMachineDetailPage /></Suspense>} />
                                  <Route path="/usedmachines/sell" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><ProtectedRoute><SellUsedMachine /></ProtectedRoute></Suspense>} />
                                  <Route path="/spare-parts" element={<Suspense fallback={getLoadingComponent('/spare-parts')}><SpareParts /></Suspense>} />
                                  <Route
                                    path="/inventory"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/inventory')}>
                                        <ProtectedRoute>
                                          <InventoryPage />
                                        </ProtectedRoute>
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/projects"
                                    element={
                                      <Suspense fallback={getLoadingComponent('/projects')}>
                                        <ProjectsPage />
                                      </Suspense>
                                    }
                                  />

                                  {/* Quote System */}
                                  <Route path="/quote" element={<Suspense fallback={getLoadingComponent('/quote')}><QuotePage /></Suspense>} />
                                  <Route path="/quotes/confirmation" element={<Suspense fallback={getLoadingComponent('/quotes')}><QuoteConfirmationPage /></Suspense>} />

                                  {/* 3D Model Viewers */}
                                  <Route path="/3d-demo" element={<Suspense fallback={getLoadingComponent('/3d')}><ModelViewerDemo /></Suspense>} />
                                  <Route path="/3d-test" element={<Suspense fallback={getLoadingComponent('/3d')}><ModelViewerTest /></Suspense>} />
                                  <Route path="/3d-viewer" element={<Suspense fallback={getLoadingComponent('/3d')}><AdvancedModelViewer /></Suspense>} />

                                  {/* Authentication */}
                                  <Route path="/login" element={<Suspense fallback={getLoadingComponent('/login')}><Login /></Suspense>} />
                                  <Route path="/register" element={<Suspense fallback={getLoadingComponent('/register')}><Register /></Suspense>} />
                                  <Route path="/portal" element={<Suspense fallback={getLoadingComponent('/portal')}><ProtectedRoute><CustomerPortal /></ProtectedRoute></Suspense>} />
                                  <Route path="/client-portal" element={<Suspense fallback={getLoadingComponent('/client-portal')}><ProtectedRoute><ClientPortalPage /></ProtectedRoute></Suspense>} />

                                  {/* Support & Tickets */}
                                  <Route path="/support" element={<Suspense fallback={getLoadingComponent('/support')}><ProtectedRoute><CustomerSupport /></ProtectedRoute></Suspense>} />
                                  <Route path="/support/tickets/new" element={<Suspense fallback={getLoadingComponent('/support')}><ProtectedRoute><CreateTicketPage /></ProtectedRoute></Suspense>} />
                                  <Route path="/support/new" element={<Navigate to="/support/tickets/new" replace />} />
                                  <Route path="/portal/create-ticket" element={<Navigate to="/support/tickets/new" replace />} />
                                  <Route path="/portal/register-machine" element={<Suspense fallback={getLoadingComponent('/portal')}><ProtectedRoute><RegisterMachinePage /></ProtectedRoute></Suspense>} />

                                  {/* Admin */}
                                  <Route path="/admin" element={<Suspense fallback={getLoadingComponent('/admin')}><ProtectedRoute><AdminDashboard /></ProtectedRoute></Suspense>} />
                                  <Route path="/admin/dashboard" element={<Suspense fallback={getLoadingComponent('/admin')}><ProtectedRoute><AdminDashboard /></ProtectedRoute></Suspense>} />
                                  <Route path="/admin/demo" element={<Suspense fallback={getLoadingComponent('/admin')}><ProtectedRoute><AdminDashboard /></ProtectedRoute></Suspense>} />

                                  {/* Executive Trust Dashboard - Phase 4: Precision Upgrade Plan */}
                                  <Route path="/executive/trust" element={<Suspense fallback={getLoadingComponent('/executive')}><ProtectedRoute><ExecutiveTrustDashboard /></ProtectedRoute></Suspense>} />
                                  <Route path="/trust-dashboard" element={<Suspense fallback={getLoadingComponent('/trust')}><ProtectedRoute><ExecutiveTrustDashboard /></ProtectedRoute></Suspense>} />

                                  {/* Demo routes – batch cut list must be registered for /demo/batch-cut-list to work */}
                                  <Route path="/demo/regional-features" element={<Suspense fallback={getLoadingComponent('/demo')}><RegionalFeaturesDemo /></Suspense>} />
                                  <Route path="/demo/ai-recommendations" element={<Suspense fallback={getLoadingComponent('/demo')}><AIRecommendationDemo /></Suspense>} />
                                  <Route path="/demo/batch-cut-list" element={<Suspense fallback={getLoadingComponent('/demo')}><BatchCutListDemo /></Suspense>} />
                                  <Route path="/batch-cut-list-demo" element={<Suspense fallback={getLoadingComponent('/demo')}><BatchCutListDemo /></Suspense>} />

                                  {/* YDT Agent */}
                                  <Route path="/prestige-agent" element={<Suspense fallback={getLoadingComponent('/prestige-agent')}><AlmonaPrestigeChatbot /></Suspense>} />
                                  <Route path="/ydt" element={<Suspense fallback={getLoadingComponent('/ydt')}><AlmonaPrestigeChatbot /></Suspense>} />

                                  {/* National Service Dashboard - Egypt Vision 2030 (Public for Demo) */}
                                  <Route path="/national-dashboard" element={<Suspense fallback={getLoadingComponent('/national-dashboard')}><NationalDashboard /></Suspense>} />
                                  <Route path="/government/dashboard" element={<Suspense fallback={getLoadingComponent('/government')}><NationalDashboard /></Suspense>} />
                                  <Route path="/egypt-vision-2030" element={<Suspense fallback={getLoadingComponent('/egypt-vision-2030')}><NationalDashboard /></Suspense>} />

                                  {/* 404 */}
                                  <Route path="*" element={<Suspense fallback={getLoadingComponent('/404')}><NotFound /></Suspense>} />
                                </Routes>
                              </RegionAwareLayout>
                              {/* Phase 1 Performance Dashboard - Development Only */}
                              {import.meta.env.DEV && (
                                <Suspense fallback={null}>
                                  <PerformanceDashboard />
                                </Suspense>
                              )}
                            </BrowserRouter>
                          </FabricatorWorkspaceProvider>
                        </QuoteProvider>
                      </LanguageProvider>
                    </ABTestProvider>
                  </LoadingProvider>
                </AuthProvider>
              </TooltipProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </Prestige3DLoader>
      </ErrorBoundary>
      {isProd && isVercel && <SpeedInsights />}
    </ChunkLoadingErrorBoundary>
  );
});

App.displayName = 'App';

export default App;
