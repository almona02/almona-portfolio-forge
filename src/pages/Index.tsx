import { Suspense, memo } from 'react';
import { lazyRetry } from '@/utils/lazyImport';
import Hero from "@/components/home/Hero";
import { DeferredSection } from "@/components/home/DeferredSection";
import { NationalImpactSection } from "@/components/home/NationalImpactSection";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";

// Keep NationalImpactSection eager: a tiny homepage section must not die on stale Vite chunk hashes after deploy.
// Lazy-load heavier below-the-fold sections with retry/reload recovery.
const EgyptVision2030Section = lazyRetry(() => import("@/components/home/EgyptVision2030Section").then(m => ({ default: m.EgyptVision2030Section })), 'EgyptVision2030Section');
const AboutSection = lazyRetry(() => import("@/components/home/AboutSection"), 'AboutSection');
const ServicesSection = lazyRetry(() => import("@/components/home/ServicesSection"), 'ServicesSection');
const FeaturedProducts = lazyRetry(() => import("@/components/home/FeaturedProducts"), 'FeaturedProducts');

// Lightweight loading placeholder
const SectionPlaceholder = () => (
  <div className="min-h-[400px] w-full bg-background/50 animate-pulse" />
);

const Index = memo(() => {
  // Note: document.title removed in favor of SEO component management
  
  return (
    <main dir="ltr" className="flex-grow overflow-x-hidden text-left">
      {/* Critical: Hero loads immediately (above the fold) */}
      <Hero />
      
      {/* Eager: no separate hashed chunk that can 404 after a deploy race */}
      <DeferredSection label="Machinery, maintenance and training" href="/services">
        <NationalImpactSection />
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
