# 3D Window Generator & Drawing System - Comprehensive Upgrade Plan

**Goal:** Make Fabricator Pro's 3D window generation and drawing experience **better than Klaes (beauty) and Orgadata (precision)**

**Current State Analysis:** 85% accuracy (visual), 99.8% accuracy (production data)  
**Target State:** 98%+ visual accuracy, photorealistic rendering, intuitive drawing

---

## 🎯 Executive Summary

Your consultant is RIGHT - before pilot, you need the 3D window generator to be **visually stunning and technically perfect**. This is your **main differentiator** from competitors.

### Current Strengths ✅
- Solid technical foundation (99.8% production accuracy)
- Good architecture (dual output system)
- Working animation system
- Manual mullion tools
- Preset pattern system
- SmartDrawCanvas with grid system

### Critical Gaps ❌
- **Visual accuracy only 85%** (needs 98%+)
- Profile cross-sections too simple (rectangular boxes)
- No realistic hardware visualization
- Glass rendering basic
- No material textures
- Limited opening mechanism visualization
- Drawing UX needs polish

---

## 📊 Competitive Analysis

### Klaes (German Standard - Beauty)
**Strengths:**
- Photorealistic rendering
- Beautiful material textures
- Smooth animations
- Professional UI/UX

**Weaknesses:**
- Expensive
- Complex to learn
- Not Egyptian-focused

### Orgadata (German Standard - Precision)
**Strengths:**
- 99%+ visual accuracy
- Detailed profile cross-sections
- Accurate hardware placement
- Production-ready geometry

**Weaknesses:**
- Expensive
- Slow performance
- Not Egyptian-focused

### **Your Opportunity:**
Combine Klaes's beauty + Orgadata's precision + Egyptian focus = **Market Leader**

---

## 🚀 12-Week Upgrade Plan

### Phase 1: Foundation (Weeks 1-3) - **CRITICAL**

#### Week 1: Advanced Profile Cross-Sections

**Current Problem:**
```typescript
// windowGeometry.ts - Line 85
// Creates simple rectangular boxes - NOT REALISTIC
const bar = new BoxGeometry(width, height, depth);
```

**Solution: Multi-Chamber Profile System**

**Tasks:**
- [ ] **Day 1-2:** Create `AdvancedProfileGenerator.ts`
  ```typescript
  // src/lib/3d/AdvancedProfileGenerator.ts
  
  interface ProfileChamber {
    position: Vector2;
    width: number;
    height: number;
    type: 'air' | 'reinforcement' | 'drainage';
  }
  
  interface AdvancedProfileSpec {
    outerWidth: number;
    outerHeight: number;
    wallThickness: number;
    chambers: ProfileChamber[];
    glassPocket: {
      width: number;
      depth: number;
      position: Vector2;
    };
    drainageHoles: Vector2[];
    reinforcementChannel?: {
      width: number;
      height: number;
      position: Vector2;
    };
  }
  
  export class AdvancedProfileGenerator {
    /**
     * Generate realistic multi-chamber profile cross-section
     * 
     * Examples:
     * - 3-chamber: Basic residential (50mm width)
     * - 5-chamber: Standard (70mm width)
     * - 7-chamber: High-performance (80mm width)
     * - 9-chamber: Passive house (90mm width)
     */
    generateProfileShape(spec: AdvancedProfileSpec): Shape {
      const shape = new Shape();
      
      // 1. Outer perimeter
      this.createOuterPerimeter(shape, spec);
      
      // 2. Chamber walls (internal divisions)
      this.createChamberWalls(shape, spec);
      
      // 3. Glass pocket (U-shaped notch)
      this.createGlassPocket(shape, spec);
      
      // 4. Drainage channels
      this.createDrainageChannels(shape, spec);
      
      // 5. Reinforcement channel (for UPVC)
      if (spec.reinforcementChannel) {
        this.createReinforcementChannel(shape, spec);
      }
      
      return shape;
    }
    
    /**
     * Get profile spec from system pack
     */
    getProfileSpecFromSystemPack(systemPackId: string, role: 'frame' | 'sash'): AdvancedProfileSpec {
      const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId);
      if (!systemPack) return this.getDefaultProfileSpec();
      
      const profile = systemPack.windowSystemSpec.aluminum_profiles.find(
        p => p.role === role
      );
      
      if (!profile) return this.getDefaultProfileSpec();
      
      // Parse profile dimensions and create chamber layout
      return this.parseProfileToChambers(profile);
    }
    
    private parseProfileToChambers(profile: any): AdvancedProfileSpec {
      const width = profile.width / 1000; // mm to meters
      const height = profile.height / 1000;
      
      // Determine chamber count based on width
      const chamberCount = width < 0.06 ? 3 : 
                          width < 0.075 ? 5 : 
                          width < 0.085 ? 7 : 9;
      
      // Generate chamber layout
      const chambers = this.generateChamberLayout(width, height, chamberCount);
      
      return {
        outerWidth: width,
        outerHeight: height,
        wallThickness: 0.0015, // 1.5mm standard
        chambers,
        glassPocket: {
          width: width * 0.3,
          depth: height * 0.4,
          position: new Vector2(0, -height * 0.3)
        },
        drainageHoles: this.generateDrainageHoles(width, height),
        reinforcementChannel: profile.material === 'upvc' ? {
          width: width * 0.6,
          height: height * 0.5,
          position: new Vector2(0, 0)
        } : undefined
      };
    }
  }
  ```

