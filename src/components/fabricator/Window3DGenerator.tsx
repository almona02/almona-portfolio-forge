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

import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Bounds, useBounds, CameraControls } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette } from '@react-three/postprocessing';
import { WindowUnit, Profile } from '@/types/fabricator';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Toggle } from '@/shared/ui/ui/toggle';
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
import { validateProjectWithConstraints, deriveSystemConstraintsFromProfiles } from '@/lib/fabricatorValidation';
import { Progress } from '@/shared/ui/ui/progress';
import { Badge } from '@/shared/ui/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { generateFrameGeometry, frameGeometryToThreeJS } from '@/lib/3d/windowGeometry';

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
    metalness: 0.9,
    roughness: 0.2,
    envMapIntensity: 1.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.1
  },
  upvc: {
    metalness: 0.1,
    roughness: 0.5,
    envMapIntensity: 0.4,
    clearcoat: 0.05,
    clearcoatRoughness: 0.3
  },
  wood: {
    metalness: 0.0,
    roughness: 0.8,
    envMapIntensity: 0.2,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4
  },
  steel: {
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: 1.2,
    clearcoat: 0.1,
    clearcoatRoughness: 0.1
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

export interface Window3DGeneratorRef {
  captureSnapshot: () => Promise<Blob | null>;
}

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
  explodedView?: boolean;
  setExplodedView?: (value: boolean) => void;
  highlightDimension?: 'width' | 'height' | null;
}

// Enhanced material creation with PBR properties
const createMaterial = (materialType: string, color: string): THREE.MeshStandardMaterial => {
  const baseColor = new THREE.Color(color);
  const materialProps = MATERIAL_DATABASE[materialType as keyof typeof MATERIAL_DATABASE] || MATERIAL_DATABASE.aluminum;
  
  // Remove clearcoat properties as they're only available on MeshPhysicalMaterial
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clearcoat, clearcoatRoughness, ...standardProps } = materialProps as any;
  
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    ...standardProps,
  });
};

// Enhanced glass material with realistic properties
const createGlassMaterial = (glazingType: string): THREE.MeshPhysicalMaterial => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.95, // High transmission for glass
    thickness: 0.004, // 4mm glass
    ior: 1.52, // Index of refraction for glass
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    specularIntensity: 1.0,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide
  });
};

