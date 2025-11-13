import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { NeonButton } from "@/shared/ui/ui/neon-button";

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Memoize slides to prevent unnecessary re-renders
  const slides = useMemo(() => [
    {
      id: 1,
      title: "YILMAZ Machines",
      subtitle: "Premium Quality Aluminium & PVC Processing Machines",
      description: "Authorized dealer in Egypt since 2000",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      link: "/products/machines",
      imageAlt: "Industrial machinery for aluminium and PVC processing",
    },
    {
      id: 2,
      title: "ALMONA Co.",
      subtitle: "Your Trusted Partner Since 1991",
      description: "Expert consultation, sales and service",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80",
      link: "/about",
      imageAlt: "Almona company building and team",
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

  // Preload next image for smoother transitions
  useEffect(() => {
    const nextIndex = activeSlide === slides.length - 1 ? 0 : activeSlide + 1;
    const nextSlide = slides[nextIndex];
    
    const img = new Image();
    img.src = nextSlide.image;
  }, [activeSlide, slides]);

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

  return (
    <section 
      className="relative min-h-screen h-screen overflow-hidden -mt-16 pt-16"
      style={{ minHeight: '-webkit-fill-available' }}
      aria-label="Hero carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            activeSlide === index 
              ? "opacity-100 z-10" 
              : "opacity-0 z-0"
          }`}
          aria-hidden={activeSlide !== index}
        >
          {/* Enhanced gradient overlay - Better opacity for mobile */}
          <div className="absolute inset-0 bg-gradient-to-r from-almona-dark-dark/98 sm:from-almona-dark-dark/95 via-almona-dark-dark/80 sm:via-almona-dark-dark/70 to-almona-dark-dark/50 sm:to-almona-dark-dark/40 z-10"></div>
          
          {/* Optimized image with lazy loading */}
          <img
            src={slide.image}
            alt={slide.imageAlt}
            className="w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
      ))}

      {/* Content - Optimized for mobile with proper spacing */}
      <div className="relative z-20 flex flex-col h-full">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 container mx-auto py-12 sm:py-16 md:py-20">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`transition-all duration-700 ${
                activeSlide === index
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform -translate-y-8 absolute pointer-events-none"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              {activeSlide === index && (
                <div className="max-w-3xl">
                  {/* Badge/Description - Optimized for mobile */}
                  <span 
                    className="inline-block text-almona-yellow mb-2 sm:mb-3 text-xs sm:text-sm font-medium uppercase tracking-wider animate-fade-in opacity-90 sm:opacity-100"
                    role="doc-subtitle"
                  >
                    {slide.description}
                  </span>
                  
                  {/* Main Title - Better mobile scaling */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-2 sm:mb-3 md:mb-4 text-white animate-slide-in leading-[1.1] sm:leading-tight">
                    <span className="text-gradient-orange bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                      {slide.title}
                    </span>
                  </h1>
                  
                  {/* Subtitle - Better mobile scaling */}
                  <h2
                    className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-gray-200/90 sm:text-gray-200 mb-3 sm:mb-4 md:mb-6 animate-slide-in leading-[1.2] sm:leading-tight"
                    style={{ animationDelay: "0.1s" }}
                  >
                    {slide.subtitle}
                  </h2>
                  
                  {/* Action Buttons - Optimized for mobile */}
                  <div
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 animate-fade-in"
                    style={{ animationDelay: "0.3s" }}
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
                        Explore {slide.title}
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
        <div className="relative z-30 pb-2 sm:pb-4 md:pb-6 lg:pb-8">
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

      {/* Loading indicator for transition states */}
      {isTransitioning && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </section>
  );
};

export default Hero;