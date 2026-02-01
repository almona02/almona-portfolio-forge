/**
 * Almona Fabricator Pro: Physics & Shader Integration Hooks
 * 
 * React hooks for easily integrating physics simulation and advanced shaders
 * into Three.js/React Three Fiber components.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
    AluminiumMaterialParams,
    GlassMaterialParams,
    UPVCMaterialParams,
    createAdvancedAluminiumMaterial,
    createAdvancedGlassMaterial,
    createAdvancedUPVCMaterial,
    updateMaterialEnvMap,
    updateMaterialLights,
} from './AdvancedShaders';
import { HingeConstraintConfig, PhysicsWorld } from './PhysicsEngine';

// ============================================================================
// PHYSICS HOOK
// ============================================================================

export interface UsePhysicsOptions {
  gravity?: number;
  autoStart?: boolean;
  dampingLinear?: number;
  dampingAngular?: number;
}

export interface UsePhysicsReturn {
  world: PhysicsWorld | null;
  isInitialized: boolean;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  applyForce: (bodyId: string, force: THREE.Vector3) => void;
  applyTorque: (bodyId: string, torque: THREE.Vector3) => void;
  openSash: (constraintId: string, speed?: number) => void;
  closeSash: (constraintId: string, speed?: number) => void;
}

/**
 * Hook to manage physics simulation in a React Three Fiber scene
 */
export function usePhysics(options: UsePhysicsOptions = {}): UsePhysicsReturn {
  const worldRef = useRef<PhysicsWorld | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  // Initialize physics world
  useEffect(() => {
    const world = new PhysicsWorld({
      gravity: options.gravity ?? -9.81,
      dampingLinear: options.dampingLinear ?? 0.1,
      dampingAngular: options.dampingAngular ?? 0.5,
    });
    
    world.initialize().then((success) => {
      if (success) {
        worldRef.current = world;
        setIsInitialized(true);
        
        if (options.autoStart) {
          world.start();
          setIsRunning(true);
        }
      }
    });
    
    return () => {
      worldRef.current?.dispose();
      worldRef.current = null;
      setIsInitialized(false);
      setIsRunning(false);
    };
  }, [options.gravity, options.dampingLinear, options.dampingAngular, options.autoStart]);
  
  // Update physics on each frame
  useFrame(() => {
    if (worldRef.current && isRunning) {
      worldRef.current.update();
    }
  });
  
  const start = useCallback(() => {
    worldRef.current?.start();
    setIsRunning(true);
  }, []);
  
  const stop = useCallback(() => {
    worldRef.current?.stop();
    setIsRunning(false);
  }, []);
  
  const applyForce = useCallback((bodyId: string, force: THREE.Vector3) => {
    worldRef.current?.applyForce(bodyId, force);
  }, []);
  
  const applyTorque = useCallback((bodyId: string, torque: THREE.Vector3) => {
    worldRef.current?.applyTorque(bodyId, torque);
  }, []);
  
  const openSash = useCallback((constraintId: string, speed: number = 1.0) => {
    worldRef.current?.setHingeMotor(constraintId, speed, 15);
  }, []);
  
  const closeSash = useCallback((constraintId: string, speed: number = 1.0) => {
    worldRef.current?.setHingeMotor(constraintId, -speed, 15);
  }, []);
  
  return {
    world: worldRef.current,
    isInitialized,
    isRunning,
    start,
    stop,
    applyForce,
    applyTorque,
    openSash,
    closeSash,
  };
}

// ============================================================================
// ADVANCED MATERIALS HOOK
// ============================================================================

export type MaterialType = 'aluminum' | 'upvc' | 'glass';

export interface UseAdvancedMaterialsOptions {
  useWebGL2Shaders?: boolean;
  defaultAluminiumParams?: AluminiumMaterialParams;
  defaultUPVCParams?: UPVCMaterialParams;
  defaultGlassParams?: GlassMaterialParams;
}

