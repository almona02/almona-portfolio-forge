/**
 * Almona Fabricator Pro: Physics Engine (v1.0)
 * 
 * Provides Ammo.js-based physics simulation for realistic window/door animations.
 * Supports hinge constraints for casement windows, sliding constraints for sliders,
 * and tilt-turn mechanisms.
 * 
 * Features:
 * - Realistic hinge physics with damping
 * - Collision detection between sashes
 * - Wind load simulation
 * - Gravity-aware animations
 */

import * as THREE from 'three';

// Ammo.js types (loaded dynamically)
declare global {
  interface Window {
    Ammo: any;
  }
}

export interface PhysicsConfig {
  gravity?: number;
  dampingLinear?: number;
  dampingAngular?: number;
  friction?: number;
  restitution?: number;
}

export interface HingeConstraintConfig {
  pivotA: THREE.Vector3;
  pivotB: THREE.Vector3;
  axisA: THREE.Vector3;
  axisB: THREE.Vector3;
  lowLimit: number;  // radians
  highLimit: number; // radians
  softness?: number;
  biasFactor?: number;
  relaxationFactor?: number;
}

export interface SliderConstraintConfig {
  frameA: THREE.Matrix4;
  frameB: THREE.Matrix4;
  lowLimit: number;  // meters
  highLimit: number; // meters
}

export type ConstraintType = 'hinge' | 'slider' | 'tilt_turn' | 'fixed';

export interface PhysicsBody {
  id: string;
  mesh: THREE.Object3D;
  rigidBody: any; // Ammo.btRigidBody
  mass: number;
  type: 'static' | 'dynamic' | 'kinematic';
}

export interface PhysicsConstraint {
  id: string;
  type: ConstraintType;
  bodyA: string;
  bodyB: string;
  constraint: any; // Ammo.btTypedConstraint
}

let ammoInstance: any = null;
let isAmmoInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialize Ammo.js physics engine.
 * Must be called before creating any physics objects.
 */
export async function initPhysics(): Promise<boolean> {
  if (isAmmoInitialized) return true;
  
  if (initPromise) return initPromise;
  
  initPromise = new Promise(async (resolve) => {
    try {
      // Dynamic import of ammo.js
      // ammo.js v0.0.10 exports differently - try multiple import patterns
      let AmmoModule: any;
      try {
        AmmoModule = await import('ammo.js');
        
        // ammo.js v0.0.10 typically exports as: { default: function() }
        // But the function might be at different levels
        if (AmmoModule && typeof AmmoModule === 'object') {
          // Try default export first
          if (AmmoModule.default) {
            if (typeof AmmoModule.default === 'function') {
              ammoInstance = await AmmoModule.default();
            } else if (typeof AmmoModule.default === 'object' && AmmoModule.default.ready) {
              // Some versions export a promise-like object
              ammoInstance = await AmmoModule.default;
            } else {
              ammoInstance = AmmoModule.default;
            }
          } 
          // Try direct function export
          else if (typeof AmmoModule === 'function') {
            ammoInstance = await AmmoModule();
          }
          // Try named exports
          else if (AmmoModule.Ammo && typeof AmmoModule.Ammo === 'function') {
            ammoInstance = await AmmoModule.Ammo();
          }
          else {
            // Last resort: check if it's already initialized
            ammoInstance = AmmoModule;
          }
        } else {
          throw new Error('Ammo.js module structure not recognized');
        }
      } catch (importError: any) {
        // Fallback: try loading from CDN or skip physics
        console.warn('[PhysicsEngine] Direct import failed, physics will be disabled:', importError?.message || importError);
        resolve(false);
        return;
      }
      
      if (ammoInstance && typeof ammoInstance === 'object') {
        window.Ammo = ammoInstance;
        isAmmoInitialized = true;
        console.log('[PhysicsEngine] Ammo.js initialized successfully');
        resolve(true);
      } else {
        console.warn('[PhysicsEngine] Ammo.js instance is invalid, disabling physics');
        resolve(false);
      }
    } catch (error: any) {
      console.error('[PhysicsEngine] Failed to initialize Ammo.js:', error?.message || error);
      resolve(false);
    }
  });
  
  return initPromise;
}

/**
 * Physics World Manager
 * Handles the simulation loop and body management
 */
