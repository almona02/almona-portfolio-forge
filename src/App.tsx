import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, memo } from "react";
import { lazyRetry } from "./utils/lazyImport";
import { ThemeProvider } from "next-themes";
import SEO from "./components/SEO";
import { PageLoadingWrapper } from "./components/ui/PageLoadingWrapper";
import { PrestigeLoader } from "./components/ui/PrestigeLoader";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ChunkLoadingErrorBoundary } from "./components/ui/ChunkLoadingErrorBoundary";
import { QuoteProvider } from "./context/QuoteContext.tsx";
import { FabricatorWorkspaceProvider } from "./context/FabricatorWorkspaceContext";
import { AuthProvider } from "./context/AuthContext.tsx";
import { LoadingProvider } from "./context/LoadingContext.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { ABTestProvider } from "./components/analytics/ABTestProvider";
import { Analytics } from "@vercel/analytics/react";
import RegionAwareLayout from "./components/layout/RegionAwareLayout";
import { useRoutePrefetching } from "./hooks/useRoutePrefetching";
import { SpeedInsights } from '@vercel/speed-insights/react';
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
const YilmazService = lazy(() => import("./pages/YilmazService.tsx"));
const YilmazTraining = lazy(() => import("./pages/YilmazTraining.tsx"));

// Digital Egypt Initiative - lazy loaded
const DigitalEgypt = lazy(() => import("./pages/DigitalEgypt.tsx"));

// Workflow and fabrication - lazy loaded with retry (HEAVY ROUTES)
const WorkflowDetail = lazyRetry(() => import("./pages/workflows/WorkflowDetail.tsx"), "WorkflowDetail");
const FabricationWorkflowDetail = lazyRetry(() => import("./pages/FabricationWorkflowDetail.tsx"), "FabricationWorkflowDetail");
const FabricationServices = lazyRetry(() => import("./pages/FabricationServices.tsx"), "FabricationServices");
const FabricatorWorkflow = lazyRetry(() => import("./pages/FabricatorWorkflow.tsx"), "FabricatorWorkflow");
const FabricatorWorkflowPro = lazyRetry(() => import("./components/fabricator/FabricatorWorkflowPro.tsx"), "FabricatorWorkflowPro");
const FabricatorDashboard = lazyRetry(() => import("./pages/FabricatorDashboard.tsx"), "FabricatorDashboard");
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
const FabricatorWorkspaceLayout = lazy(
  () => import("./components/fabricator/FabricatorWorkspaceLayout.tsx"),
);
const ProfileStudioLite = lazy(() => import("./components/fabricator/ProfileStudioLite.tsx").then(m => ({ default: m.ProfileStudioLite })));
const TurkishProfileGallery = lazy(() => import("./components/fabricator/TurkishProfileGallery.tsx").then(m => ({ default: m.TurkishProfileGallery })));
const SystemPackTuningStudio = lazy(() => import("./components/fabricator/SystemPackTuningStudio.tsx").then(m => ({ default: m.SystemPackTuningStudio })));
const NoDXFTuningStudio = lazy(() => import("./components/fabricator/NoDXFTuningStudio.tsx").then(m => ({ default: m.NoDXFTuningStudio })));
const CommercialPage = lazy(() => import("./pages/CommercialPage.tsx").catch(() => ({
  default: () => null,
})));
const SystemPacksPage = lazy(() => import("./pages/SystemPacksPage.tsx").then(m => ({ default: m.SystemPacksPage })));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));

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
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));

// Admin and support - lazy loaded with retry (HEAVY ROUTES)
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard.tsx"), "AdminDashboard");
const CreateTicketPage = lazyRetry(() => import("./pages/CreateTicketPage.tsx"), "CreateTicketPage");
const RegisterMachinePage = lazyRetry(() => import("./pages/RegisterMachinePage.tsx"), "RegisterMachinePage");
const CustomerSupport = lazyRetry(() => import("./pages/CustomerSupport.tsx"), "CustomerSupport");
const RegionalFeaturesDemo = lazyRetry(() => import("./pages/RegionalFeaturesDemo.tsx"), "RegionalFeaturesDemo");
const AIRecommendationDemo = lazyRetry(() => import("./pages/AIRecommendationDemo.tsx"), "AIRecommendationDemo");

// National Service Dashboard - Egypt Vision 2030
const NationalDashboard = lazy(() => import("./pages/NationalDashboard.tsx"));

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
      <PrestigeLoader>
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
                  
                  {/* Workflows */}
                  <Route path="/workflows/upvc-fabrication" element={<Suspense fallback={getLoadingComponent('/workflows')}><WorkflowDetail /></Suspense>} />
                  <Route path="/workflows/fabrication-detail" element={<Suspense fallback={getLoadingComponent('/workflows')}><FabricationWorkflowDetail /></Suspense>} />
                  <Route path="/fabrication-services" element={<Suspense fallback={getLoadingComponent('/fabrication')}><FabricationServices /></Suspense>} />
                  <Route path="/fabricator-workflow" element={<Suspense fallback={getLoadingComponent('/fabricator')}><FabricatorWorkflow /></Suspense>} />
                  <Route path="/fabricator-workflow/pro" element={<Suspense fallback={getLoadingComponent('/fabricator-workflow/pro')}><FabricatorWorkflowPro /></Suspense>} />
                  <Route path="/fabricator" element={<Suspense fallback={getLoadingComponent('/fabricator')}><FabricatorDashboard /></Suspense>} />
                  <Route
                    path="/fabricator/*"
                    element={
                      <Suspense fallback={<PageLoadingWrapper message="Loading Fabricator Workspace..." variant="fullscreen" />}>
                        <FabricatorWorkspaceLayout />
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
                  </Route>
                  
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
                  
                  {/* Regional Features Demo */}
                  <Route path="/demo/regional-features" element={<Suspense fallback={getLoadingComponent('/demo')}><RegionalFeaturesDemo /></Suspense>} />
                  
                  {/* AI Recommendation Demo */}
                  <Route path="/demo/ai-recommendations" element={<Suspense fallback={getLoadingComponent('/demo')}><AIRecommendationDemo /></Suspense>} />
                  
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
      </PrestigeLoader>
    </ErrorBoundary>
    {isProd && isVercel && <SpeedInsights />}
  </ChunkLoadingErrorBoundary>
  );
});

App.displayName = 'App';

export default App;
