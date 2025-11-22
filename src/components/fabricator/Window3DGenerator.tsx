/**
 * Window3DGenerator - Real-time 3D Window Model Generator
 * 
 * Generates high-quality 3D models directly from WindowUnit data with:
 * - Real-time geometry generation for all window types
 * - Material rendering (aluminum, UPVC, glass with reflections)
 * - Hardware visualization (hinges, locks, handles)
 * - Opening mechanism animations
 * - Export to GLB, STL, OBJ formats
 * - Client presentation mode with Almona branding
 */

import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Html, PerspectiveCamera } from '@react-three/drei';
import { WindowUnit, WindowComponent, Profile } from '@/types/fabricator';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Download, Play, Pause, RotateCcw, Settings, Eye, EyeOff, Maximize2, AlertTriangle } from 'lucide-react';
import { track } from '@/lib/analytics';
import { validateProject, ValidationError } from '@/lib/fabricatorValidation';

// Window type definitions
type WindowType = 'sliding_window' | 'casement' | 'tilt_turn' | 'sliding_door' | 'fixed_window';

interface Window3DGeneratorProps {
  windowUnit: WindowUnit;
  presentationMode?: boolean;
  showControls?: boolean;
  onModelUpdate?: (model: THREE.Group) => void;
  className?: string;
  showErrorDetection?: boolean;
  profiles?: Profile[];
}

interface WindowGeometry {
  frame: THREE.BufferGeometry;
  sash: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  hardware: THREE.Group;
}

// Material definitions
const createMaterial = (materialType: string, color: string): THREE.MeshStandardMaterial => {
  const baseColor = new THREE.Color(color);
  
  switch (materialType.toLowerCase()) {
    case 'aluminum':
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.8,
        roughness: 0.2,
        envMapIntensity: 1.0,
      });
    case 'upvc':
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.1,
        roughness: 0.7,
        envMapIntensity: 0.5,
      });
    default:
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.5,
        roughness: 0.5,
      });
  }
};

const createGlassMaterial = (glazingType: string): THREE.MeshPhysicalMaterial => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.95,
    thickness: glazingType === 'double' ? 24 : glazingType === 'triple' ? 36 : 6,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
  });
};

