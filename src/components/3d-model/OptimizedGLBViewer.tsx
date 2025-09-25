import React, { Suspense, useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, Bounds, useBounds } from '@react-three/drei';
import * as THREE from 'three';

interface OptimizedGLBViewerProps {
  modelPath: string;
  backgroundColor?: string;
  onLoaded?: () => void;
  enableAR?: boolean;
  autoPlay?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

// Memoized model component with performance optimizations
const OptimizedModel = React.memo(({ 
  modelPath, 
  onLoaded, 
  autoPlay = false,
  quality = 'medium' 
}: { 
  modelPath: string; 
  onLoaded?: () => void; 
  autoPlay?: boolean;
  quality?: 'low' | 'medium' | 'high';
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(modelPath);
  const bounds = useBounds();
  const [isLoaded, setIsLoaded] = useState(false);

  // Optimize materials based on quality setting
  const optimizedScene = useMemo(() => {
    if (!gltf.scene) return null;
    
    const scene = gltf.scene.clone();
    
    // Apply quality-based optimizations
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Optimize geometry
        if (child.geometry) {
          if (quality === 'low') {
            // Reduce geometry complexity for low quality
            child.geometry.deleteAttribute('normal');
            child.geometry.deleteAttribute('uv2');
          }
        }
        
        // Optimize materials
        if (child.material instanceof THREE.Material) {
          const material = child.material.clone();
          
          if (quality === 'low') {
            // Disable expensive material features for low quality
            if ('normalMap' in material) material.normalMap = null;
            if ('roughnessMap' in material) material.roughnessMap = null;
            if ('metalnessMap' in material) material.metalnessMap = null;
          }
          
          child.material = material;
        }
      }
    });
    
    return scene;
  }, [gltf.scene, quality]);

  useEffect(() => {
    if (groupRef.current && optimizedScene && !isLoaded) {
      bounds.refresh(groupRef.current).fit();
      setIsLoaded(true);
      onLoaded?.();
    }
  }, [optimizedScene, bounds, onLoaded, isLoaded]);

  if (!optimizedScene) return null;

  return (
    <group ref={groupRef}>
      <primitive object={optimizedScene} />
    </group>
  );
});

OptimizedModel.displayName = 'OptimizedModel';

// Lightweight loading component
const ModelLoader = React.memo(() => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#333" wireframe />
  </mesh>
));

ModelLoader.displayName = 'ModelLoader';

export const OptimizedGLBViewer: React.FC<OptimizedGLBViewerProps> = ({
  modelPath,
  backgroundColor = '#111',
  onLoaded,
  enableAR = false,
  autoPlay = false,
  quality = 'medium'
}) => {
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Memoized canvas settings based on quality
  const canvasSettings = useMemo(() => {
    const settings = {
      low: { dpr: [0.5, 1], shadows: false, antialias: false },
      medium: { dpr: [1, 1.5], shadows: true, antialias: true },
      high: { dpr: [1, 2], shadows: true, antialias: true }
    };
    return settings[quality];
  }, [quality]);

  const handleError = useCallback((error: Error) => {
    console.error('3D Viewer Error:', error);
    setError(error.message);
  }, []);

  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    // Optimize renderer settings
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    
    // Quality-based optimizations
    if (quality === 'low') {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      gl.shadowMap.enabled = false;
    } else {
      gl.shadowMap.enabled = canvasSettings.shadows;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [quality, canvasSettings.shadows]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-sm text-red-400">Failed to load 3D model</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {enableAR && (
        <div className="absolute top-2 left-2 z-10">
          <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 transition">
            AR View
          </button>
        </div>
      )}
      
      <Canvas
        ref={canvasRef}
        style={{ background: backgroundColor }}
        camera={{ position: [2, 2, 2], fov: 45 }}
        dpr={canvasSettings.dpr}
        onCreated={handleCanvasCreated}
        onError={handleError}
      >
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow={canvasSettings.shadows}
          shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
          shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
        />
        
        <Suspense fallback={<ModelLoader />}>
          <Bounds fit clip observe margin={1.2}>
            <OptimizedModel 
              modelPath={modelPath} 
              onLoaded={onLoaded}
              autoPlay={autoPlay}
              quality={quality}
            />
          </Bounds>
          <Environment preset="warehouse" />
        </Suspense>
        
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.05}
          rotateSpeed={0.5}
          maxPolarAngle={Math.PI * 0.75}
        />
      </Canvas>
    </div>
  );
};

// Preload models for better performance
export const preloadModel = (modelPath: string) => {
  useGLTF.preload(modelPath);
};

export default OptimizedGLBViewer;