- [ ] **Day 3:** Integrate with `windowGeometry.ts`
  ```typescript
  // Update generateProfileCrossSection to use AdvancedProfileGenerator
  export function generateProfileCrossSection(
    profile: Profile,
    systemPackId?: string
  ): ProfileCrossSection {
    const generator = new AdvancedProfileGenerator();
    
    // Get advanced spec from system pack
    const spec = systemPackId 
      ? generator.getProfileSpecFromSystemPack(systemPackId, 'frame')
      : generator.getDefaultProfileSpec();
    
    // Generate realistic shape
    const shape = generator.generateProfileShape(spec);
    
    return {
      shape: shape.getPoints(), // Convert to Vector2[]
      width: spec.outerWidth,
      depth: spec.outerHeight,
      material: profile.material || 'aluminum',
      color: profile.color,
      glassPocket: spec.glassPocket,
      chambers: spec.chambers // NEW: Store chamber data
    };
  }
  ```

- [ ] **Day 4-5:** Test with real system packs
  - KALE 70mm (5-chamber)
  - ASAS CW100 (7-chamber)
  - Validate visual accuracy

**Success Criteria:**
- ✅ Profile cross-sections show realistic chambers
- ✅ Glass pocket visible and accurate
- ✅ Drainage holes rendered
- ✅ Visual accuracy: 85% → 92%

---

#### Week 2: Photorealistic Materials & Textures

**Current Problem:**
```typescript
// Window3DGenerator.tsx - Line 180
// Basic materials - no textures, no realism
const frameMaterial = createMaterial('aluminum', { 
  color,
  metalness: 0.7,
  roughness: 0.25
});
```

**Solution: PBR Materials with Textures**

**Tasks:**
- [ ] **Day 1-2:** Create texture library
  ```typescript
  // src/lib/3d/materials/TextureLibrary.ts
  
  export class TextureLibrary {
    private textureCache: Map<string, Texture> = new Map();
    
    /**
     * Load material textures (color, normal, roughness, metalness)
     */
    async loadMaterialTextures(material: MaterialType): Promise<MaterialTextures> {
      const basePath = '/textures/materials';
      
      const textures = {
        aluminum: {
          color: `${basePath}/aluminum/color.jpg`,
          normal: `${basePath}/aluminum/normal.jpg`,
          roughness: `${basePath}/aluminum/roughness.jpg`,
          metalness: `${basePath}/aluminum/metalness.jpg`,
          ao: `${basePath}/aluminum/ao.jpg`
        },
        upvc: {
          color: `${basePath}/upvc/color.jpg`,
          normal: `${basePath}/upvc/normal.jpg`,
          roughness: `${basePath}/upvc/roughness.jpg`,
          ao: `${basePath}/upvc/ao.jpg`
        },
        wood: {
          color: `${basePath}/wood/color.jpg`,
          normal: `${basePath}/wood/normal.jpg`,
          roughness: `${basePath}/wood/roughness.jpg`,
          ao: `${basePath}/wood/ao.jpg`
        }
      };
      
      return this.loadTextures(textures[material]);
    }
    
    /**
     * Generate procedural textures for materials without images
     */
    generateProceduralTexture(material: MaterialType): Texture {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      if (material === 'aluminum') {
        // Brushed aluminum effect
        this.drawBrushedMetal(ctx);
      } else if (material === 'upvc') {
        // Smooth plastic with slight grain
        this.drawSmoothPlastic(ctx);
      }
      
      const texture = new CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(4, 4);
      
      return texture;
    }
  }
  ```

