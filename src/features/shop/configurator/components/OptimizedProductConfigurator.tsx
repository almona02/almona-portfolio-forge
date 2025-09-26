import { 
  OptimizedCanvas,
  OptimizedLighting,
  OptimizedControls,
  useOptimizedGLTF,
  type GLTF
} from '@/lib/three-optimized';
import { Suspense, useState, useEffect } from 'react';
import { ModelLoader } from './ModelLoader';

interface OptimizedProductConfiguratorProps {
  productId: string;
  className?: string;
}

type MachineAttachment = 'cutter' | 'welder' | 'processor' | null;

// Optimized machine model component
const OptimizedMachineModel = ({ 
  productId, 
  activeAttachment 
}: { 
  productId: string; 
  activeAttachment: MachineAttachment 
}) => {
  const { scene } = useOptimizedGLTF(`/models/${productId}.glb`);

  useEffect(() => {
    if (scene) {
      // Optimize model for better performance
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Reduce geometry complexity for better performance
          if (child.geometry) {
            child.geometry.computeBoundingBox();
          }
        }
      });
    }
  }, [scene]);

  return (
    <primitive 
      object={scene} 
      scale={[1, 1, 1]}
      position={[0, 0, 0]}
    />
  );
};

// Optimized attachment component
const OptimizedAttachment = ({ 
  type, 
  isActive 
}: { 
  type: MachineAttachment; 
  isActive: boolean 
}) => {
  if (!type) return null;

  const attachmentModels = {
    cutter: '/models/attachments/cutter.glb',
    welder: '/models/attachments/welder.glb',
    processor: '/models/attachments/processor.glb'
  };

  const { scene } = useOptimizedGLTF(attachmentModels[type]);

  return (
    <primitive 
      object={scene} 
      scale={isActive ? [1, 1, 1] : [0.8, 0.8, 0.8]}
      position={[0, 0, 0]}
      visible={isActive}
    />
  );
};

export const OptimizedProductConfigurator = ({ 
  productId, 
  className 
}: OptimizedProductConfiguratorProps) => {
  const [activeAttachment, setActiveAttachment] = useState<MachineAttachment>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  return (
    <div className={`h-full w-full ${className}`}>
      <OptimizedCanvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <OptimizedLighting />
        <Suspense fallback={<ModelLoader />}>
          <OptimizedMachineModel 
            productId={productId} 
            activeAttachment={activeAttachment}
          />
          <OptimizedAttachment 
            type={activeAttachment} 
            isActive={!!activeAttachment}
          />
        </Suspense>
        <OptimizedControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </OptimizedCanvas>

      <div className="absolute bottom-4 left-4 bg-almona-darker/80 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Attachments</h3>
        <div className="space-y-2">
          {(['cutter', 'welder', 'processor'] as const).map((attachment) => (
            <button
              key={attachment}
              onClick={() => setActiveAttachment(
                activeAttachment === attachment ? null : attachment
              )}
              className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                activeAttachment === attachment
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {attachment.charAt(0).toUpperCase() + attachment.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
