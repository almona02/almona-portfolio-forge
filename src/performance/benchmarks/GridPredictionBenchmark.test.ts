
import { DEFAULT_GRID } from '@/components/fabricator/measuringConstants';
import { EGYPTIAN_GRID_STANDARDS } from '@/data/egyptianGridStandards';
import { WindowGrid } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';

// Isolated Logic extracted from useEgyptianPredictiveGrid for pure benchmarking
// This allows us to test the performance of the algorithm without React hook overhead
const calculateGrid = (width: number, height: number, windowType: string, isGridLocked: boolean) => {
    if (isGridLocked) return null;
    if (!width || !height || width <= 0 || height <= 0) return null;

    const typeLower = windowType.toLowerCase();
    
    // Default to existing grid structure or baseline
    let cols: number = DEFAULT_GRID.DEFAULT_COLS;
    const rows: number = DEFAULT_GRID.DEFAULT_ROWS;
    
    // Logic: Sliding
    if (typeLower.includes('sliding')) {
        if (width <= EGYPTIAN_GRID_STANDARDS.SLIDING.THRESHOLDS.TWO_PANEL_LIMIT) {
            cols = 2;
        } else if (width <= EGYPTIAN_GRID_STANDARDS.SLIDING.THRESHOLDS.THREE_PANEL_LIMIT) {
            cols = 3; 
        } else {
            cols = 4;
        }
    } 
    // Logic: Casement/Turn
    else if (typeLower.includes('casement') || typeLower.includes('turn')) {
        if (width <= EGYPTIAN_GRID_STANDARDS.CASEMENT.THRESHOLDS.SINGLE_SASH_LIMIT) {
             cols = 1;
        } else {
            cols = 2; // French window
        }
    }
    
    // Construct the new grid object
    let colWidths = Array(cols).fill(1); // Default symmetric (1:1...)

    // Apply Specific Symmetry Rules (Phase 3 Option A)
    if (typeLower.includes('sliding') && cols === 3) {
        // Create a new array spread from the standard to avoid mutation issues in loops
        colWidths = [...EGYPTIAN_GRID_STANDARDS.SLIDING.RATIOS.THREE_PANEL_SYMMETRIC]; 
    }

    const newGrid: WindowGrid = {
        rows,
        cols,
        cells: [], 
        colWidths, 
        rowHeights: Array(rows).fill(1)
    };

    // Simulate cell generation 
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            newGrid.cells.push({
                id: `p-${r}-${c}`,
                row: r,
                col: c,
                type: typeLower.includes('sliding') ? 'sliding' : 'sash'
            });
        }
    }

    return newGrid;
};

describe('Grid Logic Performance', () => {
    it('should execute grid calculation under 100ms', () => {
        const start = performance.now();
        
        // Run 1000 iterations to get a stable measurement
        for (let i = 0; i < 1000; i++) {
            calculateGrid(2400, 2000, 'Sliding Window', false);
            calculateGrid(900, 1200, 'Casement Window', false);
            calculateGrid(3600, 2400, 'Sliding Window', false);
        }
        
        const end = performance.now();
        const totalDuration = end - start;
        const averagePerCall = totalDuration / 3000; // 3 calls per iteration * 1000 iterations

        console.log(`Total duration for 3000 calculations: ${totalDuration.toFixed(2)}ms`);
        console.log(`Average calculation time: ${averagePerCall.toFixed(4)}ms`);

        expect(averagePerCall).toBeLessThan(0.1); // Expect < 0.1ms per call (well under 100ms target)
    });
});
