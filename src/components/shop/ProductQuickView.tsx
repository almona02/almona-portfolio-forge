
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Machine } from '@/types';
import { useQuote } from '@/context/QuoteContext';
import { toast } from 'sonner';
import { 
  Play, 
  FileText, 
  Download, 
  Share2, 
  Star, 
  Truck, 
  Shield, 
  Zap,
  Settings,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';

interface ProductQuickViewProps {
  product: Machine;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('shop');
  const { addToQuote } = useQuote();
  const [activeTab, setActiveTab] = useState('overview');

  const handleAddToQuote = () => {
    addToQuote(product);
    toast.success(`${product.name} has been added to your quote.`);
    onClose();
  };

  const handleVideoPlay = () => {
    // Simulate video play action
    toast.success('Opening product video...');
  };

  const handleSpecsView = () => {
    setActiveTab('specifications');
  };

  const handleDownloadBrochure = () => {
    // Simulate brochure download
    toast.success('Downloading product brochure...');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-almona-darker border-almona-light text-white p-0">
        <DialogHeader className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gradient-orange">{product.name}</DialogTitle>
              <DialogDescription className="text-gray-400 mt-2">{product.description}</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
              <Badge variant="outline" className="border-orange-500 text-orange-400">
                <Shield className="w-3 h-3 mr-1" />
                Warranty
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-64 object-cover rounded-lg" 
                      loading="lazy" 
                    />
                    {/* Video and Specs Icons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleVideoPlay}
                        className="bg-black/50 backdrop-blur-sm text-white border-gray-600 hover:bg-red-600/80"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSpecsView}
                        className="bg-black/50 backdrop-blur-sm text-white border-gray-600 hover:bg-blue-600/80"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDownloadBrochure}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Brochure
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.success('Sharing product...')}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Price */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-orange-400">Pricing</h3>
                    <p className="text-2xl font-bold text-gradient-orange">
                      {product.pricing?.basePrice ? `${product.pricing.basePrice.toLocaleString()} EGP` : 'Price on request'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Excluding VAT and shipping</p>
                  </div>

                  {/* Key Features */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-orange-400">Key Features</h3>
                    <div className="space-y-2">
                      {product.specifications?.slice(0, 4).map((spec, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-gray-300">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add to Quote */}
                  <Button onClick={handleAddToQuote} className="w-full bg-gradient-orange text-lg py-3">
                    {t('shop.buttons.add_to_quote')}
                  </Button>
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
      </DialogContent>
    </Dialog>
  );
};
