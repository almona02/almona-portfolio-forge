import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import SEO from "./components/SEO";
import UsedMachineDetailPage from "./pages/UsedMachineDetail.tsx";
import { PageLoadingWrapper } from "./components/ui/PageLoadingWrapper";
// (Removed complex retry/prefetch helpers to simplify lazy loading.)

// Lazy load all page components with optimized chunking
// Core pages (loaded immediately)
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const About = lazy(() => import("./pages/About.tsx"));

// Shop and product pages (heavy components)
const Shop = lazy(() => import("./pages/Shop"));
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail.tsx"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail.tsx"));
const UsedMachines = lazy(() => import("./pages/UsedMachines"));
const SellUsedMachine = lazy(() => import("./pages/SellUsedMachine.tsx"));
const SpareParts = lazy(() => import("@/pages/SpareParts.tsx"));

// Workflow and fabrication pages
const WorkflowDetail = lazy(() => import("./pages/workflows/WorkflowDetail"));
const FabricationWorkflowDetail = lazy(
  () => import("./pages/FabricationWorkflowDetail.tsx")
);
const FabricationServices = lazy(() => import("./pages/FabricationServices.tsx"));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));

// Quote and model viewer pages (3D heavy)
const QuotePage = lazy(() => import("./pages/QuotePage.tsx"));
const QuoteConfirmationPage = lazy(
  () => import("./pages/QuoteConfirmationPage.tsx")
);
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo.tsx"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest.tsx"));

// Auth and user pages
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal.tsx"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));

