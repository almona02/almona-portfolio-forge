import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';

interface Milestone {
  year: number;
  title: string;
  description: string;
  details?: string[];
  impact?: string[];
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  comparison?: {
    before: string;
    after: string;
  };
}

import { MILESTONES } from './timelineData';

const TimelineNode = ({ milestone, active, onClick }: { milestone: Milestone; active: boolean; onClick: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(active ? 1.2 : 1, active ? 1.2 : 1, active ? 1.2 : 1),
        0.1
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[milestone.year - 2000, 0, 0]}
      onClick={onClick}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={active ? '#f97316' : '#64748b'} />
      <Text
        position={[0, -1, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {milestone.year}
      </Text>
    </mesh>
  );
};

const MediaGallery = ({ media }: { media: Milestone['media'] }) => {
  if (!media || media.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-almona-light/10 bg-gradient-to-br from-almona-dark to-almona-dark/80 px-4 py-6 text-sm text-gray-400">
        Media coming soon for this milestone.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {media.map((item, index) => (
        <div key={index} className="relative aspect-[4/3] sm:aspect-video bg-almona-dark rounded-lg overflow-hidden border border-almona-light/10">
          {item.type === 'image' ? (
            <img 
              src={item.url} 
              alt={item.thumbnail ?? item.url} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <video
              src={item.url}
              controls
              className="w-full h-full object-cover"
            />
          )}
          {!item.thumbnail && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />
          )}
        </div>
      ))}
    </div>
  );
};

const ComparisonSlider = ({ before, after }: { before: string; after: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sliderPosition;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + (deltaX / containerWidth * 100);
      setSliderPosition(Math.min(100, Math.max(0, newWidth)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative w-full h-64 mt-4 rounded-lg overflow-hidden" ref={containerRef}>
      <div className="absolute inset-0 flex">
        <div className="w-full h-full">
          <img 
            src={before} 
            alt="Before" 
            className="w-full h-full object-cover"
          />
        </div>
        <div 
          className="absolute top-0 left-0 bottom-0 w-full"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={after} 
            alt="After" 
            className="w-full h-full object-cover"
          />
                        <div
                          className="absolute top-0 right-0 bottom-0 w-1 bg-white cursor-ew-resize"
                          onMouseDown={handleMouseDown}
                          role="slider"
                          aria-label="Image comparison slider"
                          aria-valuenow={sliderPosition}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft') {
                              setSliderPosition(prev => Math.max(0, prev - 5));
                            } else if (e.key === 'ArrowRight') {
                              setSliderPosition(prev => Math.min(100, prev + 5));
                            }
                          }}
                        />

        </div>
      </div>
    </div>
  );
};

export const CompanyTimeline = () => {
  const [activeMilestone, setActiveMilestone] = useState<Milestone>(MILESTONES[0]);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div 
      ref={ref}
      className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8"
      style={{
        opacity: isInView ? 1 : 0,
        transition: 'opacity 0.5s ease'
      }}
    >
      <div className="flex-1 h-[320px] sm:h-[420px] md:h-[460px] lg:h-[520px] bg-gradient-to-br from-almona-dark to-almona-darker rounded-lg sm:rounded-xl overflow-hidden border border-almona-light/10 shadow-inner">
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <group position={[0, -2, 0]}>
            {MILESTONES.map((milestone) => (
              <TimelineNode
                key={milestone.year}
                milestone={milestone}
                active={activeMilestone.year === milestone.year}
                onClick={() => setActiveMilestone(milestone)}
              />
            ))}
          </group>
          <OrbitControls 
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>

      <div className="flex-1">
        <ScrollArea className="h-[320px] sm:h-[420px] md:h-[460px] lg:h-[520px] pr-2 sm:pr-4 bg-almona-dark/60 rounded-lg sm:rounded-xl border border-almona-light/10 p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">{activeMilestone.title}</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed">{activeMilestone.description}</p>
            
            {activeMilestone.comparison && (
              <ComparisonSlider 
                before={activeMilestone.comparison.before}
                after={activeMilestone.comparison.after}
              />
            )}

            <MediaGallery media={activeMilestone.media} />

            <Tabs value="details" onValueChange={() => {}} className="mt-4 sm:mt-6">
              <TabsList className="grid w-full grid-cols-2 bg-almona-darker h-9 sm:h-10">
                <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                <TabsTrigger value="impact" className="text-xs sm:text-sm">Impact</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-3 sm:mt-4">
                {activeMilestone.details && activeMilestone.details.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed">
                    {activeMilestone.details.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed">
                    Additional details about this milestone will be added soon.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="impact" className="mt-3 sm:mt-4">
                {activeMilestone.impact && activeMilestone.impact.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed">
                    {activeMilestone.impact.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed">
                    Impact highlights will be documented here.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
