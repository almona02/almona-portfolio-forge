import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider } from "next-themes";
import React, { Suspense, lazy, memo, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import SEO from "./components/SEO";
import { ABTestProvider } from "./components/analytics/ABTestProvider";
import { WelcomeToast } from "./components/auth/WelcomeToast";
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
const FabricatorWorkflowPro = lazyRetry(() => import("./components/fabricator/FabricatorWorkflowPro.tsx"), "FabricatorWorkflowPro");
const _FabricatorDashboard = lazyRetry(() => import("./pages/FabricatorDashboard.tsx"), "FabricatorDashboard");
const FabricatorPricingConfiguration = lazy(() =>
  import("./components/fabricator/PricingConfiguration.tsx").then((m) => ({
    default: m.PricingConfiguration,
  })),
);
const FabricatorBrandingSettings = lazy(() => import("./pages/FabricatorBrandingSettings.tsx"));
const CustomersPage = lazy(() => import("./pages/Customers.tsx"));
const InventoryPage = lazy(() => import("./pages/Inventory.tsx"));
const FabricatorReportsPage = lazy(() => import("./pages/FabricatorReports.tsx"));
const ProjectsPage = lazy(() => import("./pages/Projects.tsx"));
const ProfilesPage = lazy(() => import("./pages/Profiles.tsx"));
const PublicOptimizer = lazy(() => import("./pages/PublicOptimizer.tsx"));
const MasterLayout = lazy(() => import("./components/fabricator/MasterLayout.tsx").then(m => ({ default: m.MasterLayout })));
const EngineeringBayWrapper = lazy(() => import("./components/fabricator/EngineeringBayWrapper").then(m => ({ default: m.EngineeringBayWrapper })));
// const DesignWorkflowWrapper = lazy(() => import("./components/fabricator/workflow/DesignWorkflowWrapper.tsx").then(m => ({ default: m.DesignWorkflowWrapper })));
const _DraftingWorkbench = lazy(() => import("./components/fabricator/drafting/DraftingWorkbench.tsx").then(m => ({ default: m.DraftingWorkbench })));
const QualityControlPage = lazy(() => import("./pages/QualityControlPage.tsx"));
const ProfileStudioLite = lazy(() => import("./components/fabricator/tuning/ProfileStudioLite.tsx").then(m => ({ default: m.ProfileStudioLite })));
const TurkishProfileGallery = lazy(() => import("./components/fabricator/TurkishProfileGallery.tsx").then(m => ({ default: m.TurkishProfileGallery })));
const SystemPackTuningStudio = lazy(() => import("./components/fabricator/SystemPackTuningStudio.tsx").then(m => ({ default: m.SystemPackTuningStudio })));
const NoDXFTuningStudio = lazy(() => import("./components/fabricator/NoDXFTuningStudio.tsx").then(m => ({ default: m.NoDXFTuningStudio })));
const CommercialPage = lazy(() => import("./pages/CommercialPage.tsx"));
const SystemPacksPage = lazy(() => import("./pages/SystemPacksPage.tsx").then(m => ({ default: m.SystemPacksPage })));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));
const ProductionDashboard = lazy(() => import("./components/fabricator/ProductionDashboard.tsx").then(m => ({ default: m.ProductionDashboard })));

// NEW: Workflow Page Components - Route-Based Architecture
const FabricatorLayout = lazy(() => import("./layouts/FabricatorLayout").then(m => ({ default: m.FabricatorLayout })));
const _UnifiedDesignPage = lazy(() => import("./pages/fabricator/workflow/UnifiedDesignPage").then(m => ({ default: m.UnifiedDesignPage })));
const MeasuringPage = lazy(() => import("./pages/fabricator/workflow/MeasuringPage").then(m => ({ default: m.MeasuringPage })));
const DesignPage = lazy(() => import("./pages/fabricator/workflow/DesignPage").then(m => ({ default: m.DesignPage })));
const Preview3DPage = lazy(() => import("./pages/fabricator/workflow/Preview3DPage").then(m => ({ default: m.Preview3DPage })));
const OptimizationPage = lazy(() => import("./pages/fabricator/workflow/OptimizationPage").then(m => ({ default: m.OptimizationPage })));
const _InventoryWorkflowPage = lazy(() => import("./pages/fabricator/workflow/InventoryPage").then(m => ({ default: m.InventoryPage })));
const ProductionPage = lazy(() => import("./pages/fabricator/workflow/ProductionPage").then(m => ({ default: m.ProductionPage })));
const _QualityControlWorkflowPage = lazy(() => import("./pages/fabricator/workflow/QualityControlPage").then(m => ({ default: m.QualityControlPage })));
const _DebugWorkflowPage = lazy(() => import("./pages/DebugWorkflowPage").then(m => ({ default: m.DebugWorkflowPage })));

