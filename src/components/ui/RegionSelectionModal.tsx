import React, { useState, useEffect } from 'react';
import { RegionCode } from '@/config/regionalConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin, Clock, CreditCard, Shield, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegionSelectionModalProps {
  isOpen: boolean;
  onRegionSelect: (region: RegionCode) => void;
  onClose: () => void;
  currentRegion?: RegionCode;
}

const regionConfigs = {
  TR: {
    name: 'Turkey',
    flag: '🇹🇷',
    currency: '₺ TRY',
    language: 'Türkçe',
    timezone: 'Europe/Istanbul',
    features: ['KDV Calculator', 'Turkish Support', 'Local Shipping', 'WhatsApp Support'],
    compliance: ['CE Marking', 'TSE Certification', 'ISO 9001'],
    workingHours: '09:00 - 18:00',
    paymentMethods: ['Credit Card', 'Bank Transfer', 'Cash on Delivery', 'Installment'],
    color: 'from-red-500 to-amber-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  EG: {
    name: 'Egypt',
    flag: '🇪🇬',
    currency: 'ج.م EGP',
    language: 'العربية',
    timezone: 'Africa/Cairo',
    features: ['Arabic Support', 'RTL Layout', 'Local Shipping', 'WhatsApp Support'],
    compliance: ['CE Marking', 'ES Certification', 'ISO 9001'],
    workingHours: '09:00 - 17:00',
    paymentMethods: ['Credit Card', 'Bank Transfer', 'Cash on Delivery'],
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  DEFAULT: {
    name: 'International',
    flag: '🌍',
    currency: '$ USD',
    language: 'English',
    timezone: 'UTC',
    features: ['Global Shipping', 'Multi-Currency', 'International Support', 'AR Support'],
    compliance: ['CE Marking', 'ISO 9001', 'International Standards'],
    workingHours: '09:00 - 17:00',
    paymentMethods: ['Credit Card', 'Bank Transfer'],
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  }
};

export const RegionSelectionModal: React.FC<RegionSelectionModalProps> = ({
  isOpen,
  onRegionSelect,
  onClose,
  currentRegion = 'DEFAULT'
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>(currentRegion);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
  }, [isOpen]);

  const handleRegionSelect = (region: RegionCode) => {
    setSelectedRegion(region);
    setIsAnimating(true);
    
    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => {
        onRegionSelect(region);
        setShowSuccess(false);
        setIsAnimating(false);
        onClose();
      }, 1000);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn(
        "relative w-full max-w-4xl mx-4 transform transition-all duration-500",
        isAnimating ? "scale-105" : "scale-100"
      )}>
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-amber-600/20 to-amber-600/20 rounded-2xl blur-xl animate-pulse" />
        
        <Card className="relative bg-almona-dark border-gray-700 shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Globe className="w-12 h-12 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Choose Your Region
            </CardTitle>
            <p className="text-gray-400">
              Select your region to get personalized experience, local pricing, and regional support
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {showSuccess ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto animate-bounce" />
                  <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl animate-ping" />
                </div>
                <h3 className="typography-h3 text-white mb-2">
                  Region Selected Successfully!
                </h3>
                <p className="text-gray-400">
                  Redirecting to {regionConfigs[selectedRegion].name} experience...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(regionConfigs).map(([code, config]) => (
                  <div
                    key={code}
                    className={cn(
                      "relative group cursor-pointer transform transition-all duration-300 hover:scale-105",
                      selectedRegion === code && "scale-105"
                    )}
                    onClick={() => setSelectedRegion(code as RegionCode)}
                  >
                    {/* Card background with gradient */}
                    <div className={cn(
                      "absolute inset-0 rounded-xl bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity",
                      config.color
                    )} />
                    
                    <Card className={cn(
                      "relative border-2 transition-all duration-300",
                      selectedRegion === code 
                        ? `${config.borderColor} ${config.bgColor} shadow-lg` 
                        : "border-gray-700 hover:border-gray-600"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-3xl">{config.flag}</span>
                            <div>
                              <h3 className="typography-h3 text-white">{config.name}</h3>
                              <p className="text-sm text-gray-400">{config.language}</p>
                            </div>
                          </div>
                          {selectedRegion === code && (
                            <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Currency */}
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300">{config.currency}</span>
                        </div>

                        {/* Timezone */}
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-300">{config.timezone}</span>
                        </div>

                        {/* Working Hours */}
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-gray-300">{config.workingHours}</span>
                        </div>

                        {/* Features */}
                        <div>
                          <h4 className="typography-h4 text-xs font-medium text-gray-400 mb-2">Features</h4>
                          <div className="flex flex-wrap gap-1">
                            {config.features.slice(0, 2).map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Compliance */}
                        <div>
                          <h4 className="typography-h4 text-xs font-medium text-gray-400 mb-2">Compliance</h4>
                          <div className="flex items-center space-x-1">
                            <Shield className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-gray-300">
                              {config.compliance.slice(0, 2).join(', ')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!showSuccess && (
              <div className="flex justify-center space-x-4 mt-8">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRegionSelect(selectedRegion)}
                  className={cn(
                    "bg-gradient-to-r text-white hover:opacity-90 transition-all duration-300",
                    regionConfigs[selectedRegion].color
                  )}
                >
                  <span>Continue to {regionConfigs[selectedRegion].name}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegionSelectionModal;
