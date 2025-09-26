/**
 * Interactive GLB Viewer with Part Annotations
 * Enhanced version of EnhancedGLBViewer with interactive part selection and pricing integration
 */

import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, Bounds, useBounds, useAnimations, Text, Html } from '@react-three/drei';
import { useRegionDetection, useRegionUtils } from '@/hooks/useRegionDetection';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

// Part annotation interface
export interface PartAnnotation {
  id: string;
  name: string;
  nameTr?: string; // Turkish name
  nameAr?: string; // Arabic name
  description: string;
  descriptionTr?: string; // Turkish description
  descriptionAr?: string; // Arabic description
  price: number;
  material?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  meshName?: string; // Name of the mesh in the GLB file
  position?: [number, number, number]; // Override position for annotation
  color?: string; // Highlight color
}

// Pricing calculation interface
export interface PricingCalculation {
  partId: string;
  basePrice: number;
  quantity: number;
  taxAmount: number;
  totalWithTax: number;
  currency: string;
  region: string;
}

interface Part {
  id: string;
  name: string;
  price: number;
  description: string;
  compatibleWith: string[];
}

interface InteractiveGLBViewerProps {
  modelPath: string;
  usdzPath?: string;
  enableAR?: boolean;
  backgroundColor?: string;
  onLoaded?: () => void;
  title?: string;
  enableWebXR?: boolean;
  webXRHitTest?: boolean;
  autoPlayAnimations?: boolean;
  webXRScaleFactor?: number;
  
  // Interactive features
  annotations?: PartAnnotation[];
  enablePartSelection?: boolean;
  enablePricing?: boolean;
  onPartSelected?: (part: PartAnnotation) => void;
  onPricingCalculated?: (pricing: PricingCalculation) => void;
  selectedPartId?: string;
  highlightColor?: string;
  showAnnotations?: boolean;
  
  // Enhanced configuration features
  parts?: Part[];
  onPartSelect?: (part: Part) => void;
  initialConfiguration?: string[];
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

// Interactive model component with part selection
function InteractiveModel({ 
  modelPath, 
  onLoaded, 
  autoPlayAnimations = true,
  annotations = [],
  enablePartSelection = false,
  onPartSelected,
  selectedPartId,
  highlightColor = '#ff6b35'
}: {
  modelPath: string;
  onLoaded?: () => void;
  autoPlayAnimations?: boolean;
  annotations: PartAnnotation[];
  enablePartSelection: boolean;
  onPartSelected?: (part: PartAnnotation) => void;
  selectedPartId?: string;
  highlightColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(modelPath) as unknown as { scene?: THREE.Object3D; animations?: THREE.AnimationClip[] };
  const scene = gltf.scene;
  const { actions } = useAnimations(gltf.animations ?? [], scene as unknown as THREE.Object3D);
  const bounds = useBounds();
  const fired = useRef(false);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const { raycaster, camera, gl } = useThree();
  const mouse = useRef(new THREE.Vector2());

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
        annotation.meshName === intersectedObject.name || 
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
        annotation.meshName === intersectedObject.name || 
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
      if (!fired.current) { fired.current = true; onLoaded?.(); }
    }
  }, [scene, bounds, onLoaded]);

  useEffect(() => {
    if (autoPlayAnimations && actions) {
      Object.values(actions).forEach(a => a?.play?.());
    }
    return () => {
      if (actions) Object.values(actions).forEach(a => a?.stop?.());
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
  useFrame(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const part = annotations.find(annotation => 
          annotation.meshName === child.name || 
          child.name.includes(annotation.id)
        );

        if (part) {
          if (part.id === selectedPartId || part.id === hoveredPart) {
            child.material = child.material.clone();
            (child.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(highlightColor);
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
          } else {
            (child.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }
        }
      }
    });
  });

  if (!scene) return null;
  return <group ref={groupRef}><primitive object={scene} /></group>;
}