- [ ] **Day 3:** Enhanced material system
  ```typescript
  // src/lib/3d/materials/EnhancedMaterials.ts
  
  export class EnhancedMaterialSystem {
    private textureLibrary: TextureLibrary;
    
    async createRealisticMaterial(
      type: MaterialType,
      options: MaterialOptions
    ): Promise<MeshStandardMaterial> {
      // Load textures
      const textures = await this.textureLibrary.loadMaterialTextures(type);
      
      const material = new MeshStandardMaterial({
        // Base color
        color: options.color || 0xffffff,
        map: textures.color,
        
        // Surface detail
        normalMap: textures.normal,
        normalScale: new Vector2(0.5, 0.5),
        
        // Roughness (how shiny/matte)
        roughnessMap: textures.roughness,
        roughness: type === 'aluminum' ? 0.3 : 0.6,
        
        // Metalness
        metalnessMap: textures.metalness,
        metalness: type === 'aluminum' ? 0.9 : 0.0,
        
        // Ambient occlusion (shadows in crevices)
        aoMap: textures.ao,
        aoMapIntensity: 1.0,
        
        // Environment reflection
        envMapIntensity: type === 'aluminum' ? 1.5 : 0.3,
        
        // Advanced features
        clearcoat: type === 'upvc' ? 0.3 : 0,
        clearcoatRoughness: 0.4
      });
      
      return material;
    }
  }
  ```

- [ ] **Day 4:** Glass material upgrade
  ```typescript
  // Realistic glass with refraction
  const glassMaterial = new MeshPhysicalMaterial({
    color: glassColor,
    metalness: 0,
    roughness: 0.05,
    
    // Transmission (see-through)
    transmission: 0.95,
    thickness: 0.01,
    
    // Index of refraction (glass = 1.52)
    ior: 1.52,
    
    // Reflections
    reflectivity: 0.5,
    
    // Clearcoat (outer layer)
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    
    // Transparency
    transparent: true,
    opacity: 0.3,
    
    // Environment map
    envMapIntensity: 2.0,
    
    // Double-sided rendering
    side: DoubleSide
  });
  ```

- [ ] **Day 5:** Test and optimize
  - Test on different devices
  - Optimize texture sizes (512x512 for mobile, 1024x1024 for desktop)
  - Implement texture compression

**Success Criteria:**
- ✅ Aluminum looks metallic and brushed
- ✅ UPVC looks smooth and plastic
- ✅ Glass is transparent with refraction
- ✅ Performance: 60fps on mid-range devices
- ✅ Visual quality: 92% → 95%

---

#### Week 3: Realistic Hardware Visualization

**Current Problem:**
```typescript
// hardwarePlaceholder.ts
// Simple colored boxes - NOT REALISTIC
const geometry = new BoxGeometry(0.03, 0.05, 0.02);
```

**Solution: Detailed 3D Hardware Models**

