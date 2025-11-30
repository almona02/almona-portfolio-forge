
import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import ServicesSection from "@/components/home/ServicesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { FabricatorProFeatures } from "@/components/home/FabricatorProFeatures";
import { useEffect } from "react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";

const Index = () => {
  useEffect(() => {
    document.title = "ALMONA - YILMAZ Machines Dealer in Egypt";
  }, []);

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