export class PhysicsWorld {
  private world: any; // Ammo.btDiscreteDynamicsWorld
  private bodies: Map<string, PhysicsBody> = new Map();
  private constraints: Map<string, PhysicsConstraint> = new Map();
  private tempTransform: any;
  private config: PhysicsConfig;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  
  constructor(config: PhysicsConfig = {}) {
    this.config = {
      gravity: config.gravity ?? -9.81,
      dampingLinear: config.dampingLinear ?? 0.1,
      dampingAngular: config.dampingAngular ?? 0.5,
      friction: config.friction ?? 0.8,
      restitution: config.restitution ?? 0.2,
    };
  }
  
  async initialize(): Promise<boolean> {
    const initialized = await initPhysics();
    if (!initialized || !ammoInstance) return false;
    
    const Ammo = ammoInstance;
    
    // Create collision configuration
    const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    
    // Create dynamics world
    this.world = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfig
    );
    
    // Set gravity
    this.world.setGravity(new Ammo.btVector3(0, this.config.gravity!, 0));
    
    // Create temp transform for updates
    this.tempTransform = new Ammo.btTransform();
    
    console.log('[PhysicsWorld] World initialized with gravity:', this.config.gravity);
    return true;
  }
  
  /**
   * Create a rigid body from a Three.js mesh
   */
  createBody(
    id: string,
    mesh: THREE.Object3D,
    mass: number,
    shape: 'box' | 'sphere' | 'convex' | 'compound' = 'box'
  ): PhysicsBody | null {
    if (!this.world || !ammoInstance) return null;
    
    const Ammo = ammoInstance;
    
    // Calculate bounding box for shape
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Create collision shape
    let collisionShape: any;
    switch (shape) {
      case 'sphere':
        collisionShape = new Ammo.btSphereShape(Math.max(size.x, size.y, size.z) / 2);
        break;
      case 'box':
      default:
        collisionShape = new Ammo.btBoxShape(
          new Ammo.btVector3(size.x / 2, size.y / 2, size.z / 2)
        );
        break;
    }
    
    // Get initial transform from mesh
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    
    const pos = mesh.position;
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    
    const quat = mesh.quaternion;
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    
    // Calculate inertia
    const localInertia = new Ammo.btVector3(0, 0, 0);
    if (mass > 0) {
      collisionShape.calculateLocalInertia(mass, localInertia);
    }
    
    // Create motion state
    const motionState = new Ammo.btDefaultMotionState(transform);
    
    // Create rigid body
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      collisionShape,
      localInertia
    );
    
    const rigidBody = new Ammo.btRigidBody(rbInfo);
    
    // Apply damping
    rigidBody.setDamping(this.config.dampingLinear!, this.config.dampingAngular!);
    rigidBody.setFriction(this.config.friction!);
    rigidBody.setRestitution(this.config.restitution!);
    
    // Add to world
    this.world.addRigidBody(rigidBody);
    
    const body: PhysicsBody = {
      id,
      mesh,
      rigidBody,
      mass,
      type: mass === 0 ? 'static' : 'dynamic',
    };
    
    this.bodies.set(id, body);
    return body;
  }
  
  /**
   * Create a hinge constraint (for casement windows, doors)
   */
  createHingeConstraint(
    id: string,
    bodyAId: string,
    bodyBId: string,
    config: HingeConstraintConfig
  ): PhysicsConstraint | null {
    if (!this.world || !ammoInstance) return null;
    
    const Ammo = ammoInstance;
    
    const bodyA = this.bodies.get(bodyAId);
    const bodyB = this.bodies.get(bodyBId);
    
    if (!bodyA || !bodyB) {
      console.warn('[PhysicsWorld] Bodies not found for hinge constraint');
      return null;
    }
    
    const pivotA = new Ammo.btVector3(config.pivotA.x, config.pivotA.y, config.pivotA.z);
    const pivotB = new Ammo.btVector3(config.pivotB.x, config.pivotB.y, config.pivotB.z);
    const axisA = new Ammo.btVector3(config.axisA.x, config.axisA.y, config.axisA.z);
    const axisB = new Ammo.btVector3(config.axisB.x, config.axisB.y, config.axisB.z);
    
    const hinge = new Ammo.btHingeConstraint(
      bodyA.rigidBody,
      bodyB.rigidBody,
      pivotA,
      pivotB,
      axisA,
      axisB,
      true // useReferenceFrameA
    );
    
    // Set limits
    hinge.setLimit(
      config.lowLimit,
      config.highLimit,
      config.softness ?? 0.9,
      config.biasFactor ?? 0.3,
      config.relaxationFactor ?? 1.0
    );
    
    this.world.addConstraint(hinge, true);
    
    const constraint: PhysicsConstraint = {
      id,
      type: 'hinge',
      bodyA: bodyAId,
      bodyB: bodyBId,
      constraint: hinge,
    };
    
    this.constraints.set(id, constraint);
    return constraint;
  }
  
  /**
   * Create a slider constraint (for sliding windows/doors)
   */
  createSliderConstraint(
    id: string,
    bodyAId: string,
    bodyBId: string,
    config: SliderConstraintConfig
  ): PhysicsConstraint | null {
    if (!this.world || !ammoInstance) return null;
    
    const Ammo = ammoInstance;
    
    const bodyA = this.bodies.get(bodyAId);
    const bodyB = this.bodies.get(bodyBId);
    
    if (!bodyA || !bodyB) return null;
    
    // Create transform matrices
    const frameA = new Ammo.btTransform();
    const frameB = new Ammo.btTransform();
    
    frameA.setFromOpenGLMatrix(config.frameA.elements);
    frameB.setFromOpenGLMatrix(config.frameB.elements);
    
    const slider = new Ammo.btSliderConstraint(
      bodyA.rigidBody,
      bodyB.rigidBody,
      frameA,
      frameB,
      true // useLinearReferenceFrameA
    );
    
    slider.setLowerLinLimit(config.lowLimit);
    slider.setUpperLinLimit(config.highLimit);
    slider.setLowerAngLimit(0);
    slider.setUpperAngLimit(0);
    
    this.world.addConstraint(slider, true);
    
    const constraint: PhysicsConstraint = {
      id,
      type: 'slider',
      bodyA: bodyAId,
      bodyB: bodyBId,
      constraint: slider,
    };
    
    this.constraints.set(id, constraint);
    return constraint;
  }
  
  /**
   * Apply force to a body (e.g., wind load)
   */
  applyForce(bodyId: string, force: THREE.Vector3, point?: THREE.Vector3): void {
    if (!ammoInstance) return;
    
    const body = this.bodies.get(bodyId);
    if (!body || body.type === 'static') return;
    
    const Ammo = ammoInstance;
    const forceVec = new Ammo.btVector3(force.x, force.y, force.z);
    
    if (point) {
      const relPos = new Ammo.btVector3(point.x, point.y, point.z);
      body.rigidBody.applyForce(forceVec, relPos);
    } else {
      body.rigidBody.applyCentralForce(forceVec);
    }
    
    body.rigidBody.activate();
  }
  
  /**
   * Apply torque to open/close a hinged sash
   */
  applyTorque(bodyId: string, torque: THREE.Vector3): void {
    if (!ammoInstance) return;
    
    const body = this.bodies.get(bodyId);
    if (!body || body.type === 'static') return;
    
    const Ammo = ammoInstance;
    const torqueVec = new Ammo.btVector3(torque.x, torque.y, torque.z);
    body.rigidBody.applyTorque(torqueVec);
    body.rigidBody.activate();
  }
  
  /**
   * Set motor velocity on a hinge (for animated opening)
   */
  setHingeMotor(constraintId: string, velocity: number, maxImpulse: number = 10): void {
    const constraint = this.constraints.get(constraintId);
    if (!constraint || constraint.type !== 'hinge') return;
    
    constraint.constraint.enableAngularMotor(true, velocity, maxImpulse);
  }
  
  /**
   * Stop hinge motor
   */
  stopHingeMotor(constraintId: string): void {
    const constraint = this.constraints.get(constraintId);
    if (!constraint || constraint.type !== 'hinge') return;
    
    constraint.constraint.enableAngularMotor(false, 0, 0);
  }
  
  /**
   * Step the physics simulation
   */
  step(deltaTime: number): void {
    if (!this.world) return;
    
    // Step simulation (max 4 substeps, fixed timestep of 1/60)
    this.world.stepSimulation(deltaTime, 4, 1 / 60);
    
    // Update Three.js meshes from physics bodies
    this.bodies.forEach((body) => {
      if (body.type === 'static') return;
      
      const motionState = body.rigidBody.getMotionState();
      if (motionState) {
        motionState.getWorldTransform(this.tempTransform);
        
        const origin = this.tempTransform.getOrigin();
        const rotation = this.tempTransform.getRotation();
        
        body.mesh.position.set(origin.x(), origin.y(), origin.z());
        body.mesh.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
      }
    });
  }
  
  /**
   * Start the physics simulation loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
  }
  
  /**
   * Stop the physics simulation
   */
  stop(): void {
    this.isRunning = false;
  }
  
  /**
   * Update method to be called in animation frame
   */
  update(): void {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    this.step(Math.min(delta, 0.1)); // Cap at 100ms
  }
  
  /**
   * Clean up physics world
   */
  dispose(): void {
    this.stop();
    
    // Remove constraints
    this.constraints.forEach((constraint) => {
      this.world?.removeConstraint(constraint.constraint);
    });
    this.constraints.clear();
    
    // Remove bodies
    this.bodies.forEach((body) => {
      this.world?.removeRigidBody(body.rigidBody);
    });
    this.bodies.clear();
    
    this.world = null;
  }
  
  /**
   * Get body by ID
   */
  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }
  
  /**
   * Get constraint by ID
   */
  getConstraint(id: string): PhysicsConstraint | undefined {
    return this.constraints.get(id);
  }
}

