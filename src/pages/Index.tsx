import { Helmet } from 'react-helmet-async';
import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import ServicesSection from "@/components/home/ServicesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { FabricatorProFeatures } from "@/components/home/FabricatorProFeatures";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";

const Index = () => {
  // Note: document.title removed in favor of SEO component management
  
  return (
    <main className="flex-grow overflow-x-hidden">
      <Hero />
      <FabricatorProFeatures />
      <AboutSection />
      <ServicesSection />
      <FeaturedProducts />
    </main>
  );
};

export default withErrorBoundary(Index);
