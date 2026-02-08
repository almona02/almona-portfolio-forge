import { Button } from "@/components/ui/button-gold-tier";
import { FADE_IN, SLIDE_UP } from "@/lib/animations/motion";
import { motion } from "framer-motion";
import { ArrowRight, Award, CheckCircle, Phone } from "lucide-react";
import { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AIAgentStatus } from "./AIAgentStatus";

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
    }, 0);
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
  const { t } = useTranslation('home');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(100);
  const [_isStatusVisible, setIsStatusVisible] = useState(true);
  const statusHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize slides to prevent unnecessary re-renders
  const slides = useMemo(() => [
    {
      id: 1,
      title: t('hero.slides.fabricator_pro.title'),
      subtitle: t('hero.slides.fabricator_pro.subtitle'),
      description: t('hero.slides.fabricator_pro.description'),
      link: "/fabricator-workflow",
      badge: true,
      nationalFocus: true
    },
    {
      id: 2,
      title: t('hero.slides.yilmaz_machines.title'),
      subtitle: t('hero.slides.yilmaz_machines.subtitle'),
      description: t('hero.slides.yilmaz_machines.description'),
      link: "/yilmaz-machines-egypt",
      badge: true
    },
    {
      id: 3,
      title: t('hero.slides.almona_co.title'),
      subtitle: t('hero.slides.almona_co.subtitle'),
      description: t('hero.slides.almona_co.description'),
      link: "/about",
      badge: false
    },
  ], [t]);

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

  // Animate micro progress bar during slide transitions for smoother feedback
  useEffect(() => {
    if (!isTransitioning) {
      setTransitionProgress(100);
      return;
    }

    setTransitionProgress(0);
    const frame = requestAnimationFrame(() => setTransitionProgress(100));

    return () => cancelAnimationFrame(frame);
  }, [isTransitioning, activeSlide]);

  const scheduleStatusHide = useCallback((delay = 3200) => {
    if (statusHideTimeout.current) {
      clearTimeout(statusHideTimeout.current);
    }
    statusHideTimeout.current = setTimeout(() => setIsStatusVisible(false), delay);
  }, []);

  const showStatusWithAutoHide = useCallback((delay = 3200) => {
    setIsStatusVisible(true);
    scheduleStatusHide(delay);
  }, [scheduleStatusHide]);

  useEffect(() => {
    showStatusWithAutoHide();
    return () => {
      if (statusHideTimeout.current) {
        clearTimeout(statusHideTimeout.current);
      }
    };
  }, [activeSlide, showStatusWithAutoHide]);


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

  // Gradient overlay style - theme-aware for dark mode
  // Uses CSS variables that adapt to theme
  const gradientOverlayStyle = {
    background: [
      'radial-gradient(ellipse at 20% 50%, rgba(10, 10, 10, 0.98) 0%, rgba(10, 10, 10, 0.85) 40%, transparent 70%)',
      'linear-gradient(to right, rgba(10, 10, 10, 0.97) 0%, rgba(26, 26, 26, 0.88) 25%, rgba(26, 26, 26, 0.75) 40%, rgba(26, 26, 26, 0.60) 55%, rgba(26, 26, 26, 0.45) 70%, rgba(10, 10, 10, 0.35) 100%)'
    ].join(', ')
  };

  // Render hero content immediately for LCP
  const heroContent = (
    <>
      {/* Enhanced gradient overlay - Egyptian desert gold + industrial dark - Theme-aware */}
      <div
        className="absolute inset-0 z-[5] dark:opacity-100 opacity-90"
        style={gradientOverlayStyle}
      />

      {/* Content - Optimized for mobile with proper spacing - Must be above background - Moved down 2cm for nav bar clearance */}
      <div className="relative z-[100] flex flex-col h-full mt-[3cm] lg:mt-[4cm]">
        {/* Main Content Area - Enhanced positioning for large screens */}
        <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 md:px-6 lg:px-12 xl:px-20 2xl:px-32 container mx-auto py-12 sm:py-16 md:py-20 lg:py-24">
          {slides.map((slide, index) => (
            <motion.div
              key={slide.id}
              initial="hidden"
              animate={activeSlide === index ? "visible" : "hidden"}
              variants={FADE_IN}
              className={`${activeSlide === index
                  ? "block"
                  : "absolute pointer-events-none opacity-0"
                }`}
            >
              {activeSlide === index && (
                <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
                  {/* Official Partner Badge / National Badge */}
                  {slide.badge && (
                    <motion.div
                      variants={SLIDE_UP}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 backdrop-blur-sm ${slide.nationalFocus
                          ? "bg-green-500/20 border border-green-500/40 text-green-400"
                          : "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                        }`}>
                      {slide.nationalFocus ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold uppercase tracking-wide">{t('hero.slides.fabricator_pro.badge_national')}</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-semibold uppercase tracking-wide">{t('hero.slides.yilmaz_machines.badge_official')}</span>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Badge/Description - Optimized for mobile - Theme-aware colors */}
                  <motion.span
                    variants={SLIDE_UP}
                    className="block mb-3 sm:mb-4 md:mb-5 text-xs sm:text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-amber-400 dark:text-amber-400"
                    style={{
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(251, 191, 36, 0.5), 0 1px 3px rgba(0, 0, 0, 1)',
                      WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.8)'
                    }}
                    role="doc-subtitle"
                  >
                    {slide.description}
                  </motion.span>

                  {/* Main Title - Better mobile scaling - Theme-aware text colors */}
                  <motion.h1
                    variants={SLIDE_UP}
                    className="typography-h1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl mb-3 sm:mb-4 md:mb-5 lg:mb-6 text-foreground dark:text-white leading-[1.1] sm:leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                  >
                    <span className="text-gradient-orange bg-gradient-to-r from-amber-400 to-amber-600 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent drop-shadow-[0_3px_8px_rgba(251,191,36,0.6)] dark:drop-shadow-[0_3px_8px_rgba(251,191,36,0.6)]">
                      {slide.title}
                    </span>
                  </motion.h1>

                  {/* Subtitle - Better mobile scaling - Theme-aware text colors */}
                  <motion.h2
                    variants={SLIDE_UP}
                    className="typography-h2 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-foreground dark:text-white mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-[1.2] sm:leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.8)] dark:drop-shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
                  >
                    {slide.subtitle}
                  </motion.h2>

                  {/* Action Buttons - Optimized for mobile - Better spacing on large screens */}
                  <motion.div
                    variants={SLIDE_UP}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-2 sm:mt-3 md:mt-4"
                  >
                    <Link to={slide.link} className="w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm md:text-base font-bold shadow-lg shadow-amber-500/20"
                        rightIcon={<ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />}
                      >
                        {slide.nationalFocus ? t('hero.slides.fabricator_pro.cta_primary') : slide.id === 2 ? t('hero.slides.yilmaz_machines.cta_primary') : t('hero.slides.almona_co.cta_primary')}
                      </Button>
                    </Link>

                    <Link to="/contact" className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm md:text-base border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        leftIcon={<Phone className="h-4 w-4 sm:h-5 sm:w-5" />}
                      >
                        {t('hero.slides.fabricator_pro.cta_secondary')}
                      </Button>
                    </Link>
                  </motion.div>

                  {/* YDT Agent - Gold Tier Industrial Model */}
                  <div className="mt-6 sm:mt-8 md:mt-10 max-w-md">
                    <AIAgentStatus />
                  </div>
                </div>
              )}
            </motion.div>
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
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-background dark:focus:ring-offset-gray-900 ${activeSlide === index
                          ? "bg-almona-orange w-6 sm:w-8 shadow-lg shadow-amber-500/25"
                          : "bg-foreground/30 dark:bg-white/30 hover:bg-foreground/50 dark:hover:bg-white/50"
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                      aria-selected={activeSlide === index}
                      role="tab"
                    />
                  ))}
                </div>

                {/* Progress Indicator - Optimized for mobile - Theme-aware */}
                <div className="w-full sm:w-32 bg-foreground/15 dark:bg-white/15 sm:bg-foreground/20 dark:sm:bg-white/20 h-0.5 rounded-full overflow-hidden">
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

            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <section
      className="relative bg-background dark:bg-[#0a0a0a]"
      style={{ minHeight: '-webkit-fill-available' }}
      role="region"
      aria-label="Hero carousel"
      aria-roledescription="carousel"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Add slide counter for screen readers */}
      <div className="sr-only" aria-live="polite">
        Slide {activeSlide + 1} of {slides.length}. {slides[activeSlide].title}
      </div>

      {/* Render hero content immediately for LCP - no background blocking */}
      {heroContent}

      {/* Lazy load heavy background component after initial render */}
      <LazyBackground />

      {/* Loading indicator for transition states - Theme-aware */}
      {isTransitioning && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-background/35 dark:bg-black/35 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-foreground/10 dark:bg-white/10 border border-foreground/15 dark:border-white/15 shadow-xl shadow-amber-500/10">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80 dark:text-white/80">
                {t('hero.transition.preparing')}
              </span>
              <div className="w-28 h-1.5 bg-foreground/15 dark:bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${transitionProgress}%` }}
                  aria-label="Slide transition in progress"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
