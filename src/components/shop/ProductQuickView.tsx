
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Truck, Shield, Zap, Scale, Heart, Eye, Settings, Monitor, Smartphone, Globe, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Separator } from '@/shared/ui/ui/separator';
import { useTranslation } from 'react-i18next';
import { Machine } from '@/types';
import { useQuote } from '@/context/QuoteContext';
import { toast } from 'sonner';
import { quickViewAnalytics } from '@/lib/analytics/quickViewAnalytics';

interface ProductQuickViewProps {
  product: Machine;
  isOpen: boolean;
  onClose: () => void;
  position?: 'right' | 'left';
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose,
  position = 'right'
}) => {
  const { t } = useTranslation('shop');
  const { addToQuote } = useQuote();
  const [activeTab, setActiveTab] = useState('overview');
  const [openTime, setOpenTime] = useState<number>(0);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track quick view open
  useEffect(() => {
    if (isOpen) {
      setOpenTime(Date.now());
      quickViewAnalytics.trackQuickViewOpen(product, 'product_card');
    }
  }, [isOpen, product]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Trap focus within panel
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      panelRef.current.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        panelRef.current?.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen]);

  const handleAddToQuote = () => {
    const conversionTime = Date.now() - openTime;
    addToQuote(product);
    setActionsTaken(prev => [...prev, 'quote_request']);
    quickViewAnalytics.trackQuickViewConversion(product, 'quote_request', conversionTime, 'quick_view_panel');
    toast.success(`${product.name} has been added to your quote.`, {
      action: {
        label: 'View Quote',
        onClick: () => window.dispatchEvent(new CustomEvent('openQuoteDialog'))
      }
    });
    onClose();
  };

  const handleCompare = () => {
    const conversionTime = Date.now() - openTime;
    window.dispatchEvent(new CustomEvent('addToComparison', { detail: { product } }));
    setActionsTaken(prev => [...prev, 'compare_add']);
    quickViewAnalytics.trackQuickViewConversion(product, 'compare_add', conversionTime, 'quick_view_panel');
    toast.success('Added to comparison');
    onClose();
  };

  const handle3DView = () => {
    const conversionTime = Date.now() - openTime;
    window.dispatchEvent(new CustomEvent('open3DModel', { detail: { machineId: product.id } }));
    setActionsTaken(prev => [...prev, '3d_view']);
    quickViewAnalytics.trackQuickViewConversion(product, '3d_view', conversionTime, 'quick_view_panel');
    onClose();
  };

  const handleVideoPlay = () => {
    setActionsTaken(prev => [...prev, 'video_play']);
    toast.success('Opening product video...');
  };

  const handleSpecsView = () => {
    setActiveTab('specifications');
    quickViewAnalytics.trackTabSwitch(product, 'overview', 'specifications');
  };

  const handleDownloadBrochure = () => {
    const conversionTime = Date.now() - openTime;
    setActionsTaken(prev => [...prev, 'brochure_download']);
    quickViewAnalytics.trackQuickViewConversion(product, 'brochure_download', conversionTime, 'quick_view_panel');
    toast.success('Downloading product brochure...');
  };

  const handleClose = () => {
    if (openTime > 0) {
      const duration = Date.now() - openTime;
      quickViewAnalytics.trackQuickViewClose(product, duration, actionsTaken);
    }
    onClose();
  };

  const slideVariants = {
    hidden: {
      x: position === 'right' ? '100%' : '-100%',
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 200
      }
    },
    exit: {
      x: position === 'right' ? '100%' : '-100%',
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Slide-out Panel - Full width on mobile, max-w-xl on tablet, max-w-2xl on desktop */}
          <motion.div
            ref={panelRef}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] sm:max-w-xl lg:max-w-2xl bg-almona-darker border-l border-almona-light shadow-2xl overflow-hidden flex flex-col`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quickview-title"
          >
            {/* Sticky Header - Compact on mobile */}
            <div className="flex-shrink-0 bg-almona-darker/95 backdrop-blur border-b border-gray-700 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 id="quickview-title" className="text-sm sm:text-base lg:text-xl font-bold text-white truncate">
                      {product.name}
                    </h2>
                    <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm truncate capitalize">{product.category?.replace(/-/g, ' ')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {product.featured && (
                    <Badge className="bg-green-600 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 hidden xs:flex">
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Featured</span>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-white hover:bg-gray-700"
                    aria-label="Close quick view"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content - Flex-grow to fill available space */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
                {/* Main Image with Action Overlay */}
                    <div className="relative overflow-hidden rounded-lg bg-gray-800">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                    className="w-full h-40 sm:h-48 lg:h-56 object-cover object-center"
                      />
                  {/* Price overlay on image */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4">
                    <div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400">
                        Price on Request
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500 text-[10px] sm:text-xs px-1.5 py-0.5">
                          In Stock
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-gray-300">2-4 weeks delivery</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Key Specs - Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
                  {product.specifications?.slice(0, 4).map((spec, index) => (
                    <div key={index} className="flex-shrink-0 flex items-center gap-1.5 bg-gray-800/60 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs">
                      <Zap className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      <span className="text-gray-300 whitespace-nowrap">{spec.length > 35 ? spec.slice(0, 35) + '...' : spec}</span>
                        </div>
                      ))}
                </div>

                <Separator className="bg-gray-700/50" />

                {/* Enhanced Tabs - Scrollable on mobile */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
                  <TabsList className="w-full grid grid-cols-4 h-8 sm:h-9 lg:h-10 bg-gray-800/50">
                    <TabsTrigger value="overview" className="text-[10px] sm:text-xs lg:text-sm px-1 sm:px-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">Overview</TabsTrigger>
                    <TabsTrigger value="specifications" className="text-[10px] sm:text-xs lg:text-sm px-1 sm:px-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">Specs</TabsTrigger>
                    <TabsTrigger value="features" className="text-[10px] sm:text-xs lg:text-sm px-1 sm:px-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">Features</TabsTrigger>
                    <TabsTrigger value="support" className="text-[10px] sm:text-xs lg:text-sm px-1 sm:px-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">Support</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 sm:space-y-5">
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-orange-400">Product Description</h3>
                      <p className="text-gray-300 leading-relaxed text-xs sm:text-sm lg:text-base">{product.description}</p>
                      
                      {/* Key Features */}
                      <div className="bg-gray-800/50 p-3 sm:p-4 rounded-lg">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-orange-400 mb-2 sm:mb-3">Key Features</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {product.specifications?.slice(0, 4).map((spec, index) => (
                            <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-300">{spec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="space-y-3 sm:space-y-4">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Power & Electrical */}
                      {product.powerSpec && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Power & Electrical</h4>
                          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                              <span className="text-gray-400">Power</span>
                              <span className="text-white font-mono text-right">{product.powerSpec.consumption}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                              <span className="text-gray-400">Voltage</span>
                              <span className="text-white font-mono text-right">{product.powerSpec.voltage}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                              <span className="text-gray-400">Frequency</span>
                              <span className="text-white font-mono text-right">{product.powerSpec.frequency}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                              <span className="text-gray-400">Phase</span>
                              <span className="text-white font-mono text-right">{product.powerSpec.phase}P</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Air Requirements */}
                      {product.airSpec && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Air Requirements</h4>
                          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                              <span className="text-gray-400">Consumption</span>
                              <span className="text-white font-mono text-right">{product.airSpec.consumption}</span>
                            </div>
                            {product.airSpec.pressure && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Pressure</span>
                                <span className="text-white font-mono text-right">{product.airSpec.pressure}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dimensions & Weight - Combined compact view */}
                      <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                        <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Dimensions & Weight</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
                          {product.dimensions && (
                            <>
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">L</span>
                                <span className="text-white font-mono">{product.dimensions.length}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">W</span>
                                <span className="text-white font-mono">{product.dimensions.width}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">H</span>
                                <span className="text-white font-mono">{product.dimensions.height}</span>
                              </div>
                            </>
                          )}
                          {(product as any).weight && (
                            <>
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Net</span>
                                <span className="text-white font-mono">{(product as any).weight.net}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Gross</span>
                                <span className="text-white font-mono">{(product as any).weight.gross}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Working Capacity (for copy routers etc.) */}
                      {(product as any).workingCapacity && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Working Capacity</h4>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).workingCapacity.x1 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">X1</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.x1}</span>
                              </div>
                            )}
                            {(product as any).workingCapacity.x2 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">X2</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.x2}</span>
                              </div>
                            )}
                            {(product as any).workingCapacity.y1 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Y1</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.y1}</span>
                              </div>
                            )}
                            {(product as any).workingCapacity.y2 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Y2</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.y2}</span>
                              </div>
                            )}
                            {(product as any).workingCapacity.z1 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Z1</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.z1}</span>
                              </div>
                            )}
                            {(product as any).workingCapacity.z2 && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Z2</span>
                                <span className="text-white font-mono">{(product as any).workingCapacity.z2}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Spindle & Tooling */}
                      {((product as any).spindleSpeed || (product as any).cutterBits || (product as any).spindlePower || (product as any).toolCollet) && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Spindle & Tooling</h4>
                          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).spindleSpeed && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Speed</span>
                                <span className="text-white font-mono">{(product as any).spindleSpeed}</span>
                              </div>
                            )}
                            {(product as any).spindlePower && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Power</span>
                                <span className="text-white font-mono">{(product as any).spindlePower}</span>
                              </div>
                            )}
                            {(product as any).cutterBits && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Cutter</span>
                                <span className="text-white font-mono text-right">{(product as any).cutterBits}</span>
                              </div>
                            )}
                            {(product as any).toolCollet && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Collet</span>
                                <span className="text-white font-mono">{(product as any).toolCollet}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Clamping Capacity */}
                      {(product as any).clampingCapacity && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Clamping Capacity</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).clampingCapacity.widthMax && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Width Max</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.widthMax}</span>
                              </div>
                            )}
                            {(product as any).clampingCapacity.widthMin && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Width Min</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.widthMin}</span>
                              </div>
                            )}
                            {(product as any).clampingCapacity.heightMax && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Height Max</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.heightMax}</span>
                              </div>
                            )}
                            {(product as any).clampingCapacity.heightMin && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Height Min</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.heightMin}</span>
                              </div>
                            )}
                            {(product as any).clampingCapacity.lengthMax && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Length Max</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.lengthMax}</span>
                              </div>
                            )}
                            {(product as any).clampingCapacity.lengthMin && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Length Min</span>
                                <span className="text-white font-mono">{(product as any).clampingCapacity.lengthMin}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Saw Blade Specifications */}
                      {(product as any).sawBlade && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Saw Blade</h4>
                          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).sawBlade.diameter && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Diameter</span>
                                <span className="text-white font-mono">{(product as any).sawBlade.diameter}</span>
                              </div>
                            )}
                            {(product as any).sawBlade.bore && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Bore</span>
                                <span className="text-white font-mono">{(product as any).sawBlade.bore}</span>
                              </div>
                            )}
                            {(product as any).sawBlade.speed && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Speed</span>
                                <span className="text-white font-mono">{(product as any).sawBlade.speed}</span>
                              </div>
                            )}
                            {(product as any).sawBlade.motorPower && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Motor</span>
                                <span className="text-white font-mono">{(product as any).sawBlade.motorPower}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cutting Capacity */}
                      {(product as any).cuttingCapacity && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Cutting Capacity</h4>
                          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).cuttingCapacity.maxLength5m && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Max (5m)</span>
                                <span className="text-white font-mono text-right">{(product as any).cuttingCapacity.maxLength5m}</span>
                              </div>
                            )}
                            {(product as any).cuttingCapacity.maxLength7m && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Max (7m)</span>
                                <span className="text-white font-mono text-right">{(product as any).cuttingCapacity.maxLength7m}</span>
                              </div>
                            )}
                            {(product as any).cuttingCapacity.at90deg && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">At 90°</span>
                                <span className="text-white font-mono">{(product as any).cuttingCapacity.at90deg}</span>
                              </div>
                            )}
                            {(product as any).cuttingCapacity.at45degInward && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">At 45° In</span>
                                <span className="text-white font-mono">{(product as any).cuttingCapacity.at45degInward}</span>
                              </div>
                            )}
                            {(product as any).cuttingCapacity.at45degOutward && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">At 45° Out</span>
                                <span className="text-white font-mono">{(product as any).cuttingCapacity.at45degOutward}</span>
                              </div>
                            )}
                            {(product as any).cuttingCapacity.minLength && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Min Length</span>
                                <span className="text-white font-mono">{(product as any).cuttingCapacity.minLength}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Angular Capacity */}
                      {(product as any).angularCapacity && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Angular Capacity</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).angularCapacity.tilting && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Tilting</span>
                                <span className="text-white font-mono text-right">{(product as any).angularCapacity.tilting}</span>
                              </div>
                            )}
                            {(product as any).angularCapacity.pivotingInward && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Pivot In</span>
                                <span className="text-white font-mono text-right">{(product as any).angularCapacity.pivotingInward}</span>
                              </div>
                            )}
                            {(product as any).angularCapacity.pivotingOutward && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Pivot Out</span>
                                <span className="text-white font-mono text-right">{(product as any).angularCapacity.pivotingOutward}</span>
                              </div>
                            )}
                            {(product as any).angularCapacity.compound && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-1 sm:col-span-2">
                                <span className="text-gray-400">Compound</span>
                                <span className="text-white font-mono text-right">{(product as any).angularCapacity.compound}</span>
                              </div>
                            )}
                            {(product as any).angularCapacity.presetAngles && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-1 sm:col-span-2">
                                <span className="text-gray-400">Presets</span>
                                <span className="text-white font-mono text-right">{(product as any).angularCapacity.presetAngles}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Welding Capacity */}
                      {(product as any).weldingCapacity && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Welding Capacity</h4>
                          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).weldingCapacity.heightMax && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">H Max</span>
                                <span className="text-white font-mono">{(product as any).weldingCapacity.heightMax}</span>
                              </div>
                            )}
                            {(product as any).weldingCapacity.heightMin && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">H Min</span>
                                <span className="text-white font-mono">{(product as any).weldingCapacity.heightMin}</span>
                              </div>
                            )}
                            {(product as any).weldingCapacity.widthMax && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">W Max</span>
                                <span className="text-white font-mono">{(product as any).weldingCapacity.widthMax}</span>
                              </div>
                            )}
                            {(product as any).weldingCapacity.widthMin && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">W Min</span>
                                <span className="text-white font-mono">{(product as any).weldingCapacity.widthMin}</span>
                              </div>
                            )}
                            {(product as any).weldingCapacity.angleRange && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-2">
                                <span className="text-gray-400">Angle Range</span>
                                <span className="text-white font-mono">{(product as any).weldingCapacity.angleRange}</span>
                              </div>
                            )}
                          </div>
                          {((product as any).temperatureRange || (product as any).weldingOptions) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm mt-2">
                              {(product as any).temperatureRange && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Temperature</span>
                                  <span className="text-white font-mono">{(product as any).temperatureRange}</span>
                                </div>
                              )}
                              {(product as any).weldingOptions && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Options</span>
                                  <span className="text-white font-mono text-right">{(product as any).weldingOptions}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CNC / Machining Center Specs */}
                      {((product as any).cncAxes || (product as any).processingCapacity || (product as any).profileCapacity) && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">CNC Specifications</h4>
                          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm">
                            {(product as any).cncAxes && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">CNC Axes</span>
                                <span className="text-white font-mono">{(product as any).cncAxes}-axis</span>
                              </div>
                            )}
                            {(product as any).millingMotors && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                <span className="text-gray-400">Milling Motors</span>
                                <span className="text-white font-mono">{(product as any).millingMotors}</span>
                              </div>
                            )}
                            {(product as any).processingCapacity && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-2">
                                <span className="text-gray-400">Capacity</span>
                                <span className="text-white font-mono text-right">{(product as any).processingCapacity}</span>
                              </div>
                            )}
                            {(product as any).axisSpeed && (
                              <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-2">
                                <span className="text-gray-400">Axis Speed</span>
                                <span className="text-white font-mono text-right">{(product as any).axisSpeed}</span>
                              </div>
                            )}
                          </div>
                          {(product as any).profileCapacity && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs lg:text-sm mt-2">
                              {(product as any).profileCapacity.minLength && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Min Length</span>
                                  <span className="text-white font-mono">{(product as any).profileCapacity.minLength}</span>
                                </div>
                              )}
                              {(product as any).profileCapacity.maxLength && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Max Length</span>
                                  <span className="text-white font-mono">{(product as any).profileCapacity.maxLength}</span>
                                </div>
                              )}
                              {(product as any).profileCapacity.minProfile && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Min Profile</span>
                                  <span className="text-white font-mono">{(product as any).profileCapacity.minProfile}</span>
                                </div>
                              )}
                              {(product as any).profileCapacity.maxProfile && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                                  <span className="text-gray-400">Max Profile</span>
                                  <span className="text-white font-mono">{(product as any).profileCapacity.maxProfile}</span>
                                </div>
                              )}
                              {(product as any).profileCapacity.loadingCapacity && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-700/50 col-span-2">
                                  <span className="text-gray-400">Loading</span>
                                  <span className="text-white font-mono">{(product as any).profileCapacity.loadingCapacity}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Features List - Collapsible on mobile */}
                      {product.specifications && product.specifications.length > 0 && (
                        <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Features</h4>
                          <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-none overflow-y-auto">
                            {product.specifications.map((spec, index) => (
                              <div key={index} className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs lg:text-sm">
                                <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-300">{spec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Product Details - Compact */}
                      <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                        <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mb-2 sm:mb-3">Product Details</h4>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
                          <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                            <span className="text-gray-400">Category</span>
                            <span className="text-white capitalize text-right">{product.category?.replace(/-/g, ' ') || 'Machine'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                            <span className="text-gray-400">Type</span>
                            <span className="text-white text-right">{product.type || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                            <span className="text-gray-400">Warranty</span>
                            <span className="text-white">1 Year</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                            <span className="text-gray-400">Delivery</span>
                            <span className="text-white">2-4 weeks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      <div className="bg-gray-800/70 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
                        <Truck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-500 mx-auto mb-1 sm:mb-2" />
                        <h4 className="font-semibold text-white text-[10px] sm:text-xs lg:text-sm mb-0.5">Free Shipping</h4>
                        <p className="text-[9px] sm:text-[10px] lg:text-xs text-gray-400">Cairo area</p>
                      </div>
                      <div className="bg-gray-800/70 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-500 mx-auto mb-1 sm:mb-2" />
                        <h4 className="font-semibold text-white text-[10px] sm:text-xs lg:text-sm mb-0.5">Warranty</h4>
                        <p className="text-[9px] sm:text-[10px] lg:text-xs text-gray-400">1-year</p>
                      </div>
                      <div className="bg-gray-800/70 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-500 mx-auto mb-1 sm:mb-2" />
                        <h4 className="font-semibold text-white text-[10px] sm:text-xs lg:text-sm mb-0.5">Installation</h4>
                        <p className="text-[9px] sm:text-[10px] lg:text-xs text-gray-400">Professional</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="support" className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                        <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-orange-400 mb-2 sm:mb-3">Contact Support</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <Monitor className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">Online: 24/7</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">+20 2 2274 0000</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300 truncate">support@almona.com</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/70 p-3 sm:p-4 rounded-lg">
                        <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-orange-400 mb-2 sm:mb-3">Services</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">Installation & Setup</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">Maintenance</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">Training & Docs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Sticky Footer - Compact on mobile */}
            <div className="flex-shrink-0 bg-almona-darker/95 backdrop-blur border-t border-gray-700 px-3 py-2 sm:px-4 sm:py-3 safe-area-inset-bottom">
              <div className="flex gap-1.5 sm:gap-2 lg:gap-3">
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 sm:h-9 lg:h-10 text-[10px] sm:text-xs lg:text-sm border-orange-500/70 text-orange-400 hover:bg-orange-500/10 px-2 sm:px-3"
                >
                  <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                  <span className="hidden xs:inline">Compare</span>
                  <span className="xs:hidden">+</span>
                </Button>
                {((product as any).has3DModel || (product as any).modelPath || 
                  product.name?.toLowerCase().includes('fr 222') || 
                  product.name?.toLowerCase().includes('fr222') ||
                  product.id === 'ym-030') ? (
                  <Button
                    onClick={handle3DView}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 sm:h-9 lg:h-10 text-[10px] sm:text-xs lg:text-sm border-blue-500/70 text-blue-400 hover:bg-blue-500/10 px-2 sm:px-3"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                    <span className="hidden xs:inline">3D View</span>
                    <span className="xs:hidden">3D</span>
                  </Button>
                ) : null}
                <Button
                  onClick={handleAddToQuote}
                  size="sm"
                  className="flex-[1.5] sm:flex-1 h-8 sm:h-9 lg:h-10 text-[10px] sm:text-xs lg:text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-2 sm:px-3"
                >
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('shop.buttons.add_to_quote', 'Add to Quote')}</span>
                  <span className="sm:hidden">Quote</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
