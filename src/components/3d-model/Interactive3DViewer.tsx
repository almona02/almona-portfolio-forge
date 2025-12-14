/**
 * Interactive3DViewer - Interactive 3D Viewer with Window3DGenerator Integration
 * 
 * Enhanced version with:
 * - Window-specific controls (open/close animations)
 * - Interactive part selection and annotations
 * - AR/WebXR with window-specific interactions
 * - Measurement display in 3D space
 * - Client presentation mode transitions
 * - Pricing integration
 */

import { Window3DModel } from '@/components/fabricator/Window3DGenerator';
import { useRegionUtils } from '@/hooks/useRegionDetection';
import { useToast } from '@/hooks/useToast';
import { initCompressedModelDecoders } from '@/lib/three-optimized';
import { WindowUnit } from '@/types/fabricator';
import { detectSwiftXR, launchSwiftXR } from '@/utils/swiftXRIntegration';
import { Bounds, Environment, Html, OrbitControls, useAnimations, useBounds, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import './SwiftXR.css';

// Part annotation interface (for window components)
export interface WindowPartAnnotation {
  id: string;
  name: string;
  nameTr?: string;
  nameAr?: string;
  description: string;
  descriptionTr?: string;
  descriptionAr?: string;
  price: number;
  material?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  componentType?: 'frame' | 'sash' | 'glass' | 'hardware';
  position?: [number, number, number];
  color?: string;
}

interface Interactive3DViewerProps {
  // Model source - either GLB path or WindowUnit
  modelPath?: string;
  windowUnit?: WindowUnit;
  
  // AR/XR Configuration
  usdzPath?: string;
  enableAR?: boolean;
  enableWebXR?: boolean;
  webXRHitTest?: boolean;
  webXRScaleFactor?: number;
  
  // Display Configuration
  backgroundColor?: string;
  autoPlayAnimations?: boolean;
  autoRotate?: boolean;
  title?: string;
  
  // Window-specific features
  enableWindowControls?: boolean;
  windowAnimationSpeed?: number;
  presentationMode?: boolean;
  
  // Interactive features
  annotations?: WindowPartAnnotation[];
  enablePartSelection?: boolean;
  enablePricing?: boolean;
  onPartSelected?: (part: WindowPartAnnotation) => void;
  selectedPartId?: string;
  highlightColor?: string;
  showAnnotations?: boolean;
  
  // Measurement & Interaction
  showMeasurements?: boolean;
  enableMeasurementTool?: boolean;
  
  // Callbacks
  onLoaded?: () => void;
  onError?: (error: Error) => void;
  onModelUpdate?: (model: THREE.Group) => void;
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

// Interactive GLB Model Component with part selection
function InteractiveGLBModel({ 
  modelPath, 
  onLoaded, 
  onError, 
  autoPlayAnimations = true,
  annotations = [],
  enablePartSelection = false,
  onPartSelected,
  selectedPartId,
  highlightColor = '#ff6b35',
  onModelUpdate
}: { 
  modelPath: string; 
  onLoaded?: () => void; 
  onError?: (error: Error) => void; 
  autoPlayAnimations?: boolean;
  annotations: WindowPartAnnotation[];
  enablePartSelection: boolean;
  onPartSelected?: (part: WindowPartAnnotation) => void;
  selectedPartId?: string;
  highlightColor: string;
  onModelUpdate?: (model: THREE.Group) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const fired = useRef(false);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const { raycaster, camera, gl } = useThree();
  const mouse = useRef(new THREE.Vector2());

  const gltf = useGLTF(modelPath) as unknown as { scene?: THREE.Object3D; animations?: THREE.AnimationClip[] };
  const scene = gltf.scene;
  const { actions } = useAnimations(gltf.animations || [], scene as unknown as THREE.Object3D);
  const bounds = useBounds();

  // Handle mouse events for part selection
  const handleClick = useCallback((event: MouseEvent) => {
    if (!enablePartSelection || !scene) return;

    mouse.current.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse.current, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const part = annotations.find(annotation => 
        annotation.id === intersectedObject.name || 
        intersectedObject.name.includes(annotation.id)
      );

      if (part) {
        onPartSelected?.(part);
      }
    }
  }, [enablePartSelection, scene, annotations, onPartSelected, raycaster, camera, gl]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enablePartSelection || !scene) return;

    mouse.current.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse.current, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const part = annotations.find(annotation => 
        annotation.id === intersectedObject.name || 
        intersectedObject.name.includes(annotation.id)
      );

      if (part) {
        setHoveredPart(part.id);
        gl.domElement.style.cursor = 'pointer';
      } else {
        setHoveredPart(null);
        gl.domElement.style.cursor = 'default';
      }
    } else {
      setHoveredPart(null);
      gl.domElement.style.cursor = 'default';
    }
  }, [enablePartSelection, scene, annotations, raycaster, camera, gl]);

  useEffect(() => {
    if (groupRef.current && scene) {
      bounds.refresh(groupRef.current).fit();
      if (!fired.current) {
        fired.current = true;
        onLoaded?.();
      }
      
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

  useEffect(() => {
    if (enablePartSelection) {
      gl.domElement.addEventListener('click', handleClick);
      gl.domElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enablePartSelection, handleClick, handleMouseMove, gl.domElement]);

  // Apply highlighting to selected/hovered parts
  useEffect(() => {
    if (!scene || !enablePartSelection) return;

    const highlightParts = () => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const part = annotations.find(annotation => 
            annotation.id === child.name || 
            child.name.includes(annotation.id)
          );

          if (part) {
            if (part.id === selectedPartId || part.id === hoveredPart) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive = new THREE.Color(highlightColor);
                child.material.emissiveIntensity = 0.3;
              }
            } else {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          }
        }
      });
    };

    highlightParts();
  }, [scene, enablePartSelection, annotations, selectedPartId, hoveredPart, highlightColor]);

  if (!scene) return null;
  return <group ref={groupRef}><primitive object={scene} /></group>;
}

