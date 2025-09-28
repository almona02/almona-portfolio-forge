import React, { memo, useState, useCallback } from 'react';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/ui/card';
import { Eye, Download, ExternalLink, Play } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import type { Machine } from '@/constants/yilmazMachines';

interface OptimizedProductCardProps {
  machine: Machine;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onQuoteRequest: () => void;
  on3DView?: () => void;
}

// Optimized image component with lazy loading and format optimization
const LazyImage = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={192}
      className={`w-full h-48 object-cover rounded-lg ${className}`}
      loading="lazy"
      quality={85}
      placeholder="/images/placeholder-machine.jpg"
    />
  );
});

LazyImage.displayName = 'LazyImage';

export const OptimizedProductCard = memo<OptimizedProductCardProps>(({
  machine,
  isSelected,
  onSelect,
  onQuoteRequest,
  on3DView
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const handleSelect = useCallback(() => {
    onSelect(!isSelected);
  }, [isSelected, onSelect]);

  const handleQuoteRequest = useCallback(() => {
    onQuoteRequest();
  }, [onQuoteRequest]);

  const handle3DView = useCallback(() => {
    on3DView?.();
  }, [on3DView]);

  const truncatedDescription = machine.description.length > 120 
    ? machine.description.substring(0, 120) + '...'
    : machine.description;

  return (
    <Card className={`group relative transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 ${
      isSelected ? 'ring-2 ring-orange-500 bg-orange-500/5' : 'hover:bg-gray-800/50'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
              {machine.name}
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {machine.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {machine.featured && (
                <Badge variant="default" className="text-xs bg-orange-500">
                  Featured
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={handleSelect}
            className="ml-2 flex-shrink-0"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <LazyImage
          src={machine.imageUrl}
          alt={machine.name}
          className="mb-4"
        />
        
        <div className="space-y-2">
          <p className="text-sm text-gray-300 leading-relaxed">
            {showFullDescription ? machine.description : truncatedDescription}
            {machine.description.length > 120 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="ml-1 text-orange-400 hover:text-orange-300 text-xs"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Power:</span>
              <span className="ml-1 text-white">{machine.powerSpec.consumption}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-1 text-white">{machine.type}</span>
            </div>
            <div>
              <span className="text-gray-400">Category:</span>
              <span className="ml-1 text-white">{machine.category}</span>
            </div>
            <div>
              <span className="text-gray-400">Air:</span>
              <span className="ml-1 text-white">{machine.airSpec?.consumption || 'N/A'}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex flex-wrap gap-2">
        <Button
          onClick={handleQuoteRequest}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          size="sm"
        >
          Request Quote
        </Button>
        
        {machine.specPdf && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(machine.specPdf, '_blank')}
            className="flex-shrink-0"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        
        {machine.youtubeUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(machine.youtubeUrl, '_blank')}
            className="flex-shrink-0"
          >
            <Play className="w-4 h-4" />
          </Button>
        )}
        
        {on3DView && (
          <Button
            variant="outline"
            size="sm"
            onClick={handle3DView}
            className="flex-shrink-0"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';
