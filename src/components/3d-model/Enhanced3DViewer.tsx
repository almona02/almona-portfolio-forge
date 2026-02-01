/**
 * Enhanced3DViewer - Unified 3D Viewer with Window3DGenerator Integration
 * 
 * Supports both GLB models and Window3DGenerator models with:
 * - Window-specific controls (open/close animations)
 * - AR/WebXR with window-specific interactions
 * - Measurement display in 3D space
 * - Client presentation mode transitions
 * - Enhanced AR/WebXR support
 */

import { Window3DModel } from '@/components/fabricator/Window3DGenerator';
import { useToast } from '@/hooks/useToast';
import { initCompressedModelDecoders } from '@/lib/three-optimized';
import { WindowUnit } from '@/types/fabricator';
import { detectSwiftXR, launchSwiftXR } from '@/utils/swiftXRIntegration';
import { Bounds, Environment, OrbitControls, useAnimations, useBounds, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import './SwiftXR.css';

interface Enhanced3DViewerProps {
  // Model source - either GLB path or WindowUnit
  modelPath?: string;           // .glb path (public served)
  windowUnit?: WindowUnit;       // WindowUnit for window generation
  
  // AR/XR Configuration
  usdzPath?: string;            // optional .usdz for iOS Quick Look
  enableAR?: boolean;            // show AR button(s)
  enableWebXR?: boolean;        // enable in-browser WebXR immersive-ar
  webXRHitTest?: boolean;        // request hit-test feature when entering WebXR
  webXRScaleFactor?: number;     // scale factor to apply in AR session
  
  // Display Configuration
  backgroundColor?: string;     // canvas background color
  autoPlayAnimations?: boolean; // if true, play all GLTF animations on load
  autoRotate?: boolean;         // enable auto-rotation of the model
  title?: string;               // AR title (for Android Scene Viewer)
  
  // Window-specific features
  enableWindowControls?: boolean; // show window open/close controls
  windowAnimationSpeed?: number; // window animation speed (0-1)
  presentationMode?: boolean;   // client presentation mode with Almona branding
  
  // Measurement & Interaction
  showMeasurements?: boolean;   // show measurement overlays
  enableMeasurementTool?: boolean; // enable interactive measurement tool
  
  // Callbacks
  onLoaded?: () => void;        // callback after model fits
  onError?: (error: Error) => void; // callback for errors
  onModelUpdate?: (model: THREE.Group) => void; // callback when model updates
  cameraState?: { position: [number, number, number]; target: [number, number, number] };
  onCameraChange?: (state: { position: [number, number, number]; target: [number, number, number] }) => void;
  
  // Styling
  className?: string;
}

interface CanvasErrorState { hasError: boolean; error: Error | null }
class CanvasErrorBoundary extends React.Component<React.PropsWithChildren, CanvasErrorState> {
  state: CanvasErrorState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('3D Viewer Error', error, info); }
  render() { 
    if (this.state.hasError && this.state.error) { 
      return <div className="p-4 text-sm bg-red-600 text-white">3D Viewer crashed: {this.state.error.message}</div>; 
    } 
    return this.props.children; 
  }
}