export interface UseAdvancedMaterialsReturn {
  createMaterial: (type: MaterialType, params?: any) => THREE.Material;
  updateLighting: (position: THREE.Vector3, color: THREE.Color, intensity: number) => void;
  updateEnvMap: (envMap: THREE.CubeTexture) => void;
  isWebGL2: boolean;
}

/**
 * Hook to manage advanced PBR materials with WebGL 2.0 shaders
 */
export function useAdvancedMaterials(options: UseAdvancedMaterialsOptions = {}): UseAdvancedMaterialsReturn {
  const { gl, scene } = useThree();
  const materialsRef = useRef<THREE.Material[]>([]);
  const shaderErrorRef = useRef(false); // Track if shaders failed
  
  // Check WebGL 2.0 support
  // DISABLED: Advanced shaders are causing WebGL errors. Using standard materials instead.
  // The standard THREE.js materials (MeshPhysicalMaterial) provide excellent quality without errors.
  const isWebGL2 = gl?.capabilities?.isWebGL2 ?? false;
  const shouldUseShaders = false; // Disabled due to shader compilation errors
  
  const createMaterial = useCallback((type: MaterialType, params: any = {}) => {
    let material: THREE.Material | undefined;
    
    // Check if WebGL context is ready
    if (!gl || !gl.domElement || !gl.getContext) {
      // Fallback to standard materials if WebGL not ready
      return new THREE.MeshStandardMaterial(params);
    }
    
    if (shouldUseShaders && !shaderErrorRef.current) {
      try {
        // Use advanced WebGL 2.0 shaders
        switch (type) {
          case 'aluminum':
            material = createAdvancedAluminiumMaterial({
              ...options.defaultAluminiumParams,
              ...params,
            });
            break;
          case 'upvc':
            material = createAdvancedUPVCMaterial({
              ...options.defaultUPVCParams,
              ...params,
            });
            break;
          case 'glass':
            material = createAdvancedGlassMaterial({
              ...options.defaultGlassParams,
              ...params,
            });
            break;
          default:
            material = new THREE.MeshStandardMaterial(params);
        }
        
        // Verify material is valid
        if (material && (material as any).program === undefined) {
          // Material created but program not compiled yet - this is OK
        }
      } catch (error) {
        // Fallback to standard materials if shader creation fails
        console.warn('[Performance] Advanced shader creation failed, using fallback:', error);
        shaderErrorRef.current = true; // Disable shaders for subsequent calls
        material = undefined; // Force fallback
      }
    }
    
    if (!shouldUseShaders || !material || shaderErrorRef.current) {
      // Fallback to standard Three.js materials (WebGL 1.0 compatible) - UPGRADED FOR V6 REALISM
      switch (type) {
        case 'aluminum':
          material = new THREE.MeshPhysicalMaterial({
            color: params.color ?? 0xC0C0C0,
            metalness: 0.9, // Lower slightly to allow coating to shine
            roughness: params.roughness ?? 0.35, // Brushed effect
            clearcoat: 1.0, // Anodized layer
            clearcoatRoughness: 0.15,
            sheen: 0.5,
            sheenColor: new THREE.Color(0xffffff),
            envMapIntensity: params.envMapIntensity ?? 1.5, // Pop the reflections
          });
          break;
        case 'upvc':
          material = new THREE.MeshPhysicalMaterial({
            color: params.color ?? 0xFFFFFF,
            metalness: 0.05, // Plastic has very low metalness
            roughness: params.roughness ?? 0.2, // Smooth, glossy stick
            clearcoat: 0.8, // High gloss finish
            clearcoatRoughness: 0.05,
            reflectivity: 0.9,
            envMapIntensity: params.envMapIntensity ?? 0.8,
          });
          break;
        case 'glass':
          // Physically correct tinted glass: White surface (specular) + Colored attenuation (absorption)
          const tintColor = params.color ? new THREE.Color(params.color) : new THREE.Color(0xeefcfc);
          
          material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, // Surface is always white for correct fresnel/specular
            metalness: 0.0,
            roughness: params.roughness ?? 0.0,
            transmission: 1.0, 
            thickness: 0.012, // 12mm
            ior: 1.52,
            attenuationColor: tintColor, // The color comes from volume absorption
            attenuationDistance: 0.5, // How thick until it reaches full color
            transparent: true,
            envMapIntensity: params.envMapIntensity ?? 2.0,
            depthWrite: false, 
          });
          break;
        default:
          material = new THREE.MeshStandardMaterial(params);
      }
    }
    
    if (material) {
      materialsRef.current.push(material);
    }
    return material;
  }, [shouldUseShaders, gl, options.defaultAluminiumParams, options.defaultUPVCParams, options.defaultGlassParams]);
  
  const updateLighting = useCallback((position: THREE.Vector3, color: THREE.Color, intensity: number) => {
    if (shouldUseShaders && !shaderErrorRef.current) {
      try {
        updateMaterialLights(scene, position, color, intensity);
      } catch (error) {
        console.warn('[Performance] Failed to update material lights:', error);
      }
    }
  }, [shouldUseShaders, scene]);
  
  const updateEnvMap = useCallback((envMap: THREE.CubeTexture) => {
    if (shouldUseShaders && !shaderErrorRef.current) {
      try {
        updateMaterialEnvMap(scene, envMap);
      } catch (error) {
        console.warn('[Performance] Failed to update material env map:', error);
      }
    }
    
    // Also update standard materials
    materialsRef.current.forEach((mat) => {
      if (mat instanceof THREE.MeshPhysicalMaterial || mat instanceof THREE.MeshStandardMaterial) {
        mat.envMap = envMap;
        mat.needsUpdate = true;
      }
    });
  }, [shouldUseShaders, scene]);
  
  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      materialsRef.current.forEach((mat) => mat.dispose());
      materialsRef.current = [];
    };
  }, []);
  
  return {
    createMaterial,
    updateLighting,
    updateEnvMap,
    isWebGL2,
  };
}

