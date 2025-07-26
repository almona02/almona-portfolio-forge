import { useThree } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { useState } from 'react';
import { getEquipmentRecommendation } from '@/lib/ai/gemini';

// Default Egyptian workshop dimensions (10m x 15m)
const EGYPTIAN_WORKSHOP_DIMENSIONS = {
  width: 10,
  length: 15,
  minCeilingHeight: 2.5, // meters
  powerOptions: ['220V', '380V']
};

interface MachineRequirements {
  id: string;
  minWidth: number;
  minLength: number;
  minHeight: number;
  powerRequired: string;
  clearance: number;
}

export const WorkshopARView = ({ machine }: { machine: MachineRequirements }) => {
  const { scene } = useThree();
  const [warnings, setWarnings] = useState<string[]>([]);

  const analyzeSpace = async () => {
    const analysisResults: string[] = [];
    
    // Check machine dimensions against workshop
    if (machine.minWidth > EGYPTIAN_WORKSHOP_DIMENSIONS.width) {
      analysisResults.push(`Machine too wide (needs ${machine.minWidth}m, workshop is ${EGYPTIAN_WORKSHOP_DIMENSIONS.width}m)`);
    }
    if (machine.minLength > EGYPTIAN_WORKSHOP_DIMENSIONS.length) {
      analysisResults.push(`Machine too long (needs ${machine.minLength}m, workshop is ${EGYPTIAN_WORKSHOP_DIMENSIONS.length}m)`);
    }
    if (machine.minHeight > EGYPTIAN_WORKSHOP_DIMENSIONS.minCeilingHeight) {
      analysisResults.push(`Machine too tall (needs ${machine.minHeight}m clearance)`);
    }

    // Check power requirements
    if (!EGYPTIAN_WORKSHOP_DIMENSIONS.powerOptions.includes(machine.powerRequired)) {
      analysisResults.push(`Warning: This machine requires ${machine.powerRequired} power (not standard in Cairo)`);
    }

    // AI-powered analysis
    const prompt = `Check if machine ${machine.id} fits in Egyptian workshop:
- Machine dimensions: ${machine.minWidth}x${machine.minLength}x${machine.minHeight}m
- Required power: ${machine.powerRequired}
- Workshop size: ${EGYPTIAN_WORKSHOP_DIMENSIONS.width}x${EGYPTIAN_WORKSHOP_DIMENSIONS.length}m
- Power options: ${EGYPTIAN_WORKSHOP_DIMENSIONS.powerOptions.join(', ')}`;

    const aiAnalysis = await getEquipmentRecommendation(prompt);
    if (aiAnalysis) analysisResults.push(aiAnalysis);

    setWarnings(analysisResults);
  };

  return (
    <XR onSessionStart={analyzeSpace}>
      {warnings.length > 0 && (
        <div className="ar-warnings">
          {warnings.map((warning, i) => (
            <div key={i} className="warning-item">⚠️ {warning}</div>
          ))}
        </div>
      )}
    </XR>
  );
};
