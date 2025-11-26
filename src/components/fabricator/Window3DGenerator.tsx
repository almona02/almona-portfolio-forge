/**
 * Window3DGenerator - Enhanced Real-time 3D Window Model Generator
 * 
 * Advanced features with MENA layout presets:
 * - Realistic PBR materials with environment mapping
 * - Advanced lighting and shadows
 * - Performance optimizations with LOD
 * - Enhanced error detection with visual indicators
 * - Interactive measurements
 * - Multi-format export with progress tracking
 * - Advanced camera controls
 * - Responsive design adaptations
 */

import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Bounds, useBounds, CameraControls } from '@react-three/drei';
import { WindowUnit, Profile } from '@/types/fabricator';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle,
  Ruler,
  ZoomIn,
  ZoomOut,
  Home,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { track } from '@/lib/analytics';
import { validateProject, validateProjectWithConstraints, deriveSystemConstraintsFromProfiles } from '@/lib/fabricatorValidation';
import { Progress } from '@/shared/ui/ui/progress';
import { Badge } from '@/shared/ui/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';

// Extend THREE with additional features if needed
extend({ CameraControls });

// Enhanced window type definitions
type WindowType = 'sliding_window' | 'casement' | 'tilt_turn' | 'sliding_door' | 'fixed_window' | 'double_hung' | 'awning';

// Enhanced sash role definitions
type SashRole = 'sliding' | 'casement_left' | 'casement_right' | 'tilt_turn' | 'fixed' | 'double_hung_upper' | 'double_hung_lower' | 'awning';

interface SashLayout {
  index: number;
  role: SashRole;
  centerX: number;
  width: number;
  height?: number; // For vertical divisions (double hung)
}

// Enhanced material database
const MATERIAL_DATABASE = {
  aluminum: {
    metalness: 0.85,
    roughness: 0.15,
    envMapIntensity: 1.2,
    clearcoat: 0.1,
    clearcoatRoughness: 0.1
  },
  upvc: {
    metalness: 0.05,
    roughness: 0.6,
    envMapIntensity: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.3
  },
  wood: {
    metalness: 0.0,
    roughness: 0.8,
    envMapIntensity: 0.2,
    clearcoat: 0.2,
    clearcoatRoughness: 0.2
  },
  steel: {
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 1.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.05
  }
} as const;

// Enhanced normalizeWindowType with more window types
const normalizeWindowType = (rawType: string | undefined): WindowType => {
  const t = (rawType || 'sliding_window').toLowerCase();

  if (t.includes('sliding_door')) return 'sliding_door';
  if (t.includes('double_hung')) return 'double_hung';
  if (t.includes('awning')) return 'awning';
  if (t.includes('sliding')) return 'sliding_window';
  if (t.includes('tilt')) return 'tilt_turn';
  if (t.includes('fixed')) return 'fixed_window';
  if (t.includes('casement')) return 'casement';

  return 'sliding_window';
};

