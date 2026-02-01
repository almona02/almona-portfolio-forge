import React, { useState } from 'react';
import { RegionCode } from '@/config/regionalConfig';
import { Button } from '@/components/ui/button';
import { Globe, ChevronDown, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegionSelectorProps {
  currentRegion: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'floating';
}

const regionConfigs = {
  TR: {
    name: 'Turkey',
    flag: '🇹🇷',
    currency: '₺',
    color: 'from-red-500 to-amber-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  EG: {
    name: 'Egypt',
    flag: '🇪🇬',
    currency: 'ج.م',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  DEFAULT: {
    name: 'International',
    flag: '🌍',
    currency: '$',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  }
};

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  currentRegion,
  onRegionChange,
  className,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = regionConfigs[currentRegion];

  const handleRegionSelect = (region: RegionCode) => {
    onRegionChange(region);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <span className="text-lg">{currentConfig.flag}</span>
          <span className="text-sm">{currentConfig.name}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            {Object.entries(regionConfigs).map(([code, config]) => (
              <button
                key={code}
                onClick={() => handleRegionSelect(code as RegionCode)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg",
                  currentRegion === code && "bg-gray-700"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{config.flag}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{config.name}</div>
                    <div className="text-xs text-gray-400">{config.currency}</div>
                  </div>
                </div>
                {currentRegion === code && <Check className="w-4 h-4 text-green-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div className={cn("fixed bottom-6 right-6 z-40", className)}>
        <div className="relative">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r text-white",
              currentConfig.color
            )}
          >
            <Globe className="w-6 h-6" />
          </Button>
          
          {isOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="typography-h3 text-sm text-white">Select Region</h3>
              </div>
              
              <div className="space-y-2">
                {Object.entries(regionConfigs).map(([code, config]) => (
                  <button
                    key={code}
                    onClick={() => handleRegionSelect(code as RegionCode)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                      currentRegion === code 
                        ? `${config.bgColor} ${config.borderColor} border` 
                        : "hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{config.flag}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{config.name}</div>
                        <div className="text-xs text-gray-400">{config.currency}</div>
                      </div>
                    </div>
                    {currentRegion === code && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 border-gray-600 text-gray-300 hover:bg-gray-700"
      >
        <span className="text-lg">{currentConfig.flag}</span>
        <span>{currentConfig.name}</span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            {Object.entries(regionConfigs).map(([code, config]) => (
              <button
                key={code}
                onClick={() => handleRegionSelect(code as RegionCode)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 rounded-md transition-colors",
                  currentRegion === code && "bg-gray-700"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{config.flag}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{config.name}</div>
                    <div className="text-xs text-gray-400">{config.currency}</div>
                  </div>
                </div>
                {currentRegion === code && <Check className="w-4 h-4 text-green-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionSelector;
