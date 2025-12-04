import { Helmet } from 'react-helmet-async';
import Hero from "@/components/home/Hero";
import { NationalImpactSection } from "@/components/home/NationalImpactSection";
import { EgyptVision2030Section } from "@/components/home/EgyptVision2030Section";
import AboutSection from "@/components/home/AboutSection";
import ServicesSection from "@/components/home/ServicesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";

const Index = () => {
  // Note: document.title removed in favor of SEO component management
  
  return (
    <main className="flex-grow overflow-x-hidden">
      <Hero />
      <NationalImpactSection />
      <EgyptVision2030Section />
      <AboutSection />
      <ServicesSection />
      <FeaturedProducts />
    </main>
  );
};

export default withErrorBoundary(Index);
