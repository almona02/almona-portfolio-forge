import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import SEO from "../components/SEO";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FloatingNumbers } from "../components/NotFound3DComponents";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  // const [isHovered, setIsHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [canRender3D, setCanRender3D] = useState(true);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      if (import.meta.env.DEV) {
        // Only log in dev
        console.error('404 Error: User attempted to access non-existent route:', location.pathname);
      }
      lastPathRef.current = location.pathname;
      if (typeof window !== 'undefined' && window.gtag && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        window.gtag('event', 'page_not_found', {
          page_path: location.pathname,
          page_title: '404 - Page Not Found'
        });
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const suggestedPages = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Services', path: '/services' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Contact', path: '/contact' }
  ];

  // Don't render Three.js components during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 text-center border border-white/20">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={handleGoHome}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="404 - Page Not Found"
        description="The page you're looking for doesn't exist. Return to ALMONA's homepage or explore our products and services."
      />
      
      {/* 3D Background */}
      <div className="fixed inset-0 z-0 opacity-20">
        {canRender3D ? (
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 50 }}
            onCreated={() => console.log('Canvas created successfully')}
            onError={(e) => {
              console.error("Canvas error:", e);
              setCanRender3D(false);
            }}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.2} />
            <directionalLight position={[0, 5, 5]} intensity={0.8} />
            <FloatingNumbers />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
          </Canvas>
        ) : (
          <div className="h-64 mb-6 relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
            <h1 className="text-8xl font-bold text-blue-600">404</h1>
          </div>
        )}
      </div>
      
      <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 text-center border border-white/20">
          {/* 3D 404 Display */}
          <div className="h-64 mb-6 relative">
            {canRender3D ? (
              <Canvas 
                camera={{ position: [0, 0, 5], fov: 50 }} 
                className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50"
                onCreated={() => console.log('Canvas created successfully')}
                onError={(e) => {
                  console.error("Canvas error:", e);
                  setCanRender3D(false);
                }}
              >
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} intensity={1.2} />
                <directionalLight position={[0, 5, 5]} intensity={0.8} />
                <FloatingNumbers />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
              </Canvas>
            ) : (
              <div className="h-64 mb-6 relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
                <h1 className="text-8xl font-bold text-blue-600">404</h1>
              </div>
            )}
          </div>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Lost in the Digital Space</h2>
          <p className="text-gray-600 mb-6">
            The page you&apos;re looking for seems to have drifted into orbit. 
            Let us guide you back to familiar territory.
          </p>

          {/* Attempted URL */}
          <div className="bg-gray-50/80 rounded-lg p-3 mb-6 backdrop-blur-sm">
            <p className="text-sm text-gray-500">Attempted destination:</p>
            <code className="text-sm font-mono text-gray-800 break-all">{location.pathname}</code>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleGoHome}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              // onMouseEnter={() => setIsHovered(true)}
              // onMouseLeave={() => setIsHovered(false)}
            >
              Return to Homebase
            </button>
            <button
              onClick={handleGoBack}
              className="flex-1 bg-white text-gray-800 px-6 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Navigate Back
            </button>
          </div>

          {/* Auto-redirect countdown */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 mb-6 backdrop-blur-sm">
            <p className="text-sm text-blue-800">
              Auto-pilot engaged. Returning to homepage in <span className="font-bold">{countdown}</span> seconds...
            </p>
          </div>

          {/* Suggested Pages */}
          <div className="text-left bg-white/80 p-4 rounded-xl backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recommended destinations:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {suggestedPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-primary hover:text-primary/80 px-3 py-2 rounded-lg transition-all duration-200 border border-white shadow-sm hover:shadow-md"
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>

          {/* Easter egg for developers */}
          <div className="mt-6 text-xs text-gray-400">
            <p>PS: Check the console for technical details 🛠️</p>
          </div>
        </div>
      </div>

      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
};

const NotFoundWithErrorBoundary = withErrorBoundary(NotFound);
NotFoundWithErrorBoundary.displayName = 'NotFoundWithErrorBoundary';
export default NotFoundWithErrorBoundary;