import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRegionDetection, useRegionUtils } from '@/hooks/useRegionDetection';

interface Technician {
  id: string;
  name: string;
  city: string;
  coords: [number, number]; // [lat, lng]
  responseMins: number;
}

const TECHS: Technician[] = [
  { id: 't1', name: 'Cairo Team A', city: 'Cairo', coords: [30.0444, 31.2357], responseMins: 120 },
  { id: 't2', name: 'Alexandria Unit', city: 'Alexandria', coords: [31.2001, 29.9187], responseMins: 180 },
  { id: 't3', name: 'Istanbul Crew', city: 'Istanbul', coords: [41.0082, 28.9784], responseMins: 150 },
  { id: 't4', name: 'Ankara Crew', city: 'Ankara', coords: [39.9334, 32.8597], responseMins: 210 },
];

export const ServiceCoverageMap: React.FC = () => {
  const { regionState } = useRegionDetection();
  const utils = useRegionUtils();

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Regional Service Coverage</CardTitle>
          <Badge variant="outline" className="text-xs">Egypt & Turkey</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="aspect-[16/9] w-full rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-3">
              <div className="h-full w-full rounded-lg bg-[url('/images/maps/egypt-turkey.png')] bg-cover bg-center" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Map placeholder — integrate MapLibre/OSM tiles in production.</p>
          </div>

          <div className="space-y-3">
            {TECHS.map(t => (
              <div key={t.id} className="p-3 rounded-lg border border-white/10 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-sm text-gray-400">{t.city}</div>
                  </div>
                  <Badge className={
                    t.responseMins <= 120 ? 'bg-green-600' : t.responseMins <= 180 ? 'bg-yellow-600' : 'bg-orange-600'
                  }>
                    {Math.round(t.responseMins)} min ETA
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCoverageMap;
