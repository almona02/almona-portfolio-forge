import React, { useEffect, useRef, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRegionDetection, useRegionUtils } from '@/hooks/useRegionDetection';
// Lazy load MapLibre to reduce initial bundle size (~744KB saved)
let maplibregl: typeof import('maplibre-gl').default | null = null;

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
  const { regionState: _regionState } = useRegionDetection();
  const _utils = useRegionUtils();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);

  // Lazy load MapLibre
  useEffect(() => {
    if (maplibregl) {
      setIsMapLoaded(true);
      return;
    }
    
    Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css')
    ]).then(([mapLib]) => {
      maplibregl = mapLib.default;
      setIsMapLoaded(true);
    }).catch((err) => {
      console.error('Failed to load MapLibre:', err);
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !isMapLoaded || !maplibregl) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [32.5, 29.5], // centered between Egypt/Turkey roughly
      zoom: 4.2,
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const features = TECHS.map(t => ({
        type: 'Feature' as const,
        properties: { response: t.responseMins, name: t.name, city: t.city },
        geometry: { type: 'Point' as const, coordinates: [t.coords[1], t.coords[0]] }
      }));
      map.addSource('techs', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      // Simple heat-like circles scaled by response time
      map.addLayer({
        id: 'tech-heat',
        type: 'circle',
        source: 'techs',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'response'],
            60, 8,
            120, 12,
            240, 18
          ],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'response'],
            60, '#22c55e',
            120, '#eab308',
            240, '#f97316'
          ],
          'circle-opacity': 0.25
        }
      });

      TECHS.forEach(t => {
        const el = document.createElement('div');
        el.className = 'rounded-full border border-white/20 bg-orange-500/90 w-3 h-3 shadow';
        new maplibregl.Marker({ element: el })
          .setLngLat([t.coords[1], t.coords[0]])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font-size:12px"><strong>${t.name}</strong><br/>${t.city}<br/>ETA: ${Math.round(t.responseMins)} min</div>`))
          .addTo(map);
      });
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [isMapLoaded]);

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
            <div className="aspect-[16/9] w-full rounded-xl border border-white/10 overflow-hidden">
              {!isMapLoaded ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-400">Loading map...</p>
                  </div>
                </div>
              ) : (
                <div ref={mapRef} className="h-full w-full" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Map data © OpenStreetMap contributors, style © Carto.</p>
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