// Enhanced sash layout computation - KEEPING YOUR MENA LAYOUT PRESETS
const computeSashLayout = (windowUnit: WindowUnit, width: number): SashLayout[] => {
  const rawType = (windowUnit.type || '').toLowerCase();
  const baseType = normalizeWindowType(windowUnit.type);

  // Helper to evenly split width into n segments
  const equalSegments = (count: number, roleForIndex: (i: number) => SashRole): SashLayout[] => {
    const segmentWidth = width / count;
    const layouts: SashLayout[] = [];

    for (let i = 0; i < count; i++) {
      const centerX = -width / 2 + segmentWidth * (i + 0.5);
      layouts.push({
        index: i,
        role: roleForIndex(i),
        centerX,
        width: segmentWidth,
      });
    }

    return layouts;
  };

  // MENA Layout Presets - KEEPING YOUR EXISTING LOGIC

  // sliding_window_2sash: 2 equal sliding sashes
  if (rawType.startsWith('sliding_window_2sash')) {
    return equalSegments(2, () => 'sliding');
  }

  // sliding_window_4sash: 4 equal sliding sashes
  if (rawType.startsWith('sliding_window_4sash')) {
    return equalSegments(4, () => 'sliding');
  }

  // sliding_window_3sash_center_fixed: center fixed, sides sliding
  if (rawType.startsWith('sliding_window_3sash_center_fixed')) {
    const count = 3;
    const segmentWidth = width / count;
    return [
      {
        index: 0,
        role: 'sliding',
        centerX: -width / 2 + segmentWidth * 0.5,
        width: segmentWidth,
      },
      {
        index: 1,
        role: 'fixed',
        centerX: -width / 2 + segmentWidth * 1.5,
        width: segmentWidth,
      },
      {
        index: 2,
        role: 'sliding',
        centerX: -width / 2 + segmentWidth * 2.5,
        width: segmentWidth,
      },
    ];
  }

  // sliding_door_2panel: 2 equal sliding panels
  if (rawType.startsWith('sliding_door_2panel')) {
    return equalSegments(2, () => 'sliding');
  }

  // casement_double: left/right casements sharing central mullion
  if (rawType.startsWith('casement_double')) {
    const layouts = equalSegments(2, () => 'casement_left');
    layouts[0].role = 'casement_left';
    layouts[1].role = 'casement_right';
    return layouts;
  }

  // fixed_with_side_casements: center fixed, narrow casements left/right
  if (rawType.startsWith('fixed_with_side_casements')) {
    const sideWidth = width * 0.2;
    const centerWidth = width * 0.6;
    return [
      {
        index: 0,
        role: 'casement_left',
        centerX: -width / 2 + sideWidth / 2,
        width: sideWidth,
      },
      {
        index: 1,
        role: 'fixed',
        centerX: 0,
        width: centerWidth,
      },
      {
        index: 2,
        role: 'casement_right',
        centerX: width / 2 - sideWidth / 2,
        width: sideWidth,
      },
    ];
  }

  // tilt_turn: single tilt-turn sash
  if (rawType.startsWith('tilt_turn')) {
    return [
      {
        index: 0,
        role: 'tilt_turn',
        centerX: 0,
        width,
      },
    ];
  }

  // fixed_window: single fixed sash
  if (rawType.startsWith('fixed_window') || baseType === 'fixed_window') {
    return [
      {
        index: 0,
        role: 'fixed',
        centerX: 0,
        width,
      },
    ];
  }

  // casement door: treat as single casement (or double if two components)
  if (rawType.startsWith('casement_door')) {
    if (windowUnit.components && windowUnit.components.length === 2) {
      const layouts = equalSegments(2, () => 'casement_left');
      layouts[0].role = 'casement_left';
      layouts[1].role = 'casement_right';
      return layouts;
    }
    return [
      {
        index: 0,
        role: 'casement_left',
        centerX: 0,
        width,
      },
    ];
  }

  // Enhanced window types from the enhanced version
  if (rawType.includes('double_hung')) {
    return [
      {
        index: 0,
        role: 'double_hung_upper',
        centerX: 0,
        width: width,
      },
      {
        index: 1,
        role: 'double_hung_lower',
        centerX: 0,
        width: width,
      }
    ];
  }

  if (rawType.includes('awning')) {
    return [
      {
        index: 0,
        role: 'awning',
        centerX: 0,
        width: width,
      },
    ];
  }

  // Fallbacks based on baseType
  switch (baseType) {
    case 'sliding_window':
    case 'sliding_door':
      return equalSegments(2, () => 'sliding');
    case 'casement':
      return [
        {
          index: 0,
          role: 'casement_left',
          centerX: 0,
          width,
        },
      ];
    case 'tilt_turn':
      return [
        {
          index: 0,
          role: 'tilt_turn',
          centerX: 0,
          width,
        },
      ];
    case 'double_hung':
      return [
        {
          index: 0,
          role: 'double_hung_upper',
          centerX: 0,
          width: width,
        },
        {
          index: 1,
          role: 'double_hung_lower',
          centerX: 0,
          width: width,
        }
      ];
    case 'awning':
      return [
        {
          index: 0,
          role: 'awning',
          centerX: 0,
          width: width,
        },
      ];
    default:
      return [
        {
          index: 0,
          role: 'fixed',
          centerX: 0,
          width,
        },
      ];
  }
};

interface Window3DGeneratorProps {
  windowUnit: WindowUnit;
  presentationMode?: boolean;
  showControls?: boolean;
  onModelUpdate?: (model: THREE.Group) => void;
  className?: string;
  showErrorDetection?: boolean;
  profiles?: Profile[];
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableShadows?: boolean;
}

// Enhanced material creation with PBR properties
const createMaterial = (materialType: string, color: string): THREE.MeshStandardMaterial => {
  const baseColor = new THREE.Color(color);
  const materialProps = MATERIAL_DATABASE[materialType as keyof typeof MATERIAL_DATABASE] || MATERIAL_DATABASE.aluminum;
  
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    ...materialProps,
  });
};

