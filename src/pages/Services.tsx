
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const Services = () => {
  useEffect(() => {
    document.title = "Services - ALMONA";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">
            <span className="text-gradient-orange">Our Services</span>
          </h1>
          <p className="text-gray-400">
            Discover our comprehensive range of services for aluminum and UPVC fabricators.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
