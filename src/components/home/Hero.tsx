import { useState, useEffect, useCallback, useMemo, lazy, Suspense, startTransition } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, CheckCircle, Award } from "lucide-react";
import { NeonButton } from "@/shared/ui/ui/neon-button";

// Lazy load the heavy background component to improve LCP
const EgyptianIndustrialHero = lazy(() => import("./EgyptianIndustrialHero").then(module => ({ default: module.EgyptianIndustrialHero })));

// Component to handle lazy background loading with startTransition
const LazyBackground = () => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer loading until after initial render to avoid blocking LCP
    const timer = setTimeout(() => {
      startTransition(() => {
        setShouldLoad(true);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) return null;

  return (
    <div className="absolute inset-0 z-0">
      <Suspense fallback={null}>
        <EgyptianIndustrialHero>
          {/* Empty - content already rendered above */}
        </EgyptianIndustrialHero>
      </Suspense>
    </div>
  );
};

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Memoize slides to prevent unnecessary re-renders
  const slides = useMemo(() => [
    {
      id: 1,
      title: "Fabricator Pro",
      subtitle: "Empowering Egypt's Industrial Transformation",
      description: "Supporting Egypt Vision 2030",
      link: "/fabricator-workflow",
      badge: true,
      nationalFocus: true
    },
    {
      id: 2,
      title: "YILMAZ Machines",
      subtitle: "Premium Quality Aluminium & PVC Processing Machines",
      description: "Authorized Dealer in Egypt Since 2000",
      link: "/yilmaz-machines-egypt",
      badge: true
    },
    {
      id: 3,
      title: "ALMONA Co.",
      subtitle: "Your Trusted Partner Since 1991",
      description: "Expert Consultation, Sales & Service",
      link: "/about",
      badge: false
    },
  ], []);

  // Enhanced slide transition with smooth animation control
  const goToSlide = useCallback((index: number) => {
    if (index === activeSlide || isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveSlide(index);
    
    // Reset transitioning state after animation completes
    setTimeout(() => setIsTransitioning(false), 700);
  }, [activeSlide, isTransitioning]);

  // Auto-advance slides with pause on hover
  useEffect(() => {
    if (isTransitioning || isPaused) return;
    
    const interval = setInterval(() => {
      goToSlide(activeSlide === slides.length - 1 ? 0 : activeSlide + 1);
    }, 6000);

    return () => clearInterval(interval);
  }, [activeSlide, slides.length, isTransitioning, goToSlide, isPaused]);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToSlide(activeSlide === 0 ? slides.length - 1 : activeSlide - 1);
      } else if (e.key === 'ArrowRight') {
        goToSlide(activeSlide === slides.length - 1 ? 0 : activeSlide + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlide, slides.length, goToSlide]);

  // Touch/swipe support for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) < minSwipeDistance) return;
    
    if (distance > 0) {
      // Swipe left - next slide
      goToSlide(activeSlide === slides.length - 1 ? 0 : activeSlide + 1);
    } else {
      // Swipe right - previous slide
      goToSlide(activeSlide === 0 ? slides.length - 1 : activeSlide - 1);
    }
  };

  // Render hero content immediately for LCP
  const heroContent = (
    <>
      {/* Enhanced gradient overlay - Egyptian desert gold + industrial dark - Enhanced opacity for text area */}
      <div 
        className="absolute inset-0 z-[5]"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(10, 10, 10, 0.98) 0%, rgba(10, 10, 10, 0.85) 40%, transparent 70%),
            linear-gradient(
              to right,
              rgba(10, 10, 10, 0.97) 0%,
              rgba(26, 26, 26, 0.88) 25%,
              rgba(26, 26, 26, 0.75) 40%,
              rgba(26, 26, 26, 0.60) 55%,
              rgba(26, 26, 26, 0.45) 70%,
              rgba(10, 10, 10, 0.35) 100%
            )
          `
        }}
      />

      {/* Content - Optimized for mobile with proper spacing - Must be above background */}
      <div className="relative z-[100] flex flex-col h-full">
        {/* Main Content Area - Enhanced positioning for large screens */}
        <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 md:px-6 lg:px-12 xl:px-20 2xl:px-32 container mx-auto py-12 sm:py-16 md:py-20 lg:py-24">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`${
                activeSlide === index
                  ? "opacity-100"
                  : "opacity-0 absolute pointer-events-none"
              }`}
              style={{
                transition: activeSlide === index ? 'opacity 0.3s ease-out' : 'none',
                transform: 'none'
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {activeSlide === index && (
                <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
                  {/* Official Partner Badge / National Badge */}
                  {slide.badge && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 animate-fade-in backdrop-blur-sm ${
                      slide.nationalFocus 
                        ? "bg-green-500/20 border border-green-500/40 text-green-400"
                        : "bg-orange-500/20 border border-orange-500/40 text-orange-400"
                    }`}>
                      {slide.nationalFocus ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold uppercase tracking-wide">National Strategic Asset</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-semibold uppercase tracking-wide">Official Partner</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Badge/Description - Optimized for mobile - Enhanced visibility with better contrast */}
                  <span 
                    className="block mb-3 sm:mb-4 md:mb-5 text-xs sm:text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider animate-fade-in opacity-100 sm:opacity-100"
                    style={{
                      color: '#FFC107',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(255, 193, 7, 0.5), 0 1px 3px rgba(0, 0, 0, 1)',
                      WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.8)'
                    }}
                    role="doc-subtitle"
                  >
                    {slide.description}
                  </span>
                  
                  {/* Main Title - Better mobile scaling - Enhanced visibility with better positioning */}
                  {/* Priority content - renders immediately for LCP - no animation delays */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-5 lg:mb-6 text-white leading-[1.1] sm:leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]" style={{ opacity: 1, transform: 'none' }}>
                    <span className="text-gradient-orange bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_3px_8px_rgba(255,95,31,0.6)]">
                      {slide.title}
                    </span>
                  </h1>
                  
                  {/* Subtitle - Better mobile scaling - Enhanced visibility */}
                  <h2
                    className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-white sm:text-white mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-[1.2] sm:leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
                    style={{ opacity: 1, transform: 'none' }}
                  >
                    {slide.subtitle}
                  </h2>
                  
                  {/* Action Buttons - Optimized for mobile - Better spacing on large screens */}
                  <div
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-2 sm:mt-3 md:mt-4"
                    style={{ opacity: 1 }}
                  >
                    <NeonButton
                      variant="industrial"
                      glow="industrialGlow"
                      size="lg"
                      className="px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm md:text-base w-full sm:w-auto"
                    >
                      <Link 
                        to={slide.link} 
                        className="flex items-center justify-center gap-2"
                      >
                        {slide.nationalFocus ? "Start Your Digital Transformation" : `Explore ${slide.title}`}
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </NeonButton>
                    
                    <NeonButton
                      variant="outline"
                      glow="subtle"
                      size="lg"
                      className="border-white/20 text-white hover:bg-white/10 transition-colors px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm md:text-base w-full sm:w-auto"
                    >
                      <Link 
                        to="/contact" 
                        className="flex items-center justify-center gap-2"
                      >
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                        Contact Us
                      </Link>
                    </NeonButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Slide Navigation - Fixed at bottom, separate from content */}
        <div className="relative z-[100] pb-2 sm:pb-4 md:pb-6 lg:pb-8">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 md:gap-4">
              {/* Navigation Dots - Optimized for mobile */}
              <div className="flex flex-col items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex space-x-2 sm:space-x-3" role="tablist" aria-label="Slide navigation">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        activeSlide === index
                          ? "bg-almona-orange w-6 sm:w-8 shadow-lg shadow-orange-500/25"
                          : "bg-white/30 hover:bg-white/50"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                      aria-selected={activeSlide === index}
                      role="tab"
                    />
                  ))}
                </div>
                
                {/* Progress Indicator - Optimized for mobile */}
                <div className="w-full sm:w-32 bg-white/15 sm:bg-white/20 h-0.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-almona-orange h-full rounded-full"
                    style={{ 
                      width: isPaused ? '0%' : '100%',
                      transition: isPaused ? 'none' : 'width 6s linear'
                    }}
                    key={activeSlide}
                    aria-label="Slide progress"
                  />
                </div>
              </div>

              {/* Slide Counter - Optimized for mobile */}
              <div className="text-white/70 text-xs sm:text-sm font-medium">
                <span className="sr-only">Slide</span>
                {activeSlide + 1} / {slides.length}
              </div>

              {/* Navigation Arrows - Optimized for mobile */}
              <div className="flex space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => goToSlide(activeSlide === 0 ? slides.length - 1 : activeSlide - 1)}
                  className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label="Previous slide"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => goToSlide(activeSlide === slides.length - 1 ? 0 : activeSlide + 1)}
                  className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label="Next slide"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <section 
      className="relative min-h-screen h-screen overflow-hidden -mt-16 pt-16 bg-[#1a1a1a]"
      style={{ minHeight: '-webkit-fill-available' }}
      aria-label="Hero carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Render hero content immediately for LCP - no background blocking */}
      {heroContent}

      {/* Lazy load heavy background component after initial render */}
      <LazyBackground />

      {/* Loading indicator for transition states */}
      {isTransitioning && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </section>
  );
};

export default Hero;