// ============================================================================
// WINDOW PHYSICS SETUP HOOK
// ============================================================================

export interface SashConfig {
  id: string;
  mesh: THREE.Object3D;
  type: 'casement' | 'sliding' | 'tilt_turn' | 'fixed';
  hingePosition?: 'left' | 'right' | 'top' | 'bottom';
}

export interface UseWindowPhysicsOptions {
  frameId: string;
  frameMesh: THREE.Object3D | null;
  sashes: SashConfig[];
  enabled?: boolean;
}

/**
 * Hook to set up physics for a complete window unit
 */
export function useWindowPhysics(options: UseWindowPhysicsOptions) {
  const { world, isInitialized, openSash, closeSash, start, stop } = usePhysics({
    autoStart: false,
  });
  
  const [isSetup, setIsSetup] = useState(false);
  const constraintIdsRef = useRef<string[]>([]);
  
  // Set up physics bodies when world is ready and frame mesh is available
  useEffect(() => {
    if (!isInitialized || !world || !options.frameMesh || !options.enabled) {
      return;
    }
    
    // Create frame body (static)
    world.createBody(options.frameId, options.frameMesh, 0, 'box');
    
    // Create sash bodies with constraints
    options.sashes.forEach((sash) => {
      if (sash.type === 'fixed') return;
      
      // Create dynamic body for sash
      world.createBody(sash.id, sash.mesh, 15, 'box'); // ~15kg typical sash weight
      
      // Get sash dimensions
      const bbox = new THREE.Box3().setFromObject(sash.mesh);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      
      // Create appropriate constraint based on type
      const constraintId = `${sash.id}-constraint`;
      constraintIdsRef.current.push(constraintId);
      
      if (sash.type === 'casement') {
        // Determine hinge side
        const hingeX = sash.hingePosition === 'right' ? size.x / 2 : -size.x / 2;
        const hingeY = sash.hingePosition === 'top' ? size.y / 2 : 
                       sash.hingePosition === 'bottom' ? -size.y / 2 : 0;
        
        const hingeAxis = (sash.hingePosition === 'top' || sash.hingePosition === 'bottom')
          ? new THREE.Vector3(1, 0, 0)  // Horizontal hinge for awning/hopper
          : new THREE.Vector3(0, 1, 0); // Vertical hinge for side-hung
        
        const hingeConfig: HingeConstraintConfig = {
          pivotA: new THREE.Vector3(hingeX, hingeY, 0),
          pivotB: new THREE.Vector3(hingeX, hingeY, 0),
          axisA: hingeAxis,
          axisB: hingeAxis,
          lowLimit: 0,
          highLimit: Math.PI * 0.6, // 108 degrees
          softness: 0.9,
          biasFactor: 0.3,
          relaxationFactor: 1.0,
        };
        
        world.createHingeConstraint(constraintId, options.frameId, sash.id, hingeConfig);
      } else if (sash.type === 'sliding') {
        world.createSliderConstraint(constraintId, options.frameId, sash.id, {
          frameA: new THREE.Matrix4().identity(),
          frameB: new THREE.Matrix4().identity(),
          lowLimit: 0,
          highLimit: size.x * 0.8,
        });
      }
    });
    
    setIsSetup(true);
    
    return () => {
      constraintIdsRef.current = [];
      setIsSetup(false);
    };
  }, [isInitialized, world, options.frameMesh, options.frameId, options.sashes, options.enabled]);
  
  // Helper to open/close all sashes
  const openAllSashes = useCallback((speed: number = 1.0) => {
    constraintIdsRef.current.forEach((id) => openSash(id, speed));
  }, [openSash]);
  
  const closeAllSashes = useCallback((speed: number = 1.0) => {
    constraintIdsRef.current.forEach((id) => closeSash(id, speed));
  }, [closeSash]);
  
  return {
    isSetup,
    start,
    stop,
    openSash,
    closeSash,
    openAllSashes,
    closeAllSashes,
    constraintIds: constraintIdsRef.current,
  };
}

