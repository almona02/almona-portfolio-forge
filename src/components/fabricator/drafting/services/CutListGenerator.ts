
import type { Rectangle } from '../types/drafting';
import { ProfileRegistry } from './ProfileRegistry';

export interface CutItem {
  profileName: string; // e.g., "Frame Profile", "Sash Profile"
  profileCode: string; // e.g., "M9660-101"
  lengthMm: number;
  quantity: number;
  angles: {
    left: number; // e.g. 45 or 90
    right: number; // e.g. 45 or 90
  };
  type: 'frame' | 'sash' | 'bead' | 'interlock';
  description?: string;
}

export class CutListGenerator {

  /**
   * Generates a flat list of cut items for the fabrication shop.
   */
  public static generate(rectangles: Rectangle[], systemId: string): CutItem[] {
    const specs = ProfileRegistry.getInstance().getSpecs(systemId);
    if (!specs) return [];

    const cuts: CutItem[] = [];
    const isMiter = specs.cornerConnection === 'miter' || specs.cornerConnection === 'corner_key'; // Aluminum usually miters
    
    // Alumil/PS codes (Mock)
    const codes = {
      frame: systemId.includes('alumil') ? 'M11000' : 'PS9600-F',
      sash: systemId.includes('alumil') ? 'M11200' : 'PS9600-S',
      bead: systemId.includes('alumil') ? 'M200' : 'PS-B1',
    };

    rectangles.forEach(rect => {
      // 1. Fixed Frames (Outer Box)
      // Usually measuring Outer-to-Outer
      // If mitered (45 deg), the cut length is equal to the outer dimension
      
      // Horizontal Frames (Top/Bottom)
      cuts.push({
        profileName: 'Frame Horizontal',
        profileCode: codes.frame,
        lengthMm: rect.width,
        quantity: 2, 
        angles: { left: isMiter ? 45 : 90, right: isMiter ? 45 : 90 },
        type: 'frame'
      });

      // Vertical Frames (Left/Right)
      cuts.push({
        profileName: 'Frame Vertical',
        profileCode: codes.frame,
        lengthMm: rect.height,
        quantity: 2,
        angles: { left: isMiter ? 45 : 90, right: isMiter ? 45 : 90 },
        type: 'frame'
      });

      // 2. Openable Sashes
      if (rect.type && rect.type !== 'fixed') {
        // Deduction logic
        // For standard Casement: Sash Outer = Frame Outer - (FrameDepth * 2) + Overlap
        // Simplified Tier 3 Logic: Deduct fixed clearance
        // Egyptian Market Rule of Thumb: Sash = Frame - 50mm (approx)
        const frameClearance = 50; 
        const sashW = rect.width - frameClearance;
        const sashH = rect.height - frameClearance;

        // Sash Horizontal
        cuts.push({
          profileName: 'Sash Horizontal',
          profileCode: codes.sash,
          lengthMm: sashW,
          quantity: 2,
          angles: { left: 45, right: 45 }, // Sashes are almost always mitered
          type: 'sash'
        });

        // Sash Vertical
        cuts.push({
          profileName: 'Sash Vertical',
          profileCode: codes.sash,
          lengthMm: sashH,
          quantity: 2,
          angles: { left: 45, right: 45 },
          type: 'sash'
        });

        // 3. Glazing Beads (Sash)
        // Bead = Sash - (SashProfileWidth * 2)
        const sashProfileWidth = 70; // approx
        cuts.push({
          profileName: 'Glazing Bead Horz',
          profileCode: codes.bead,
          lengthMm: sashW - (sashProfileWidth * 2),
          quantity: 2,
          angles: { left: 90, right: 90 }, // Usually straight cut and snapped in
          type: 'bead'
        });
        
         cuts.push({
          profileName: 'Glazing Bead Vert',
          profileCode: codes.bead,
          lengthMm: sashH - (sashProfileWidth * 2),
          quantity: 2,
          angles: { left: 90, right: 90 },
          type: 'bead'
        });
      } else {
        // Fixed Glazing Beads (Frame)
        const frameFace = 50;
        cuts.push({
          profileName: 'Glazing Bead Horz',
          profileCode: codes.bead,
          lengthMm: rect.width - (frameFace * 2),
          quantity: 2,
          angles: { left: 90, right: 90 },
          type: 'bead'
        });
        cuts.push({
          profileName: 'Glazing Bead Vert',
          profileCode: codes.bead,
          lengthMm: rect.height - (frameFace * 2),
          quantity: 2,
          angles: { left: 90, right: 90 },
          type: 'bead'
        });
      }
    });

    return cuts;
  }
}