**Tasks:**
- [ ] **Day 1-2:** Create hardware model library
  ```typescript
  // src/lib/3d/hardware/HardwareModelLibrary.ts
  
  export class HardwareModelLibrary {
    private modelCache: Map<string, Group> = new Map();
    
    /**
     * Load or generate hardware 3D model
     */
    async getHardwareModel(type: HardwareType): Promise<Group> {
      if (this.modelCache.has(type)) {
        return this.modelCache.get(type)!.clone();
      }
      
      // Try to load GLTF model first
      try {
        const model = await this.loadGLTFModel(`/models/hardware/${type}.glb`);
        this.modelCache.set(type, model);
        return model.clone();
      } catch {
        // Fallback: generate procedural model
        const model = this.generateProceduralHardware(type);
        this.modelCache.set(type, model);
        return model.clone();
      }
    }
    
    /**
     * Generate realistic hardware models procedurally
     */
    private generateProceduralHardware(type: HardwareType): Group {
      const group = new Group();
      
      switch (type) {
        case 'hinge':
          return this.generateHinge();
        case 'handle':
          return this.generateHandle();
        case 'lock':
          return this.generateLock();
        case 'roller':
          return this.generateRoller();
        default:
          return group;
      }
    }
    
    private generateHinge(): Group {
      const group = new Group();
      
      // Hinge barrel (cylinder)
      const barrelGeometry = new CylinderGeometry(0.008, 0.008, 0.06, 16);
      const barrelMaterial = new MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.2
      });
      const barrel = new Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.z = Math.PI / 2;
      group.add(barrel);
      
      // Hinge plates (2 flat rectangles)
      const plateGeometry = new BoxGeometry(0.04, 0.06, 0.002);
      const plateMaterial = new MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.3
      });
      
      const plate1 = new Mesh(plateGeometry, plateMaterial);
      plate1.position.set(-0.015, 0, 0);
      group.add(plate1);
      
      const plate2 = new Mesh(plateGeometry, plateMaterial);
      plate2.position.set(0.015, 0, 0);
      group.add(plate2);
      
      // Screws (small cylinders)
      const screwGeometry = new CylinderGeometry(0.002, 0.002, 0.003, 8);
      const screwMaterial = new MeshStandardMaterial({
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.4
      });
      
      // 4 screws per plate
      [-0.02, 0.02].forEach(y => {
        [-0.015, 0.015].forEach(x => {
          const screw = new Mesh(screwGeometry, screwMaterial);
          screw.position.set(x, y, 0.002);
          screw.rotation.x = Math.PI / 2;
          group.add(screw);
        });
      });
      
      return group;
    }
    
    private generateHandle(): Group {
      const group = new Group();
      
      // Handle grip (rounded cylinder)
      const gripGeometry = new CylinderGeometry(0.012, 0.012, 0.12, 16);
      const gripMaterial = new MeshStandardMaterial({
        color: 0xc0c0c0,
        metalness: 0.8,
        roughness: 0.3
      });
      const grip = new Mesh(gripGeometry, gripMaterial);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(0.06, 0, 0);
      group.add(grip);
      
      // Handle base (mounting plate)
      const baseGeometry = new BoxGeometry(0.05, 0.08, 0.01);
      const baseMaterial = new MeshStandardMaterial({
        color: 0xa0a0a0,
        metalness: 0.9,
        roughness: 0.2
      });
      const base = new Mesh(baseGeometry, baseMaterial);
      group.add(base);
      
      // Lock cylinder (if lockable)
      const cylinderGeometry = new CylinderGeometry(0.008, 0.008, 0.015, 16);
      const cylinderMaterial = new MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.3
      });
      const cylinder = new Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.rotation.x = Math.PI / 2;
      cylinder.position.set(0, 0, 0.01);
      group.add(cylinder);
      
      return group;
    }
    
    private generateRoller(): Group {
      const group = new Group();
      
      // Roller wheel
      const wheelGeometry = new CylinderGeometry(0.015, 0.015, 0.02, 24);
      const wheelMaterial = new MeshStandardMaterial({
        color: 0x303030,
        metalness: 0.3,
        roughness: 0.7
      });
      const wheel = new Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
      
      // Roller housing
      const housingGeometry = new BoxGeometry(0.04, 0.05, 0.03);
      const housingMaterial = new MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.8,
        roughness: 0.4
      });
      const housing = new Mesh(housingGeometry, housingMaterial);
      housing.position.set(0, 0, 0.02);
      group.add(housing);
      
      return group;
    }
  }
  ```

- [ ] **Day 3:** Integrate with window generator
  ```typescript
  // Update Window3DModel to use realistic hardware
  const hardwareLibrary = new HardwareModelLibrary();
  
  // Replace simple boxes with detailed models
  for (const hw of hardwarePlaceholders) {
    const model = await hardwareLibrary.getHardwareModel(hw.type);
    model.position.copy(hw.position);
    model.rotation.copy(hw.rotation);
    group.add(model);
  }
  ```

