import { lazy, Suspense, memo } from 'react';
import Hero from "@/components/home/Hero";
import { DeferredSection } from "@/components/home/DeferredSection";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";

// Lazy load non-critical sections to improve initial page load
const NationalImpactSection = lazy(() => import("@/components/home/NationalImpactSection").then(m => ({ default: m.NationalImpactSection })));
const EgyptVision2030Section = lazy(() => import("@/components/home/EgyptVision2030Section").then(m => ({ default: m.EgyptVision2030Section })));
const AboutSection = lazy(() => import("@/components/home/AboutSection"));
const ServicesSection = lazy(() => import("@/components/home/ServicesSection"));
const FeaturedProducts = lazy(() => import("@/components/home/FeaturedProducts"));

// Lightweight loading placeholder
const SectionPlaceholder = () => (
  <div className="min-h-[400px] w-full bg-almona-dark/50 animate-pulse" />
);

const Index = memo(() => {
  // Note: document.title removed in favor of SEO component management
  
  return (
    <main dir="ltr" className="flex-grow overflow-x-hidden text-left">
      {/* Critical: Hero loads immediately (above the fold) */}
      <Hero />
      
      {/* Non-critical: Lazy load sections below the fold */}
      <DeferredSection label="Machinery, maintenance and training" href="/services">
        <Suspense fallback={<SectionPlaceholder />}>
          <NationalImpactSection />
        </Suspense>
      </DeferredSection>
      
      <DeferredSection label="Digital manufacturing proposal" href="/digital-egypt">
        <Suspense fallback={<SectionPlaceholder />}>
          <EgyptVision2030Section />
        </Suspense>
      </DeferredSection>
      
      <DeferredSection label="About ALMONA" href="/about">
        <Suspense fallback={<SectionPlaceholder />}>
          <AboutSection />
        </Suspense>
      </DeferredSection>
      
      <DeferredSection label="Machinery services" href="/services">
        <Suspense fallback={<SectionPlaceholder />}>
          <ServicesSection />
        </Suspense>
      </DeferredSection>
      
      <DeferredSection label="YILMAZ machine catalogue" href="/products/machines">
        <Suspense fallback={<SectionPlaceholder />}>
          <FeaturedProducts />
        </Suspense>
      </DeferredSection>
    </main>
  );
});

Index.displayName = 'Index';

export default withErrorBoundary(Index);