/**
 * Factory function to create physics setup for a window unit
 */
export function createWindowPhysics(
  world: PhysicsWorld,
  frameId: string,
  frameMesh: THREE.Object3D,
  sashes: Array<{ id: string; mesh: THREE.Object3D; type: 'casement' | 'sliding' | 'tilt_turn' | 'fixed' }>
): void {
  // Create static frame body
  world.createBody(frameId, frameMesh, 0, 'box'); // mass 0 = static
  
  // Create dynamic sash bodies with appropriate constraints
  sashes.forEach((sash) => {
    if (sash.type === 'fixed') return;
    
    // Create dynamic body for sash (mass based on typical aluminium window sash ~15kg)
    const sashMass = 15;
    world.createBody(sash.id, sash.mesh, sashMass, 'box');
    
    // Get sash dimensions for constraint positioning
    const bbox = new THREE.Box3().setFromObject(sash.mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    switch (sash.type) {
      case 'casement': {
        // Hinge on left side (typical casement)
        const hingeConfig: HingeConstraintConfig = {
          pivotA: new THREE.Vector3(-size.x / 2, 0, 0), // Left edge of sash
          pivotB: new THREE.Vector3(-size.x / 2, 0, 0), // Corresponding point on frame
          axisA: new THREE.Vector3(0, 1, 0), // Vertical hinge axis
          axisB: new THREE.Vector3(0, 1, 0),
          lowLimit: 0,
          highLimit: Math.PI * 0.6, // 108 degrees max opening
          softness: 0.9,
          biasFactor: 0.3,
          relaxationFactor: 1.0,
        };
        world.createHingeConstraint(`${sash.id}-hinge`, frameId, sash.id, hingeConfig);
        break;
      }
      
      case 'sliding': {
        // Slider constraint for horizontal movement
        const sliderConfig: SliderConstraintConfig = {
          frameA: new THREE.Matrix4().identity(),
          frameB: new THREE.Matrix4().identity(),
          lowLimit: 0,
          highLimit: size.x * 0.8, // 80% of width travel
        };
        world.createSliderConstraint(`${sash.id}-slider`, frameId, sash.id, sliderConfig);
        break;
      }
      
      case 'tilt_turn': {
        // Two hinges: bottom for tilt, side for turn
        // Bottom tilt hinge
        const tiltConfig: HingeConstraintConfig = {
          pivotA: new THREE.Vector3(0, -size.y / 2, 0),
          pivotB: new THREE.Vector3(0, -size.y / 2, 0),
          axisA: new THREE.Vector3(1, 0, 0), // Horizontal axis for tilt
          axisB: new THREE.Vector3(1, 0, 0),
          lowLimit: 0,
          highLimit: Math.PI * 0.15, // ~27 degrees tilt
        };
        world.createHingeConstraint(`${sash.id}-tilt`, frameId, sash.id, tiltConfig);
        // Note: Turn mode would require switching constraints at runtime
        break;
      }
    }
  });
}

export default PhysicsWorld;


