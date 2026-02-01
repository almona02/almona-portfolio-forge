
import type { Rectangle } from '../types/drafting';
import type { HardwarePlacement } from '../types/materialAware';

export class HardwareLogic {
  
  /**
   * Calculates standard hardware placement for Egyptian market
   * @param rect The window/door sash rectangle
   * @param type Opening type (casement, sliding, etc)
   */
  public static calculateHardware(rect: Rectangle, type: string): HardwarePlacement[] {
      const hardware: HardwarePlacement[] = [];
      const height = rect.height;
      const width = rect.width;

      // 1. Handles
      // Standard Egyptian Handle Height: 1050mm - 1100mm from FFL (Finished Floor Level)
      // Since we don't know FFL offset, we assume relative to bottom if door, or center if window.
      
      const isDoor = height > 1900;
      const handleY = isDoor ? height - 1100 : height / 2; // Door: 1100 from bottom. Window: Center.

      // Determine handle side (usually opposite to hinge side)
      // Assuming standard right-hand opening for now (handle on left)
      const handleX = 40; // 40mm from edge

      hardware.push({
          id: `handle-${Date.now()}`,
          type: 'handle',
          position: { x: handleX, y: handleY },
          orientation: 'vertical',
          specifications: {
              model: isDoor ? 'D-Handle-Standard' : 'W-Handle-Standard',
              egyptianStandard: true,
              positionFromBottom: isDoor ? 1100 : undefined
          }
      });

      // 2. Hinges (Casement Only)
      if (type.includes('casement') || type === 'turn_tilt') {
         // Hinge Side is Right (width - offset)
         const hingeX = width - 10;
         
         // Top Hinge
         hardware.push(this.createHinge(hingeX, 150));
         
         // Bottom Hinge
         hardware.push(this.createHinge(hingeX, height - 150));
         
         // Middle Hinge (if tall)
         if (height > 1200) {
             hardware.push(this.createHinge(hingeX, height / 2));
         }
         
         // Extra Top Hinge (if heavy/wide)
         if (width > 900 || height > 2200) {
             hardware.push(this.createHinge(hingeX, 350));
         }
      }

      return hardware;
  }

  private static createHinge(x: number, y: number): HardwarePlacement {
      return {
          id: `hinge-${Math.random()}`,
          type: 'hinge',
          position: { x, y },
          orientation: 'vertical',
          specifications: {
              model: 'Standard-Hinge',
              egyptianStandard: true
          }
      };
  }
}
