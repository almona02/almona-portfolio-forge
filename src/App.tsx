import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import Script from 'react-google-analytics'; // or use gtag directly
import { SpeedInsights } from '@vercel/speed-insights/react';

// Core pages (essential) - loaded immediately
const Index = lazy(() => import("./pages/Index.tsx"));
const Products = lazy(() => import("./pages/Products.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
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

// Shop and e-commerce - lazy loaded with prefetch
const Shop = lazy(() => import("./pages/Shop"));
const UsedMachines = lazy(() => import("./pages/UsedMachines.tsx"));
const UsedMachineDetailPage = lazy(() => import("./pages/UsedMachineDetail.tsx"));
const SellUsedMachine = lazy(() => import("./pages/SellUsedMachine.tsx"));
const SpareParts = lazy(() => import("./pages/SpareParts.tsx"));

// Product details - lazy loaded
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail.tsx"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail.tsx"));

// New Yilmaz Dealer Pages - lazy loaded
const YilmazDealer = lazy(() => import("./pages/YilmazDealer.tsx"));
const YilmazService = lazy(() => import("./pages/YilmazService.tsx"));
const YilmazTraining = lazy(() => import("./pages/YilmazTraining.tsx"));

// Digital Egypt Initiative - lazy loaded
const DigitalEgypt = lazy(() => import("./pages/DigitalEgypt.tsx"));

// Workflow and fabrication - lazy loaded
const WorkflowDetail = lazy(() => import("./pages/workflows/WorkflowDetail.tsx"));
const FabricationWorkflowDetail = lazy(() => import("./pages/FabricationWorkflowDetail.tsx"));
const FabricationServices = lazy(() => import("./pages/FabricationServices.tsx"));
const FabricatorWorkflow = lazy(() => import("./pages/FabricatorWorkflow.tsx"));
const FabricatorWorkflowPro = lazy(() => import("./components/fabricator/FabricatorWorkflowPro.tsx"));
const FabricatorDashboard = lazy(() => import("./pages/FabricatorDashboard.tsx"));
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
const CommercialPage = lazy(() => import("./pages/CommercialPage.tsx").catch(() => ({
  default: () => null,
})));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));

// Quote system - lazy loaded
const QuotePage = lazy(() => import("./pages/QuotePage.tsx"));
const QuoteConfirmationPage = lazy(() => import("./pages/QuoteConfirmationPage.tsx"));

// 3D model viewers - lazy loaded (heavy components)
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo.tsx"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest.tsx"));
const SwiftXRTest = lazy(() => import("./pages/SwiftXRTest.tsx"));

// Authentication - lazy loaded
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal.tsx"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));

// Admin and support - lazy loaded (admin features)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const CreateTicketPage = lazy(() => import("./pages/CreateTicketPage.tsx"));
const RegisterMachinePage = lazy(() => import("./pages/RegisterMachinePage.tsx"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport.tsx"));
const RegionalFeaturesDemo = lazy(() => import("./pages/RegionalFeaturesDemo.tsx"));
const AIRecommendationDemo = lazy(() => import("./pages/AIRecommendationDemo.tsx"));

// National Service Dashboard - Egypt Vision 2030
const NationalDashboard = lazy(() => import("./pages/NationalDashboard.tsx"));

const queryClient = new QueryClient();

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
const RoutePrefetchingHelper = () => {
  useRoutePrefetching();
  return null;
};

// Global error handler for dynamic import failures
const GlobalDynamicImportGuard = () => {
  useEffect(() => {
    const handler = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message || ev.reason || '').toLowerCase();
      if (msg.includes('failed to fetch dynamically imported module')) {
        console.warn('Dynamic import failed, attempting recovery...');
        // Simple recovery: reload page after a short delay
        setTimeout(() => window.location.reload(), 1000);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  return null;
};

const App = () => (
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
                      <Analytics />
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
    <SpeedInsights />
  </ChunkLoadingErrorBoundary>
);

export default App;
