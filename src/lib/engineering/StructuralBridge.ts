import { StructuralElement, StructuralLoad, StructuralMaterial, StructuralModel, StructuralNode, StructuralSection } from '@/types/engineering';
import { FacadeModel } from '@/types/fabricator';

/**
 * Structural Analysis Bridge
 * 
 * Converts visual FacadeModels into engineering StructuralModels (FEM).
 * Handles node deduplication, connectivity, and load application.
 */
export class StructuralBridge {
  
  /**
   * Converts a FacadeModel to a StructuralModel ready for analysis
   * @param facadeModel The visual facade model
   * @param windPressurePa Design wind pressure in Pascals (N/m2), default 1000 Pa (1 kPa)
   */
  static convertToStructural(facadeModel: FacadeModel, windPressurePa: number = 1000): StructuralModel {
    const nodes: StructuralNode[] = [];
    const elements: StructuralElement[] = [];
    const sections: StructuralSection[] = [];
    const materials: StructuralMaterial[] = [];
    const loads: StructuralLoad[] = [];

    // Helper to find or add a node
    // Uses a string key "x,y,z" for spatial hashing (tolerance 1mm)
    const nodeMap = new Map<string, string>(); // key -> nodeId
    let nextNodeId = 1;

    const getOrCreateNode = (x: number, y: number, z: number): string => {
      // Round to nearest mm to handle floating point tolerance
      const kx = Math.round(x);
      const ky = Math.round(y);
      const kz = Math.round(z);
      const key = `${kx},${ky},${kz}`;

      if (nodeMap.has(key)) {
        return nodeMap.get(key)!;
      }

      const id = `N${nextNodeId++}`;
      nodes.push({ id, x: kx, y: ky, z: kz });
      nodeMap.set(key, id);
      return id;
    };

    // 1. Generate Materials & Sections (Mock data for now, ideally comes from Profile DB)
    const defaultMaterial: StructuralMaterial = {
      id: 'MAT_ALU_6063',
      name: 'Aluminum 6063-T6',
      E: 70000, // MPa
      fy: 160,  // MPa
      density: 2700 // kg/m3
    };
    materials.push(defaultMaterial);

    const sectionMap = new Map<string, string>(); // profileId -> sectionId

    // 2. Process Members into Elements and Nodes
    facadeModel.members.forEach((member, index) => {
      // Calculate start and end points
      // NOTE: This assumes members are axis-aligned for simplicity of Phase 1
      // A more robust math library would handle arbitrary 3D rotation
        
      const halfL = member.length / 2;
      let start: {x: number, y: number, z: number};
      let end: {x: number, y: number, z: number};

      // Determine orientation based on type (simple heuristic)
      // Vertical (Mullion) or Horizontal (Transom)
      // Real rotation check: member.rotation
      
      const isVertical = member.type === 'mullion';

      if (isVertical) {
        start = { x: member.position.x, y: member.position.y - halfL, z: member.position.z };
        end =   { x: member.position.x, y: member.position.y + halfL, z: member.position.z };
      } else {
        start = { x: member.position.x - halfL, y: member.position.y, z: member.position.z };
        end =   { x: member.position.x + halfL, y: member.position.y, z: member.position.z };
      }

      const startNodeId = getOrCreateNode(start.x, start.y, start.z);
      const endNodeId = getOrCreateNode(end.x, end.y, end.z);

      // Create Section if new
      if (!sectionMap.has(member.profileId)) {
        const secId = `SEC_${member.profileId}`;
        sections.push({
          id: secId,
          name: member.profileId,
          area: 500, // Placeholder mm2
          ix: 100000, // Placeholder mm4
          iy: 20000,  // Placeholder mm4
          materialId: defaultMaterial.id
        });
        sectionMap.set(member.profileId, secId);
      }

      const structElem: StructuralElement = {
        id: `E${index + 1}`,
        type: 'beam',
        startNodeId,
        endNodeId,
        sectionId: sectionMap.get(member.profileId)!,
        rotation: isVertical ? 0 : 90 
      };
      elements.push(structElem);

      // 3. Apply Wind Load
      // Distributed load on the element
      // Tributary width approximation: For mullions, it's roughly the spacing.
      // Logic: If member is mullion, apply load. Transoms usually take dead load (glass weight).
      // For Phase 1 simplification: Apply horizontal load to verticals.
      if (isVertical) {
        // Find tributary width. 
        // Heuristic: spacing in facades is typically uniform-ish.
        // We'll estimate from the model specs if available, or just use 1.0m (1000mm) default
        // In a real engine, we'd query adjacent panels.
        const tributaryWidthMm = 1000; 
        
        // Load (N/mm) = Pressure (MPa) * Width (mm)
        // 1000 Pa = 0.001 MPa
        // Load = 0.001 * 1000 = 1 N/mm
        const pressureMPa = windPressurePa / 1_000_000;
        const lineLoadNmm = pressureMPa * tributaryWidthMm;

        loads.push({
          id: `L_WIND_${index}`,
          type: 'distributed',
          elementId: structElem.id,
          magnitude: lineLoadNmm, // N/mm
          direction: 'y' // Local axis Y (perpendicular to surface usually) - simplified
        });
      }
    });

    // 4. Apply Supports (Restraints)
    // Heuristic: Bottom nodes (min Y) are pinned/fixed.
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y)); // Maybe top nodes differ

    nodes.forEach(node => {
      if (Math.abs(node.y - minY) < 5) { // Within 5mm of bottom
        // Pinned Support (Fixed X, Y, Z, Free Rotation) -> [1,1,1, 0,0,0]
        node.restraints = [1, 1, 1, 0, 0, 0];
      }
      else if (Math.abs(node.y - maxY) < 5) {
        // Vertical Slip Support (Fixed X, Z, Free Y) -> [1,0,1, 0,0,0]
        // Often curtain walls hang or sit. Assuming dead load stacking -> Sit.
        // Top might be guide.
        node.restraints = [1, 0, 1, 0, 0, 0];
      }
    });

    return {
      projectId: facadeModel.id,
      version: '1.0',
      units: 'mm',
      nodes,
      materials,
      sections,
      elements,
      loads
    };
  }
}
