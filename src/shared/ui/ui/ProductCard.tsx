import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/ui/card";
import { ArrowRight, Download, PlayCircle } from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";


interface ProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  features?: string[];
  tags?: string[];
  ctaText: string;
  ctaLink?: string;
  onCtaClick?: () => void;
  badge?: string;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  specPdf?: string;
  youtubeUrl?: string;

}

const ProductCard: React.FC<ProductCardProps> = ({ 
  title, 
  description, 
  imageUrl, 
  features = [], 
  tags = [], 
  ctaText, 
  ctaLink, 
  onCtaClick,
  badge,
  isSelected = false,
  onSelect,
  specPdf,
  youtubeUrl
}) => {
  return (
    <Card className={`bg-almona-dark-lighter border-gray-800 overflow-hidden hover:border-almona-orange/30 transition-all group ${isSelected ? 'ring-2 ring-almona-orange' : ''}`}>
      <div className="relative overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-almona-orange focus:ring-almona-orange"
          />
        </div>
        {badge && (
          <span className="absolute top-4 left-0 bg-almona-orange text-white text-xs font-medium px-3 py-1 z-10">
            {badge}
          </span>
        )}
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-almona-dark-default to-transparent opacity-50"></div>
      </div>
      
      <CardHeader className="pt-4 pb-2 px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white hover:text-almona-orange transition-colors">
            {title}
          </h3>
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="w-5 h-5 text-almona-orange hover:text-almona-orange-dark transition-colors" />
            </a>
          )}

        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="px-4 py-2">
        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{description}</p>
        {features && features.length > 0 && (
          <ul className="text-xs text-gray-300 space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-almona-orange rounded-full mr-2"></span>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      
      <CardFooter className="px-4 py-4 border-t border-gray-800 flex flex-col gap-2">
        {onCtaClick ? (
          <Button 
            variant="default" 
            size="sm" 
            className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full"
            onClick={onCtaClick}
          >
            {ctaText}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        ) : (
          <Button asChild variant="default" size="sm" className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full">
            <Link to={ctaLink || '#'}>
              {ctaText}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
        {specPdf && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={specPdf} download target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              <Download size={16} />
              Download Specs
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
