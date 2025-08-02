import { Toaster } from "@/shared/ui/ui/toaster.tsx";
import { Toaster as Sonner } from "@/shared/ui/ui/sonner.tsx";
import { TooltipProvider } from "@/shared/ui/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import SEO from "./components/SEO";
import UsedMachineDetailPage from "./pages/UsedMachineDetail";

// Lazy load all page components for better performance
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const Services = lazy(() => import("./pages/Services"));
const ServicesNew = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Shop = lazy(() => import("./pages/Shop-enhanced"));
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail"));
const ProfileDetail = lazy(() => import("./pages/profiles/ProfileDetail"));
const About = lazy(() => import("./pages/About"));

const WorkflowDetail = lazy(() => import("./pages/workflows/WorkflowDetail"));
const UsedMachines = lazy(() => import("./pages/UsedMachines"));
const FabricationWorkflowDetail = lazy(() => import("./pages/FabricationWorkflowDetail"));
const QuotePage = lazy(() => import("./pages/QuotePage"));
const QuoteConfirmationPage = lazy(() => import("./pages/QuoteConfirmationPage"));
const ModelViewerDemo = lazy(() => import("./pages/ModelViewerDemo"));
const ModelViewerTest = lazy(() => import("./pages/ModelViewerTest"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));
const SellUsedMachine = lazy(() => import("./pages/SellUsedMachine"));


// Apply dark mode by default
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();


// Loading component for lazy-loaded routes
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

import { QuoteProvider } from "./context/QuoteContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
// import { Analytics } from "@vercel/analytics"; // Temporarily commented out to fix build issues

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <SEO />
        <Toaster />
        <Sonner />
        <AuthProvider>
          <QuoteProvider>
            <BrowserRouter>
              {/* <Analytics /> */} {/* Temporarily commented out to fix build issues */}
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
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;