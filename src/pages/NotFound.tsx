import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SEO from "../components/SEO";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Track 404 errors with analytics if available
    if (window.gtag && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      window.gtag('event', 'page_not_found', {
        page_path: location.pathname,
        page_title: '404 - Page Not Found'
      });
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
    window.history.back();
  };

  const suggestedPages = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Services', path: '/services' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <>
      <SEO 
        title="404 - Page Not Found"
        description="The page you're looking for doesn't exist. Return to ALMONA's homepage or explore our products and services."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8 text-center">
          {/* 404 Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Attempted URL */}
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-500">You tried to access:</p>
            <code className="text-sm font-mono text-gray-800 break-all">{location.pathname}</code>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoHome}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Go to Homepage
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Go Back
            </button>
          </div>

          {/* Auto-redirect countdown */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              Redirecting to homepage in <span className="font-bold">{countdown}</span> seconds...
            </p>
          </div>

          {/* Suggested Pages */}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Or try these pages:</h3>
            <div className="grid grid-cols-2 gap-2">
              {suggestedPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="text-sm text-primary hover:text-primary/80 hover:underline text-left"
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
