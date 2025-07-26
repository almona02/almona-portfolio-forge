import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useGLTF, Html, useProgress, Box } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Group, Vector3, Box3 } from 'three';
import { GLTF } from 'three-stdlib';

// Type definitions for GLTF result
type GLTFResult = GLTF & {
  nodes: { [name: string]: THREE.Mesh };
  materials: { [name: string]: THREE.Material };
};

interface GLBViewerProps {
  /** Path to the .glb file */
  modelPath: string;
  /** Scale factor for the model */
  scale?: number | [number, number, number];
  /** Position offset for the model */
  position?: [number, number, number];
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed */
  autoRotateSpeed?: number;
  /** Enable shadows */
  shadows?: boolean;
  /** Camera position */
  cameraPosition?: [number, number, number];
  /** Background color */
  backgroundColor?: string;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Error component */
  errorComponent?: React.ReactNode;
  /** On load callback */
  onLoad?: () => void;
  /** On error callback */
  onError?: (error: Error) => void;
}

interface ModelProps {
  modelPath: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
  shadows?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Loading component with progress indicator
 */
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-sm font-medium text-gray-700">{progress.toFixed(0)}% loaded</span>
      </div>
    </Html>
  );
}

/**
 * Error fallback component
 */
function ErrorFallback({ error }: { error: Error }) {
  return (
    <Html center>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Model</h3>
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    </Html>
  );
}

/**
 * 3D Model component
 */
function Model({ 
  modelPath, 
  scale = 1, 
  position = [0, 0, 0], 
  shadows = true,
  onLoad,
  onError 
}: ModelProps) {
  const modelRef = useRef<Group>(null);
  
  const gltf = useGLTF(modelPath) as GLTFResult;
  
  useEffect(() => {
    if (gltf && onLoad) {
      onLoad();
    }
    
    if (gltf.scene && modelRef.current) {
      const box = new Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = 2 / maxDim;
      
      gltf.scene.position.sub(center);
      gltf.scene.scale.multiplyScalar(scaleFactor);
    }
  }, [gltf, onLoad]);

  return (
    <group ref={modelRef} position={position} scale={scale}>
      <primitive 
        object={gltf.scene} 
        castShadow={shadows}
        receiveShadow={shadows}
      />
    </group>
  );
}

/**
 * Enhanced 3D Model Viewer component with full TypeScript support
 * @param {GLBViewerProps} props - Component props
 * @returns {JSX.Element} 3D Model Viewer
 */
export function EnhancedGLBViewer({
  modelPath,
  scale = 1,
  position = [0, 0, 0],
  autoRotate = false,
  autoRotateSpeed = 0.5,
  shadows = true,
  cameraPosition = [0, 0, 5],
  backgroundColor = '#f8f9fa',
  loadingComponent = <Loader />,
  errorComponent,
  onLoad,
  onError
}: GLBViewerProps) {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (error: Error) => {
    setError(error);
    if (onError) onError(error);
  };

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor }}>
      <Canvas
        shadows={shadows}
        camera={{ position: cameraPosition, fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={loadingComponent}>
          <Model 
            modelPath={modelPath} 
            scale={scale}
            position={position}
            shadows={shadows}
            onLoad={onLoad}
            onError={handleError}
          />
          
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          <Environment preset="studio" />
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            minDistance={1}
            maxDistance={20}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the model for better performance
EnhancedGLBViewer.preload = (modelPath: string) => {
  return useGLTF.preload(modelPath);
};

export default EnhancedGLBViewer;
