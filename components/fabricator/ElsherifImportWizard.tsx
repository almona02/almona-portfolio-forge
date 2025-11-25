// components/fabricator/ElsherifImportWizard.tsx
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
  AlertCircle,
  Package,
  DollarSign,
  Scale,
  FileText,
} from 'lucide-react';
import { ElsherifPDFExtractor, ExtractedProfile } from '@/lib/imports/ElsherifPDFExtractor';
import { AluminumPricingCalculator } from '@/lib/pricing/AluminumPricingCalculator';
import { Profile } from '@/types/fabricator';
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
  const [aluminumPrice, setAluminumPrice] = useState(6.5);
  const [markupPercentage, setMarkupPercentage] = useState(30);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate processing
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const profiles = await ElsherifPDFExtractor.extractProfilesFromPDF(file);
      clearInterval(interval);
      setProgress(100);
      setExtractedProfiles(profiles);

      toast.success(`Extracted ${profiles.length} ELSHERIF profiles`);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImportProfiles = async () => {
    if (!userId) {
      toast.error('User ID required');
      return;
    }

    try {
      const profilesToImport: Profile[] = extractedProfiles.map((extracted) => {
        const pricing = AluminumPricingCalculator.calculateCost(extracted.weightPerMeter, 1, {
          aluminumPricePerKg: aluminumPrice,
          markupPercentage,
        });

        return {
          id: `elsherif_${extracted.profileNumber}_${Date.now()}`,
          name: extracted.name,
          material: 'aluminum' as const,
          width: extracted.dimensions.width || 50,
          height: extracted.dimensions.height || 25,
          thickness: 1.4,
          color: '#C0C0C0',
          costPerMeter: pricing.pricePerMeter,
          cuttingAllowance: 3,
          stockQuantity: 0,
          minStockLevel: 0,
          maxStockLevel: 1000,
          supplier: 'ELSHERIF',
          systemBrand: 'ELSHERIF',
          grainDirection: null,
          weightPerMeter: extracted.weightPerMeter,
          specifications: {
            ...extracted.specifications,
            originalWeight: extracted.weightPerMeter,
            aluminumPricePerKg: aluminumPrice,
            markupPercentage,
            lastPriceUpdate: new Date().toISOString(),
            cuttingType: 'miter_45',
            optimizedFor45Degree: true,
          },
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      onProfilesImported(profilesToImport);
      toast.success(`Imported ${profilesToImport.length} profiles`);
      setExtractedProfiles([]);
    } catch (error) {
      toast.error('Failed to import profiles');
    }
  };

  const updateGlobalPricing = () => {
    AluminumPricingCalculator.updateGlobalPricing(aluminumPrice, { markupPercentage });
    toast.success('Global pricing updated');
  };

  return (
    <div className="space-y-6">
      {/* Pricing Configuration */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Aluminum Pricing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Aluminum Price per Kg (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={aluminumPrice}
                onChange={(e) => setAluminumPrice(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Markup Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={updateGlobalPricing} className="bg-green-600 hover:bg-green-700">
            <DollarSign className="h-4 w-4 mr-2" />
            Update Global Pricing
          </Button>
        </CardContent>
      </Card>

      {/* PDF Import Section */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            ELSHERIF Catalog Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-400 text-center">Processing... {progress}%</p>
            </div>
          )}

          {!isProcessing && extractedProfiles.length === 0 && (
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Label htmlFor="elsherif-pdf" className="cursor-pointer">
                <Button asChild>
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
              <p className="text-sm text-gray-400 mt-2">
                Upload ELSHERIF PDF to extract profiles and weights
              </p>
            </div>
          )}

          {extractedProfiles.length > 0 && (
            <div className="space-y-4">
              <Alert className="bg-green-500/10 border-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Extraction Complete</AlertTitle>
                <AlertDescription>Found {extractedProfiles.length} profiles</AlertDescription>
              </Alert>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {extractedProfiles.map((profile, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{profile.name}</h4>
                          <Badge variant="outline">{profile.series}</Badge>
                          <Badge className="bg-orange-500/20 text-orange-400">45° Ready</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {profile.weightPerMeter} kg/m
                          </div>
                          <div>Number: {profile.profileNumber}</div>
                          <div>
                            Size: {profile.dimensions.width}×{profile.dimensions.height}mm
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-400">
                          $
                          {AluminumPricingCalculator.calculateCost(
                            profile.weightPerMeter,
                            1,
                            { aluminumPricePerKg: aluminumPrice }
                          ).pricePerMeter.toFixed(2)}
                          /m
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleImportProfiles} className="bg-orange-500 hover:bg-orange-600">
                  <Package className="h-4 w-4 mr-2" />
                  Import {extractedProfiles.length} Profiles
                </Button>
                <Button variant="outline" onClick={() => setExtractedProfiles([])}>
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


