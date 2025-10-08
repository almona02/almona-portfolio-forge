import React from 'react';
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Eye, ShoppingCart, GitCompare } from "lucide-react";
import { OptimizedImage } from "@/components/optimized/OptimizedImage";
import type { Machine } from "@/constants/yilmazMachines";

interface EnhancedProductCardProps {
  machine: Machine & { has3DModel?: boolean; modelPath?: string };
  isSelected?: boolean;
  onSelect?: (machine: Machine, selected: boolean) => void;
  onQuoteRequest?: (machine: Machine) => void;
  on3DView?: (machine: Machine) => void;
  onQuickPreview?: (machine: Machine) => void;
  show3DBadge?: boolean;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  machine,
  isSelected = false,
  onSelect,
  onQuoteRequest,
  on3DView,
  onQuickPreview,
  show3DBadge = true
}) => {
  const handleSelect = () => {
    onSelect?.(machine, !isSelected);
  };

  const handleQuickPreview = () => {
    onQuickPreview?.(machine);
  };

  const handle3DView = () => {
    on3DView?.(machine);
  };

  const handleQuote = () => {
    onQuoteRequest?.(machine);
  };

  return (
    <div
      className={`group relative bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 transition-all duration-300 hover:shadow-xl ${
        isSelected 
          ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
          : 'border-gray-700 hover:border-orange-400/50'
      }`}
    >
      {/* 3D Model Badge */}
      {show3DBadge && machine.has3DModel && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 shadow-lg">
            <Eye className="w-3 h-3 mr-1" />
            3D View
          </Badge>
        </div>
      )}

      {/* Featured Badge */}
      {machine.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg">
            Featured
          </Badge>
        </div>
      )}

      {/* Image Container with Fixed Aspect Ratio - KEY CHANGE: object-contain */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gradient-to-br from-gray-800 to-gray-900">
        <OptimizedImage
          src={machine.imageUrl}
          alt={machine.name}
          width={400}
          height={300}
          className="w-full h-full object-contain" // CHANGED: object-contain instead of object-cover
          loading="lazy"
          quality={85}
        />
        
        {/* Quick Preview Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex gap-2">
            {onQuickPreview && (
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                onClick={handleQuickPreview}
              >
                <Eye className="w-4 h-4 mr-1" />
                Quick View
              </Button>
            )}
            {machine.has3DModel && on3DView && (
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/20"
                onClick={handle3DView}
              >
                3D
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2">
            {machine.name}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
            {machine.description}
          </p>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {machine.powerSpec?.consumption && (
            <div className="text-gray-400">
              <div className="text-gray-500 text-xs">Power</div>
              <div className="text-white font-medium">{machine.powerSpec.consumption}</div>
            </div>
          )}
          {machine.category && (
            <div className="text-gray-400">
              <div className="text-gray-500 text-xs">Category</div>
              <div className="text-white font-medium capitalize">{machine.category}</div>
            </div>
          )}
        </div>

        {/* Tags */}
        {machine.tags && machine.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {machine.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs text-gray-400 border-gray-600">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onSelect && (
              <Button
                size="sm"
                className={`flex-1 ${
                  isSelected
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white transition-all duration-300`}
                onClick={handleSelect}
              >
                <GitCompare className="w-4 h-4 mr-1" />
                {isSelected ? 'Remove' : 'Compare'}
              </Button>
          )}
          
          {onQuoteRequest && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
              onClick={handleQuote}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedProductCard;
