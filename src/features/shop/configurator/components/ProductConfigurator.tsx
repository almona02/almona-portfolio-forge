import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import { ModelLoader } from './ModelLoader';
import type { GLTF } from 'three-stdlib';


interface ProductConfiguratorProps {
  productId: string;
  className?: string;
}

type MachineAttachment = 'cutter' | 'welder' | 'processor' | null;


export const ProductConfigurator = ({ productId, className }: ProductConfiguratorProps) => {

  const [activeAttachment, setActiveAttachment] = useState<MachineAttachment>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);


  if (!isMounted) return null;

  return (
    <div className={`h-full w-full ${className}`}>

      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Suspense fallback={<ModelLoader />}>
          <MachineModel 
            productId={productId} 
            activeAttachment={activeAttachment}
          />
        </Suspense>
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 bg-almona-darker/80 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Attachments</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveAttachment('cutter')}
            className={`px-3 py-1 rounded ${activeAttachment === 'cutter' ? 'bg-orange-600' : 'bg-almona-light/20'}`}
          >
            Cutting Head
          </button>
          <button 
            onClick={() => setActiveAttachment('welder')}
            className={`px-3 py-1 rounded ${activeAttachment === 'welder' ? 'bg-orange-600' : 'bg-almona-light/20'}`}
          >
            Welding Arm
          </button>
        </div>
      </div>
    </div>
  );
};

interface MachineModelProps {
  productId: string;
  activeAttachment: MachineAttachment;
}

const MachineModel = ({ productId, activeAttachment }: MachineModelProps) => {
  const { scene } = useGLTF(`/models/${productId}.glb`) as GLTF;

  useEffect(() => {
    // Apply attachment-specific transformations
    if (activeAttachment) {
      // This would be replaced with actual model manipulation logic
      console.log(`Showing ${activeAttachment} attachment`);
    }
  }, [activeAttachment]);

  return (
    <primitive 
      object={scene} 
      position={[0, -1, 0]}
      scale={0.5}
    />
  );
};

declare module 'three-stdlib' {
  interface GLTF {
    nodes: Record<string, THREE.Object3D>;
    materials: Record<string, THREE.Material>;
  }
}
