'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Progress } from '@/shared/ui/ui/progress';
import {
  Upload,
  CheckCircle,
  Package,
  DollarSign,
  Scale,
  FileText,
} from 'lucide-react';
import { ElsherifPDFExtractor, ExtractedProfile } from '@/lib/imports/ElsherifPDFExtractor';
import { AluminumPricingCalculator } from '@/lib/pricing/AluminumPricingCalculator';
import type { Profile } from '@/types/fabricator';
import { toast } from 'sonner';

interface ElsherifImportWizardProps {
  onProfilesImported: (profiles: Profile[]) => void;
  userId?: string;
}

export const ElsherifImportWizard: React.FC<ElsherifImportWizardProps> = ({
  onProfilesImported,
  userId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedProfiles, setExtractedProfiles] = useState<ExtractedProfile[]>([]);
  const [aluminumPrice, setAluminumPrice] = useState(
    AluminumPricingCalculator.getCurrentPricing().aluminumPricePerKg,
  );
  const [markupPercentage, setMarkupPercentage] = useState(
    AluminumPricingCalculator.getCurrentPricing().markupPercentage,
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress while we call the extractor (phase 1 is instant).
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      const profiles = await ElsherifPDFExtractor.extractProfilesFromPDF(file);

      clearInterval(interval);
      setProgress(100);
      setExtractedProfiles(profiles);

      toast.success(`Extracted ${profiles.length} ELSHERIF profiles from catalog`);
    } catch (error) {
      console.error('Error processing ELSHERIF PDF:', error);
      toast.error('Failed to process ELSHERIF PDF file');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      // allow re‑selecting the same file
      event.target.value = '';
    }
  };

  const handleImportProfiles = () => {
    if (!userId) {
      toast.error('User ID required to link profiles to your account');
      return;
    }

    if (extractedProfiles.length === 0) {
      toast.error('No profiles to import');
      return;
    }

    const imported: Profile[] = extractedProfiles.map((extracted) => {
      const pricing = AluminumPricingCalculator.calculateCost(
        extracted.weightPerMeter,
        1,
        { aluminumPricePerKg: aluminumPrice, markupPercentage },
      );

      const now = new Date();

      return {
        id: `elsherif_${extracted.profileNumber}_${now.getTime()}`,
        name: extracted.name,
        material: 'aluminum',
        width: extracted.dimensions.width ?? 61,
        height: extracted.dimensions.height ?? 30,
        thickness: extracted.dimensions.thickness ?? 1.4,
        color: '#C0C0C0',
        costPerMeter: pricing.pricePerMeter,
        cuttingAllowance: 3,
        stockQuantity: 0,
        minStockLevel: 0,
        maxStockLevel: 1000,
        supplier: 'ELSHERIF',
        systemBrand: 'ELSHERIF',
        weightPerMeter: extracted.weightPerMeter,
        grainDirection: null,
        specifications: {
          ...extracted.specifications,
          originalWeightKgPerM: extracted.weightPerMeter,
          aluminumPricePerKg: aluminumPrice,
          markupPercentage,
          calculatedPricePerMeter: pricing.pricePerMeter,
          optimizedFor45Degree: true,
          cuttingType: 'miter_45',
          profileRole: 'frame',
          supplierCode: extracted.oldProfileNumber,
          series: extracted.series,
          lastPriceUpdate: now.toISOString(),
        },
        userId,
        createdAt: now,
        updatedAt: now,
      };
    });

    onProfilesImported(imported);
    toast.success(`Imported ${imported.length} ELSHERIF profiles into inventory`);
    setExtractedProfiles([]);
  };

  const updateGlobalPricing = () => {
    AluminumPricingCalculator.updateGlobalPricing(aluminumPrice, {
      markupPercentage,
    });
    const current = AluminumPricingCalculator.getCurrentPricing();
    toast.success(
      `Global aluminum pricing set to ${current.aluminumPricePerKg.toFixed(
        2,
      )} ${current.currency}/kg with ${current.markupPercentage}% markup`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Pricing Configuration */}
      <Card className="bg-gray-900/60 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <DollarSign className="h-4 w-4 text-green-400" />
            Aluminum Price per Kg – ELSHERIF Profiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Aluminum Price / Kg</Label>
              <Input
                type="number"
                step="0.01"
                value={aluminumPrice}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setAluminumPrice(Number.isNaN(v) ? 0 : v);
                }}
                placeholder="e.g., 6.50"
              />
            </div>
            <div>
              <Label className="text-xs">Markup (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={markupPercentage}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setMarkupPercentage(Number.isNaN(v) ? 0 : v);
                }}
                placeholder="e.g., 30"
              />
            </div>
          </div>
          <Button
            onClick={updateGlobalPricing}
            className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Update Global Aluminum Pricing
          </Button>
        </CardContent>
      </Card>

      {/* PDF Import */}
      <Card className="bg-gray-900/60 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <FileText className="h-4 w-4 text-blue-400" />
            ELSHERIF Catalog (ROCK60) Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-gray-400 text-center">
                Processing ELSHERIF PDF... {progress}%
              </p>
            </div>
          )}

          {!isProcessing && extractedProfiles.length === 0 && (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <Label htmlFor="elsherif-pdf" className="cursor-pointer">
                <Button asChild className="bg-orange-500 hover:bg-orange-600 text-xs md:text-sm">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload ELSHERIF PDF Catalog
                  </span>
                </Button>
                <Input
                  id="elsherif-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-gray-400 mt-2">
                Phase 1 uses curated ROCK60 data for 99% accurate weight per meter.
              </p>
            </div>
          )}

          {extractedProfiles.length > 0 && (
            <div className="space-y-3">
              <Alert className="bg-green-500/10 border-green-500/60">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Extraction Complete</AlertTitle>
                <AlertDescription>
                  Found {extractedProfiles.length} ELSHERIF ROCK60 profiles with exact weight per meter.
                </AlertDescription>
              </Alert>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {extractedProfiles.map((profile, index) => {
                  const pricePerMeter =
                    AluminumPricingCalculator.calculateCost(profile.weightPerMeter, 1, {
                      aluminumPricePerKg: aluminumPrice,
                      markupPercentage,
                    }).pricePerMeter;

                  return (
                    <div
                      key={profile.profileNumber ?? index}
                      className="p-3 bg-gray-800 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{profile.name}</h4>
                          <Badge variant="outline" className="text-[10px]">
                            {profile.series}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-orange-500/10 text-orange-300 border-orange-500/40 text-[10px]"
                          >
                            45° Ready
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-300">
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {profile.weightPerMeter.toFixed(3)} kg/m
                          </div>
                          <div>Number: {profile.profileNumber}</div>
                          {profile.oldProfileNumber && (
                            <div>Old: {profile.oldProfileNumber}</div>
                          )}
                        </div>
                        {profile.dimensions.width && (
                          <div className="text-[11px] text-gray-400 mt-1">
                            {profile.dimensions.width} ×{' '}
                            {profile.dimensions.height ?? '—'} mm
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-green-400">
                          ${pricePerMeter.toFixed(2)}/m
                        </div>
                        <div className="text-[10px] text-gray-400">
                          @{aluminumPrice.toFixed(2)} / kg
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleImportProfiles}
                  className="bg-orange-500 hover:bg-orange-600 text-xs md:text-sm"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Import {extractedProfiles.length} Profiles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setExtractedProfiles([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


