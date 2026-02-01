/**
 * ThermalEngine.ts
 * Physics engine for calculating Window U-Values (Uw) based on ISO 10077-1.
 * Essential for Green Building / LEED certifications.
 */

export interface ThermalParams {
    Ag: number; // Area of Glass (m2)
    Af: number; // Area of Frame (m2)
    Ug: number; // U-value of Glass (W/m2K)
    Uf: number; // U-value of Frame (W/m2K)
    Lg: number; // Perimeter of Glass (m) (Linear thermal bridge)
    Psi: number; // Psi-value of spacer (W/mK)
}

export class ThermalEngine {
    /**
     * Calculates the overall Window U-Value (Uw).
     * Formula: Uw = (Ag*Ug + Af*Uf + Lg*Psi) / (Ag + Af)
     */
    static calculateUw(params: ThermalParams): number {
        const { Ag, Af, Ug, Uf, Lg, Psi } = params;
        
        const totalArea = Ag + Af;
        if (totalArea <= 0) return 0;

        const heatTransfer_Glass = Ag * Ug;
        const heatTransfer_Frame = Af * Uf;
        const heatTransfer_Edge = Lg * Psi;

        const totalHeatTransfer = heatTransfer_Glass + heatTransfer_Frame + heatTransfer_Edge;
        
        const Uw = totalHeatTransfer / totalArea;

        return parseFloat(Uw.toFixed(2));
    }

    /**
     * Helper to estimate params from a Grid definition if exact geometry isn't meshed.
     * (Simplified estimation for quick quoting)
     */
    static estimateFromDimensions(widthMm: number, heightMm: number, frameFaceWidthMm: number): { Ag: number, Af: number, Lg: number } {
        const w = widthMm / 1000; // m
        const h = heightMm / 1000; // m
        const f = frameFaceWidthMm / 1000; // m

        const totalArea = w * h;
        
        // Approximate Frame Area (Top + Bottom + Left + Right) - Overlap
        // Af ~= 2*w*f + 2*h*f - 4*f^2
        const Af = (2 * w * f) + (2 * h * f) - (4 * f * f);
        
        const Ag = totalArea - Af;
        
        // Glass Perimeter
        // Lg = 2*(w-2f) + 2*(h-2f)
        const Lg = 2 * (w - 2 * f) + 2 * (h - 2 * f);

        return {
            Ag: parseFloat(Ag.toFixed(2)),
            Af: parseFloat(Af.toFixed(2)),
            Lg: parseFloat(Lg.toFixed(2))
        };
    }
}
