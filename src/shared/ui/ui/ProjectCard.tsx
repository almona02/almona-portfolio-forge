import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Project {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  link: string;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Card className="bg-almona-dark-lighter border-gray-800 overflow-hidden hover:border-almona-orange/30 transition-all group">
      <div className="relative overflow-hidden">
        <Link to={project.link}>
          <img 
            src={project.imageUrl} 
            alt={project.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-almona-dark-default to-transparent opacity-50"></div>
      </div>
      
      <CardHeader className="pt-4 pb-2 px-4">
        <h3 className="text-lg font-semibold text-white hover:text-almona-orange transition-colors">
          {project.title}
        </h3>
      </CardHeader>
      
      <CardContent className="px-4 py-2">
        <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tags.map((tag, index) => (
            <Badge 
              key={index} 
              variant="outline"
              className="border-almona-orange/30 text-almona-orange bg-almona-orange/10"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center px-4 py-4 border-t border-gray-800">
        <Button asChild variant="default" size="sm" className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
          <Link to={project.link}>
            View Project
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
