import { getEquipmentRecommendation, identifyPartFromImage as geminiIdentifyPart } from './gemini';
import { EGYPTIAN_MARKET_CONTEXT } from './gemini';
import { validateAIEnv } from './config';

interface PartIdentificationResult {
  partInfo: string;
  localSuppliers: Array<{
    name: string;
    location: string;
  }>;
  priceRange: {
    genuine: string;
    local: string;
  };
}

const SPARE_PARTS_CONTEXT = `
Spare Parts Considerations:
- Common YILMAZ machine models: DK-502, KM-212, FR-221-S
- Egyptian terminology mappings:
  - "مسامير" → "Screws"
  - "براغي" → "Bolts"
  - "صامولة" → "Nuts"
- Local suppliers: Cairo Machine Parts, Alexandria Steel
- Common failure modes:
  - Dust-related: 65% of failures
  - Overheating: 20%
  - Improper maintenance: 15%
`;

// Circuit breaker state
let serviceStatus: 'OPEN' | 'HALF_OPEN' | 'CLOSED' = 'CLOSED';
let failureCount = 0;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 30000;

async function checkServiceHealth() {
  try {
    const endpoint = import.meta.env.VITE_AI_API_ENDPOINT;
    if (!endpoint) return false;
    
    validateAIEnv();
    const response = await fetch(`${endpoint}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export const identifyPartFromImage = async (imageBase64: string): Promise<PartIdentificationResult> => {
  if (serviceStatus === 'OPEN') {
    const healthy = await checkServiceHealth();
    serviceStatus = healthy ? 'HALF_OPEN' : 'OPEN';
    if (!healthy) throw new Error('SERVICE_UNAVAILABLE');
  }

  try {
    const result = await geminiIdentifyPart(imageBase64);
    failureCount = 0;
    serviceStatus = 'CLOSED';

    return {
      partInfo: result,
      localSuppliers: [
        { name: 'Cairo Machine Parts', location: 'Cairo' },
        { name: 'Alexandria Steel', location: 'Alexandria' }
      ],
      priceRange: {
        genuine: '500-2000 EGP',
        local: '300-1500 EGP'
      }
    };
  } catch (error) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      serviceStatus = 'OPEN';
      setTimeout(() => {
        serviceStatus = 'HALF_OPEN';
      }, RESET_TIMEOUT);
    }
    console.error('Part identification failed:', error);
    throw new Error('Failed to identify part from image');
  }
};

export const findPartByDescription = async (description: string) => {
  if (serviceStatus === 'OPEN') {
    const healthy = await checkServiceHealth();
    serviceStatus = healthy ? 'HALF_OPEN' : 'OPEN';
    if (!healthy) throw new Error('SERVICE_UNAVAILABLE');
  }

  const prompt = `${EGYPTIAN_MARKET_CONTEXT}
  ${SPARE_PARTS_CONTEXT}
  
  Identify spare part from description:
  "${description}"
  
  Return:
  1. Official part name and number
  2. Compatible machine models
  3. Common Egyptian terms
  4. Local supplier options
  5. Price range in EGP`;

  try {
    const result = await getEquipmentRecommendation(prompt);
    failureCount = 0;
    serviceStatus = 'CLOSED';
    return result;
  } catch (error) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      serviceStatus = 'OPEN';
      setTimeout(() => {
        serviceStatus = 'HALF_OPEN';
      }, RESET_TIMEOUT);
    }
    throw error;
  }
};

export const predictPartDemand = async (machineType: string, location: string) => {
  if (serviceStatus === 'OPEN') {
    const healthy = await checkServiceHealth();
    serviceStatus = healthy ? 'HALF_OPEN' : 'OPEN';
    if (!healthy) throw new Error('SERVICE_UNAVAILABLE');
  }

  const prompt = `${EGYPTIAN_MARKET_CONTEXT}
  ${SPARE_PARTS_CONTEXT}
  
  Predict spare parts demand for:
  - Machine: ${machineType}
  - Location: ${location}
  
  Consider:
  - Local environmental factors
  - Machine age
  - Seasonal variations
  
  Return:
  1. Top 3 parts likely needed
  2. Recommended stock levels
  3. Optimal reorder timing`;

  try {
    const result = await getEquipmentRecommendation(prompt);
    failureCount = 0;
    serviceStatus = 'CLOSED';
    return result;
  } catch (error) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      serviceStatus = 'OPEN';
      setTimeout(() => {
        serviceStatus = 'HALF_OPEN';
      }, RESET_TIMEOUT);
    }
    throw error;
  }
};
