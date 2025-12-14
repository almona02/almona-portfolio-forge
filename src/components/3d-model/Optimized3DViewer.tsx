/**
 * Optimized3DViewer - Performance-Optimized 3D Viewer with Window3DGenerator Integration
 * 
 * Optimized version with:
 * - Lazy loading and code splitting
 * - Performance optimizations for better loading times
 * - Window-specific controls (open/close animations)
 * - AR/WebXR support
 * - Measurement display in 3D space
 * - Client presentation mode transitions
 */

import { Window3DModel } from '@/components/fabricator/Window3DGenerator';
import { initCompressedModelDecoders } from '@/lib/three-optimized';
import { WindowUnit } from '@/types/fabricator';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LazyThreeJS } from './LazyThreeJS';

// Props extended to support AR, scaling, positioning, window units, and animation
export interface Optimized3DViewerProps {
  // Model source - either GLB path or WindowUnit
  modelPath?: string;
  windowUnit?: WindowUnit;
  
  scale?: number;
  position?: [number, number, number];
  enableAR?: boolean;
  onReady?: () => void;
  arScaleMultiplier?: number;
  enableShadows?: boolean;
  enableAnimations?: boolean;
  
  // Window-specific features
  enableWindowControls?: boolean;
  windowAnimationSpeed?: number;
  presentationMode?: boolean;
  showMeasurements?: boolean;
  
  // Callbacks
  onModelUpdate?: (model: THREE.Group) => void;
  className?: string;
}

// Optimized model component
const OptimizedModel = ({ 
  modelPath,
  windowUnit,
  scale = 1, 
  position = [0, 0, 0], 
  enableAR = true,
  onReady,
  arScaleMultiplier = 0.5,
  enableShadows = false,
  enableAnimations = true,
  enableWindowControls = true,
  windowAnimationSpeed = 1,
  showMeasurements = true,
  onModelUpdate,
  threeJS
}: Optimized3DViewerProps & { threeJS: any }) => {
  const groupRef = useRef<any>(null);
  const windowModelRef = useRef<THREE.Group | null>(null);
  const { gl, camera } = threeJS.useThree();
  
  // Determine viewer mode
  const isWindowMode = !!windowUnit;
  const isGLBMode = !!modelPath && !windowUnit;
  
  // Window animation state
  const [isWindowAnimating, setIsWindowAnimating] = useState(false);
  const [windowAnimationProgress, setWindowAnimationProgress] = useState(0);
  
  // GLB mode: Load GLTF model (always call hooks, conditionally use)
  const gltfResult = threeJS.useGLTF(isGLBMode && modelPath ? modelPath : '');
  const scene = isGLBMode ? gltfResult.scene : null;
  const animations = isGLBMode ? gltfResult.animations || [] : [];

  // Animations setup (always call hook)
  const { actions } = threeJS.useAnimations(animations, scene || groupRef.current || ({} as any));

  const [arSupported, setArSupported] = useState(false);
  const [isARSession, setIsARSession] = useState(false);
  const checkingRef = useRef(false);

  // Detect AR support (once)
  useEffect(() => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    ;(async () => {
      if ('xr' in navigator) {
        try {
          const navXR = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: XRSessionMode) => Promise<boolean> } }).xr;
          const supported = await navXR?.isSessionSupported?.('immersive-ar');
          setArSupported(!!supported);
        } catch (e) {
          console.warn('AR support check failed:', e);
        }
      }
    })();
  }, []);

  // Auto-play animations (GLB mode only)
  useEffect(() => {
    if (isGLBMode && enableAnimations && actions && Object.keys(actions).length > 0) {
      try {
        Object.values(actions).forEach((action: any) => {
          if (action && typeof action.play === 'function') {
            action.play();
          }
        });
      } catch (error) {
        console.warn('Failed to play animations:', error);
      }
    }
  }, [actions, enableAnimations, isGLBMode]);

  // Window animation loop
  useEffect(() => {
    if (!isWindowAnimating || !isWindowMode) return;

    const interval = setInterval(() => {
      setWindowAnimationProgress((prev) => {
        const next = prev + 0.02 * windowAnimationSpeed;
        if (next >= 1) {
          setIsWindowAnimating(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isWindowAnimating, isWindowMode, windowAnimationSpeed]);

  // Handle AR session
  const handleAR = async () => {
    if (!arSupported || !gl.xr) return;

    try {
      if (isARSession) {
        await gl.xr.getSession()?.end();
        setIsARSession(false);
        // Restore scale
        if (groupRef.current) {
          groupRef.current.scale.setScalar(scale);
        }
        if (windowModelRef.current) {
          windowModelRef.current.scale.setScalar(scale);
        }
      } else {
        const session = await gl.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local'],
        });
        await gl.xr.setSession(session);
        setIsARSession(true);
        // Scale down for AR
        const arScale = scale * arScaleMultiplier;
        if (groupRef.current) {
          groupRef.current.scale.setScalar(arScale);
        }
        if (windowModelRef.current) {
          windowModelRef.current.scale.setScalar(arScale);
        }
      }
    } catch (e) {
      console.warn('AR session failed:', e);
    }
  };

  // Call onReady when model is loaded
  useEffect(() => {
    if ((scene || windowUnit) && onReady) {
      onReady();
    }
  }, [scene, windowUnit, onReady]);

  // Apply shadows if enabled
  useEffect(() => {
    if (enableShadows && scene) {
      try {
        scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      } catch (error) {
        console.warn('Failed to apply shadows:', error);
      }
    }
  }, [scene, enableShadows]);

  const handleWindowModelUpdate = useCallback((model: THREE.Group) => {
    windowModelRef.current = model;
    if (onModelUpdate) {
      onModelUpdate(model);
    }
  }, [onModelUpdate]);

  const currentScale = isARSession ? scale * arScaleMultiplier : scale;

  return (
    <>
      {isWindowMode && windowUnit ? (
        <group ref={windowModelRef as unknown as React.Ref<THREE.Group>} scale={currentScale} position={position}>
          <Window3DModel
            windowUnit={windowUnit}
            isAnimating={isWindowAnimating}
            animationProgress={windowAnimationProgress}
            onModelReady={handleWindowModelUpdate}
          />
          {/* Measurement overlay removed - component doesn't exist */}
        </group>
      ) : isGLBMode && scene ? (
        <group ref={groupRef} scale={currentScale} position={position}>
          <primitive object={scene} />
        </group>
      ) : null}
      
      {enableAR && arSupported && (
        <mesh position={[0, -2, 0]}>
          <button
            onClick={handleAR}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              backgroundColor: isARSession ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              zIndex: 1000
            }}
          >
            {isARSession ? 'Exit AR' : 'View in AR'}
          </button>
        </mesh>
      )}
    </>
  );
};

// Loading fallback component
const ModelLoadingFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#666666" />
  </mesh>
);