- [ ] **Day 4-5:** Hardware placement algorithm
  ```typescript
  // src/lib/3d/hardware/HardwarePlacementEngine.ts
  
  export class HardwarePlacementEngine {
    /**
     * Calculate optimal hardware positions based on:
     * - Window dimensions
     * - Opening mechanism
     * - Building codes (Egyptian Code 2020)
     * - Ergonomics
     */
    calculateHardwarePlacements(
      windowUnit: WindowUnit,
      pattern: EgyptianPattern
    ): HardwarePlacement[] {
      const placements: HardwarePlacement[] = [];
      
      // 1. Hinges (for casement windows)
      if (pattern.openingMechanism?.type === 'casement') {
        placements.push(...this.calculateHingePlacements(windowUnit));
      }
      
      // 2. Handles
      placements.push(...this.calculateHandlePlacements(windowUnit));
      
      // 3. Locks
      placements.push(...this.calculateLockPlacements(windowUnit));
      
      // 4. Rollers (for sliding windows)
      if (pattern.openingMechanism?.type === 'sliding') {
        placements.push(...this.calculateRollerPlacements(windowUnit));
      }
      
      return placements;
    }
    
    private calculateHingePlacements(windowUnit: WindowUnit): HardwarePlacement[] {
      const placements: HardwarePlacement[] = [];
      const height = windowUnit.overallHeight / 1000;
      
      // Egyptian Code 2020: Hinges at 150mm from top/bottom
      const topHingeY = height / 2 - 0.15;
      const bottomHingeY = -height / 2 + 0.15;
      
      // Add middle hinge if height > 1.5m
      if (height > 1.5) {
        placements.push({
          type: 'hinge',
          position: new Vector3(0, 0, 0),
          rotation: new Euler(0, 0, 0)
        });
      }
      
      placements.push(
        {
          type: 'hinge',
          position: new Vector3(0, topHingeY, 0),
          rotation: new Euler(0, 0, 0)
        },
        {
          type: 'hinge',
          position: new Vector3(0, bottomHingeY, 0),
          rotation: new Euler(0, 0, 0)
        }
      );
      
      return placements;
    }
    
    private calculateHandlePlacements(windowUnit: WindowUnit): HardwarePlacement[] {
      const height = windowUnit.overallHeight / 1000;
      
      // Ergonomic handle height: 1.1m from bottom (Egyptian standard)
      const handleY = -height / 2 + 1.1;
      
      return [{
        type: 'handle',
        position: new Vector3(0, handleY, 0.02),
        rotation: new Euler(0, 0, 0)
      }];
    }
  }
  ```

**Success Criteria:**
- ✅ Hardware looks realistic (not boxes)
- ✅ Hardware positioned according to Egyptian Code 2020
- ✅ Hinges, handles, locks, rollers all detailed
- ✅ Visual quality: 95% → 97%

---

### Phase 2: Advanced Features (Weeks 4-6)

#### Week 4: Opening Mechanism Simulation

**Current Problem:**
- Animation works but pivot points not accurate
- No physics simulation
- Opening paths not realistic

**Solution: Accurate Kinematic Simulation**

