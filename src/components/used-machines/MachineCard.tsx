import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { ChevronRight, MapPin, Factory, Calendar, Gauge, Star } from 'lucide-react';
import { UsedMachine } from '@/data/usedMachines';
import OptimizedImage from '@/components/shared/OptimizedImage';
import ConditionBadge from '@/components/used-machines/ConditionBadge';

interface MachineCardProps {
  machine: UsedMachine;
  isCompact?: boolean;
  showSellerRating?: boolean;
  onClick?: () => void;
}

/**
 * MachineCard Component
 * 
 * Enhanced machine listing card with optimized images, condition badges,
 * and improved information display for better user experience
 */
const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  isCompact = false,
  showSellerRating = true,
  onClick
}) => {
  
  const cardHeight = isCompact ? 'h-80' : 'h-auto';
  const imageHeight = isCompact ? 'h-32' : 'h-48';

  return (
    <Card className={`bg-almona-darker border-almona-light overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 group ${cardHeight}`}>
      {/* Image Section with Overlays */}
      <div className="relative">
        <div className={`${imageHeight} overflow-hidden`}>
          <OptimizedImage
            src={machine.images[0]} 
            alt={machine.title}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            width={400}
            height={300}
          />
        </div>
        
        {/* Condition Badge */}
        <div className="absolute top-2 left-2">
          <ConditionBadge 
            condition={machine.condition} 
            size="sm"
          />
        </div>
        
        {/* Verified Seller Badge */}
        {machine.seller.verified && (
          <Badge className="absolute top-2 right-2 bg-blue-600/90 backdrop-blur-sm">
            ✅ Verified
          </Badge>
        )}
        
        {/* Image Count Indicator */}
        {machine.images.length > 1 && (
          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
            📷 {machine.images.length}
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <CardHeader className="pb-2">
        <CardTitle className={`${isCompact ? 'text-lg' : 'text-xl'} line-clamp-2 group-hover:text-amber-400 transition-colors`}>
          {machine.title}
        </CardTitle>
        <div className="text-amber-400 font-bold text-xl">
          {machine.price}
        </div>
      </CardHeader>

      <CardContent className={isCompact ? 'py-2' : 'py-4'}>
        <p className="text-gray-400 mb-4 line-clamp-2">{machine.description}</p>
        
        {/* Machine Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span className="truncate">{machine.location}</span>
          </div>
          
          <div className="flex items-center">
            <Factory className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span className="truncate">{machine.seller.name}</span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span>Year: {machine.year}</span>
          </div>
          
          <div className="flex items-center">
            <Gauge className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span>Hours: {machine.hours.toLocaleString()}</span>
          </div>
        </div>

        {/* Seller Rating */}
        {showSellerRating && (
          <div className="flex items-center mt-3 pt-3 border-t border-almona-light/20">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span className="text-sm text-yellow-400 font-medium">
              {machine.seller.rating}/5
            </span>
            <span className="text-xs text-almona-light/60 ml-2">
              Seller Rating
            </span>
          </div>
        )}
      </CardContent>

      {/* Action Buttons */}
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          size={isCompact ? "sm" : "default"}
          className="btn-primary"
        >
          📞 Request Info
        </Button>
        
        <Button 
          asChild
          size={isCompact ? "sm" : "default"}
          className="btn-primary"
        >
          <Link 
            to={`/used-machines/${machine.id}`} 
            className="flex items-center justify-center"
            onClick={onClick}
          >
            Details <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MachineCard;