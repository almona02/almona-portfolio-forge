import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/ui/card";
import { ArrowRight, Download, X } from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { OptimizedImage } from "@/components/ui/OptimizedImage";


interface ProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  features?: string[];
  tags?: string[];
  ctaText?: string;
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
  const [showVideo, setShowVideo] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const embedUrl = useMemo(() => {
    if (!youtubeUrl) return null;
    try {
      if (youtubeUrl.includes('youtube.com/watch')) {
        const videoId = new URL(youtubeUrl).searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : youtubeUrl;
      }
      if (youtubeUrl.includes('youtu.be/')) {
        const id = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      return youtubeUrl;
    } catch {
      return youtubeUrl;
    }
  }, [youtubeUrl]);

  const autoplayUrl = useMemo(() => {
    if (!embedUrl) return null;
    const separator = embedUrl.includes("?") ? "&" : "?";
    return `${embedUrl}${separator}autoplay=1&mute=1&rel=0`;
  }, [embedUrl]);

  return (
    <Card
      className={`bg-almona-dark-lighter border-gray-800 overflow-hidden hover:border-almona-orange/30 transition-all group ${isSelected ? 'ring-2 ring-almona-orange' : ''}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className="relative overflow-hidden">
        {/* Badge removed during video playback / overlay */}
        <div className="relative w-full aspect-[4/3] overflow-hidden" ref={videoContainerRef}>
          {youtubeUrl && showVideo && (autoplayUrl ?? embedUrl) ? (
            <>
              <iframe
                src={autoplayUrl ?? embedUrl}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
              <button
                type="button"
                className="absolute top-3 right-3 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 text-slate-800 shadow-md shadow-black/20 ring-1 ring-white/70 hover:bg-white transition"
                onClick={() => setShowVideo(false)}
                aria-label="Close video"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <OptimizedImage
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              quality={95}
              format="auto"
            />
          )}

          {youtubeUrl && !showVideo && isHover && (
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] text-white transition-colors hover:bg-black/30"
              onClick={() => setShowVideo(true)}
              aria-label={`Play video for ${title}`}
            >
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/30">
                <span className="text-sm font-semibold">Play Video</span>
              </div>
            </button>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-almona-dark-default to-transparent opacity-50 pointer-events-none"></div>
      </div>
      
      <CardHeader className="pt-4 pb-2 px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white hover:text-almona-orange transition-colors">
            {title}
          </h3>
          {/* Inline play trigger removed; use overlay only */}

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
        {ctaText && (
          onCtaClick ? (
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
          )
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