// Enhanced glass material with realistic properties
const createGlassMaterial = (glazingType: string): THREE.MeshPhysicalMaterial => {
  const thickness = glazingType === 'double' ? 0.024 : glazingType === 'triple' ? 0.036 : 0.006;
  
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.97,
    thickness: thickness,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    // @ts-ignore - specularIntensity not in older typings but supported at runtime
    specularIntensity: 1.0,
    envMapIntensity: 1.5,
  });
};

// Enhanced geometry generation with bevel and details
const generateFrameGeometry = (
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType
): THREE.BufferGeometry => {
  const profileWidth = (profile.width || 50) / 1000;
  const profileDepth = (profile.height || 25) / 1000;

  const shape = new THREE.Shape();
  
  // Outer frame with rounded corners
  const radius = 0.005;
  shape.moveTo(radius, 0);
  shape.lineTo(width - radius, 0);
  shape.quadraticCurveTo(width, 0, width, radius);
  shape.lineTo(width, height - radius);
  shape.quadraticCurveTo(width, height, width - radius, height);
  shape.lineTo(radius, height);
  shape.quadraticCurveTo(0, height, 0, height - radius);
  shape.lineTo(0, radius);
  shape.quadraticCurveTo(0, 0, radius, 0);

  // Inner cutout
  const innerWidth = width - profileWidth * 2;
  const innerHeight = height - profileWidth * 2;
  const innerX = profileWidth;
  const innerY = profileWidth;

  const innerPath = new THREE.Path();
  innerPath.moveTo(innerX + radius, innerY);
  innerPath.lineTo(innerX + innerWidth - radius, innerY);
  innerPath.quadraticCurveTo(innerX + innerWidth, innerY, innerX + innerWidth, innerY + radius);
  innerPath.lineTo(innerX + innerWidth, innerY + innerHeight - radius);
  innerPath.quadraticCurveTo(innerX + innerWidth, innerY + innerHeight, innerX + innerWidth - radius, innerY + innerHeight);
  innerPath.lineTo(innerX + radius, innerY + innerHeight);
  innerPath.quadraticCurveTo(innerX, innerY + innerHeight, innerX, innerY + innerHeight - radius);
  innerPath.lineTo(innerX, innerY + radius);
  innerPath.quadraticCurveTo(innerX, innerY, innerX + radius, innerY);
  shape.holes.push(innerPath);

  const extrudeSettings = {
    depth: profileDepth,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.001,
    bevelSegments: 4,
    bevelOffset: 0,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center(); // Center the geometry for proper positioning
  return geometry;
};

// Generate sash geometry - KEEPING YOUR POSITIONING LOGIC
const generateSashGeometry = (
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType
): THREE.BufferGeometry => {
  // Convert profile dimensions from mm to meters
  const profileWidth = (profile.width || 50) / 1000;
  const profileDepth = (profile.height || 25) / 1000;
  // Account for frame overlap (10mm in meters)
  const sashWidth = width - profileWidth * 2 - 0.01;
  const sashHeight = height - profileWidth * 2 - 0.01;

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
    // Bevel values are in meters now
    bevelThickness: 0.0015,
    bevelSize: 0.0005,
    bevelSegments: 2,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center(); // Center the geometry for proper positioning
  return geometry;
};

// Generate glass geometry - KEEPING YOUR POSITIONING LOGIC
const generateGlassGeometry = (
  width: number,
  height: number,
  profile: Profile,
  glazingType: string
): THREE.BufferGeometry => {
  // Convert profile dimensions from mm to meters
  const profileWidth = (profile.width || 50) / 1000;
  const glassWidth = Math.max(0.01, width - profileWidth * 2 - 0.02); // Ensure minimum size
  const glassHeight = Math.max(0.01, height - profileWidth * 2 - 0.02);
  const glassDepth = glazingType === 'double' ? 0.024 : glazingType === 'triple' ? 0.036 : 0.006; // Convert mm to meters

  return new THREE.BoxGeometry(glassWidth, glassHeight, glassDepth);
};

// Enhanced hardware generation
function generateEnhancedHardware(
  windowType: WindowType,
  width: number,
  height: number,
  hardware: any[]
): THREE.Group {
  const hardwareGroup = new THREE.Group();

  hardware.forEach((item) => {
    let geometry: THREE.BufferGeometry;
    let position: [number, number, number] = [0, 0, 0];
    let rotation: [number, number, number] = [0, 0, 0];

    switch (item.type) {
      case 'hinge':
        geometry = new THREE.CylinderGeometry(0.008, 0.008, 0.025, 16);
        position = [width / 2 - 0.02, 0, 0.0125];
        rotation = [0, 0, Math.PI / 2];
        break;
      case 'lock':
        geometry = new THREE.BoxGeometry(0.025, 0.015, 0.01);
        position = [0, height / 2 - 0.03, 0.005];
        break;
      case 'handle':
        geometry = new THREE.CylinderGeometry(0.004, 0.004, 0.06, 12);
        position = [width / 2 - 0.025, height / 2 - 0.04, 0.03];
        rotation = [Math.PI / 2, 0, 0];
        break;
      default:
        geometry = new THREE.BoxGeometry(0.01, 0.01, 0.005);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 1.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = item.id || `hardware_${hardwareGroup.children.length}`;
    hardwareGroup.add(mesh);
  });

  return hardwareGroup;
}

// Enhanced Window3DModel with LOD support and YOUR POSITIONING LOGIC
export function Window3DModel({
  windowUnit,
  isAnimating,
  animationProgress,
  onModelReady,
  quality = 'high',
  enableShadows = true,
}: {
  windowUnit: WindowUnit;
  isAnimating: boolean;
  animationProgress: number;
  onModelReady?: (model: THREE.Group) => void;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableShadows?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sashRefs = useRef<THREE.Group[]>([]);
  const { scene } = useThree();

  // LOD settings based on quality
  // (Currently not used to vary geometry segments, but ready for future use)
  const lodSettings = useMemo(() => {
    switch (quality) {
      case 'low':
        return { bevelSegments: 2, curveSegments: 8 };
      case 'medium':
        return { bevelSegments: 3, curveSegments: 12 };
      case 'high':
        return { bevelSegments: 4, curveSegments: 16 };
      case 'ultra':
        return { bevelSegments: 6, curveSegments: 24 };
      default:
        return { bevelSegments: 4, curveSegments: 16 };
    }
  }, [quality]);

  useEffect(() => {
    if (!groupRef.current || !windowUnit) {
      console.warn('Window3DModel: Missing groupRef or windowUnit');
      return;
    }

    const windowGroup = groupRef.current;
    windowGroup.clear();
    sashRefs.current = [];

    const windowType = normalizeWindowType(windowUnit.type);
    const width = windowUnit.overallWidth / 1000; // Convert mm to meters
    const height = windowUnit.overallHeight / 1000;
    
    // Validate dimensions
    if (!width || !height || width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
      console.warn('Invalid window dimensions:', { 
        overallWidth: windowUnit.overallWidth, 
        overallHeight: windowUnit.overallHeight,
        calculatedWidth: width,
        calculatedHeight: height
      });
      return;
    }
    
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
    
    // Use first component's profile if available, otherwise use default
    const profile: Profile = (windowUnit.components && windowUnit.components.length > 0 && windowUnit.components[0]?.profile) 
      ? windowUnit.components[0].profile 
      : defaultProfile;

    // Create enhanced materials
    const frameMaterial = createMaterial(profile.material, profile.color || windowUnit.color || '#C0C0C0');
    const sashMaterial = createMaterial(profile.material, profile.color || windowUnit.color || '#C0C0C0');
    const glassMaterial = createGlassMaterial(
      windowUnit.glazing?.type || (windowUnit.components && windowUnit.components.length > 0 ? windowUnit.components[0]?.glazingType : undefined) || 'single'
    );

    // Generate frame geometry (outer frame for entire unit)
    const frameGeometry = generateFrameGeometry(width, height, profile, windowType);

    // Create frame
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0, 0);
    frame.castShadow = enableShadows;
    frame.receiveShadow = enableShadows;
    frame.name = 'frame';
    windowGroup.add(frame);

    // Create sash groups (multi-sash layouts for sliding/casement/etc.)
    const sashGroups: THREE.Group[] = [];
    const layouts: SashLayout[] = computeSashLayout(windowUnit, width);

    const sashGeometries: THREE.BufferGeometry[] = [];
    const glassGeometries: THREE.BufferGeometry[] = [];

    layouts.forEach((layout) => {
      const i = layout.index;
      const sashGroup = new THREE.Group();
      sashGroup.name = `sash_${i}`;

      const sashWidth = layout.width;

      // Sash frame for this segment
      const sashGeometry = generateSashGeometry(sashWidth, height, profile, windowType);
      sashGeometries.push(sashGeometry);
      const sash = new THREE.Mesh(sashGeometry, sashMaterial);
      sash.position.set(0, 0, 0);
      sash.castShadow = enableShadows;
      sash.receiveShadow = enableShadows;
      sash.name = `sash_mesh_${i}`;
      sash.userData.role = layout.role;
      sashGroup.add(sash);

      // Glass for this segment
      const glassGeometry = generateGlassGeometry(sashWidth, height, profile, windowUnit.glazing?.type || 'single');
      glassGeometries.push(glassGeometry);
      const glass = new THREE.Mesh(glassGeometry, glassMaterial);
      glass.position.set(0, 0, 0);
      glass.castShadow = false;
      glass.receiveShadow = true;
      glass.name = `glass_${i}`;
      sashGroup.add(glass);

      // Horizontal placement based on layout centerX - YOUR POSITIONING LOGIC
      sashGroup.position.x = layout.centerX;

      windowGroup.add(sashGroup);
      sashGroups.push(sashGroup);
    });

    // Use all sash groups for animation reference
    sashRefs.current = sashGroups;

    // Generate enhanced hardware
    if (windowUnit.hardware && windowUnit.hardware.length > 0) {
      const hardwareGroup = generateEnhancedHardware(windowType, width, height, windowUnit.hardware);
      hardwareGroup.name = 'hardware';
      windowGroup.add(hardwareGroup);
    }

    // Center the model
    const box = new THREE.Box3().setFromObject(windowGroup);
    const center = box.getCenter(new THREE.Vector3());
    windowGroup.position.sub(center);
    
    // Calculate appropriate scale to fit in view
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Scale to fit nicely in view (target size around 2-3 units)
    if (maxDimension > 0) {
      const targetSize = 2.5;
      const scale = targetSize / maxDimension;
      // Only scale if significantly different from target
      if (Math.abs(scale - 1) > 0.1) {
        windowGroup.scale.set(scale, scale, scale);
      }
    }

    // Verify model was created
    if (windowGroup.children.length === 0) {
      console.error('Window model has no children after creation');
    } else {
      console.log('Window model created successfully with', windowGroup.children.length, 'children');
    }

    if (onModelReady) {
      onModelReady(windowGroup);
    }

    return () => {
      try {
        frameGeometry.dispose();
        sashGeometries.forEach((g) => g.dispose());
        glassGeometries.forEach((g) => g.dispose());
        frameMaterial.dispose();
        sashMaterial.dispose();
        glassMaterial.dispose();
      } catch (error) {
        console.warn('Error disposing geometries:', error);
      }
    };
  }, [windowUnit, onModelReady, quality, enableShadows]);

  // Enhanced animation system
  useFrame(() => {
    if (!isAnimating || sashRefs.current.length === 0) return;

    const windowType = normalizeWindowType(windowUnit.type);
    const width = windowUnit.overallWidth / 1000;
    const height = windowUnit.overallHeight / 1000;
    const progress = animationProgress;

    const layouts = computeSashLayout(windowUnit, width);

    sashRefs.current.forEach((sashGroup, index) => {
      const layout = layouts[index];
      if (!layout) return;

      switch (windowType) {
        case 'sliding_window':
        case 'sliding_door':
          if (layout.role === 'sliding') {
            // Alternate sliding directions for multi-sash layouts
            const dir = index % 2 === 0 ? -1 : 1;
            sashGroup.position.x = layout.centerX + dir * (width * 0.25 * (1 - progress));
          }
          break;

        case 'casement':
          if (layout.role === 'casement_left') {
            sashGroup.rotation.y = Math.PI / 2 * progress;
            sashGroup.position.x = layout.centerX - width * 0.1 * progress;
          } else if (layout.role === 'casement_right') {
            sashGroup.rotation.y = -Math.PI / 2 * progress;
            sashGroup.position.x = layout.centerX + width * 0.1 * progress;
          }
          break;

        case 'tilt_turn':
          if (progress < 0.5) {
            // Tilt mode
            sashGroup.rotation.x = -Math.PI / 6 * (progress * 2);
          } else {
            // Turn mode
            sashGroup.rotation.x = -Math.PI / 6;
            sashGroup.rotation.y = Math.PI / 2 * ((progress - 0.5) * 2);
          }
          break;

        case 'double_hung':
          if (layout.role === 'double_hung_upper') {
            sashGroup.position.y = height * 0.25 * progress;
          } else if (layout.role === 'double_hung_lower') {
            sashGroup.position.y = -height * 0.25 * progress;
          }
          break;

        case 'awning':
          sashGroup.rotation.x = Math.PI / 4 * progress;
          break;
      }
    });
  });

  return <group ref={groupRef} />;
}

// Enhanced error overlay with better visuals
export function WindowErrorOverlay({ 
  windowUnit, 
  profiles 
}: { 
  windowUnit: WindowUnit;
  profiles?: Profile[];
}) {
  const constraints = profiles ? deriveSystemConstraintsFromProfiles(profiles) : null;
  const validation = validateProjectWithConstraints(windowUnit, constraints);
  const errors = validation.errors;
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;

  if (errors.length === 0) return null;

  return (
    <>
      {/* Enhanced error indicators */}
      {errors.map((error, index) => {
        const angle = (index / errors.length) * Math.PI * 2;
        const radius = Math.max(width, height) * 0.7;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0.15;

        return (
          <group key={index} position={[x, y, z]}>
            {/* Animated error indicator */}
            <mesh>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshBasicMaterial color={0xff0000} transparent opacity={0.8} />
            </mesh>
            <Html center>
              <div className="bg-red-500/95 text-white px-3 py-2 rounded-lg shadow-2xl border-2 border-red-600 max-w-xs backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                  <span className="font-bold text-xs">Design Error</span>
                  <Badge variant="outline" className="ml-auto bg-red-600 text-white text-xs">
                    {error.field}
                  </Badge>
                </div>
                <div className="text-xs leading-relaxed">{error.message}</div>
              </div>
            </Html>
          </group>
        );
      })}

      {/* Enhanced warning effects */}
      {errors.some(e => e.field === 'overallWidth' || e.field === 'overallHeight') && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[Math.max(width, height) * 0.65, Math.max(width, height) * 0.7, 32]} />
          <meshBasicMaterial 
            color={0xff0000} 
            transparent 
            opacity={0.4} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}
    </>
  );
}

// Enhanced measurement overlay
export function WindowMeasurementOverlay({ windowUnit }: { windowUnit: WindowUnit }) {
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;

  return (
    <>
      {/* Width measurement with line */}
      <group position={[0, -height / 2 - 0.15, 0]}>
        <mesh>
          <boxGeometry args={[width, 0.002, 0.002]} />
          <meshBasicMaterial color={0x00ff00} />
        </mesh>
        <Html position={[0, -0.05, 0]} center>
          <div className="bg-green-600/90 text-white px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg border-2 border-green-400">
            {windowUnit.overallWidth}mm
          </div>
        </Html>
      </group>

      {/* Height measurement with line */}
      <group position={[-width / 2 - 0.15, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[height, 0.002, 0.002]} />
          <meshBasicMaterial color={0x00ff00} />
        </mesh>
        <Html position={[-0.05, 0, 0]} center>
          <div className="bg-green-600/90 text-white px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg border-2 border-green-400 transform -rotate-90">
            {windowUnit.overallHeight}mm
          </div>
        </Html>
      </group>
    </>
  );
}

// Enhanced controls component
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
  controlsRef,
  quality,
  setQuality,
  enableShadows,
  setEnableShadows,
  isExporting,
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
  controlsRef?: React.MutableRefObject<any>;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  setQuality?: (quality: 'low' | 'medium' | 'high' | 'ultra') => void;
  enableShadows?: boolean;
  setEnableShadows?: (enable: boolean) => void;
  isExporting?: boolean;
}) {
  if (presentationMode) {
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-black/80 backdrop-blur-md border-orange-500/50 shadow-2xl">
          <CardContent className="p-4">
            <div className="text-white">
              <div className="font-bold text-lg text-orange-400 mb-1">ALMONA 3D</div>
              <div className="text-sm text-gray-300 space-y-1">
                <div>{windowUnit.orderNumber}</div>
                <div className="text-xs text-gray-400">{windowUnit.posNumber}</div>
                <div className="text-xs text-green-400 capitalize">{windowUnit.type?.replace('_', ' ')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-10 space-y-3">
        {/* Main Controls Card */}
        <Card className="bg-gray-900/95 backdrop-blur-md border-gray-600 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-400" />
              3D Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Animation Controls */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={isAnimating ? 'destructive' : 'default'}
                      onClick={() => {
                        setIsAnimating(!isAnimating);
                        if (!isAnimating) setAnimationProgress(0);
                      }}
                      className="flex-1"
                    >
                      {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isAnimating ? 'Pause Animation' : 'Play Animation'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAnimationProgress(0);
                        setIsAnimating(false);
                        controlsRef?.current?.reset();
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset View</TooltipContent>
                </Tooltip>
              </div>
              
              {/* Animation Progress */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex-1">
                  <Progress value={animationProgress * 100} className="h-1" />
                </div>
                <span>{Math.round(animationProgress * 100)}%</span>
              </div>
            </div>

            {/* Visualization Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={showMeasurements ? 'default' : 'outline'}
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className="w-full"
                  >
                    <Ruler className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showMeasurements ? 'Hide Measurements' : 'Show Measurements'}
                </TooltipContent>
              </Tooltip>

              {showErrorDetection && setShowErrors && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={showErrors ? 'destructive' : hasErrors ? 'outline' : 'outline'}
                      onClick={() => setShowErrors(!showErrors)}
                      className="w-full relative"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {hasErrors && (
                        <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 text-[8px] bg-red-500">
                          {errorCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showErrors ? 'Hide Errors' : 'Show Errors'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Quality Settings */}
            {setQuality && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Quality</label>
                <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="low" className="text-xs">Low Performance</SelectItem>
                    <SelectItem value="medium" className="text-xs">Balanced</SelectItem>
                    <SelectItem value="high" className="text-xs">High Quality</SelectItem>
                    <SelectItem value="ultra" className="text-xs">Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Shadow Toggle */}
            {setEnableShadows && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={enableShadows ? 'default' : 'outline'}
                    onClick={() => setEnableShadows(!enableShadows)}
                    className="w-full"
                  >
                    {enableShadows ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {enableShadows ? 'Disable Shadows' : 'Enable Shadows'}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Export Section */}
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'GLB' | 'STL' | 'OBJ')}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="GLB" className="text-xs">GLB (Recommended)</SelectItem>
                  <SelectItem value="STL" className="text-xs">STL (3D Print)</SelectItem>
                  <SelectItem value="OBJ" className="text-xs">OBJ (Legacy)</SelectItem>
                </SelectContent>
              </Select>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportModel(exportFormat)}
                    className="w-full"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export {exportFormat}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Export 3D Model for {exportFormat === 'GLB' ? 'web and apps' : exportFormat === 'STL' ? '3D printing' : 'legacy software'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Fullscreen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFullscreen}
                  className="w-full"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Fullscreen Mode</TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-gray-900/95 backdrop-blur-md border-gray-600 shadow-2xl">
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => controlsRef?.current?.reset()}>
                    <Home className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Camera</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => controlsRef?.current?.zoomTo?.(1.2)}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => controlsRef?.current?.zoomTo?.(0.8)}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Enhanced main component
