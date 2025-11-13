import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Eye, ShoppingCart, GitCompare, Play, Download } from "lucide-react";
import { OptimizedImage } from "@/components/optimized/OptimizedImage";
import { ProductHoverPreview } from '@/components/shop/ProductHoverPreview';
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

// Animation variants for gentle, professional animations
const cardVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for smooth feel
    }
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

const imageVariants = {
  initial: { 
    opacity: 0,
    scale: 1.1
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

const overlayVariants = {
  initial: { 
    opacity: 0,
    scale: 0.8
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.15
    }
  }
};

const badgeVariants = {
  initial: { 
    opacity: 0,
    scale: 0.8,
    y: -10
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

const contentVariants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      delay: 0.1
    }
  }
};

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
    <ProductHoverPreview 
      product={machine} 
      onQuickPreview={onQuickPreview}
    >
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
        className={`group relative bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 transition-all duration-300 hover:shadow-xl ${
          isSelected 
            ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
            : 'border-gray-700 hover:border-orange-400/50'
        }`}
      >
      {/* 3D Model Badge - Clickable */}
      <AnimatePresence>
        {show3DBadge && machine.has3DModel && (
          <motion.div 
            className="absolute top-3 left-3 z-10"
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => {
              e.stopPropagation();
              if (on3DView) {
                handle3DView();
              }
            }}
          >
            <Badge 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 shadow-lg cursor-pointer transition-all"
            >
              <Eye className="w-3 h-3 mr-1" />
              3D View
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video and Featured Badges - Stacked when both exist */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        <AnimatePresence>
          {machine.youtubeUrl && (
            <motion.div
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <a href={machine.youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg cursor-pointer">
                  <Play className="w-3 h-3 mr-1" />
                  Video
                </Badge>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {machine.featured && (
            <motion.div
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg">
                Featured
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Container with Fixed Aspect Ratio - KEY CHANGE: object-contain */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gradient-to-br from-gray-800 to-gray-900">
        <motion.div
          variants={imageVariants}
          initial="initial"
          animate="animate"
          className="w-full h-full"
        >
          <OptimizedImage
            src={machine.imageUrl}
            alt={machine.name}
            width={400}
            height={300}
            className="w-full h-full object-contain" // CHANGED: object-contain instead of object-cover
            loading="lazy"
            quality={85}
          />
        </motion.div>
        
        {/* Quick Preview Overlay */}
        <AnimatePresence>
          <motion.div 
            className="absolute inset-0 bg-black/60 flex items-center justify-center"
            variants={overlayVariants}
            initial="initial"
            animate="initial"
            whileHover="animate"
            exit="exit"
          >
            <motion.div 
              className="flex gap-2"
              variants={overlayVariants}
            >
              {onQuickPreview && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                    onClick={handleQuickPreview}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Quick View
                  </Button>
                </motion.div>
              )}
              {machine.has3DModel && on3DView && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/20"
                    onClick={handle3DView}
                  >
                    3D
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <motion.div 
        className="p-4 space-y-3"
        variants={contentVariants}
        initial="initial"
        animate="animate"
      >
        {/* Title and Description */}
        <div className="space-y-2">
          <motion.h3 
            className="font-semibold text-white text-lg leading-tight line-clamp-2"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {machine.name}
          </motion.h3>
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
            {machine.description}
          </p>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {machine.powerSpec?.consumption && (
            <motion.div 
              className="text-gray-400"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-gray-500 text-xs">Power</div>
              <div className="text-white font-medium">{machine.powerSpec.consumption}</div>
            </motion.div>
          )}
          {machine.category && (
            <motion.div 
              className="text-gray-400"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-gray-500 text-xs">Category</div>
              <div className="text-white font-medium capitalize">{machine.category}</div>
            </motion.div>
          )}
        </div>

        {/* Tags */}
        {machine.tags && machine.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {machine.tags.slice(0, 3).map((tag: string, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ scale: 1.1 }}
              >
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                  {tag}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {machine.specPdf && (
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <a href={machine.specPdf} target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Specs
                </Button>
              </a>
            </motion.div>
          )}

          {onSelect && (
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="sm"
                className={`w-full ${
                  isSelected
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white transition-all duration-300`}
                onClick={handleSelect}
              >
                <GitCompare className="w-4 h-4 mr-1" />
                {isSelected ? 'Remove' : 'Compare'}
              </Button>
            </motion.div>
          )}

          {onQuoteRequest && (
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                onClick={handleQuote}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Quote
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
    </ProductHoverPreview>
  );
};

export default EnhancedProductCard;
