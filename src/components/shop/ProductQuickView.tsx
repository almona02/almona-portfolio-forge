
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Star, Truck, Shield, Zap, Play, FileText, Scale, Heart, Eye, Settings, Monitor, Smartphone, Globe } from 'lucide-react';
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
          
          {/* Slide-out Panel */}
          <motion.div
            ref={panelRef}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full w-full max-w-2xl sm:max-w-2xl bg-almona-darker border-l border-almona-light shadow-2xl overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quickview-title"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-almona-darker/95 backdrop-blur border-b border-gray-700 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 id="quickview-title" className="text-base sm:text-xl font-bold text-white truncate">
                      {product.name}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm truncate">{product.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {product.featured && (
                    <Badge className="bg-green-600">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                    aria-label="Close quick view"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-[calc(100vh-140px)] overflow-y-auto overflow-x-hidden">
              <div className="p-6 space-y-6">
                {/* Main Image & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-lg bg-gray-800">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-48 sm:h-64 object-cover object-center"
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (product.youtubeUrl) {
                              window.open(product.youtubeUrl, '_blank');
                            } else {
                              toast.error('Video not available for this product');
                            }
                          }}
                          className="bg-black/50 backdrop-blur-sm text-white border-gray-600 hover:bg-red-600/80"
                          disabled={!product.youtubeUrl}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (product.specPdf) {
                              window.open(product.specPdf, '_blank');
                            } else {
                              toast.error('Brochure not available for this product');
                            }
                          }}
                          className="bg-black/50 backdrop-blur-sm text-white border-gray-600 hover:bg-blue-600/80"
                          disabled={!product.specPdf}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (product.specPdf) {
                            window.open(product.specPdf, '_blank');
                          } else {
                            toast.error('Brochure not available for this product');
                          }
                        }}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        disabled={!product.specPdf}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Brochure
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toast.success('Sharing product...')}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>

                  {/* Key Information */}
                  <div className="space-y-4">
                    {/* Pricing */}
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-400 mb-2">Pricing & Availability</h3>
                      <p className="text-2xl font-bold text-gradient-orange">
                        Price on Request
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                          In Stock
                        </Badge>
                        <span className="text-sm text-gray-400">Delivery: 2-4 weeks</span>
                      </div>
                    </div>

                    {/* Key Specs */}
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-400 mb-3">Key Specifications</h3>
                      <div className="space-y-2">
                        {product.specifications?.slice(0, 3).map((spec, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-gray-300">{spec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Key Information - Show below image on mobile */}
                <div className="lg:hidden space-y-4">
                  {/* Pricing */}
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">Pricing & Availability</h3>
                    <p className="text-2xl font-bold text-gradient-orange">
                      Price on Request
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                        In Stock
                      </Badge>
                      <span className="text-sm text-gray-400">Delivery: 2-4 weeks</span>
                    </div>
                  </div>

                  {/* Key Specs */}
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-orange-400 mb-3">Key Specifications</h3>
                    <div className="space-y-2">
                      {product.specifications?.slice(0, 3).map((spec, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Zap className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <span className="text-gray-300">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Enhanced Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="specifications">Specifications</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="support">Support</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-orange-400">Product Description</h3>
                      <p className="text-gray-300 leading-relaxed">{product.description}</p>
                      
                      {/* Key Features */}
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">Key Features</h3>
                        <div className="space-y-2">
                          {product.specifications?.slice(0, 4).map((spec, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-orange-500" />
                              <span className="text-gray-300">{spec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-orange-400">Technical Specifications</h3>
                        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                          {product.specifications?.map((spec, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                              <span className="text-gray-300">{spec}</span>
                              <Settings className="w-4 h-4 text-orange-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-orange-400">Product Details</h3>
                        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-700">
                            <span className="text-gray-300">Category</span>
                            <span className="text-white">{product.category || 'Industrial Machine'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-700">
                            <span className="text-gray-300">Warranty</span>
                            <span className="text-white">1 Year</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-700">
                            <span className="text-gray-300">Delivery</span>
                            <span className="text-white">2-4 weeks</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-300">Support</span>
                            <span className="text-white">24/7 Available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg text-center">
                        <Truck className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <h4 className="font-semibold text-white mb-1">Free Shipping</h4>
                        <p className="text-sm text-gray-400">Free delivery in Cairo</p>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg text-center">
                        <Shield className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <h4 className="font-semibold text-white mb-1">Warranty</h4>
                        <p className="text-sm text-gray-400">1-year comprehensive</p>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg text-center">
                        <Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <h4 className="font-semibold text-white mb-1">Installation</h4>
                        <p className="text-sm text-gray-400">Professional setup</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="support" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">Contact Support</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Online Support: 24/7</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Phone: +20 2 2274 0000</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Email: support@almona.com</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">Service Options</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Installation & Setup</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Maintenance Service</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-300">Training & Documentation</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-almona-darker border-t border-gray-700 p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  className="flex-1 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Compare
                </Button>
                {(product as any).has3DModel || (product as any).modelPath ? (
                  <Button
                    onClick={handle3DView}
                    variant="outline"
                    className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    3D View
                  </Button>
                ) : null}
                <Button
                  onClick={handleAddToQuote}
                  className="flex-1 bg-gradient-orange text-white"
                >
                  {t('shop.buttons.add_to_quote')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