export const Window3DGenerator: React.FC<Window3DGeneratorProps> = ({
  windowUnit,
  presentationMode = false,
  showControls = true,
  onModelUpdate,
  className = '',
  showErrorDetection = true,
  profiles = [],
  quality: initialQuality = 'high',
  enableShadows: initialShadows = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showErrors, setShowErrors] = useState(showErrorDetection);
  const [exportFormat, setExportFormat] = useState<'GLB' | 'STL' | 'OBJ'>('GLB');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>(initialQuality);
  const [enableShadows, setEnableShadows] = useState(initialShadows);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);
  const constraints = deriveSystemConstraintsFromProfiles(profiles || []);
  const validation = validateProjectWithConstraints(windowUnit, constraints);
  const hasErrors = validation.errors.length > 0;

  const handleModelReady = useCallback((model: THREE.Group) => {
    modelRef.current = model;
    model.name = 'window_group';
    if (onModelUpdate) {
      onModelUpdate(model);
    }
  }, [onModelUpdate]);

  // Enhanced animation loop with smooth interpolation
  useEffect(() => {
    if (!isAnimating) return;

    const startTime = Date.now();
    const duration = 3000; // 3 seconds for full animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isAnimating]);

  // Enhanced export with progress tracking
  const exportModel = useCallback(async (format: 'GLB' | 'STL' | 'OBJ') => {
    if (!modelRef.current) {
      console.warn('No model available for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const clonedModel = modelRef.current.clone();
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      switch (format) {
        case 'GLB': {
          const exporter = new GLTFExporter();
          const result = await exporter.parseAsync(clonedModel, {
            binary: true,
            includeCustomExtensions: true,
          });
          
          clearInterval(progressInterval);
          setExportProgress(100);
          
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
          
          clearInterval(progressInterval);
          setExportProgress(100);
          
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
          
          clearInterval(progressInterval);
          setExportProgress(100);
          
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

      track('window_3d_export', { format, windowId: windowUnit.id, quality });
      
      // Reset progress after success
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Export error:', error);
      track('window_3d_export_error', { format, error: String(error) });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [windowUnit, quality]);

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
      {/* Export Progress Overlay */}
      {isExporting && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
          <Card className="bg-gray-900/95 border-orange-500 shadow-2xl">
            <CardContent className="p-6 text-center">
              <Download className="h-8 w-8 text-orange-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-semibold text-white mb-2">Exporting Model</h3>
              <p className="text-gray-400 text-sm mb-4">
                Preparing {exportFormat} file for download...
              </p>
              <Progress value={exportProgress} className="w-64 mb-2" />
              <p className="text-xs text-gray-500">{exportProgress}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Canvas
        camera={{ position: [3, 3, 3], fov: 50 }}
        shadows={enableShadows}
        gl={{ 
          antialias: quality !== 'low',
          alpha: true,
          powerPreference: quality === 'low' ? 'low-power' : 'high-performance'
        }}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        performance={{ min: 0.5 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        }}
      >
        <Suspense fallback={
          <Html center>
            <div className="text-white text-center">
              <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm">Loading 3D Model...</p>
            </div>
          </Html>
        }>
          <Bounds fit margin={1.2}>
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
              quality={quality}
              enableShadows={enableShadows}
              onControlsReady={(controls) => {
                controlsRef.current = controls;
              }}
            />
          </Bounds>
        </Suspense>
      </Canvas>

      {/* Enhanced Controls Panel */}
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
          controlsRef={controlsRef}
          quality={quality}
          setQuality={setQuality}
          enableShadows={enableShadows}
          setEnableShadows={setEnableShadows}
          isExporting={isExporting}
        />
      )}

      {/* Status Bar */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-600">
            <CardContent className="p-3">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  <span className="capitalize">{quality} Quality</span>
                </div>
                <div className="flex items-center gap-1">
                  {enableShadows ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                  <span>Shadows {enableShadows ? 'On' : 'Off'}</span>
                </div>
                {hasErrors && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{validation.errors.length} Issues</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Enhanced scene content
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
  quality,
  enableShadows,
  onControlsReady,
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
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableShadows: boolean;
  onControlsReady?: (controls: any) => void;
}) {
  const controlsRef = useRef<any>(null);
  const bounds = useBounds();

  useEffect(() => {
    if (controlsRef.current && onControlsReady) {
      onControlsReady(controlsRef.current);
    }
  }, [onControlsReady]);

  // Enhanced lighting setup
  const lightingConfig = useMemo(() => {
    switch (quality) {
      case 'low':
        return { shadowMapSize: 512, intensity: 0.8 };
      case 'medium':
        return { shadowMapSize: 1024, intensity: 1.0 };
      case 'high':
        return { shadowMapSize: 2048, intensity: 1.2 };
      case 'ultra':
        return { shadowMapSize: 4096, intensity: 1.5 };
      default:
        return { shadowMapSize: 1024, intensity: 1.0 };
    }
  }, [quality]);

  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={lightingConfig.intensity}
        castShadow={enableShadows}
        shadow-mapSize-width={lightingConfig.shadowMapSize}
        shadow-mapSize-height={lightingConfig.shadowMapSize}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.2} />
      <hemisphereLight color={0xffffff} groundColor={0x444444} intensity={0.3} />

      {/* Enhanced Environment */}
      <Environment 
        preset="apartment"
        background={false}
        blur={quality === 'ultra' ? 1 : 0.5}
      />

      {/* Main Window Model */}
      <Window3DModel
        windowUnit={windowUnit}
        isAnimating={isAnimating}
        animationProgress={animationProgress}
        onModelReady={onModelReady}
        quality={quality}
        enableShadows={enableShadows}
      />

      {/* Enhanced Overlays */}
      {showMeasurements && <WindowMeasurementOverlay windowUnit={windowUnit} />}
      
      {showErrors && showErrorDetection && (
        <WindowErrorOverlay windowUnit={windowUnit} profiles={profiles} />
      )}

      {/* Enhanced Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={20}
        autoRotate={presentationMode}
        autoRotateSpeed={1}
        target={[0, 0, 0]}
        makeDefault
        dampingFactor={0.1}
      />
    </>
  );
}

// Enhanced wrapper
export const Window3DGeneratorWrapper: React.FC<Window3DGeneratorProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[600px] relative">
      <Window3DGenerator {...props} />
    </div>
  );
};

export default Window3DGenerator;