// ============================================================================
// WIND LOAD SIMULATION HOOK
// ============================================================================

export interface UseWindSimulationOptions {
  enabled?: boolean;
  windDirection?: THREE.Vector3;
  windSpeed?: number; // m/s
  gustiness?: number; // 0-1
}

/**
 * Hook to simulate wind load on window sashes
 */
export function useWindSimulation(
  physics: ReturnType<typeof usePhysics>,
  sashIds: string[],
  options: UseWindSimulationOptions = {}
) {
  const windDirection = options.windDirection ?? new THREE.Vector3(0, 0, 1);
  const baseWindSpeed = options.windSpeed ?? 5; // 5 m/s default
  const gustiness = options.gustiness ?? 0.3;
  
  useFrame(({ clock }) => {
    if (!options.enabled || !physics.isRunning) return;
    
    // Calculate wind force with gusts
    const time = clock.getElapsedTime();
    const gustFactor = 1 + Math.sin(time * 2) * gustiness + Math.sin(time * 5.7) * gustiness * 0.5;
    const currentWindSpeed = baseWindSpeed * gustFactor;
    
    // F = 0.5 * rho * v^2 * A * Cd
    // Simplified: assume area ~1m² and Cd ~1.2 for flat surface
    const airDensity = 1.225; // kg/m³
    const dragCoeff = 1.2;
    const area = 1.0;
    const forceMagnitude = 0.5 * airDensity * currentWindSpeed * currentWindSpeed * area * dragCoeff;
    
    const force = windDirection.clone().normalize().multiplyScalar(forceMagnitude);
    
    // Apply to all sashes
    sashIds.forEach((id) => {
      physics.applyForce(id, force);
    });
  });
}

export default {
  usePhysics,
  useAdvancedMaterials,
  useWindowPhysics,
  useWindSimulation,
};


