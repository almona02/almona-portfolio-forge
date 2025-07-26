
import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import ServicesSection from "@/components/home/ServicesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useEffect } from "react";
import LogisticsPartners from "@/components/local/LogisticsPartners";

const Index = () => {
  useEffect(() => {
    document.title = "ALMONA - YILMAZ Machines & ALFAPEN Profiles Dealer in Egypt";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <AboutSection />
        <ServicesSection />
        <FeaturedProducts />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
