/**
 * Interactive Model Demo Component
 * Demonstrates the integration of InteractiveGLBViewer with InteractivePricingCalculator
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegionDetection } from '@/hooks/useRegionDetection';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractiveGLBViewer, PartAnnotation, PricingCalculation } from './InteractiveGLBViewer';
import { InteractivePricingCalculator, TotalPricingCalculation } from './InteractivePricingCalculator';

// Sample part annotations for demonstration
const SAMPLE_ANNOTATIONS: PartAnnotation[] = [
  {
    id: 'frame',
    name: 'Window Frame',
    nameTr: 'Pencere Çerçevesi',
    nameAr: 'إطار النافذة',
    description: 'High-quality aluminum window frame with thermal break',
    descriptionTr: 'Termal kırımlı yüksek kaliteli alüminyum pencere çerçevesi',
    descriptionAr: 'إطار نافذة من الألومنيوم عالي الجودة مع كسر حراري',
    price: 2500,
    material: 'Aluminum',
    dimensions: { width: 120, height: 150, depth: 5 },
    meshName: 'frame',
    position: [0, 0, 0],
    color: '#ff6b35'
  },
  {
    id: 'glass',
    name: 'Double Glazing',
    nameTr: 'Çift Cam',
    nameAr: 'الزجاج المزدوج',
    description: 'Energy-efficient double glazing with low-E coating',
    descriptionTr: 'Düşük emisyonlu enerji verimli çift cam',
    descriptionAr: 'زجاج مزدوج موفر للطاقة مع طلاء منخفض الانبعاث',
    price: 1800,
    material: 'Glass',
    dimensions: { width: 110, height: 140, depth: 2 },
    meshName: 'glass',
    position: [0, 0, 0.1],
    color: '#4ecdc4'
  },
  {
    id: 'handle',
    name: 'Window Handle',
    nameTr: 'Pencere Kolu',
    nameAr: 'مقبض النافذة',
    description: 'Ergonomic window handle with security lock',
    descriptionTr: 'Güvenlik kilidi olan ergonomik pencere kolu',
    descriptionAr: 'مقبض نافذة مريح مع قفل أمان',
    price: 150,
    material: 'Stainless Steel',
    dimensions: { width: 8, height: 2, depth: 1 },
    meshName: 'handle',
    position: [0.5, 0, 0.2],
    color: '#45b7d1'
  },
  {
    id: 'seal',
    name: 'Weather Seal',
    nameTr: 'Hava Sızdırmazlık Contası',
    nameAr: 'ختم الطقس',
    description: 'Durable weather seal for optimal insulation',
    descriptionTr: 'Optimal yalıtım için dayanıklı hava sızdırmazlık contası',
    descriptionAr: 'ختم طقس متين للعزل الأمثل',
    price: 80,
    material: 'Rubber',
    dimensions: { width: 120, height: 150, depth: 0.5 },
    meshName: 'seal',
    position: [0, 0, -0.1],
    color: '#96ceb4'
  }
];

interface InteractiveModelDemoProps {
  modelPath?: string;
  className?: string;
}

export const InteractiveModelDemo: React.FC<InteractiveModelDemoProps> = ({
  modelPath = '/models/window-assembly.glb',
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const { regionState } = useRegionDetection();
  
  const [selectedParts, setSelectedParts] = useState<PartAnnotation[]>([]);
  const [totalPricing, setTotalPricing] = useState<TotalPricingCalculation | null>(null);
  const [showPricing, setShowPricing] = useState(true);

  const handlePartSelected = useCallback((part: PartAnnotation) => {
    setSelectedParts(prev => {
      const existingIndex = prev.findIndex(p => p.id === part.id);
      if (existingIndex >= 0) {
        // Remove if already selected
        return prev.filter(p => p.id !== part.id);
      } else {
        // Add if not selected
        return [...prev, part];
      }
    });
  }, []);

  const handlePricingCalculated = useCallback((pricing: PricingCalculation) => {
    console.log('Part pricing calculated:', pricing);
  }, []);

  const handleTotalPricingUpdate = useCallback((pricing: TotalPricingCalculation | null) => {
    setTotalPricing(pricing);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedParts([]);
    setTotalPricing(null);
  }, []);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* 3D Model Viewer */}
      <div className="lg:col-span-2">
        <Card className="bg-almona-dark border-almona-light/20 h-full">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>{t('3d.interactive.title', 'Interactive 3D Model')}</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-orange-400 border-orange-400">
                  {regionState.region}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPricing(!showPricing)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {showPricing ? t('3d.hidePricing', 'Hide Pricing') : t('3d.showPricing', 'Show Pricing')}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 lg:h-[500px] relative">
              <InteractiveGLBViewer
                modelPath={modelPath}
                annotations={SAMPLE_ANNOTATIONS}
                enablePartSelection={true}
                enablePricing={true}
                onPartSelected={handlePartSelected}
                onPricingCalculated={handlePricingCalculated}
                showAnnotations={true}
                highlightColor="#ff6b35"
                enableAR={true}
                enableWebXR={true}
              />
            </div>
            
            {/* Selection Info */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  {t('3d.selectedParts', 'Selected Parts')}: {selectedParts.length} / {SAMPLE_ANNOTATIONS.length}
                </div>
                {selectedParts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    {t('3d.clearSelection', 'Clear Selection')}
                  </Button>
                )}
              </div>
              
              {/* Selected parts list */}
              {selectedParts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedParts.map(part => (
                    <Badge
                      key={part.id}
                      variant="secondary"
                      className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30"
                    >
                      {i18n.language === 'tr' ? part.nameTr || part.name : 
                       i18n.language === 'ar' ? part.nameAr || part.name : 
                       part.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Calculator */}
      {showPricing && (
        <div className="lg:col-span-1">
          <InteractivePricingCalculator
            selectedParts={selectedParts}
            onPricingUpdate={handleTotalPricingUpdate}
            enableQuantityAdjustment={true}
            showTaxBreakdown={true}
            showRegionalPricing={true}
            className="h-full"
          />
        </div>
      )}

      {/* Instructions */}
      <div className="lg:col-span-3">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>{t('3d.instructions.click', 'Click on parts to select/deselect')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{t('3d.instructions.hover', 'Hover to highlight parts')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{t('3d.instructions.pricing', 'Real-time pricing updates')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InteractiveModelDemo;
