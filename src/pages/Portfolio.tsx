import { useEffect } from "react";
import ProjectCard from "@/shared/ui/ui/ProjectCard";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { portfolioData } from "@/constants/portfolioData";

const Portfolio = () => {
  useEffect(() => {
    document.title = "Portfolio - ALMONA";
  }, []);

  return (
    <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <h1 className="typography-h1 mb-8">
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
  );
};

export default withErrorBoundary(Portfolio);
