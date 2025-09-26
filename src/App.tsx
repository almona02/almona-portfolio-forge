import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import SEO from "./components/SEO";
import { PageLoadingWrapper } from "./components/ui/PageLoadingWrapper";
import { CriticalPathLoader } from "./components/ui/CriticalPathLoader";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ChunkLoadingErrorBoundary } from "./components/ui/ChunkLoadingErrorBoundary";
import { MainChunkTest } from "./components/ui/MainChunkTest";
import { QuoteProvider } from "./context/QuoteContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { LoadingProvider } from "./context/LoadingContext.tsx";
import { Analytics } from "@vercel/analytics/react";

// Core pages (essential)
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Shop and e-commerce
const Shop = lazy(() => import("./pages/Shop"));
const UsedMachines = lazy(() => import("./pages/UsedMachines"));
const UsedMachineDetailPage = lazy(() => import("./pages/UsedMachineDetail.tsx"));
const SellUsedMachine = lazy(() => import("./pages/SellUsedMachine.tsx"));
const SpareParts = lazy(() => import("./pages/SpareParts.tsx"));

// Product details
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail.tsx"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail.tsx"));

// Workflow and fabrication
const WorkflowDetail = lazy(() => import("./pages/workflows/WorkflowDetail"));
const FabricationWorkflowDetail = lazy(() => import("./pages/FabricationWorkflowDetail.tsx"));
const FabricationServices = lazy(() => import("./pages/FabricationServices.tsx"));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));

// Quote system
const QuotePage = lazy(() => import("./pages/QuotePage.tsx"));
const QuoteConfirmationPage = lazy(() => import("./pages/QuoteConfirmationPage.tsx"));

// 3D model viewers
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo.tsx"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest.tsx"));

// Authentication
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal.tsx"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));

// Admin and support
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const CreateTicketPage = lazy(() => import("./pages/CreateTicketPage.tsx"));
const RegisterMachinePage = lazy(() => import("./pages/RegisterMachinePage.tsx"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport.tsx"));

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
      <CriticalPathLoader>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <TooltipProvider>
              <SEO />
              <Toaster />
              <Sonner />
              <AuthProvider>
                <LoadingProvider>
                  <QuoteProvider>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}
                    >
                      <GlobalDynamicImportGuard />
                      <Analytics />
                      <MainChunkTest />
                <Routes>
                  {/* Core pages */}
                  <Route path="/" element={<Suspense fallback={getLoadingComponent('/')}><Index /></Suspense>} />
                  <Route path="/about" element={<Suspense fallback={getLoadingComponent('/about')}><About /></Suspense>} />
                  <Route path="/contact" element={<Suspense fallback={getLoadingComponent('/contact')}><Contact /></Suspense>} />
                  
                  {/* Products */}
                  <Route path="/products" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  <Route path="/products/machines" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  <Route path="/products/profiles" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  <Route path="/products/machines/:machineId" element={<Suspense fallback={getLoadingComponent('/products')}><MachineDetail /></Suspense>} />
                  <Route path="/products/profiles/:profileId" element={<Suspense fallback={getLoadingComponent('/products')}><ProfileDetail /></Suspense>} />
                  
                  {/* Egyptian Market Routes */}
                  <Route path="/products/upvc/windows" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  <Route path="/products/upvc/doors" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  <Route path="/products/aluminum/thermal-break" element={<Suspense fallback={getLoadingComponent('/products')}><Products /></Suspense>} />
                  
                  {/* Services */}
                  <Route path="/services" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                  <Route path="/services/egypt/maintenance-centers" element={<Suspense fallback={getLoadingComponent('/services')}><Services /></Suspense>} />
                  <Route path="/services/training" element={<Suspense fallback={getLoadingComponent('/services')}><TrainingServicesPage /></Suspense>} />
                  
                  {/* Workflows */}
                  <Route path="/workflows/upvc-fabrication" element={<Suspense fallback={getLoadingComponent('/workflows')}><WorkflowDetail /></Suspense>} />
                  <Route path="/workflows/fabrication-detail" element={<Suspense fallback={getLoadingComponent('/workflows')}><FabricationWorkflowDetail /></Suspense>} />
                  <Route path="/fabrication-services" element={<Suspense fallback={getLoadingComponent('/fabrication')}><FabricationServices /></Suspense>} />
                  
                  {/* Shop & E-commerce */}
                  <Route path="/shop" element={<Suspense fallback={getLoadingComponent('/shop')}><Shop /></Suspense>} />
                  <Route path="/usedmachines" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><UsedMachines /></Suspense>} />
                  <Route path="/usedmachines/:id" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><UsedMachineDetailPage /></Suspense>} />
                  <Route path="/usedmachines/sell" element={<Suspense fallback={getLoadingComponent('/usedmachines')}><ProtectedRoute><SellUsedMachine /></ProtectedRoute></Suspense>} />
                  <Route path="/spare-parts" element={<Suspense fallback={getLoadingComponent('/spare-parts')}><SpareParts /></Suspense>} />
                  
                  {/* Quote System */}
                  <Route path="/quote" element={<Suspense fallback={getLoadingComponent('/quote')}><QuotePage /></Suspense>} />
                  <Route path="/quotes/confirmation" element={<Suspense fallback={getLoadingComponent('/quotes')}><QuoteConfirmationPage /></Suspense>} />
                  
                  {/* 3D Model Viewers */}
                  <Route path="/3d-demo" element={<Suspense fallback={getLoadingComponent('/3d')}><ModelViewerDemo /></Suspense>} />
                  <Route path="/3d-test" element={<Suspense fallback={getLoadingComponent('/3d')}><ModelViewerTest /></Suspense>} />
                  
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
                  <Route path="/admin/dashboard" element={<Suspense fallback={getLoadingComponent('/admin')}><ProtectedRoute><AdminDashboard /></ProtectedRoute></Suspense>} />
                  <Route path="/admin/demo" element={<Suspense fallback={getLoadingComponent('/admin')}><ProtectedRoute><AdminDashboard /></ProtectedRoute></Suspense>} />
                  
                  {/* 404 */}
                  <Route path="*" element={<Suspense fallback={getLoadingComponent('/404')}><NotFound /></Suspense>} />
                </Routes>
              </BrowserRouter>
                  </QuoteProvider>
                </LoadingProvider>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </CriticalPathLoader>
    </ErrorBoundary>
  </ChunkLoadingErrorBoundary>
);

export default App;
