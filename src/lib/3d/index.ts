/**
 * Almona Fabricator Pro: 3D Engine Exports
 * 
 * Central export point for all 3D-related utilities:
 * - Physics simulation (Ammo.js)
 * - Advanced PBR shaders (WebGL 2.0)
 * - React hooks for integration
 * - Geometry generation
 */

// Physics Engine
export {
  PhysicsWorld,
  initPhysics,
  createWindowPhysics,
  type PhysicsConfig,
  type HingeConstraintConfig,
  type SliderConstraintConfig,
  type PhysicsBody,
  type PhysicsConstraint,
  type ConstraintType,
} from './PhysicsEngine';

// Advanced Shaders
export {
  createAdvancedAluminiumMaterial,
  createAdvancedUPVCMaterial,
  createAdvancedGlassMaterial,
  updateMaterialLights,
  updateMaterialEnvMap,
  type AluminiumMaterialParams,
  type UPVCMaterialParams,
  type GlassMaterialParams,
} from './AdvancedShaders';

// React Hooks
export {
  usePhysics,
  useAdvancedMaterials,
  useWindowPhysics,
  useWindSimulation,
  type UsePhysicsOptions,
  type UsePhysicsReturn,
  type UseAdvancedMaterialsOptions,
  type UseAdvancedMaterialsReturn,
  type SashConfig,
  type UseWindowPhysicsOptions,
  type UseWindSimulationOptions,
  type MaterialType,
} from './hooks';

// Window Geometry (existing)
export {
  generateModelGeometries,
  createRealisticProfileShape,
  type FrameGeometry,
  type MiteredFrameData,
  type SashData,
  type ProfileCrossSection,
  type WindowType,
  type MaterialType as GeometryMaterialType,
  type OpeningMechanism,
  type MuntinConfig,
} from './windowGeometry';