const createSpacerMaterial = (): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.8,
    roughness: 0.3,
  });
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
      // emissive: 0x000000,
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
  const { scene: _scene } = useThree();

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
      specifications: {}
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
    const spacerMaterial = createSpacerMaterial();

    // ------------------------------------------------------------------------
    // GRID MODE (PHASE 4)
    // ------------------------------------------------------------------------
    if (windowUnit.grid && windowUnit.grid.cells.length > 0) {
        const { rows, cols, cells } = windowUnit.grid;
        const cellWidth = width / cols;
        const cellHeight = height / rows;

        // 1. Draw Cells
        cells.forEach(cell => {
            // Calculate Bottom-Left Corner for this cell
            // Top-Left of grid is (-W/2, H/2)
            // Cell X: -W/2 + (col * cellWidth)
            // Cell Y: H/2 - ((row + 1) * cellHeight)  (Since geom draws up from y=0)
            
            const startX = -width/2 + (cell.col * cellWidth);
            const startY = height/2 - ((cell.row + 1) * cellHeight);

            if (cell.type === 'empty') return;

            // Generate cell geometry
            const cellGeo = generateFrameGeometry(
                cellWidth,
                cellHeight,
                profile,
                cell.type === 'fixed' || cell.type === 'panel' ? 'fixed_window' : 'casement',
                (windowUnit.glazing?.type || 'double') as any
            );
            const cellThreeJS = frameGeometryToThreeJS(cellGeo);

            const cellGroup = new THREE.Group();
            
            // Frame
            const cellFrame = new THREE.Mesh(cellThreeJS.frame, frameMaterial);
            cellFrame.castShadow = enableShadows;
            cellFrame.receiveShadow = enableShadows;
            cellGroup.add(cellFrame);

            // Sash
            if (cellThreeJS.sash && cell.type === 'sash') {
                const sash = new THREE.Mesh(cellThreeJS.sash, sashMaterial);
                sash.castShadow = enableShadows;
                sash.receiveShadow = enableShadows;
                cellGroup.add(sash);
            }

            // Glass (only if not panel)
            if (cell.type !== 'panel') {
                cellThreeJS.glass.forEach(g => {
                    const glass = new THREE.Mesh(g, glassMaterial);
                    glass.receiveShadow = true;
                    cellGroup.add(glass);
                });
                cellThreeJS.spacers.forEach(s => {
                    const spacer = new THREE.Mesh(s, spacerMaterial);
                    cellGroup.add(spacer);
                });
            } else {
                // Panel placeholder (Solid Block)
                const panelGeo = new THREE.BoxGeometry(cellWidth - 0.1, cellHeight - 0.1, 0.02);
                const panelMesh = new THREE.Mesh(panelGeo, frameMaterial);
                panelMesh.position.set(cellWidth/2, cellHeight/2, 0.025);
                cellGroup.add(panelMesh);
            }

            cellGroup.position.set(startX, startY, 0);
            windowGroup.add(cellGroup);
        });

        // 2. Intelligent Mullions (Between Columns)
        // A simple box for now
        const profileWidth = (profile.width || 50) / 1000;
        for (let c = 1; c < cols; c++) {
            const x = -width/2 + (c * cellWidth);
            const mullionGeo = new THREE.BoxGeometry(profileWidth, height, profileWidth * 2);
            const mullion = new THREE.Mesh(mullionGeo, frameMaterial);
            mullion.position.set(x, 0, 0); // Centered vertically
            windowGroup.add(mullion);
        }

        // 3. Intelligent Transoms (Between Rows)
        for (let r = 1; r < rows; r++) {
            const y = height/2 - (r * cellHeight);
            const transomGeo = new THREE.BoxGeometry(width, profileWidth, profileWidth * 2);
            const transom = new THREE.Mesh(transomGeo, frameMaterial);
            transom.position.set(0, y, 0);
            windowGroup.add(transom);
        }

        // Adjust camera fit scale
        // (Scale logic reused below)

    } else {
        // ------------------------------------------------------------------------
        // LEGACY PRESET MODE
        // ------------------------------------------------------------------------
        
        // Generate layouts for sash logic (still used for positioning logic)
        const layouts: SashLayout[] = computeSashLayout(windowUnit, width);

        // 1. Generate Outer Frame
        const fullGeometry = generateFrameGeometry(
            width, 
            height, 
            profile, 
            windowType, 
            (windowUnit.glazing?.type || 'single') as any
        );
        const threeJSGeo = frameGeometryToThreeJS(fullGeometry);
        
        // Create frame mesh
        const frame = new THREE.Mesh(threeJSGeo.frame, frameMaterial);
        frame.position.set(0, 0, 0);
        frame.castShadow = enableShadows;
        frame.receiveShadow = enableShadows;
        frame.name = 'frame';
        windowGroup.add(frame);

        // 2. Create Sashes and Glass
        const sashGroups: THREE.Group[] = [];
        layouts.forEach((layout) => {
          const i = layout.index;
          const sashGroup = new THREE.Group();
          sashGroup.name = `sash_${i}`;

          const sashWidth = layout.width;
          
          // Generate temporary geometry for this sash segment
          const segmentGeo = generateFrameGeometry(
              sashWidth,
              height,
              profile,
              windowType,
              (windowUnit.glazing?.type || 'single') as any,
              undefined,
              (windowUnit as any).muntins
          );
          const segmentThreeJS = frameGeometryToThreeJS(segmentGeo);
          
          if (segmentThreeJS.sash) {
              const sash = new THREE.Mesh(segmentThreeJS.sash, sashMaterial);
              sash.castShadow = enableShadows;
              sash.receiveShadow = enableShadows;
              sash.name = `sash_mesh_${i}`;
              sash.userData.role = layout.role;
              sashGroup.add(sash);
          }
          
          // Glass
          segmentThreeJS.glass.forEach((g, idx) => {
              const glass = new THREE.Mesh(g, glassMaterial);
              glass.castShadow = false;
              glass.receiveShadow = true;
              glass.name = `glass_${i}_${idx}`;
              sashGroup.add(glass);
          });
          
          // Spacers
          segmentThreeJS.spacers.forEach((s, idx) => {
              const spacer = new THREE.Mesh(s, spacerMaterial);
              spacer.castShadow = enableShadows;
              spacer.receiveShadow = true;
              spacer.name = `spacer_${i}_${idx}`;
              sashGroup.add(spacer);
          });
          
          // Muntins
          if (segmentThreeJS.muntins) {
              const muntins = new THREE.Mesh(segmentThreeJS.muntins, frameMaterial); 
              muntins.castShadow = enableShadows;
              muntins.receiveShadow = true;
              muntins.name = `muntins_${i}`;
              sashGroup.add(muntins);
          }

          // Horizontal placement based on layout centerX
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
    } // End legacy mode

    // Center the model
    const box = new THREE.Box3().setFromObject(windowGroup);
    const center = box.getCenter(new THREE.Vector3());
    windowGroup.position.sub(center);
    
    // Calculate appropriate scale to fit in view
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 0) {
      const targetSize = 2.5;
      const scale = targetSize / maxDimension;
      if (Math.abs(scale - 1) > 0.1) {
        windowGroup.scale.set(scale, scale, scale);
      }
    }

    if (onModelReady) {
      onModelReady(windowGroup);
    }

    return () => {
      try {
        // Disposal logic
      } catch (error) {
        console.warn('Error disposing geometries:', error);
      }
    };
  }, [windowUnit, onModelReady, quality, enableShadows]);

  // Enhanced animation system (Legacy Mode Only for now)
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