/**
 * Optimized3DViewer
 * - Loads a GLB/GLTF model or WindowUnit with optimized performance
 * - Plays included animations automatically (if enabled)
 * - Provides an optional WebXR (AR) session toggle button if device supports immersive-ar
 * - Includes performance optimizations for better loading times
 */
export function Optimized3DViewer(props: Optimized3DViewerProps) {
  // Validate props
  if (!props.modelPath && !props.windowUnit) {
    return (
      <div className="p-4 text-sm bg-yellow-600 text-white">
        Optimized3DViewer: Either modelPath or windowUnit must be provided
      </div>
    );
  }

  return (
    <LazyThreeJS>
      {(threeJS) => {
        const canvasProps = threeJS.getOptimizedCanvasProps();
        const lightingProps = threeJS.getOptimizedLightingProps();
        const controlsProps = threeJS.getOptimizedControlsProps();

        const { Canvas, AmbientLight, DirectionalLight, PointLight, OrbitControls } = threeJS;

        return (
          <Canvas {...canvasProps}>
            <AmbientLight {...lightingProps.ambientLight} />
            <DirectionalLight {...lightingProps.directionalLight} />
            <PointLight {...lightingProps.pointLight} />
            <Suspense fallback={<ModelLoadingFallback />}>
              <Initializer />
              <OptimizedModel {...props} threeJS={threeJS} />
            </Suspense>
            <OrbitControls {...controlsProps} />
          </Canvas>
        );
      }}
    </LazyThreeJS>
  );
}

// Small helper to ensure decoders are initialized once before model load
const Initializer: React.FC = () => {
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initCompressedModelDecoders('/').catch(() => {});
  }, []);
  return null;
};

export default Optimized3DViewer;

