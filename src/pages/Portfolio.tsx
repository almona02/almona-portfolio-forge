import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectCard from "@/shared/ui/ui/ProjectCard";
import { portfolioData } from "@/constants/portfolioData";

const Portfolio = () => {
  useEffect(() => {
    document.title = "Portfolio - ALMONA";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">
            <span className="text-gradient-orange">Our Portfolio</span>
          </h1>
          <p className="text-gray-400 mb-8">
            Explore our portfolio of successful projects and implementations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioData.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Portfolio;
