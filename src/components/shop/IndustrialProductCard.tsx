import React, { useState } from "react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/ui/card";
import { EnhancedImage } from "@/components/ui/EnhancedImage";
import { motion, AnimatePresence } from "framer-motion";

const EgyptCertificationBadge = ({ standard }: { standard: string }) => (
  <div className="flex items-center bg-[#ce1126] text-white px-1.5 py-0.5 rounded-full text-[10px]">
    <span className="mr-0.5">🇪🇬</span>
    <span>{standard}</span>
  </div>
);

interface DurabilityInfo {
  score: number; // e.g., 1-5 or 1-100
  maintenanceInterval: string; // e.g., "Every 6 months", "1000 operating hours"
  keyDurabilityFeatures: string[];
}

interface IndustrialProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  features: string[];
  badges?: string[];
  egyptCertifications?: string[];
  stock: number;
  actions: {
    label: string;
    action: () => void;
  }[];
  durabilityInfo?: DurabilityInfo;
  onDurabilityClick?: (info: DurabilityInfo) => void;
}

export const IndustrialProductCard = ({
  title,
  description,
  imageUrl,
  price,
  features,
  badges = [],
  egyptCertifications = [],
  stock,
  actions,
  durabilityInfo,
  onDurabilityClick,
}: IndustrialProductCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleActionClick = (action: () => void) => {
    // Check if this is an "Add to Quote" action
    const isAddToQuote = actions.find(a => a.action === action)?.label.toLowerCase().includes('add to quote');
    
    if (isAddToQuote) {
      setIsAnimating(true);
      // Reset animation after a shorter duration to prevent flashing
      setTimeout(() => setIsAnimating(false), 300);
    }
    
    action();
  };

  return (
    <motion.div
      animate={isAnimating ? {
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          "0 0 15px rgba(255, 165, 0, 0.3)",
          "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        ]
      } : {}}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Card className="bg-almona-darker border-almona-light/20 hover:border-almona-light/40 transition-colors h-full flex flex-col">
      <CardHeader className="p-0 relative">
        {/* Taller aspect ratio (4:3) for better image visibility on narrow cards */}
        <div className="aspect-[4/3] relative overflow-hidden">
          <EnhancedImage 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105" 
            aspectRatio="video"
            loading="lazy"
            loadingMessage="Loading product image..."
          />
        </div>
        {/* Badges - compact styling, limited to 3 badges max to avoid covering image */}
        {(badges.length > 0 || egyptCertifications.length > 0 || stock !== undefined) && (
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[85%]">
            {/* Show only first 2 badges */}
            {badges.slice(0, 2).map((badge, index) => (
              <Badge
                key={`badge-${index}-${badge}-${title.slice(0, 10)}`}
                variant="secondary"
                className="bg-orange-600/90 hover:bg-orange-600 text-[10px] px-1.5 py-0.5"
              >
                {badge}
              </Badge>
            ))}
            {/* Show +N if more badges */}
            {badges.length > 2 && (
              <Badge
                variant="secondary"
                className="bg-gray-600/90 text-[10px] px-1.5 py-0.5"
              >
                +{badges.length - 2}
              </Badge>
            )}
            {/* Show only first certification */}
            {egyptCertifications.slice(0, 1).map((cert, i) => (
              <EgyptCertificationBadge key={`egypt-cert-${i}-${cert}-${title.slice(0, 10)}`} standard={cert} />
            ))}
            {/* Stock badge at bottom right instead */}
          </div>
        )}
        {/* Stock badge positioned at bottom right of image */}
        {stock !== undefined && (
          <div className="absolute bottom-2 right-2">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0.5 ${
                stock === 0
                  ? "bg-red-600/90"
                  : stock <= 5
                  ? "bg-yellow-600/90"
                  : "bg-green-600/90"
              }`}
            >
              {stock === 0 ? "Out of Stock" : stock <= 5 ? `Low (${stock})` : "In Stock"}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 flex-grow flex flex-col">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 line-clamp-2">{title}</h3>
        <p className="text-gray-400 text-xs sm:text-sm mb-2 line-clamp-2">{description}</p>
        <div className="space-y-1 mb-3 flex-grow">
          {features.slice(0, 3).map((feature, i) => (
            <div key={`feature-${i}-${feature.slice(0, 20)}-${title.slice(0, 10)}`} className="flex items-start">
              <svg
                className="w-3 h-3 mt-0.5 mr-1.5 text-orange-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-300 text-xs line-clamp-1">{feature}</span>
            </div>
          ))}
        </div>
        {durabilityInfo && (
          <div className="mt-2 pt-2 border-t border-almona-light/20">
            <div className="flex items-center mb-1">
              <span className="text-orange-500 font-bold text-sm mr-1">{durabilityInfo.score}/5</span>
              <span className="text-gray-300 text-xs">Durability</span>
            </div>
          </div>
        )}
        <div className="text-lg sm:text-xl font-bold text-orange-500 mt-auto">{price}</div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0">
        <div className="flex flex-col gap-1.5 w-full">
          {actions.map((action, i) => (
            <Button
              key={`action-${i}-${action.label}-${title.slice(0, 10)}`}
              variant={i === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => handleActionClick(action.action)}
              className={`text-xs sm:text-sm ${i === 0 ? "bg-orange-600 hover:bg-orange-700" : ""}`}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
    </motion.div>
  );
};
