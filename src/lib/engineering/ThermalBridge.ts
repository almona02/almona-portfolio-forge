import { FacadeModel } from '@/types/fabricator';

export interface ThermalAnalysisResult {
    overallUValue: number; // W/m2K
    glassUValue: number;
    frameUValue: number;
    psiValue: number; // Linear thermal transmittance
    glassArea: number;
    frameArea: number;
    totalArea: number;
    heatLoss: number; // Watts at 20K delta
    classification: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

/**
 * Thermal Analysis Bridge
 * 
 * Provides quick U-value estimation for Fenestration units.
 * Critical for "Gold Tier" engineering features.
 */
export class ThermalBridge {

    /**
     * Calculates U_w (Window U-value) according to ISO 10077-1 simplified method.
     * Formula: U_w = (Ag*Ug + Af*Uf + Lg*Psi) / (Ag + Af)
     * 
     * @param facadeModel Simple geometry model
     * @param glassUTarget Target U-value for glass (default 1.1 double glazed)
     * @param frameUTarget Target U-value for frame (default 2.4 aluminum thermal break)
     */
    static calculateUValue(
        facadeModel: FacadeModel, 
        glassUTarget: number = 1.1, 
        frameUTarget: number = 2.4
    ): ThermalAnalysisResult {
        // 1. Calculate Areas
        const totalArea = facadeModel.totalArea; // m2
        // Heuristic: Frame area is typically 15-25% of curtain wall
        // For accurate calculation, we would sum member lengths * widths
        let frameArea = 0;
        let perimeterGasketLength = 0; // Lg

        facadeModel.members.forEach(m => {
            // member.length is in mm -> convert to m
            // Width assumption: 50mm (0.05m) for standard mullion
            const lengthM = m.length / 1000;
            const widthM = 0.05; 
            frameArea += lengthM * widthM;
        });

        // Deduplicate frame area (intersections) - simplified factor 0.9
        frameArea = frameArea * 0.9;
        
        // Clamp frame area to logical bounds
        if (frameArea > totalArea) frameArea = totalArea * 0.3;

        const glassArea = Math.max(0, totalArea - frameArea);

        // Psi value (Linear thermal transmittance of spacer) appropriate for Aluminum
        const psiValue = 0.06; // W/mK (Warm edge spacer)

        // Glass Perimeter (approximate from panels)
        facadeModel.panels.forEach(p => {
            // P = 2(w+h)
            perimeterGasketLength += 2 * ((p.width + p.height) / 1000);
        });

        // Calculate Uw
        // (Ag*Ug + Af*Uf + Lg*Psi)
        const heatTransferGlass = glassArea * glassUTarget;
        const heatTransferFrame = frameArea * frameUTarget;
        const heatTransferEdge = perimeterGasketLength * psiValue;

        const totalHeatTransferCoefficient = heatTransferGlass + heatTransferFrame + heatTransferEdge;
        
        const Uw = totalHeatTransferCoefficient / totalArea;

        // Classification (Egyptian Energy Code / European scale rough approximation)
        let classification: ThermalAnalysisResult['classification'] = 'F';
        if (Uw <= 0.8) classification = 'A+';
        else if (Uw <= 1.0) classification = 'A';
        else if (Uw <= 1.3) classification = 'B';
        else if (Uw <= 1.6) classification = 'C';
        else if (Uw <= 2.0) classification = 'D';
        else if (Uw <= 2.5) classification = 'E';

        return {
            overallUValue: Number(Uw.toFixed(2)),
            glassUValue: glassUTarget,
            frameUValue: frameUTarget,
            psiValue,
            glassArea: Number(glassArea.toFixed(2)),
            frameArea: Number(frameArea.toFixed(2)),
            totalArea: Number(totalArea.toFixed(2)),
            heatLoss: Number((Uw * totalArea * 20).toFixed(1)), // 20 degree delta T
            classification
        };
    }
}