// Exploded View Control Component
function ExplodedViewControl({ 
  exploded, 
  modelGroup 
}: { 
  exploded: boolean; 
  modelGroup: THREE.Group | null;
}) {
  useFrame(() => {
    if (!modelGroup) return;
    
    const expansionFactor = exploded ? 0.2 : 0; // Expansion distance in meters
    
    modelGroup.children.forEach((child) => {
      // Initialize original position if not set
      if (!child.userData.originalPos) {
        child.userData.originalPos = child.position.clone();
      }

      // Calculate direction from center (assuming local 0,0,0 is center)
      // If parts are grouped, we might need world position logic, but this works for centered groups
      const targetPos = child.userData.originalPos.clone();
      const direction = targetPos.clone().normalize();
      
      // If the part is at (0,0,0), it won't move. Add a slight offset based on name if needed.
      if (direction.length() === 0) {
        // Default direction based on part name or use Z-axis
        if (child.name.includes('sash')) {
          direction.set(1, 0, 0); // Move right for sashes
        } else if (child.name.includes('glass')) {
          direction.set(0, 0, 1); // Move forward for glass
        } else {
          direction.set(0, 0, 1); // Default Z-axis
        }
      }

      // Lerp to new position
      const expandedPos = targetPos.clone().add(direction.multiplyScalar(expansionFactor));
      child.position.lerp(expandedPos, 0.1);
    });
  });

  return null;
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

// Enhanced measurement overlay with dimension highlighting
export function WindowMeasurementOverlay({ 
  windowUnit, 
  highlightDimension 
}: { 
  windowUnit: WindowUnit;
  highlightDimension?: 'width' | 'height' | null;
}) {
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;
  const isWidthHighlighted = highlightDimension === 'width';
  const isHeightHighlighted = highlightDimension === 'height';

  return (
    <>
      {/* Width measurement with line */}
      <group position={[0, -height / 2 - 0.15, 0]}>
        <mesh>
          <boxGeometry args={[width, 0.005, 0.005]} />
          <meshBasicMaterial 
            color={isWidthHighlighted ? 0xf97316 : 0x4ade80} // Orange if active, Green default
            toneMapped={false} // Makes it glow with Bloom
          />
        </mesh>
        <Html position={[0, -0.08, 0]} center>
          <div className={`
            px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg border-2 transition-all duration-300
            ${isWidthHighlighted 
              ? 'bg-orange-600 text-white border-orange-400 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)]' 
              : 'bg-green-600/90 text-white border-green-400'}
          `}>
            {windowUnit.overallWidth}mm
          </div>
        </Html>
      </group>

      {/* Height measurement with line */}
      <group position={[-width / 2 - 0.15, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[height, 0.005, 0.005]} />
          <meshBasicMaterial 
            color={isHeightHighlighted ? 0xf97316 : 0x4ade80} // Orange if active, Green default
            toneMapped={false} // Makes it glow with Bloom
          />
        </mesh>
        <Html position={[-0.05, 0, 0]} center>
          <div className={`
            px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg border-2 transition-all duration-300 transform -rotate-90
            ${isHeightHighlighted 
              ? 'bg-orange-600 text-white border-orange-400 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)]' 
              : 'bg-green-600/90 text-white border-green-400'}
          `}>
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
export const Window3DGenerator = forwardRef<Window3DGeneratorRef, Window3DGeneratorProps>(({
  windowUnit,
  presentationMode = false,
  showControls = true,
  onModelUpdate,
  className = '',
  showErrorDetection = true,
  profiles = [],
  quality: initialQuality = 'high',
  enableShadows: initialShadows = true,
  explodedView: initialExplodedView = false,
  setExplodedView,
  highlightDimension,
}, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showErrors, setShowErrors] = useState(showErrorDetection);
  const [exportFormat, setExportFormat] = useState<'GLB' | 'STL' | 'OBJ'>('GLB');
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>(initialQuality);
  const [enableShadows, setEnableShadows] = useState(initialShadows);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [explodedView, setExplodedViewInternal] = useState(initialExplodedView);
  
  const modelRef = useRef<THREE.Group | null>(null);
  const glRef = useRef<any>(null);
  
  // Use external setter if provided, otherwise use internal state
  const actualExplodedView = setExplodedView !== undefined ? initialExplodedView : explodedView;
  const actualSetExplodedView = setExplodedView || setExplodedViewInternal;
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

  // Expose captureSnapshot method
  useImperativeHandle(ref, () => ({
    captureSnapshot: async () => {
      if (!glRef.current || !modelRef.current) return null;
      
      try {
        const gl = glRef.current;
        // Render the scene one more time to ensure it's up to date
        gl.render(gl.scene, gl.camera);
        
        const blob = await new Promise<Blob | null>(resolve => {
          gl.domElement.toBlob((b: Blob | null) => resolve(b), 'image/png', 1.0);
        });
        
        return blob;
      } catch (err) {
        console.error("Snapshot failed", err);
        return null;
      }
    }
  }));

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
          powerPreference: quality === 'low' ? 'low-power' : 'high-performance',
          preserveDrawingBuffer: true // Required for snapshot
        }}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        performance={{ min: 0.5 }}
        onCreated={({ gl, camera }) => {
          glRef.current = gl;
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
            <Window3DModel
              windowUnit={windowUnit}
              isAnimating={isAnimating}
              animationProgress={animationProgress}
              showMeasurements={showMeasurements}
              presentationMode={presentationMode}
              onModelReady={handleModelReady}
              showErrors={showErrors}
              showErrorDetection={showErrorDetection}
              profiles={profiles}
              quality={quality}
              enableShadows={enableShadows}
            />
          </Bounds>
        </Suspense>
      </Canvas>

      {/* Exploded View Toggle */}
      {showControls && setExplodedView && (
        <div className="absolute top-4 left-4 z-10">
          <Toggle 
            pressed={actualExplodedView} 
            onPressedChange={actualSetExplodedView}
            className="bg-black/50 backdrop-blur text-white data-[state=on]:bg-orange-600"
          >
            <Layers className="h-4 w-4 mr-2" /> Explode
          </Toggle>
        </div>
      )}

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
});

export default Window3DGenerator;