// Gold Tier Foundation Components - Lazy loaded
const ActivityTimeline = lazy(() => import("./core/activity/ActivityTimeline.tsx").then(m => ({ default: m.ActivityTimeline })));
const PaymentForm = lazy(() => import("./components/commercial/PaymentForm.tsx").then(m => ({ default: m.PaymentForm })));
const ReportingDashboard = lazy(() => import("./components/commercial/ReportingDashboard.tsx").then(m => ({ default: m.ReportingDashboard })));

// Strategic Transformation Features - lazy loaded
const SmartWizardPage = lazy(() => import("./pages/SmartWizardPage.tsx"));
const PatternLibraryPage = lazy(() => import("./pages/PatternLibraryPage.tsx"));
const MachineTestingPage = lazy(() => import("./pages/MachineTestingPage.tsx"));
const ValidationDashboardPage = lazy(() => import("./pages/ValidationDashboardPage.tsx"));
const BentProfileDesignerPage = lazy(() => import("./pages/BentProfileDesignerPage.tsx"));

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

// Redirect component for /fabricator-workflow with hash handling
const FabricatorWorkflowRedirect: React.FC = () => {
  const location = useLocation();
  const hash = location.hash.replace('#', '');
  const searchParams = new URLSearchParams(location.search);
  const isNewProject = searchParams.get('new') === 'true';

  // If new=true query parameter, render FabricatorWorkflow component which has wizard logic
  // This allows the wizard to open properly when user clicks "New Project"
  if (isNewProject) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
        <_FabricatorWorkflow />
      </Suspense>
    );
  }

  // Special case: inventory hash should go to inventory page
  if (hash === 'inventory') {
    return <Navigate to="/fabricator/inventory" replace />;
  }

  // Other hashes: redirect to engineering-bay with hash preserved
  if (hash) {
    return <Navigate to={`/fabricator/workflow/engineering-bay${location.hash}`} replace />;
  }

  // No hash: default to engineering-bay
  return <Navigate to="/fabricator/workflow/engineering-bay" replace />;
};

