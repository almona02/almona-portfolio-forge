/**
 * Hardware Merging Utilities
 * 
 * Provides utilities for merging hardware arrays from different sources,
 * avoiding duplicates and properly aggregating quantities.
 * 
 * @since Phase 2: Engineering Bay Enhancements
 */

/**
 * Merges multiple hardware arrays, avoiding duplicates and aggregating quantities
 * 
 * @param hardwareArrays - Array of hardware arrays to merge
 * @returns Merged hardware array with aggregated quantities
 */
export function mergeHardwareArrays(...hardwareArrays: any[][]): any[] {
  const hardwareMap = new Map<string, any>();
  
  hardwareArrays.forEach(hardwareArray => {
    hardwareArray.forEach(hw => {
      const key = hw.id || `${hw.type}-${hw.name}`;
      const existing = hardwareMap.get(key);
      
      if (existing) {
        // Merge quantities if same type
        hardwareMap.set(key, {
          ...existing,
          quantity: (existing.quantity || 0) + (hw.quantity || 0),
        });
      } else {
        hardwareMap.set(key, hw);
      }
    });
  });
  
  return Array.from(hardwareMap.values());
}

