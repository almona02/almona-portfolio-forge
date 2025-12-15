import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Machine } from '@/types';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Star, Zap, Shield, Eye } from 'lucide-react';
import { quickViewAnalytics } from '@/lib/analytics/quickViewAnalytics';

interface ProductHoverPreviewProps {
  product: Machine;
  children: React.ReactElement;
  delay?: number;
  onQuickPreview?: (product: Machine) => void;
}

export const ProductHoverPreview: React.FC<ProductHoverPreviewProps> = ({
  product,
  children,
  delay = 500,
  onQuickPreview
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [hoverStartTime, setHoverStartTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setHoverStartTime(Date.now());
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
      quickViewAnalytics.trackHoverPreview(product, 0, position, true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isVisible && hoverStartTime > 0) {
      const duration = Date.now() - hoverStartTime;
      quickViewAnalytics.trackHoverPreview(product, duration, position, false);
    }
    
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const _viewportHeight = window.innerHeight;

    // Determine best position based on available space
    if (rect.right + 320 > viewportWidth) {
      setPosition('left');
    } else if (rect.top - 200 < 0) {
      setPosition('bottom');
    } else {
      setPosition('right');
    }
  };

  const handleQuickPreview = () => {
    quickViewAnalytics.trackQuickViewConversion(product, 'quote_request', 0, 'hover_preview');
    onQuickPreview?.(product);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionStyles = {
    right: { left: '100%', top: 0, marginLeft: '8px' },
    left: { right: '100%', top: 0, marginRight: '8px' },
    top: { bottom: '100%', left: 0, marginBottom: '8px' },
    bottom: { top: '100%', left: 0, marginTop: '8px' }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-80 bg-almona-darker border border-almona-light rounded-lg shadow-2xl"
            style={positionStyles[position]}
          >
            {/* Preview Content */}
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {product.name}
                  </h3>
                  <p className="text-gray-400 text-xs truncate">
                    {product.description}
                  </p>
                </div>
                {product.featured && (
                  <Badge className="bg-green-600 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              {/* Key Specs */}
              <div className="space-y-2">
                {product.specifications?.slice(0, 2).map((spec, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <Zap className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-300 truncate">{spec}</span>
                  </div>
                ))}
              </div>

              {/* Pricing & Status */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <div>
                  <p className="text-lg font-bold text-gradient-orange">
                    {product.pricing?.basePrice ? `${product.pricing.basePrice.toLocaleString()} EGP` : 'Price on Request'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500">
                      In Stock
                    </Badge>
                    <Shield className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  className="bg-gradient-orange text-xs"
                  onClick={handleQuickPreview}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Quick View
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
