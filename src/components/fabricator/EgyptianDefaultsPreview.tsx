import {
    getDefaultGlazing,
    getDefaultMarketTier,
    getDefaultProfileColor,
    getDefaultWindLoad
} from '@/data/egyptian-defaults';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Droplet, Palette, TrendingUp, Wind } from 'lucide-react';
import React from 'react';

interface EgyptianDefaultsPreviewProps {
  region?: string;
  projectType?: string;
  isExternal?: boolean;
  className?: string;
}

export const EgyptianDefaultsPreview: React.FC<EgyptianDefaultsPreviewProps> = ({
  region = 'Cairo',
  projectType = 'residential',
  isExternal = true,
  className
}) => {
  const defaults = {
    profileColor: getDefaultProfileColor(region),
    glazing: getDefaultGlazing(region, isExternal),
    windLoad: getDefaultWindLoad(region),
    marketTier: getDefaultMarketTier(projectType)
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-orange-500" />
          Egyptian Defaults
        </CardTitle>
        <CardDescription className="text-xs">
          Auto-applied based on region and project type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Profile Color */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border border-gray-600" 
              style={{ backgroundColor: defaults.profileColor.hex }}
            />
            <span className="text-xs text-gray-300">{defaults.profileColor.name}</span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-gray-800/50 border-gray-700">
            {defaults.profileColor.ralCode}
          </Badge>
        </div>

        {/* Glazing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-gray-300">
              {defaults.glazing.type === 'double' && (defaults.glazing as any).color === 'blue_reflective' 
                ? 'Blue Reflective' 
                : defaults.glazing.type === 'double' && (defaults.glazing as any).color === 'brown_reflective'
                ? 'Brown Reflective'
                : `${defaults.glazing.type} (${defaults.glazing.thickness}mm)`}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-gray-800/50 border-gray-700">
            {defaults.glazing.uValue?.toFixed(1)} W/m²K
          </Badge>
        </div>

        {/* Wind Load */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-3 w-3 text-green-400" />
            <span className="text-xs text-gray-300">
              {defaults.windLoad.baseLoad.toFixed(2)} kN/m²
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-gray-800/50 border-gray-700">
            {defaults.windLoad.windZone}
          </Badge>
        </div>

        {/* Market Tier */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-purple-400" />
            <span className="text-xs text-gray-300">{defaults.marketTier.useCase}</span>
          </div>
          <Badge 
            variant="outline" 
            className={`text-[10px] ${
              (defaults.marketTier as any).profiles === 'chinese_local' ? 'bg-green-900/30 border-green-800 text-green-400' :
              (defaults.marketTier as any).profiles === 'german' ? 'bg-purple-900/30 border-purple-800 text-purple-400' :
              'bg-gray-800/50 border-gray-700'
            }`}
          >
            {(defaults.marketTier as any).profiles === 'chinese_local' ? 'Low' :
             (defaults.marketTier as any).profiles === 'german' ? 'High' :
             'Medium'} Tier
          </Badge>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <p className="text-[10px] text-gray-400">
            Region: {region} • {projectType}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