**Tasks:**
- [ ] **Day 1-2:** Kinematic engine
  ```typescript
  // src/lib/3d/kinematics/OpeningKinematicsEngine.ts
  
  export class OpeningKinematicsEngine {
    /**
     * Calculate accurate opening path for casement windows
     * Based on hinge positions and sash dimensions
     */
    calculateCasementPath(
      sash: SashData,
      hinges: HardwarePlacement[],
      openAngle: number // 0 to 90 degrees
    ): {
      position: Vector3;
      rotation: Euler;
    } {
      // Find hinge line (pivot axis)
      const hingeLine = this.calculateHingeLine(hinges);
      
      // Calculate rotation around hinge line
      const rotation = new Euler(0, openAngle * Math.PI / 180, 0);
      
      // Calculate position (sash center moves as it rotates)
      const sashCenter = sash.openingPath.position;
      const pivotPoint = hingeLine.center;
      
      // Rotate sash center around pivot
      const relativePos = sashCenter.clone().sub(pivotPoint);
      relativePos.applyEuler(rotation);
      const newPosition = pivotPoint.clone().add(relativePos);
      
      return { position: newPosition, rotation };
    }
    
    /**
     * Calculate sliding path with track constraints
     */
    calculateSlidingPath(
      sash: SashData,
      track: TrackData,
      slideDistance: number // 0 to max
    ): {
      position: Vector3;
      rotation: Euler;
    } {
      // Sliding is linear along track direction
      const direction = track.direction.clone().normalize();
      const offset = direction.multiplyScalar(slideDistance);
      
      return {
        position: sash.openingPath.position.clone().add(offset),
        rotation: sash.openingPath.rotation.clone()
      };
    }
    
    /**
     * Calculate tilt-turn path (complex 2-axis movement)
     */
    calculateTiltTurnPath(
      sash: SashData,
      mode: 'tilt' | 'turn',
      angle: number
    ): {
      position: Vector3;
      rotation: Euler;
    } {
      if (mode === 'tilt') {
        // Tilt: rotate around bottom edge (X-axis)
        return {
          position: sash.openingPath.position,
          rotation: new Euler(angle * Math.PI / 180, 0, 0)
        };
      } else {
        // Turn: rotate around side edge (Y-axis) - like casement
        return this.calculateCasementPath(sash, [], angle);
      }
    }
  }
  ```

- [ ] **Day 3:** Collision detection
  ```typescript
  // Detect if sash collides with frame or other sashes
  export class CollisionDetector {
    detectCollisions(
      sash: SashData,
      frame: FrameGeometry,
      otherSashes: SashData[]
    ): Collision[] {
      const collisions: Collision[] = [];
      
      // Check frame collision
      if (this.checkFrameCollision(sash, frame)) {
        collisions.push({
          type: 'frame',
          severity: 'critical',
          message: 'Sash collides with frame'
        });
      }
      
      // Check other sashes
      for (const other of otherSashes) {
        if (this.checkSashCollision(sash, other)) {
          collisions.push({
            type: 'sash',
            severity: 'warning',
            message: 'Sash collides with another sash'
          });
        }
      }
      
      return collisions;
    }
  }
  ```

- [ ] **Day 4-5:** Smooth animation curves
  ```typescript
  // Use easing functions for natural movement
  export function easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // Apply to animation
  const easedProgress = easeInOutCubic(animationProgress);
  const path = kinematicsEngine.calculateCasementPath(sash, hinges, easedProgress * 90);
  ```

**Success Criteria:**
- ✅ Casement windows rotate around actual hinge positions
- ✅ Sliding windows follow track accurately
- ✅ No collisions during animation
- ✅ Smooth, natural movement
- ✅ Visual accuracy: 97% → 98%

---

#### Week 5: SmartDrawCanvas UX Enhancement

**Current Problem:**
- Grid drawing works but UX could be smoother
- Preset suggestions good but could be better
- Mullion tools functional but not intuitive

**Solution: Professional Drawing Experience**

**Tasks:**
- [ ] **Day 1:** Drag-to-draw grid cells
  ```typescript
  // Add drag selection for faster grid creation
  const [dragStart, setDragStart] = useState<{row: number, col: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{row: number, col: number} | null>(null);
  
  const handleCellMouseDown = (row: number, col: number) => {
    setDragStart({row, col});
    setDragEnd({row, col});
  };
  
  const handleCellMouseEnter = (row: number, col: number) => {
    if (dragStart) {
      setDragEnd({row, col});
    }
  };
  
  const handleCellMouseUp = () => {
    if (dragStart && dragEnd) {
      // Apply cell type to all cells in rectangle
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);
      
      const newCells = grid.cells.map(cell => {
        if (cell.row >= minRow && cell.row <= maxRow &&
            cell.col >= minCol && cell.col <= maxCol) {
          return { ...cell, type: selectedCellType };
        }
        return cell;
      });
      
      onGridChange({ ...grid, cells: newCells });
    }
    setDragStart(null);
    setDragEnd(null);
  };
  ```

- [ ] **Day 2:** Visual mullion placement
  ```typescript
  // Click-to-place mullions instead of typing positions
  const [mullionPlacementMode, setMullionPlacementMode] = useState(false);
  
  const handleCanvasClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!mullionPlacementMode) return;
    
    // Get click
