/**
 * RegionalProfileDatabase - Pre-load Turkish/Egyptian profile brands
 * Define regional profile brands and their specifications
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertCircle, CheckCircle, Download, Globe } from 'lucide-react';
import React, { useState } from 'react';
import { CustomProfile } from './ProfileConfigurator';

export interface RegionalProfileBrand {
  id: string;
  name: string;
  region: 'turkey' | 'egypt' | 'europe' | 'middle_east' | 'global';
  country: string;
  profiles: CustomProfile[];
  website?: string;
  contact?: string;
}

interface RegionalProfileDatabaseProps {
  onProfilesLoaded: (profiles: CustomProfile[]) => void;
}

// Pre-loaded Turkish profile brands
const turkishBrands: RegionalProfileBrand[] = [
  {
    id: 'alumil_tr',
    name: 'Alumil',
    region: 'turkey',
    country: 'Turkey',
    website: 'https://www.alumil.com',
    profiles: [
      {
        id: 'alumil_70',
        name: 'Alumil 70mm',
        material: 'aluminum',
        width: 70,
        height: 30,
        thickness: 1.4,
        color: '#C0C0C0',
        costPerMeter: 12.5,
        cuttingAllowance: 3,
        stockQuantity: 0,
        minStockLevel: 100,
        supplier: 'Alumil Turkey',
        region: 'turkey',
        brand: 'Alumil',
        finish: 'powder_coated',
      },
      {
        id: 'alumil_65',
        name: 'Alumil 65mm',
        material: 'aluminum',
        width: 65,
        height: 28,
        thickness: 1.4,
        color: '#C0C0C0',
        costPerMeter: 11.8,
        cuttingAllowance: 3,
        stockQuantity: 0,
        minStockLevel: 100,
        supplier: 'Alumil Turkey',
        region: 'turkey',
        brand: 'Alumil',
        finish: 'powder_coated',
      },
    ],
  },
  {
    id: 'kale_tr',
    name: 'Kale',
    region: 'turkey',
    country: 'Turkey',
    website: 'https://www.kale.com.tr',
    profiles: [
      {
        id: 'kale_70',
        name: 'Kale 70mm',
        material: 'aluminum',
        width: 70,
        height: 30,
        thickness: 1.4,
        color: '#C0C0C0',
        costPerMeter: 13.2,
        cuttingAllowance: 3,
        stockQuantity: 0,
        minStockLevel: 100,
        supplier: 'Kale Turkey',
        region: 'turkey',
        brand: 'Kale',
        finish: 'powder_coated',
      },
    ],
  },
];

// Pre-loaded Egyptian profile brands
const egyptianBrands: RegionalProfileBrand[] = [
  {
    id: 'egypt_standard',
    name: 'Egypt Standard Profiles',
    region: 'egypt',
    country: 'Egypt',
    profiles: [
      {
        id: 'egypt_70',
        name: 'Egypt Standard 70mm',
        material: 'aluminum',
        width: 70,
        height: 30,
        thickness: 1.4,
        color: '#C0C0C0',
        costPerMeter: 10.5,
        cuttingAllowance: 3,
        stockQuantity: 0,
        minStockLevel: 100,
        supplier: 'Egypt Local',
        region: 'egypt',
        brand: 'Local',
        finish: 'standard',
      },
    ],
  },
];

export const RegionalProfileDatabase: React.FC<RegionalProfileDatabaseProps> = ({
  onProfilesLoaded,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<'turkey' | 'egypt' | 'all'>('all');
  const [loadedProfiles, setLoadedProfiles] = useState<CustomProfile[]>([]);
  const [success, setSuccess] = useState(false);

  const allBrands = [...turkishBrands, ...egyptianBrands];

  const getBrandsForRegion = (region: 'turkey' | 'egypt' | 'all') => {
    if (region === 'all') return allBrands;
    return allBrands.filter((brand) => brand.region === region);
  };

  const handleLoadBrand = (brand: RegionalProfileBrand) => {
    const newProfiles = [...loadedProfiles, ...brand.profiles];
    setLoadedProfiles(newProfiles);
    onProfilesLoaded(newProfiles);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleLoadAll = () => {
    const allProfiles = allBrands.flatMap((brand) => brand.profiles);
    setLoadedProfiles(allProfiles);
    onProfilesLoaded(allProfiles);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      turkey: 'text-red-400',
      egypt: 'text-yellow-400',
      europe: 'text-blue-400',
      middle_east: 'text-green-400',
      global: 'text-gray-400',
    };
    return colors[region] || 'text-gray-400';
  };

  const brandsToShow = getBrandsForRegion(selectedRegion);

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {loadedProfiles.length} profiles loaded successfully!
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-400" />
              Regional Profile Database
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedRegion === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRegion('all')}
              >
                All Regions
              </Button>
              <Button
                variant={selectedRegion === 'turkey' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRegion('turkey')}
              >
                Turkey
              </Button>
              <Button
                variant={selectedRegion === 'egypt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRegion('egypt')}
              >
                Egypt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button onClick={handleLoadAll} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Load All Profiles
            </Button>
          </div>

          <div className="space-y-4">
            {brandsToShow.map((brand) => (
              <Card key={brand.id} className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className={getRegionColor(brand.region)}>{brand.name}</span>
                        <Badge variant="outline">{brand.country}</Badge>
                        <Badge variant="outline">{brand.profiles.length} profiles</Badge>
                      </CardTitle>
                    </div>
                    <Button
                      onClick={() => handleLoadBrand(brand)}
                      size="sm"
                      className="btn-primary"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Load Profiles
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {brand.profiles.map((profile) => (
                      <div key={profile.id} className="p-3 bg-gray-800 rounded-lg">
                        <div className="font-semibold mb-1">{profile.name}</div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>{profile.width}mm × {profile.height}mm</div>
                          <div>${profile.costPerMeter}/m</div>
                          <div>{profile.finish}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {brand.website && (
                    <div className="mt-3 text-sm text-gray-400">
                      Website: <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">{brand.website}</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {brandsToShow.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No profile brands found for the selected region.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

