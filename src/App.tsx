import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import SEO from "./components/SEO";
import ErrorBoundary from "./components/ErrorBoundary";
import UsedMachineDetailPage from "./pages/UsedMachineDetail.tsx";

// Resilient lazy loader with retry to mitigate transient network/service worker hiccups
function retryableLazy<T extends { default: React.ComponentType<unknown> }>(importer: () => Promise<T>, retries = 3, delay = 500) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastErr = err;
        // Only retry on network-like failures
        const message = (err as Error)?.message || '';
        const retriable = /fetch|network|loading chunk/i.test(message);
        if (!retriable && attempt > 0) break;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt)));
      }
    }
    throw lastErr;
  });
}

// Prefetch a few critical modules after idle to reduce dynamic import race conditions
const PrefetchCritical = () => {
  useEffect(() => {
    const heavyModules = [
      './pages/CustomerPortal.tsx',
      './pages/FabricationServices.tsx'
    ];

    // Dev helper: add modulepreload links (in production Vite rewrites to chunk graph automatically)
    if (import.meta.env.DEV) {
      heavyModules.forEach(href => {
        if (!document.querySelector(`link[data-preload="${href}"]`)) {
          const l = document.createElement('link');
          l.rel = 'modulepreload';
          l.href = href;
          l.setAttribute('data-preload', href);
          document.head.appendChild(l);
        }
      });
    }

    const loadAll = () => {
      import('./pages/Index');
      import('./pages/Products.tsx');
      import('./pages/CustomerPortal.tsx');
      import('./pages/FabricationServices.tsx');
    };

    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadAll);
    } else {
      setTimeout(loadAll, 1200);
    }
  }, []);
  return null;
};

// Lazy load all page components for better performance using retryable loader
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products.tsx"));
const Services = retryableLazy(() => import("./pages/Services.tsx"));
const ServicesNew = retryableLazy(() => import("./pages/Services.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.tsx"));
const Shop = lazy(() => import("./pages/Shop.tsx"));
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail.tsx"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail.tsx"));
const About = lazy(() => import("./pages/About.tsx"));

const WorkflowDetail = lazy(() => import("./pages/workflows/WorkflowDetail"));
const UsedMachines = lazy(() => import("./pages/UsedMachines"));
const FabricationWorkflowDetail = lazy(
  () => import("./pages/FabricationWorkflowDetail.tsx")
);
const QuotePage = lazy(() => import("./pages/QuotePage.tsx"));
const QuoteConfirmationPage = lazy(
  () => import("./pages/QuoteConfirmationPage.tsx")
);
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo.tsx"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const CustomerPortal = retryableLazy(() => import("./pages/CustomerPortal.tsx"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute.tsx"));
const SellUsedMachine = lazy(() => import("./pages/SellUsedMachine.tsx"));
const FabricationServices = lazy(() => import("./pages/FabricationServices.tsx"));
const SpareParts = lazy(() => import("@/pages/SpareParts.tsx"));
const TrainingServicesPage = lazy(() => import("./routes/TrainingServicesPage.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const CreateTicketPage = lazy(() => import("./pages/CreateTicketPage.tsx"));
const RegisterMachinePage = lazy(() => import("./pages/RegisterMachinePage.tsx"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport.tsx"));
const SupportNewTicketMenu = lazy(() => import('./pages/SupportNewTicketMenu.tsx'));

// Apply dark mode by default
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

// Loading component for lazy-loaded routes
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-almona-dark text-white transition-colors">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-almona-light/20 border-t-almona-orange"></div>
  </div>
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
                <PrefetchCritical />
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Index />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/machines"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/profiles"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/machines/:machineId"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <MachineDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/profiles/:profileId"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProfileDetail />
                      </Suspense>
                    }
                  />
                  {/* Egyptian Market Routes */}
                  <Route
                    path="/products/upvc/windows"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/upvc/doors"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/products/aluminum/thermal-break"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Products />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/workflows/upvc-fabrication"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <WorkflowDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/workflows/fabrication-detail"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <FabricationWorkflowDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/services/egypt/maintenance-centers"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Services />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/services"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Services />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/services/training"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <TrainingServicesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/services-new"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ServicesNew />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/usedmachines"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <UsedMachines />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/usedmachines/:id"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <UsedMachineDetailPage />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/shop"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Shop />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/contact"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Contact />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/portfolio"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Portfolio />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <About />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/quote"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <QuotePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/quotes/confirmation"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <QuoteConfirmationPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/3d-demo"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ModelViewerDemo />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/3d-test"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ModelViewerTest />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Login />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Register />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/portal"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <CustomerPortal />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/usedmachines/sell"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <SellUsedMachine />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/portal/create-ticket"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <Navigate to="/support/tickets/new" replace />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/support/tickets/new"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <CreateTicketPage />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/portal/register-machine"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <RegisterMachinePage />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fabrication-services"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <FabricationServices />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/spare-parts"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SpareParts />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/demo"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/support"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <CustomerSupport />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/support/new"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ProtectedRoute>
                          <Navigate to="/support/tickets/new" replace />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}

                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </QuoteProvider>
          </LoadingProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