// Gold Tier Demo/Test Components
const ActivityTimelineDemo: React.FC = () => {
  const [entityType, setEntityType] = React.useState<string>('customer');
  const [entityId, setEntityId] = React.useState<string>('');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-slate-900/90 border border-amber-600/30 rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-amber-200 mb-4">Activity Timeline Demo</h1>
          <p className="text-slate-400 mb-6">
            Test the Activity Timeline component with different entity types and IDs.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full bg-slate-800 border border-amber-600/30 rounded px-3 py-2 text-white"
              >
                <option value="customer">Customer</option>
                <option value="project">Project</option>
                <option value="invoice">Invoice</option>
                <option value="quote">Quote</option>
                <option value="workflow">Workflow</option>
                <option value="production">Production</option>
                <option value="inventory">Inventory</option>
                <option value="profile">Profile</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">Entity ID</label>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Enter entity ID or leave empty for demo"
                className="w-full bg-slate-800 border border-amber-600/30 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          {entityId && (
            <Suspense fallback={<div className="text-slate-400">Loading timeline...</div>}>
              <ActivityTimeline
                entityType={entityType}
                entityId={entityId}
                limit={50}
                showHeader={true}
              />
            </Suspense>
          )}
          {!entityId && (
            <div className="bg-slate-800/50 border border-amber-600/20 rounded p-4 text-slate-400">
              Enter an entity ID to view the activity timeline. The timeline will show all activities logged for that entity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentTestPage: React.FC = () => {
  const [invoiceId, setInvoiceId] = React.useState<string>('');
  const [amount, setAmount] = React.useState<string>('100.00');
  const [currency, setCurrency] = React.useState<string>('USD');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900/90 border border-amber-600/30 rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-amber-200 mb-4">Payment Form Test</h1>
          <p className="text-slate-400 mb-6">
            Test the Payment Form component with Stripe integration.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">Invoice ID (optional)</label>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="invoice_123"
                className="w-full bg-slate-800 border border-amber-600/30 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                className="w-full bg-slate-800 border border-amber-600/30 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-amber-600/30 rounded px-3 py-2 text-white"
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-amber-600/20 rounded p-6">
            <Suspense fallback={<div className="text-slate-400">Loading payment form...</div>}>
              <PaymentForm
                invoiceId={invoiceId || undefined}
                amount={parseFloat(amount) || 0}
                currency={currency as 'USD' | 'EGP' | 'EUR' | 'GBP'}
                onSuccess={(paymentId) => {
                  console.log('Payment successful:', paymentId);
                  alert(`Payment successful! Payment ID: ${paymentId}`);
                }}
                onError={(error) => {
                  console.error('Payment failed:', error);
                  alert(`Payment failed: ${error.message}`);
                }}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
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
        '/fabricator-workflow',
        '/fabricator/tuning-studio-no-dxf',
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
        <Prestige3DLoader show3DAnimation={true}>
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
                                  {/* Legacy fabricator routes - redirect to new structure */}
                                  <Route path="/fabricator-workflow/pro" element={<Navigate to="/fabricator/workflow/pro" replace />} />
                                  <Route path="/fabricator" element={<Navigate to="/fabricator/projects" replace />} />

                                  {/* NEW STUDIO ARCHITECTURE - PHASE 1 REFACTOR */}
                                  <Route path="/fabricator/studio" element={<Suspense fallback={getLoadingComponent('Studio Layout')}><StudioLayout /></Suspense>}>
                                    <Route index element={<Navigate to="command" replace />} />

                                    {/* 1. Command Center */}
                                    <Route path="command" element={<Suspense fallback={getLoadingComponent('Command Center')}><_FabricatorDashboard /></Suspense>} />

                                    {/* 2. Project Studio */}
                                    <Route path="project/*" element={<Suspense fallback={getLoadingComponent('Project Studio')}><ProjectStudioLayout /></Suspense>}>
                                      <Route index element={<ProjectsPage />} />
                                      <Route path=":projectId" element={<Navigate to="/fabricator/workflow/engineering-bay" replace />} />
                                    </Route>

                                    {/* 3. Design Studio */}
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
                                  </Route>

                                  {/* NEW: Workflow Pages with FabricatorLayout (Bosphorus Bridge Pattern) */}
                                  <Route
                                    path="/fabricator/workflow/*"
                                    element={
                                      <Suspense fallback={<PageLoadingWrapper message="Loading Workflow..." variant="fullscreen"><div /></PageLoadingWrapper>}>
                                        <FabricatorLayout />
                                      </Suspense>
                                    }
                                  >
                                    {/* 1. Measuring - Smart Measuring Interface */}
                                    <Route
                                      path="measuring/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/measuring')}>
                                          <MeasuringPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 2. Design - Engineering Bay */}
                                    <Route
                                      path="design/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/design')}>
                                          <DesignPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 3. 3D Preview - Window3DGenerator */}
                                    <Route
                                      path="preview3d/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/preview3d')}>
                                          <Preview3DPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 4. Optimization - Cutting Plan */}
                                    <Route
                                      path="optimization/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/optimization')}>
                                          <OptimizationPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 5. Inventory - Stock Check */}
                                    <Route
                                      path="inventory/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/inventory')}>
                                          <InventoryPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 6. Production - CNC Commands */}
                                    <Route
                                      path="production/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/production')}>
                                          <ProductionPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* 7. Quality Control - Final Verification */}
                                    <Route
                                      path="quality-control/:projectId?"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/workflow/quality-control')}>
                                          <QualityControlPage />
                                        </Suspense>
                                      }
                                    />

                                    {/* Legacy routes for backward compatibility */}
                                    <Route path="engineering-bay/:projectId?" element={<Navigate to="../design" replace />} />
                                    <Route path="pro" element={<Suspense fallback={getLoadingComponent('/fabricator/workflow/pro')}><FabricatorWorkflowPro /></Suspense>} />

                                    {/* Default: redirect to measuring */}
                                    <Route index element={<Navigate to="measuring" replace />} />
                                  </Route>

                                  {/* General Workspace Pages with MasterLayout (Dark Gold Prestige) */}
                                  <Route
                                    path="/fabricator/*"
                                    element={
                                      <Suspense fallback={<PageLoadingWrapper message="Loading Prestige Workspace..." variant="fullscreen"><div /></PageLoadingWrapper>}>
                                        <MasterLayout currentPhase="design" />
                                      </Suspense>
                                    }
                                  >
                                    <Route index element={<Navigate to="/fabricator/projects" replace />} />
                                    <Route
                                      path="projects"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/projects')}>
                                          <ProjectsPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="customers"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/customers')}>
                                          <ProtectedRoute>
                                            <CustomersPage />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="inventory"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/inventory')}>
                                          <ProtectedRoute>
                                            <InventoryPage />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="profiles"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/profiles')}>
                                          <ProtectedRoute>
                                            <ProfilesPage />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="commercial"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/commercial')}>
                                          <CommercialPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="system-packs"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/system-packs')}>
                                          <SystemPacksPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="pricing"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/pricing')}>
                                          <ProtectedRoute>
                                            <FabricatorPricingConfiguration />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="reports"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/reports')}>
                                          <ProtectedRoute>
                                            <FabricatorReportsPage />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="settings/branding"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/settings/branding')}>
                                          <ProtectedRoute>
                                            <FabricatorBrandingSettings />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="profile-studio"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/profile-studio')}>
                                          <ProfileStudioLite />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="system-pack-studio"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/system-pack-studio')}>
                                          <SystemPacksPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="turkish-gallery"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/turkish-gallery')}>
                                          <TurkishProfileGallery />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="tuning-studio"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/tuning-studio')}>
                                          <SystemPackTuningStudio />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="tuning-studio-no-dxf"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/tuning-studio-no-dxf')}>
                                          <NoDXFTuningStudio />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="smart-wizard"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/smart-wizard')}>
                                          <SmartWizardPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="pattern-library"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/pattern-library')}>
                                          <PatternLibraryPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="machine-testing"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/machine-testing')}>
                                          <MachineTestingPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="validation"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/validation')}>
                                          <ValidationDashboardPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="bent-profile-designer"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/bent-profile-designer')}>
                                          <BentProfileDesignerPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="onboarding"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/onboarding')}>
                                          <OnboardingPage />
                                        </Suspense>
                                      }
                                    />
                                    {/* Gold Tier Foundation - Test/Demo Routes */}
                                    <Route
                                      path="activity-timeline"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/activity-timeline')}>
                                          <ProtectedRoute>
                                            <ActivityTimelineDemo />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="payment-test"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/payment-test')}>
                                          <ProtectedRoute>
                                            <PaymentTestPage />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="reports-dashboard"
                                      element={
                                        <Suspense fallback={getLoadingComponent('/fabricator/reports-dashboard')}>
                                          <ProtectedRoute>
                                            <ReportingDashboard />
                                          </ProtectedRoute>
                                        </Suspense>
                                      }
                                    />
                                  </Route>

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

                                  {/* Regional Features Demo */}
                                  <Route path="/demo/regional-features" element={<Suspense fallback={getLoadingComponent('/demo')}><RegionalFeaturesDemo /></Suspense>} />

                                  {/* AI Recommendation Demo */}
                                  <Route path="/demo/ai-recommendations" element={<Suspense fallback={getLoadingComponent('/demo')}><AIRecommendationDemo /></Suspense>} />

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