// Window Part Annotation Component
function WindowPartAnnotation({ 
  annotation, 
  position, 
  language 
}: { 
  annotation: WindowPartAnnotation; 
  position: [number, number, number];
  language: string;
}) {
  const { t } = useTranslation();
  const utils = useRegionUtils();

  const getLocalizedName = () => {
    switch (language) {
      case 'tr':
        return annotation.nameTr || annotation.name;
      case 'ar':
        return annotation.nameAr || annotation.name;
      default:
        return annotation.name;
    }
  };

  const getLocalizedDescription = () => {
    switch (language) {
      case 'tr':
        return annotation.descriptionTr || annotation.description;
      case 'ar':
        return annotation.descriptionAr || annotation.description;
      default:
        return annotation.description;
    }
  };

  return (
    <Html position={position} center>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs border border-gray-200 dark:border-gray-600">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
          {getLocalizedName()}
        </h4>
        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">
          {getLocalizedDescription()}
        </p>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-orange-500 font-bold text-sm">
            {utils.formatCurrency(annotation.price, { showSymbol: true })}
          </span>
          {annotation.material && (
            <span className="text-gray-500 text-xs">
              {annotation.material}
            </span>
          )}
        </div>
      </div>
    </Html>
  );
}

// Main Interactive3DViewer Component
export function Interactive3DViewer({
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
  enableWindowControls = true,
  windowAnimationSpeed = 1,
  presentationMode = false,
  annotations = [],
  enablePartSelection = false,
  enablePricing = false,
  onPartSelected,
  selectedPartId,
  highlightColor = '#ff6b35',
  showAnnotations = true,
  showMeasurements = true,
  enableMeasurementTool = false,
  onModelUpdate,
  cameraState,
  onCameraChange,
  className = ''
}: Interactive3DViewerProps) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const utils = useRegionUtils();

  // Determine viewer mode
  const isWindowMode = !!windowUnit;
  const isGLBMode = !!modelPath && !windowUnit;

  // WebXR AR support state
  const [xrSupported, setXrSupported] = useState(false);
  const [isXRSession, setIsXRSession] = useState(false);
  const [swiftXRInstalled, setSwiftXRInstalled] = useState<boolean | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const windowModelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);

  // Window animation state
  const [isWindowAnimating, setIsWindowAnimating] = useState(false);
  const [windowAnimationProgress, setWindowAnimationProgress] = useState(0);

  // Part selection state
  const [selectedPart, setSelectedPart] = useState<WindowPartAnnotation | null>(null);

  // Generate window annotations from WindowUnit
  const windowAnnotations = React.useMemo(() => {
    if (!windowUnit || !enablePartSelection) return [];
    
    const annotations: WindowPartAnnotation[] = [];
    
    // Frame annotation
    annotations.push({
      id: 'frame',
      name: 'Window Frame',
      description: 'Main structural frame',
      price: 0, // Would calculate from profile
      componentType: 'frame',
      position: [0, 0, 0]
    });
    
    // Sash annotation
    annotations.push({
      id: 'sash',
      name: 'Window Sash',
      description: 'Movable window panel',
      price: 0,
      componentType: 'sash',
      position: [0, 0, 0]
    });
    
    // Glass annotation
    annotations.push({
      id: 'glass',
      name: 'Glass Panel',
      description: windowUnit.glazing?.type || 'Single glazing',
      price: 0,
      componentType: 'glass',
      position: [0, 0, 0]
    });
    
    return annotations;
  }, [windowUnit, enablePartSelection]);

  const effectiveAnnotations = isWindowMode ? windowAnnotations : annotations;

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
          console.warn('[Interactive3DViewer] WebXR AR support check failed', err);
        }
      })();
    }
    
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

  const handlePartSelected = useCallback((part: WindowPartAnnotation) => {
    setSelectedPart(part);
    onPartSelected?.(part);

    if (enablePricing) {
      const taxAmount = utils.calculateTax(part.price);
      const totalWithTax = utils.calculateTotalWithTax(part.price);
      
      toast({
        title: "Part Selected",
        description: `${part.name}: ${utils.formatCurrency(totalWithTax, { showSymbol: true })}`,
      });
    }
  }, [onPartSelected, enablePricing, utils, toast]);

  const handleWindowModelUpdate = useCallback((model: THREE.Group) => {
    windowModelRef.current = model;
    if (onModelUpdate) {
      onModelUpdate(model);
    }
  }, [onModelUpdate]);

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
      
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(webXRScaleFactor);
      }
      if (windowModelRef.current) {
        windowModelRef.current.scale.setScalar(webXRScaleFactor);
      }
    } catch (err) {
      console.error('[Interactive3DViewer] Failed to start WebXR AR session', err);
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
      console.warn('[Interactive3DViewer] Error ending XR session', err);
    } finally {
      setIsXRSession(false);
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(1);
      }
      if (windowModelRef.current) {
        windowModelRef.current.scale.setScalar(1);
      }
    }
  };

  // Validate props
  if (!modelPath && !windowUnit) {
    return (
      <div className="p-4 text-sm bg-yellow-600 text-white">
        Interactive3DViewer: Either modelPath or windowUnit must be provided
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
                    
                    if (swiftXRInstalled && modelPath) {
                      const modelName = modelPath.split('/').pop()?.replace(/\.(glb|gltf)$/i, '') || title;
                      const fullModelUrl = modelPath.startsWith('http') 
                        ? modelPath 
                        : `${window.location.origin}${modelPath}`;
                      
                      await launchSwiftXR({
                        modelName,
                        modelUrl: fullModelUrl,
                        fallbackToWebXR: true,
                        onSuccess: () => {
                          toast({
                            title: "SwiftXR Launched",
                            description: "Opening native AR experience",
                          });
                        }
                      });
                    }
                  }}
                  className="swiftxr-ar-button"
                >
                  {swiftXRInstalled ? 'SwiftXR Native' : 'SwiftXR Quick Look'}
                </button>
              )}
              {isAndroid && (
                <button
                  onClick={() => {
                    if (isWindowMode) {
                      toast({
                        title: "Android AR",
                        description: "Window AR requires model export. Feature coming soon.",
                      });
                      return;
                    }
                    const url = new URL(modelPath!, window.location.origin).toString();
                    const sceneViewer = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
                    window.location.href = sceneViewer;
                  }}
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
                className="w-full px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors"
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

        {/* Selected Part Info */}
        {selectedPart && (
          <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {i18n.language === 'tr' ? selectedPart.nameTr || selectedPart.name : 
               i18n.language === 'ar' ? selectedPart.nameAr || selectedPart.name : 
               selectedPart.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
              {i18n.language === 'tr' ? selectedPart.descriptionTr || selectedPart.description : 
               i18n.language === 'ar' ? selectedPart.descriptionAr || selectedPart.description : 
               selectedPart.description}
            </p>
            {enablePricing && (
              <div className="mt-2 flex justify-between items-center">
                <span className="text-orange-500 font-bold">
                  {utils.formatCurrency(selectedPart.price, { showSymbol: true })}
                </span>
                {selectedPart.material && (
                  <span className="text-gray-500 text-sm">
                    {selectedPart.material}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <Canvas
          style={{ background: backgroundColor, backgroundImage: 'radial-gradient(circle at 35% 30%, #222 0%, #0b0b0b 80%)' }}
          camera={{ position: [2, 2, 2], fov: 45 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            rendererRef.current = gl;
            if (enableWebXR) {
              gl.xr.enabled = true;
            }
          }}
        >
          <DecoderInitializer />
          <ambientLight intensity={1.15} />
          <directionalLight position={[5, 5, 5]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <directionalLight position={[-5, -3, -5]} intensity={0.45} />
          
          <Suspense fallback={null}>
            {isWindowMode && windowUnit ? (
              <>
                <Bounds fit clip observe margin={1.15}>
                  <group ref={windowModelRef as unknown as React.Ref<THREE.Group>}>
                    <Window3DModel
                      windowUnit={windowUnit}
                      isAnimating={isWindowAnimating}
                      animationProgress={windowAnimationProgress}
                      onModelReady={handleWindowModelUpdate}
                    />
                  </group>
                </Bounds>
                {showMeasurements && (
                  {/* Measurement overlay removed - component doesn't exist */}
                )}
              </>
            ) : isGLBMode && modelPath ? (
              <Bounds fit clip observe margin={1.15}>
                <group ref={modelGroupRef as unknown as React.Ref<THREE.Group>}>
                  <InteractiveGLBModel 
                    modelPath={modelPath} 
                    onLoaded={onLoaded} 
                    onError={onError} 
                    autoPlayAnimations={autoPlayAnimations}
                    annotations={effectiveAnnotations}
                    enablePartSelection={enablePartSelection}
                    onPartSelected={handlePartSelected}
                    selectedPartId={selectedPartId}
                    highlightColor={highlightColor}
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

          {/* Render part annotations */}
          {showAnnotations && effectiveAnnotations.map((annotation) => {
            const position = annotation.position || [0, 0, 0];
            return (
              <WindowPartAnnotation
                key={annotation.id}
                annotation={annotation}
                position={position}
                language={i18n.language}
              />
            );
          })}
        </Canvas>
      </div>
    </CanvasErrorBoundary>
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

export default Interactive3DViewer;

