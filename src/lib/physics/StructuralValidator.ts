/**
 * StructuralValidator.ts
 * Physics engine for calculating moment of inertia (Ix) requirements based on wind load.
 * Reference Standards: Eurocode 1 (EN 1991-1-4) & BS 6399
 */

export interface WindLoadParams {
    windPressure: number; // Pascals (Pa), e.g., 1200 Pa for high-rise
    mullionSpacing: number; // mm
    mullionHeight: number; // mm
    maxDeflectionRatio: number; // e.g., 200 (L/200) or 300 (L/300)
    elasticModulus: number; // MPa (E), e.g., 70000 for Aluminum
}

export interface StructuralResult {
    requiredIx: number; // cm4
    actualIx: number;
    deflection: number; // mm
    maxAllowedDeflection: number; // mm
    utilization: number; // % (actual/required)
    isSafe: boolean;
    safetyFactor: number;
}

export class StructuralValidator {
    /**
     * Calculates the Required Moment of Inertia (Ix) for a mullion.
     * Formula: Ix = (5 * w * L^4) / (384 * E * maxDelta)
     * Simplified for uniform load on single span.
     */
    static calculateRequiredInertia(params: WindLoadParams): number {
        const { windPressure, mullionSpacing, mullionHeight, maxDeflectionRatio, elasticModulus } = params;

        // Convert units to consistent set (Newtons, mm)
        // Wind Pressure (Pa) = N/m2 -> N/mm2 = Pa / 1,000,000
        const q_N_mm2 = windPressure / 1_000_000;
        
        // Linear Load (w) in N/mm
        // w = q * spacing
        const w = q_N_mm2 * mullionSpacing;

        // Max Allowed Deflection (delta)
        const maxDelta = mullionHeight / maxDeflectionRatio;

        // E in MPa = N/mm2 (Direct usage)
        
        // Beam Formula (Simply Supported Uniform Load): delta = (5 * w * L^4) / (384 * E * I)
        // Rearranging for I: I = (5 * w * L^4) / (384 * E * delta)
        
        const numerator = 5 * w * Math.pow(mullionHeight, 4);
        const denominator = 384 * elasticModulus * maxDelta;

        const I_mm4 = numerator / denominator;
        
        // Convert to cm4 (standard industry unit)
        // 1 cm4 = 10,000 mm4
        const I_cm4 = I_mm4 / 10_000;

        return parseFloat(I_cm4.toFixed(2));
    }

    /**
     * Validates a specific profile against wind load parameters.
     */
    static validateProfile(profileIx: number, params: WindLoadParams): StructuralResult {
        const requiredIx = this.calculateRequiredInertia(params);
        const safetyFactor = profileIx / requiredIx;
        const isSafe = safetyFactor >= 1.0;
        
        // Back-calculate actual deflection
        // delta_actual = delta_max * (I_required / I_actual)
        const maxDelta = params.mullionHeight / params.maxDeflectionRatio;
        const actualDeflection = maxDelta / safetyFactor;

        return {
            requiredIx,
            actualIx: profileIx,
            deflection: parseFloat(actualDeflection.toFixed(2)),
            maxAllowedDeflection: parseFloat(maxDelta.toFixed(2)),
            utilization: parseFloat(((requiredIx / profileIx) * 100).toFixed(1)), // % of capacity used
            isSafe,
            safetyFactor: parseFloat(safetyFactor.toFixed(2))
        };
    }
}