// Part annotation component
function PartAnnotation({ 
  annotation, 
  position, 
  language 
}: { 
  annotation: PartAnnotation; 
  position: [number, number, number];
  language: string;
}) {
  const { t } = useTranslation();
  const { regionState } = useRegionDetection();
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

// Main interactive GLB viewer component
export function InteractiveGLBViewer({
  modelPath,
  usdzPath = '/models/model.usdz',
  enableAR = true,
  backgroundColor = '#111',
  onLoaded,
  title = 'Model',
  enableWebXR = true,
  webXRHitTest = true,
  autoPlayAnimations = true,
  webXRScaleFactor = 0.6,
  annotations = [],
  enablePartSelection = false,
  enablePricing = false,
  onPartSelected,
  onPricingCalculated,
  selectedPartId,
  highlightColor = '#ff6b35',
  showAnnotations = true,
  parts = [],
  onPartSelect,
  initialConfiguration = []
}: InteractiveGLBViewerProps) {
  const { i18n } = useTranslation();
  const { regionState } = useRegionDetection();
  const utils = useRegionUtils();
  const [selectedPart, setSelectedPart] = useState<PartAnnotation | null>(null);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set(initialConfiguration));
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // WebXR AR support state
  const [xrSupported, setXrSupported] = useState(false);
  const [isXRSession, setIsXRSession] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

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
          console.warn('[InteractiveGLBViewer] WebXR AR support check failed', err);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [enableWebXR]);

  // Calculate total price in regional currency
  useEffect(() => {
    const calculatePrice = async () => {
      let basePrice = 0;
      selectedParts.forEach(partId => {
        const part = parts.find(p => p.id === partId);
        if (part) {
          basePrice += part.price;
        }
      });

      const regionalPrice = await utils.convertCurrency(basePrice, 'USD', utils.config.currency.code);
      setTotalPrice(regionalPrice);
    };

    calculatePrice();
  }, [selectedParts, parts, utils]);

  const handlePartClick = (partId: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);

    const part = parts.find(p => p.id === partId);
    if (part) {
      onPartSelect?.(part);
    }
  };

  const handlePartSelected = useCallback((part: PartAnnotation) => {
    setSelectedPart(part);
    onPartSelected?.(part);

    if (enablePricing) {
      const taxAmount = utils.calculateTax(part.price);
      const totalWithTax = utils.calculateTotalWithTax(part.price);
      
      const pricing: PricingCalculation = {
        partId: part.id,
        basePrice: part.price,
        quantity: 1,
        taxAmount,
        totalWithTax,
        currency: utils.config.currency.code,
        region: regionState.region
      };

      onPricingCalculated?.(pricing);
    }
  }, [onPartSelected, enablePricing, utils, onPricingCalculated, regionState.region]);

  const handleAndroidAR = () => {
    try {
      const url = new URL(modelPath, window.location.origin).toString();
      const sceneViewer = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
      window.location.href = sceneViewer;
    } catch (e) {
      console.warn('Android AR launch failed', e);
    }
  };

  const enterWebXR = async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: webXRHitTest ? ['hit-test'] : [],
        optionalFeatures: ['local-floor']
      });
      await rendererRef.current.xr.setSession(session);
      setIsXRSession(true);
      session.addEventListener('end', () => setIsXRSession(false));
    } catch (err) {
      console.warn('WebXR AR session failed', err);
    }
  };

  return (
    <CanvasErrorBoundary>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative w-full h-full">
            {/* AR Controls */}
            {enableAR && (
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                {isAndroid && (
                  <button
                    onClick={handleAndroidAR}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    AR (Android)
                  </button>
                )}
                {isIOS && (
                  <a
                    href={usdzPath}
                    rel="ar"
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    AR (iOS)
                  </a>
                )}
                {enableWebXR && xrSupported && (
                  <button
                    onClick={enterWebXR}
                    className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                  >
                    WebXR AR
                  </button>
                )}
              </div>
            )}

        {/* Part Selection Info */}
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
          <ambientLight intensity={1.15} />
          <directionalLight position={[5, 5, 5]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <directionalLight position={[-5, -3, -5]} intensity={0.45} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.15}>
              <group ref={modelGroupRef as unknown as React.Ref<THREE.Group>}>
                <InteractiveModel 
                  modelPath={modelPath} 
                  onLoaded={onLoaded} 
                  autoPlayAnimations={autoPlayAnimations}
                  annotations={annotations}
                  enablePartSelection={enablePartSelection}
                  onPartSelected={handlePartSelected}
                  selectedPartId={selectedPartId}
                  highlightColor={highlightColor}
                />
              </group>
            </Bounds>
            <Environment preset="warehouse" />
          </Suspense>
          {!isXRSession && (
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} rotateSpeed={0.7} />
          )}

          {/* Render part annotations */}
          {showAnnotations && annotations.map((annotation) => {
            const position = annotation.position || [0, 0, 0];
            return (
              <PartAnnotation
                key={annotation.id}
                annotation={annotation}
                position={position}
                language={i18n.language}
              />
            );
          })}
        </Canvas>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Configuration</h3>
            <div className="space-y-2">
              {parts.map(part => (
                <div 
                  key={part.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedParts.has(part.id) ? 'border-primary bg-primary/10' : ''
                  }`}
                  onClick={() => handlePartClick(part.id)}
                  onMouseEnter={() => setHoveredPart(part.id)}
                  onMouseLeave={() => setHoveredPart(null)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{part.name}</span>
                    <span className="text-orange-500 font-bold">
                      {utils.formatCurrency(part.price, { showSymbol: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{part.description}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center font-bold">
                <span>Total Price:</span>
                <span>{utils.formatCurrency(totalPrice, { showSymbol: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CanvasErrorBoundary>
  );
}

export default InteractiveGLBViewer;