// Admin and support pages (admin chunk)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const CreateTicketPage = lazy(() => import("./pages/CreateTicketPage.tsx"));
const RegisterMachinePage = lazy(() => import("./pages/RegisterMachinePage.tsx"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport.tsx"));

// Legacy pages
const Portfolio = lazy(() => import("./pages/Portfolio.tsx"));

// Apply dark mode by default
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

// Enhanced loading components for different types of pages
const LoadingSpinner = ({ message = "Loading page..." }: { message?: string }) => (
  <PageLoadingWrapper 
    message={message} 
    variant="fullscreen"
  >
    <div />
  </PageLoadingWrapper>
);

// Specialized loading components for different page types
const AdminLoadingSpinner = () => (
  <LoadingSpinner message="Loading admin dashboard..." />
);

const ShopLoadingSpinner = () => (
  <LoadingSpinner message="Loading shop components..." />
);

const ModelLoadingSpinner = () => (
  <LoadingSpinner message="Loading 3D models..." />
);

const AuthLoadingSpinner = () => (
  <LoadingSpinner message="Loading authentication..." />
);

import { QuoteProvider } from "./context/QuoteContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { LoadingProvider } from "./context/LoadingContext.tsx";
import { Analytics } from "@vercel/analytics/react";

// Install global guard for dynamic import failures (helps with rare transient 404 in dev)
const GlobalDynamicImportGuard = () => {
  useEffect(() => {
    const handler = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message || ev.reason || '').toLowerCase();
      if (msg.includes('failed to fetch dynamically imported module')) {
        // Attempt a soft reload of just the affected script by appending a <link rel="modulepreload">
        const servicesHref = '/src/pages/Services.tsx';
        if (!document.querySelector(`link[data-preload="services"]`)) {
          const l = document.createElement('link');
            l.rel = 'modulepreload';
            l.href = servicesHref;
            l.setAttribute('data-preload', 'services');
            document.head.appendChild(l);
        }
        // Fallback: schedule full page reload if user navigated to /services and module still missing after 1s
        if (location.pathname.startsWith('/services')) {
          setTimeout(() => {
            // If route still showing error boundary container, reload
            const errorNode = document.querySelector('[data-error-boundary]');
            if (errorNode) window.location.reload();
          }, 1000);
        }
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  return null;
};

const App = () => (
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
                {/* Centralized route configuration for maintainability */}
                {(() => {
                  const routes = [
                    { path: "/", element: <Index /> },
                    { path: "/products", element: <Products /> },
                    { path: "/products/machines", element: <Products /> },
                    { path: "/products/profiles", element: <Products /> },
                    { path: "/products/machines/:machineId", element: <MachineDetail /> },
                    { path: "/products/profiles/:profileId", element: <ProfileDetail /> },
                    // Egyptian Market Routes
                    { path: "/products/upvc/windows", element: <Products /> },
                    { path: "/products/upvc/doors", element: <Products /> },
                    { path: "/products/aluminum/thermal-break", element: <Products /> },
                    { path: "/workflows/upvc-fabrication", element: <WorkflowDetail /> },
                    { path: "/workflows/fabrication-detail", element: <FabricationWorkflowDetail /> },
                    { path: "/services/egypt/maintenance-centers", element: <Services /> },
                    { path: "/services", element: <Services /> },
                    { path: "/services/training", element: <TrainingServicesPage /> },
                    // Removed duplicate /services-new
                    { path: "/usedmachines", element: <UsedMachines /> },
                    { path: "/usedmachines/:id", element: <UsedMachineDetailPage /> },
                    { path: "/shop", element: <Shop /> },
                    { path: "/contact", element: <Contact /> },
                    { path: "/portfolio", element: <Portfolio /> },
                    { path: "/about", element: <About /> },
                    { path: "/quote", element: <QuotePage /> },
                    { path: "/quotes/confirmation", element: <QuoteConfirmationPage /> },
                    { path: "/3d-demo", element: <ModelViewerDemo /> },
                    { path: "/3d-test", element: <ModelViewerTest /> },
                    { path: "/login", element: <Login /> },
                    { path: "/register", element: <Register /> },
                    { path: "/portal", element: (
                      <ProtectedRoute>
                        <CustomerPortal />
                      </ProtectedRoute>
                    ) },
                    { path: "/usedmachines/sell", element: (
                      <ProtectedRoute>
                        <SellUsedMachine />
                      </ProtectedRoute>
                    ) },
                    { path: "/portal/create-ticket", element: (
                      <ProtectedRoute>
                        <Navigate to="/support/tickets/new" replace />
                      </ProtectedRoute>
                    ) },
                    { path: "/support/tickets/new", element: (
                      <ProtectedRoute>
                        <CreateTicketPage />
                      </ProtectedRoute>
                    ) },
                    { path: "/portal/register-machine", element: (
                      <ProtectedRoute>
                        <RegisterMachinePage />
                      </ProtectedRoute>
                    ) },
                    { path: "/fabrication-services", element: <FabricationServices /> },
                    { path: "/spare-parts", element: <SpareParts /> },
                    { path: "/admin/dashboard", element: (
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    ) },
                    { path: "/admin/demo", element: (
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    ) },
                    { path: "/support", element: (
                      <ProtectedRoute>
                        <CustomerSupport />
                      </ProtectedRoute>
                    ) },
                    { path: "/support/new", element: (
                      <ProtectedRoute>
                        <Navigate to="/support/tickets/new" replace />
                      </ProtectedRoute>
                    ) },
                    { path: "*", element: <NotFound /> },
                  ];

                  return (
                    <Routes>
                      {routes.map(r => {
                        // Determine appropriate loading component based on route
                        const getLoadingComponent = (path: string) => {
                          if (path.includes('/admin')) return <AdminLoadingSpinner />;
                          if (path.includes('/shop') || path.includes('/products') || path.includes('/usedmachines')) return <ShopLoadingSpinner />;
                          if (path.includes('/3d') || path.includes('/quote') || path.includes('/model')) return <ModelLoadingSpinner />;
                          if (path.includes('/login') || path.includes('/register') || path.includes('/portal')) return <AuthLoadingSpinner />;
                          return <LoadingSpinner message={`Loading ${path === '/' ? 'home' : path.replace('/', '').replace('-', ' ')} page...`} />;
                        };

                        return (
                          <Route 
                            key={r.path} 
                            path={r.path} 
                            element={
                              <Suspense fallback={getLoadingComponent(r.path)}>
                                {r.element}
                              </Suspense>
                            } 
                          />
                        );
                      })}
                    </Routes>
                  );
                })()}
              </BrowserRouter>
            </QuoteProvider>
          </LoadingProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