// GLB Model Component
function FittedGLBModel({ 
  modelPath, 
  onLoaded, 
  onError: _onError, 
  autoPlayAnimations = true, 
  onModelUpdate 
}: { 
  modelPath: string; 
  onLoaded?: () => void; 
  onError?: (error: Error) => void; 
  autoPlayAnimations?: boolean;
  onModelUpdate?: (model: THREE.Group) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const fired = useRef(false);

  const gltf = useGLTF(modelPath) as unknown as { scene?: THREE.Object3D; animations?: THREE.AnimationClip[] };
  const scene = gltf.scene;
  const { actions } = useAnimations(gltf.animations || [], scene as unknown as THREE.Object3D);
  const bounds = useBounds();

  useEffect(() => {
    if (groupRef.current && scene) {
      bounds.refresh(groupRef.current).fit();
      if (!fired.current) {
        fired.current = true;
        onLoaded?.();
      }
      
      // Notify parent of model update
      if (onModelUpdate && scene instanceof THREE.Group) {
        onModelUpdate(scene);
      }
    }
  }, [scene, bounds, onLoaded, onModelUpdate]);

  useEffect(() => {
    if (autoPlayAnimations && actions && Object.keys(actions).length > 0) {
      try {
        Object.values(actions).forEach((a: any) => {
          if (a && typeof a.play === 'function') {
            a.play();
          }
        });
      } catch (error) {
        console.warn('Failed to play animations:', error);
      }
    }
    return () => {
      if (actions && Object.keys(actions).length > 0) {
        try {
          Object.values(actions).forEach((a: any) => {
            if (a && typeof a.stop === 'function') {
              a.stop();
            }
          });
        } catch (error) {
          console.warn('Failed to stop animations:', error);
        }
      }
    };
  }, [actions, autoPlayAnimations]);

  if (!scene) return null;
  return <group ref={groupRef}><primitive object={scene} /></group>;
}


// Main Enhanced3DViewer Component
export const Enhanced3DViewer = forwardRef<any, Enhanced3DViewerProps>(({
  modelPath,
  windowUnit,
  usdzPath = '/models/model.usdz',
  enableAR = true,
  backgroundColor = '#111',
  onLoaded,
  onError,
  title = 'Model',
  enableWebXR = true,
  webXRHitTest = true,
  autoPlayAnimations = true,
  autoRotate = false,
  webXRScaleFactor = 0.6,
  enableWindowControls: _enableWindowControls = true,
  windowAnimationSpeed: _windowAnimationSpeed = 1,
  presentationMode = false,
  showMeasurements: _showMeasurements = true,
  enableMeasurementTool: _enableMeasurementTool = false,
  onModelUpdate,
  cameraState: _cameraState,
  onCameraChange: _onCameraChange,
  className = ''
}, ref) => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const { toast } = useToast();

  // Determine viewer mode
  const isWindowMode = !!windowUnit;
  const isGLBMode = !!modelPath && !windowUnit;

  // WebXR AR support state
  const [xrSupported, setXrSupported] = useState(false);
  const [isXRSession, setIsXRSession] = useState(false);
  const [swiftXRInstalled, setSwiftXRInstalled] = useState<boolean | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);
  const windowModelRef = useRef<THREE.Group | null>(null);

  // Window animation state
  const [isWindowAnimating, setIsWindowAnimating] = useState(false);
  const [windowAnimationProgress, setWindowAnimationProgress] = useState(0);

  // Use refs for callbacks to avoid unnecessary re-renders
  const onCameraChangeRef = useRef(_onCameraChange);
  useEffect(() => {
    onCameraChangeRef.current = _onCameraChange;
  }, [_onCameraChange]);

  // Propagate camera changes for synchronization
  React.useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const handler = () => {
      try {
        const cam = controls.object;
        const pos: [number, number, number] = [cam.position.x, cam.position.y, cam.position.z];
        const tgt = controls.target;
        const target: [number, number, number] = [tgt.x, tgt.y, tgt.z];
        onCameraChangeRef.current?.({ position: pos, target });
      } catch {}
    };
    controls.addEventListener('change', handler);
    return () => { try { controls.removeEventListener('change', handler); } catch {} };
  }, []); // Empty deps - using ref for callback

  // Apply external camera state
  React.useEffect(() => {
    if (!controlsRef.current || !_cameraState) return;
    const controls = controlsRef.current;
    try {
      const cam = controls.object;
      const [px, py, pz] = _cameraState.position;
      const [tx, ty, tz] = _cameraState.target;
      cam.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
    } catch {}
  }, [_cameraState]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    },
    startWindowAnimation: () => {
      if (isWindowMode) {
        setIsWindowAnimating(true);
        setWindowAnimationProgress(0);
      }
    },
    stopWindowAnimation: () => {
      setIsWindowAnimating(false);
    }
  }));

  useEffect(() => {
    let cancelled = false;
    if (enableWebXR && 'xr' in navigator) {
      (async () => {
        try {
          const navXR = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: XRSessionMode) => Promise<boolean> } }).xr;
          const supported = await navXR?.isSessionSupported?.('immersive-ar');
          if (!cancelled) setXrSupported(!!supported);
        } catch (err) {
          if (!cancelled) setXrSupported(false);
          console.warn('[Enhanced3DViewer] WebXR AR support check failed', err);
        }
      })();
    }
    
    // Check for SwiftXR app on iOS
    if (isIOS) {
      detectSwiftXR().then(result => {
        if (!cancelled) setSwiftXRInstalled(result.isInstalled);
      });
    }
    
    return () => { cancelled = true; };
  }, [enableWebXR, isIOS]);

  // Window animation loop
  useEffect(() => {
    if (!isWindowAnimating || !isWindowMode) return;

    const interval = setInterval(() => {
      setWindowAnimationProgress((prev) => {
        const next = prev + 0.02 * _windowAnimationSpeed;
        if (next >= 1) {
          setIsWindowAnimating(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isWindowAnimating, isWindowMode, _windowAnimationSpeed]);

  const handleAndroidAR = () => {
    try {
      // For window mode, we'd need to export the model first
      if (isWindowMode) {
        toast({
          title: "AR Export",
          description: "Exporting window model for AR...",
        });
        // TODO: Export window model to GLB for AR
        return;
      }
      
      const url = new URL(modelPath!, window.location.origin).toString();
      const sceneViewer = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
      window.location.href = sceneViewer;
    } catch (e) {
      console.warn('Android AR launch failed', e);
    }
  };

  const enterWebXR = async () => {
    if (!rendererRef.current) return;
    try {
      const navXR = (navigator as Navigator & { xr?: { requestSession?: (mode: XRSessionMode, init?: XRSessionInit) => Promise<XRSession> } }).xr;
      const sessionInit: XRSessionInit & { domOverlay?: { root: HTMLElement } } = {
        requiredFeatures: webXRHitTest ? ['hit-test'] : [],
        optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor'],
        domOverlay: { root: document.body }
      };
      const session = await navXR?.requestSession?.('immersive-ar', sessionInit);
      if (!session) throw new Error('XR session unavailable');
      await rendererRef.current.xr.setSession(session);
      setIsXRSession(true);
      session.addEventListener('end', () => setIsXRSession(false));
      
      // Scale down model in AR for usability
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(webXRScaleFactor);
      }
      if (windowModelRef.current) {
        windowModelRef.current.scale.setScalar(webXRScaleFactor);
      }
    } catch (err) {
      console.error('[Enhanced3DViewer] Failed to start WebXR AR session', err);
      toast({
        title: "AR Error",
        description: "Unable to start AR session in this browser.",
        variant: "destructive"
      });
    }
  };

  const exitWebXR = async () => {
    try {
      const session = rendererRef.current?.xr.getSession?.();
      if (session) await session.end();
    } catch (err) {
      console.warn('[Enhanced3DViewer] Error ending XR session', err);
    } finally {
      setIsXRSession(false);
      // Restore scale when leaving AR
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(1);
      }
      if (windowModelRef.current) {
        windowModelRef.current.scale.setScalar(1);
      }
    }
  };

  const handleWindowModelUpdate = useCallback((model: THREE.Group) => {
    windowModelRef.current = model;
    if (onModelUpdate) {
      onModelUpdate(model);
    }
  }, [onModelUpdate]);

  // Validate props
  if (!modelPath && !windowUnit) {
    return (
      <div className="p-4 text-sm bg-yellow-600 text-white">
        Enhanced3DViewer: Either modelPath or windowUnit must be provided
      </div>
    );
  }

  return (
    <CanvasErrorBoundary>
      <div className={`relative w-full h-full ${className}`}>
        {/* AR Controls */}
        {enableAR && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="flex gap-2">
              {isIOS && (
                <button
                  onClick={async () => {
                    if (isWindowMode) {
                      toast({
                        title: "iOS AR",
                        description: "Window AR requires model export. Feature coming soon.",
                      });
                      return;
                    }
                    
                    // Try native SwiftXR first if installed
                    if (swiftXRInstalled) {
                      const modelName = modelPath!.split('/').pop()?.replace(/\.(glb|gltf)$/i, '') || title;
                      const fullModelUrl = modelPath!.startsWith('http') 
                        ? modelPath! 
                        : `${window.location.origin}${modelPath}`;
                      
                      const success = await launchSwiftXR({
                        modelName,
                        modelUrl: fullModelUrl,
                        fallbackToWebXR: true,
                        onSuccess: () => {
                          toast({
                            title: "SwiftXR Launched",
                            description: "Opening native AR experience",
                          });
                        },
                        onFallback: () => {
                          const link = document.createElement('a');
                          link.href = usdzPath;
                          link.rel = 'ar';
                          link.style.display = 'none';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      });
                      
                      if (success) return;
                    }
                    
                    // Fallback to Quick Look
                    const link = document.createElement('a');
                    link.href = usdzPath;
                    link.rel = 'ar';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="swiftxr-ar-button"
                >
                  {swiftXRInstalled ? 'SwiftXR Native' : 'SwiftXR Quick Look'}
                </button>
              )}
              {isAndroid && (
                <button
                  onClick={handleAndroidAR}
                  className="swiftxr-ar-button"
                >SwiftXR SceneViewer</button>
              )}
              {enableWebXR && xrSupported && (
                !isXRSession ? (
                  <button
                    onClick={enterWebXR}
                    className="swiftxr-ar-button"
                  >SwiftXR AR</button>
                ) : (
                  <button
                    onClick={exitWebXR}
                    className="swiftxr-ar-button"
                    style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
                  >Exit SwiftXR</button>
                )
              )}
            </div>
            {enableWebXR && !xrSupported && (
              <span className="text-[10px] text-gray-400">SwiftXR WebXR not supported</span>
            )}
          </div>
        )}

        {/* Window Controls */}
        {isWindowMode && enableWindowControls && !presentationMode && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 space-y-2">
              <button
                onClick={() => {
                  setIsWindowAnimating(!isWindowAnimating);
                  if (!isWindowAnimating) {
                    setWindowAnimationProgress(0);
                  }
                }}
                className="btn-primary"
              >
                {isWindowAnimating ? 'Pause' : 'Animate Window'}
              </button>
              <button
                onClick={() => {
                  setWindowAnimationProgress(0);
                  setIsWindowAnimating(false);
                }}
                className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <Canvas
          style={{ background: backgroundColor, backgroundImage: 'radial-gradient(circle at 35% 30%, #222 0%, #0b0b0b 80%)' }}
          camera={{ position: [2, 2, 2], fov: 45 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            rendererRef.current = gl;
            if (enableWebXR) {
              gl.xr.enabled = true; // allow entering immersive sessions
            }
          }}
        >
          {/* Initialize Draco/KTX2 decoders once */}
          <DecoderInitializer />
          <ambientLight intensity={1.15} />
          <directionalLight position={[5, 5, 5]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <directionalLight position={[-5, -3, -5]} intensity={0.45} />
          
          <Suspense fallback={null}>
            {isWindowMode && windowUnit ? (
              <>
                <Bounds fit clip observe margin={1.15}>
                  <group ref={windowModelRef as unknown as React.Ref<THREE.Group>}>
                    {/* Window3DGenerator integration */}
                    <Window3DModelWrapper
                      windowUnit={windowUnit}
                      isAnimating={isWindowAnimating}
                      animationProgress={windowAnimationProgress}
                      onModelReady={handleWindowModelUpdate}
                    />
                  </group>
                </Bounds>
                {/* Measurement overlay removed - component doesn't exist */}
              </>
            ) : isGLBMode && modelPath ? (
              <Bounds fit clip observe margin={1.15}>
                <group ref={modelGroupRef as unknown as React.Ref<THREE.Group>}>
                  <FittedGLBModel 
                    modelPath={modelPath} 
                    onLoaded={onLoaded} 
                    onError={onError} 
                    autoPlayAnimations={autoPlayAnimations}
                    onModelUpdate={onModelUpdate}
                  />
                </group>
              </Bounds>
            ) : null}
            <Environment preset="warehouse" />
          </Suspense>
          
          {!isXRSession && (
            <OrbitControls 
              ref={controlsRef} 
              makeDefault 
              enableDamping 
              dampingFactor={0.08} 
              rotateSpeed={0.7}
              autoRotate={autoRotate}
              autoRotateSpeed={1.0}
            />
          )}
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
});

Enhanced3DViewer.displayName = 'Enhanced3DViewer';

// Window3DModelWrapper - Uses exported Window3DModel component
function Window3DModelWrapper({
  windowUnit,
  isAnimating,
  animationProgress,
  onModelReady
}: {
  windowUnit: WindowUnit;
  isAnimating: boolean;
  animationProgress: number;
  onModelReady: (model: THREE.Group) => void;
}) {
  return (
    <Window3DModel
      windowUnit={windowUnit}
      isAnimating={isAnimating}
      animationProgress={animationProgress}
      onModelReady={onModelReady}
    />
  );
}

const DecoderInitializer: React.FC = () => {
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initCompressedModelDecoders('/').catch(() => {});
  }, []);
  return null;
};

export default Enhanced3DViewer;