// Generate frame geometry based on profile
const generateFrameGeometry = (
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType
): THREE.BufferGeometry => {
  const profileWidth = profile.width || 50;
  const profileDepth = profile.height || 25;
  const thickness = profile.thickness || 1.4;

  const shape = new THREE.Shape();
  
  // Outer frame rectangle
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);

  // Inner cutout
  const innerWidth = width - profileWidth * 2;
  const innerHeight = height - profileWidth * 2;
  const innerX = profileWidth;
  const innerY = profileWidth;

  const innerPath = new THREE.Path();
  innerPath.moveTo(innerX, innerY);
  innerPath.lineTo(innerX + innerWidth, innerY);
  innerPath.lineTo(innerX + innerWidth, innerY + innerHeight);
  innerPath.lineTo(innerX, innerY + innerHeight);
  innerPath.lineTo(innerX, innerY);
  shape.holes.push(innerPath);

  const extrudeSettings = {
    depth: profileDepth,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 1,
    bevelSegments: 3,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

// Generate sash geometry
const generateSashGeometry = (
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType
): THREE.BufferGeometry => {
  const profileWidth = profile.width || 50;
  const profileDepth = profile.height || 25;
  const sashWidth = width - profileWidth * 2 - 10; // Account for frame overlap
  const sashHeight = height - profileWidth * 2 - 10;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(sashWidth, 0);
  shape.lineTo(sashWidth, sashHeight);
  shape.lineTo(0, sashHeight);
  shape.lineTo(0, 0);

  // Glass cutout
  const glassWidth = sashWidth - profileWidth * 2;
  const glassHeight = sashHeight - profileWidth * 2;
  const glassX = profileWidth;
  const glassY = profileWidth;

  const glassPath = new THREE.Path();
  glassPath.moveTo(glassX, glassY);
  glassPath.lineTo(glassX + glassWidth, glassY);
  glassPath.lineTo(glassX + glassWidth, glassY + glassHeight);
  glassPath.lineTo(glassX, glassY + glassHeight);
  glassPath.lineTo(glassX, glassY);
  shape.holes.push(glassPath);

  const extrudeSettings = {
    depth: profileDepth,
    bevelEnabled: true,
    bevelThickness: 1.5,
    bevelSize: 0.5,
    bevelSegments: 2,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

// Generate glass geometry
const generateGlassGeometry = (
  width: number,
  height: number,
  profile: Profile,
  glazingType: string
): THREE.BufferGeometry => {
  const profileWidth = profile.width || 50;
  const glassWidth = width - profileWidth * 2 - 20;
  const glassHeight = height - profileWidth * 2 - 20;
  const glassDepth = glazingType === 'double' ? 24 : glazingType === 'triple' ? 36 : 6;

  return new THREE.BoxGeometry(glassWidth, glassHeight, glassDepth);
};

// Generate hardware (hinges, locks, handles)
const generateHardware = (
  windowType: WindowType,
  width: number,
  height: number,
  hardware: any[]
): THREE.Group => {
  const hardwareGroup = new THREE.Group();

  hardware.forEach((item) => {
    let geometry: THREE.BufferGeometry;
    let position: [number, number, number] = [0, 0, 0];

    switch (item.type) {
      case 'hinge':
        geometry = new THREE.BoxGeometry(15, 30, 5);
        if (windowType === 'casement' || windowType === 'tilt_turn') {
          position = [width / 2 - 25, 0, 0];
        }
        break;
      case 'lock':
        geometry = new THREE.BoxGeometry(20, 10, 8);
        position = [0, height / 2 - 20, 0];
        break;
      case 'handle':
        geometry = new THREE.CylinderGeometry(3, 3, 40, 16);
        position = [width / 2 - 30, height / 2 - 30, 0];
        break;
      default:
        geometry = new THREE.BoxGeometry(10, 10, 5);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = item.id || `hardware_${hardwareGroup.children.length}`;
    hardwareGroup.add(mesh);
  });

  return hardwareGroup;
};

// Main window 3D model component
// Export for use in other 3D viewers
export function Window3DModel({
  windowUnit,
  isAnimating,
  animationProgress,
  onModelReady,
}: {
  windowUnit: WindowUnit;
  isAnimating: boolean;
  animationProgress: number;
  onModelReady?: (model: THREE.Group) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sashRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useEffect(() => {
    if (!groupRef.current || !windowUnit) return;

    const windowGroup = groupRef.current;
    windowGroup.clear();

    const windowType = (windowUnit.type || 'sliding_window') as WindowType;
    const width = windowUnit.overallWidth / 1000; // Convert mm to meters
    const height = windowUnit.overallHeight / 1000;
    const defaultProfile: Profile = {
      id: 'default',
      name: 'Default Profile',
      material: 'aluminum',
      width: 50,
      height: 25,
      color: windowUnit.color || '#C0C0C0',
      costPerMeter: 0,
      cuttingAllowance: 3,
      stockQuantity: 0,
      minStockLevel: 0,
      supplier: 'Default',
    };
    const profile: Profile = windowUnit.components[0]?.profile || defaultProfile;

    // Create materials
    const frameMaterial = createMaterial(profile.material, profile.color || windowUnit.color || '#C0C0C0');
    const sashMaterial = createMaterial(profile.material, profile.color || windowUnit.color || '#C0C0C0');
    const glassMaterial = createGlassMaterial(
      windowUnit.glazing?.type || windowUnit.components[0]?.glazingType || 'single'
    );

    // Generate geometries
    const frameGeometry = generateFrameGeometry(width, height, profile, windowType);
    const sashGeometry = generateSashGeometry(width, height, profile, windowType);
    const glassGeometry = generateGlassGeometry(width, height, profile, windowUnit.glazing?.type || 'single');

    // Create frame
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    frame.name = 'frame';
    windowGroup.add(frame);

    // Create sash group
    const sashGroup = new THREE.Group();
    sashGroup.name = 'sash';

    const sash = new THREE.Mesh(sashGeometry, sashMaterial);
    sash.position.set(0, 0, 0);
    sash.castShadow = true;
    sash.receiveShadow = true;
    sash.name = 'sash_mesh';
    sashGroup.add(sash);

    // Create glass
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(0, 0, 0);
    glass.castShadow = false;
    glass.receiveShadow = true;
    glass.name = 'glass';
    sashGroup.add(glass);

    // Position sash based on window type
    if (windowType === 'sliding_window' || windowType === 'sliding_door') {
      sashGroup.position.x = -width * 0.25; // Slide to left
    } else if (windowType === 'casement') {
      sashGroup.position.x = 0;
    }

    windowGroup.add(sashGroup);
    sashRef.current = sashGroup;

    // Generate hardware
    if (windowUnit.hardware && windowUnit.hardware.length > 0) {
      const hardwareGroup = generateHardware(windowType, width, height, windowUnit.hardware);
      hardwareGroup.name = 'hardware';
      windowGroup.add(hardwareGroup);
    }

    // Center the model
    const box = new THREE.Box3().setFromObject(windowGroup);
    const center = box.getCenter(new THREE.Vector3());
    windowGroup.position.sub(center);

    if (onModelReady) {
      onModelReady(windowGroup);
    }

    return () => {
      frameGeometry.dispose();
      sashGeometry.dispose();
      glassGeometry.dispose();
      frameMaterial.dispose();
      sashMaterial.dispose();
      glassMaterial.dispose();
    };
  }, [windowUnit, onModelReady]);

  // Animation for opening mechanisms
  useFrame(() => {
    if (!sashRef.current || !isAnimating) return;

    const windowType = (windowUnit.type || 'sliding_window') as WindowType;
    const width = windowUnit.overallWidth / 1000;
    const progress = animationProgress;

    switch (windowType) {
      case 'sliding_window':
      case 'sliding_door':
        sashRef.current.position.x = -width * 0.25 * (1 - progress);
        break;
      case 'casement':
        sashRef.current.rotation.y = Math.PI / 2 * progress;
        sashRef.current.position.x = width * 0.25 * progress;
        break;
      case 'tilt_turn':
        if (progress < 0.5) {
          // Tilt mode
          sashRef.current.rotation.x = -Math.PI / 6 * (progress * 2);
        } else {
          // Turn mode
          sashRef.current.rotation.x = -Math.PI / 6;
          sashRef.current.rotation.y = Math.PI / 2 * ((progress - 0.5) * 2);
          sashRef.current.position.x = width * 0.25 * ((progress - 0.5) * 2);
        }
        break;
    }
  });

  return <group ref={groupRef} />;
}

// Error detection overlay component
export function WindowErrorOverlay({ 
  windowUnit, 
  profiles 
}: { 
  windowUnit: WindowUnit;
  profiles?: Profile[];
}) {
  const validation = validateProject(windowUnit);
  const errors = validation.errors;
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;

  if (errors.length === 0) return null;

  return (
    <>
      {/* Error indicators */}
      {errors.map((error, index) => {
        // Position errors at different corners
        const angle = (index / errors.length) * Math.PI * 2;
        const radius = Math.max(width, height) * 0.6;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0.1;

        return (
          <Html key={index} position={[x, y, z]} center>
            <div className="bg-red-500/90 text-white px-3 py-2 rounded-lg shadow-lg border-2 border-red-600 max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-bold text-xs">Error</span>
              </div>
              <div className="text-xs">{error.message}</div>
            </div>
          </Html>
        );
      })}

      {/* Warning glow effect on frame if dimensions are problematic */}
      {errors.some(e => e.field === 'overallWidth' || e.field === 'overallHeight') && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[Math.max(width, height) * 0.6, Math.max(width, height) * 0.65, 32]} />
          <meshBasicMaterial color={0xff0000} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  );
}

// Measurement overlay component
// Export for use in other 3D viewers
export function WindowMeasurementOverlay({ windowUnit }: { windowUnit: WindowUnit }) {
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;

  return (
    <>
      {/* Width measurement */}
      <Html position={[width / 2, -height / 2 - 0.1, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {windowUnit.overallWidth}mm
        </div>
      </Html>

      {/* Height measurement */}
      <Html position={[-width / 2 - 0.1, height / 2, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono transform -rotate-90">
          {windowUnit.overallHeight}mm
        </div>
      </Html>
    </>
  );
}

// Controls component (outside Canvas)
function WindowControls({
  isAnimating,
  setIsAnimating,
  animationProgress,
  setAnimationProgress,
  showMeasurements,
  setShowMeasurements,
  exportFormat,
  setExportFormat,
  exportModel,
  toggleFullscreen,
  windowUnit,
  presentationMode,
  showErrorDetection,
  showErrors,
  setShowErrors,
  hasErrors,
  errorCount,
}: {
  isAnimating: boolean;
  setIsAnimating: (val: boolean) => void;
  animationProgress: number;
  setAnimationProgress: (val: number) => void;
  showMeasurements: boolean;
  setShowMeasurements: (val: boolean) => void;
  exportFormat: 'GLB' | 'STL' | 'OBJ';
  setExportFormat: (val: 'GLB' | 'STL' | 'OBJ') => void;
  exportModel: (format: 'GLB' | 'STL' | 'OBJ') => void;
  toggleFullscreen: () => void;
  windowUnit: WindowUnit;
  presentationMode: boolean;
  showErrorDetection?: boolean;
  showErrors?: boolean;
  setShowErrors?: (val: boolean) => void;
  hasErrors?: boolean;
  errorCount?: number;
}) {
  if (presentationMode) {
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-black/60 backdrop-blur-sm border-gray-700">
          <CardContent className="p-3">
            <div className="text-white text-sm">
              <div className="font-bold text-orange-500">ALMONA</div>
              <div className="text-xs text-gray-300">
                {windowUnit.orderNumber} - {windowUnit.posNumber}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">3D Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Animation Controls */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isAnimating ? 'destructive' : 'default'}
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (!isAnimating) {
                  setAnimationProgress(0);
                }
              }}
            >
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAnimationProgress(0);
                setIsAnimating(false);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Measurement Toggle */}
          <Button
            size="sm"
            variant={showMeasurements ? 'default' : 'outline'}
            onClick={() => setShowMeasurements(!showMeasurements)}
            className="w-full"
          >
            {showMeasurements ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Measurements
          </Button>

          {/* Error Detection Toggle */}
          {showErrorDetection && setShowErrors && (
            <Button
              size="sm"
              variant={showErrors ? 'destructive' : 'outline'}
              onClick={() => setShowErrors(!showErrors)}
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {showErrors ? 'Hide' : 'Show'} Errors {hasErrors && errorCount !== undefined && `(${errorCount})`}
            </Button>
          )}

          {/* Export Controls */}
          <div className="space-y-2">
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'GLB' | 'STL' | 'OBJ')}>
              <SelectTrigger className="w-full bg-gray-800 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLB">GLB (GLTF Binary)</SelectItem>
                <SelectItem value="STL">STL (Stereolithography)</SelectItem>
                <SelectItem value="OBJ">OBJ (Wavefront)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportModel(exportFormat)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export {exportFormat}
            </Button>
          </div>

          {/* Fullscreen */}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            className="w-full"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component
export const Window3DGenerator: React.FC<Window3DGeneratorProps> = ({
  windowUnit,
  presentationMode = false,
  showControls = true,
  onModelUpdate,
  className = '',
  showErrorDetection = true,
  profiles = [],
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showErrors, setShowErrors] = useState(showErrorDetection);
  const [exportFormat, setExportFormat] = useState<'GLB' | 'STL' | 'OBJ'>('GLB');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelRef = useRef<THREE.Group | null>(null);
  
  // Detect design errors
  const validation = validateProject(windowUnit);
  const hasErrors = validation.errors.length > 0;

  const handleModelReady = useCallback((model: THREE.Group) => {
    modelRef.current = model;
    model.name = 'window_group';
    if (onModelUpdate) {
      onModelUpdate(model);
    }
  }, [onModelUpdate]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationProgress((prev) => {
        const next = prev + 0.02;
        if (next >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Export functions
  const exportModel = useCallback(async (format: 'GLB' | 'STL' | 'OBJ') => {
    // Get model from ref or find in DOM
    let model = modelRef.current;
    if (!model) {
      // Try to find in scene via a workaround
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.warn('No canvas found for export');
        return;
      }
      // We'll need to pass the model reference differently
      console.warn('Model ref not available, export may fail');
      return;
    }

    try {
      const clonedModel = model.clone();
      
      switch (format) {
        case 'GLB': {
          const exporter = new GLTFExporter();
          const result = await exporter.parseAsync(clonedModel, {
            binary: true,
            includeCustomExtensions: true,
          });
          
          const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${windowUnit.orderNumber || 'window'}_${windowUnit.posNumber || 'pos'}.glb`;
          link.click();
          URL.revokeObjectURL(url);
          break;
        }
        case 'STL': {
          const exporter = new STLExporter();
          const result = exporter.parse(clonedModel);
          const blob = new Blob([result], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${windowUnit.orderNumber || 'window'}_${windowUnit.posNumber || 'pos'}.stl`;
          link.click();
          URL.revokeObjectURL(url);
          break;
        }
        case 'OBJ': {
          const exporter = new OBJExporter();
          const result = exporter.parse(clonedModel);
          const blob = new Blob([result], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${windowUnit.orderNumber || 'window'}_${windowUnit.posNumber || 'pos'}.obj`;
          link.click();
          URL.revokeObjectURL(url);
          break;
        }
      }

      track('window_3d_export', { format, windowId: windowUnit.id });
    } catch (error) {
      console.error('Export error:', error);
      track('window_3d_export_error', { format, error: String(error) });
    }
  }, [windowUnit, modelRef]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const element = document.documentElement;
      element.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      >
        <Suspense fallback={null}>
          <SceneContent
            windowUnit={windowUnit}
            isAnimating={isAnimating}
            animationProgress={animationProgress}
            showMeasurements={showMeasurements}
            presentationMode={presentationMode}
            onModelReady={handleModelReady}
            modelRef={modelRef}
            showErrors={showErrors}
            showErrorDetection={showErrorDetection}
            profiles={profiles}
          />
        </Suspense>
      </Canvas>

      {/* Controls Panel */}
      {showControls && (
        <WindowControls
          isAnimating={isAnimating}
          setIsAnimating={setIsAnimating}
          animationProgress={animationProgress}
          setAnimationProgress={setAnimationProgress}
          showMeasurements={showMeasurements}
          setShowMeasurements={setShowMeasurements}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          exportModel={exportModel}
          toggleFullscreen={toggleFullscreen}
          windowUnit={windowUnit}
          presentationMode={presentationMode}
          showErrorDetection={showErrorDetection}
          showErrors={showErrors}
          setShowErrors={setShowErrors}
          hasErrors={hasErrors}
          errorCount={validation.errors.length}
        />
      )}
    </div>
  );
};

// Scene content component (inside Canvas)
function SceneContent({
  windowUnit,
  isAnimating,
  animationProgress,
  showMeasurements,
  presentationMode,
  onModelReady,
  modelRef,
  showErrors,
  showErrorDetection,
  profiles,
}: {
  windowUnit: WindowUnit;
  isAnimating: boolean;
  animationProgress: number;
  showMeasurements: boolean;
  presentationMode: boolean;
  onModelReady: (model: THREE.Group) => void;
  modelRef: React.MutableRefObject<THREE.Group | null>;
  showErrors: boolean;
  showErrorDetection: boolean;
  profiles: Profile[];
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />
      <pointLight position={[0, 5, 0]} intensity={0.3} />

      <Environment preset="warehouse" />

      <Window3DModel
        windowUnit={windowUnit}
        isAnimating={isAnimating}
        animationProgress={animationProgress}
        onModelReady={onModelReady}
      />

      {showMeasurements && <WindowMeasurementOverlay windowUnit={windowUnit} />}
      
      {showErrors && showErrorDetection && (
        <WindowErrorOverlay windowUnit={windowUnit} profiles={profiles} />
      )}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={10}
        autoRotate={presentationMode}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

// Wrapper component for Canvas context
export const Window3DGeneratorWrapper: React.FC<Window3DGeneratorProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      <Window3DGenerator {...props} />
    </div>
  );
};

