// Simplified AI-Powered Smart Categories
// Intelligent categorization that learns from machine features rather than rigid hierarchies

export interface SmartCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  keywords: string[];
  synonyms: string[];
  machineCount?: number;
}

export interface Machine {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  tags?: string[];
  specifications?: string[];
  [key: string]: any;
}

// Enhanced smart categories with comprehensive machine keywords
export const smartCategories: SmartCategory[] = [
  {
    id: "all",
    name: "All Machines",
    nameAr: "جميع الماكينات",
    icon: "🏭",
    description: "Complete range of industrial machinery",
    descriptionAr: "مجموعة كاملة من الماكينات الصناعية",
    keywords: ["all", "machines", "equipment", "yilmaz", "industrial"],
    synonyms: ["machinery", "equipment", "tools", "devices", "systems", "units"]
  },
  {
    id: "cutting",
    name: "Cutting Solutions",
    nameAr: "حلول القطع",
    icon: "✂️",
    description: "Precision cutting for aluminum and UPVC",
    descriptionAr: "قطع دقيق للألومنيوم و UPVC",
    keywords: [
      "cut", "saw", "cutting", "slice", "trim", "mitre", "double head", "compound",
      "dc 421", "kd 402", "cdc 600", "dc 421 psd", "ack 420", "mk 450", "ryk 420",
      "scm 420", "ck 412", "kd 305", "kd 350", "sdt 275", "cutting machine",
      "mitre saw", "radial saw", "serial cutting", "glazing bead", "steel cutting"
    ],
    synonyms: [
      "sawing", "trimming", "slicing", "angular", "precision", "automatic",
      "pneumatic", "servo", "hydro-pneumatic", "compound cuts", "pivoting",
      "location points", "cutting accuracy", "max cut length", "saw blade"
    ]
  },
  {
    id: "welding",
    name: "Welding & Assembly",
    nameAr: "اللحام والتجميع",
    icon: "🔗",
    description: "Joining and assembly solutions",
    descriptionAr: "حلول الربط والتجميع",
    keywords: [
      "weld", "crimp", "join", "assemble", "corner", "dk 502", "tk 505", "dk 540",
      "welding machine", "double head welding", "four head", "single corner",
      "pvc welding", "corner cleaning", "ccl 1661", "welding line"
    ],
    synonyms: [
      "joining", "assembly", "crimping", "pressing", "bonding", "seamless",
      "standard welding", "frame welding", "profile welding", "corner assembly",
      "welding process", "heating", "cooling", "automated welding"
    ]
  },
  {
    id: "routing",
    name: "Routing & Milling",
    nameAr: "التوجيه والطحن",
    icon: "⚙️",
    description: "Precision machining and profiling",
    descriptionAr: "تشغيل دقيق وتشكيل الملفات",
    keywords: [
      "router", "mill", "drill", "profile", "machine", "fr 221", "fr 226", "fr 223",
      "fr 222", "km 212", "km 215", "km 211", "ncr 300", "crm 250", "cnc 608",
      "copy router", "end milling", "cnc router", "template router", "corner cleaning",
      "pim 6509", "cnc machining", "milling machine", "routing machine"
    ],
    synonyms: [
      "milling", "drilling", "profiling", "machining", "processing", "cnc control",
      "spindle", "motor", "cutting", "opening locks", "drilling handles", "hinges",
      "water slot", "slotting", "template", "copy", "precision", "automatic"
    ]
  },
  {
    id: "finishing",
    name: "Finishing",
    nameAr: "الإنهاء",
    icon: "✨",
    description: "Final processing and cleaning",
    descriptionAr: "المعالجة النهائية والتنظيف",
    keywords: [
      "clean", "finish", "polish", "smooth", "refine", "cooling", "robot", "transfer",
      "sa 250", "sa 260", "ccl 1661", "st 264", "cooling unit", "robot unit",
      "corner cleaning", "water slot", "finishing", "automation", "production line"
    ],
    synonyms: [
      "cleaning", "polishing", "smoothing", "refining", "processing", "cooling",
      "automation", "transfer", "handling", "finishing", "assembly line", "production",
      "quality control", "final processing", "post-processing"
    ]
  }
];

// AI-powered machine categorization function
export const categorizeMachine = (machine: Machine): string => {
  const name = machine.name.toLowerCase();
  const description = machine.description?.toLowerCase() || '';
  const type = machine.type?.toLowerCase() || '';
  const tags = machine.tags?.join(' ').toLowerCase() || '';
  const specifications = machine.specifications?.join(' ').toLowerCase() || '';
  
  // Combine all text for analysis
  const combinedText = `${name} ${description} ${type} ${tags} ${specifications}`;
  
  // Smart keyword matching with scoring
  const categoryScores: Record<string, number> = {
    cutting: 0,
    welding: 0,
    routing: 0,
    finishing: 0
  };
  
  // Score each category based on keyword matches
  smartCategories.forEach(category => {
    if (category.id === 'all') return;
    
    // Check keywords
    category.keywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        categoryScores[category.id] += 2; // Higher weight for direct keywords
      }
    });
    
    // Check synonyms
    category.synonyms.forEach(synonym => {
      if (combinedText.includes(synonym)) {
        categoryScores[category.id] += 1; // Lower weight for synonyms
      }
    });
  });
  
  // Find the category with the highest score
  const bestCategory = Object.entries(categoryScores).reduce((a, b) => 
    categoryScores[a[0]] > categoryScores[b[0]] ? a : b
  );
  
  // Return the best category if it has a score > 0, otherwise return 'all'
  return bestCategory[1] > 0 ? bestCategory[0] : 'all';
};

// Dynamic material detection
export const detectMaterialType = (machine: Machine): 'aluminum' | 'upvc' | 'both' | 'unknown' => {
  const name = machine.name.toLowerCase();
  const description = machine.description?.toLowerCase() || '';
  const combinedText = `${name} ${description}`;
  
  const aluminumKeywords = ['aluminum', 'aluminium', 'alum', 'metal', 'steel'];
  const upvcKeywords = ['upvc', 'pvc', 'plastic', 'vinyl', 'window', 'door'];
  
  const hasAluminum = aluminumKeywords.some(keyword => combinedText.includes(keyword));
  const hasUpvc = upvcKeywords.some(keyword => combinedText.includes(keyword));
  
  if (hasAluminum && hasUpvc) return 'both';
  if (hasAluminum) return 'aluminum';
  if (hasUpvc) return 'upvc';
  
  return 'unknown';
};

// Helper function to normalize model numbers for comparison
// Removes spaces, hyphens, and converts to lowercase
// Example: "DC 550 PB" -> "dc550pb", "KM-215-S" -> "km215s"
const normalizeModelNumber = (model: string): string => {
  return model.toLowerCase().replace(/[\s\-_]/g, '').trim();
};

// Extract model numbers from query (handles comma-separated list)
// Example: "dc 550 pb , km 215 s , kp 180 , crm 250" -> ["dc 550 pb", "km 215 s", "kp 180", "crm 250"]
const extractModelNumbers = (query: string): string[] => {
  // Check if query contains comma-separated model numbers
  const commaSeparated = query.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  // If multiple items found, treat as model number list
  if (commaSeparated.length > 1) {
    return commaSeparated;
  }
  
  // Otherwise, try to extract model patterns from single query
  // Pattern: 2-3 letters, optional space/hyphen, 3-4 digits, optional space/hyphen, optional letters
  const modelPattern = /[a-z]{2,3}[\s\-]?\d{3,4}[\s\-]?[a-z]*/gi;
  const matches = query.match(modelPattern);
  
  return matches || [];
};

// Enhanced intelligent search with comprehensive machine data
export const intelligentSearch = (query: string, machines: Machine[]): Machine[] => {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return machines;
  
  // Extract model numbers from query (handles comma-separated list)
  const modelNumbers = extractModelNumbers(normalizedQuery);
  
  // If model numbers are detected, prioritize exact model matching
  if (modelNumbers.length > 0) {
    const normalizedModelNumbers = modelNumbers.map(normalizeModelNumber);
    
    // Filter machines that match any of the model numbers
    const modelMatches = machines.filter(machine => {
      const normalizedMachineName = normalizeModelNumber(machine.name);
      
      // Check if machine name matches any of the queried model numbers
      return normalizedModelNumbers.some(modelNum => {
        // Exact match
        if (normalizedMachineName === modelNum) return true;
        
        // Extract core model pattern (letters + numbers) for both
        const corePattern = /([a-z]{2,3})(\d{3,4})/i;
        const machineMatch = machine.name.match(corePattern);
        const queryMatch = modelNum.match(corePattern);
        
        if (machineMatch && queryMatch) {
          const machineCore = `${machineMatch[1].toLowerCase()}${machineMatch[2]}`;
          const queryCore = `${queryMatch[1].toLowerCase()}${queryMatch[2]}`;
          
          // Core pattern must match (e.g., "km215" in both "km 215 s" and "KM-215-S")
          if (machineCore === queryCore) {
            return true;
          }
        }
        
        // Fallback: check if one contains the other (for cases like "km215" vs "km215s")
        if (normalizedMachineName.includes(modelNum) || modelNum.includes(normalizedMachineName)) {
          // Additional check: ensure at least the core pattern matches
          if (machineMatch && queryMatch) {
            const machineCore = `${machineMatch[1].toLowerCase()}${machineMatch[2]}`;
            const queryCore = `${queryMatch[1].toLowerCase()}${queryMatch[2]}`;
            return machineCore === queryCore;
          }
        }
        
        return false;
      });
    });
    
    // If we found matches, return only those (exact model number search)
    if (modelMatches.length > 0) {
      return modelMatches;
    }
    
    // If no matches found but model numbers were detected, return empty
    // This ensures we don't return unrelated machines when user searches for specific models
    if (modelNumbers.length > 1) {
      return [];
    }
  }
  
  // Extract potential categories from search query
  const queryCategories = smartCategories
    .filter(category => 
      category.keywords.some(keyword => normalizedQuery.includes(keyword)) ||
      category.synonyms.some(synonym => normalizedQuery.includes(synonym))
    )
    .map(category => category.id);
  
  // Extract material type from query
  const materialType = detectMaterialType({ name: normalizedQuery, description: normalizedQuery } as Machine);
  
  return machines.filter(machine => {
    const name = machine.name.toLowerCase();
    const description = machine.description?.toLowerCase() || '';
    const type = machine.type?.toLowerCase() || '';
    const tags = machine.tags?.join(' ').toLowerCase() || '';
    const specifications = machine.specifications?.join(' ').toLowerCase() || '';
    const category = machine.category?.toLowerCase() || '';
    const powerConsumption = machine.powerSpec?.consumption?.toLowerCase() || '';
    const airConsumption = machine.airSpec?.consumption?.toLowerCase() || '';
    const certifications = machine.certifications?.join(' ').toLowerCase() || '';
    const safetyFeatures = machine.safetyFeatures?.join(' ').toLowerCase() || '';
    
    // Comprehensive text search across all machine properties
    const combinedText = `${name} ${description} ${type} ${tags} ${specifications} ${category} ${powerConsumption} ${airConsumption} ${certifications} ${safetyFeatures}`;
    
    // Direct text match (highest priority)
    if (combinedText.includes(normalizedQuery)) return true;
    
    // Single model number matching (e.g., "DC 421", "KM 212")
    if (modelNumbers.length === 1) {
      const normalizedModel = normalizeModelNumber(modelNumbers[0]);
      const normalizedMachineName = normalizeModelNumber(machine.name);
      
      // Exact or partial match
      if (normalizedMachineName === normalizedModel || 
          normalizedMachineName.includes(normalizedModel) || 
          normalizedModel.includes(normalizedMachineName)) {
        return true;
      }
    }
    
    // Partial word matching for better search results
    const queryWords = normalizedQuery.split(' ').filter(word => word.length > 2);
    const wordMatches = queryWords.filter(word => combinedText.includes(word));
    if (wordMatches.length >= Math.ceil(queryWords.length * 0.6)) return true;
    
    // Category-based match
    if (queryCategories.length > 0) {
      const machineCategory = categorizeMachine(machine);
      if (queryCategories.includes(machineCategory)) return true;
    }
    
    // Material type match
    if (materialType !== 'unknown') {
      const machineMaterial = detectMaterialType(machine);
      if (machineMaterial === materialType || machineMaterial === 'both') return true;
    }
    
    // Legacy model number matching pattern (for backward compatibility)
    const modelPattern = /[a-z]{2,3}\s*\d{3,4}/i;
    const queryModelMatch = normalizedQuery.match(modelPattern);
    if (queryModelMatch && name.includes(queryModelMatch[0].toLowerCase())) return true;
    
    // Power specification matching (e.g., "2.2 kW", "400V")
    const powerPattern = /(\d+\.?\d*)\s*(kw|w|volt|v)/i;
    const queryPowerMatch = normalizedQuery.match(powerPattern);
    if (queryPowerMatch && powerConsumption.includes(queryPowerMatch[0].toLowerCase())) return true;
    
    // Dimension matching (e.g., "6500mm", "2200mm")
    const dimensionPattern = /(\d+\.?\d*)\s*(mm|cm|m)/i;
    const queryDimensionMatch = normalizedQuery.match(dimensionPattern);
    if (queryDimensionMatch && combinedText.includes(queryDimensionMatch[0].toLowerCase())) return true;
    
    return false;
  });
};

// Get machine count for each category
export const getCategoryMachineCounts = (machines: Machine[]): Record<string, number> => {
  const counts: Record<string, number> = {
    all: machines.length,
    cutting: 0,
    welding: 0,
    routing: 0,
    finishing: 0
  };
  
  machines.forEach(machine => {
    const category = categorizeMachine(machine);
    if (category !== 'all') {
      counts[category]++;
    }
  });
  
  return counts;
};

// Get machines by category
export const getMachinesByCategory = (machines: Machine[], categoryId: string): Machine[] => {
  if (categoryId === 'all') return machines;
  
  return machines.filter(machine => categorizeMachine(machine) === categoryId);
};

// Smart recommendations based on selected machine
export const getSmartRecommendations = (selectedMachine: Machine, allMachines: Machine[]): Machine[] => {
  const selectedCategory = categorizeMachine(selectedMachine);
  const selectedMaterial = detectMaterialType(selectedMachine);
  
  // Find complementary machines
  const recommendations = allMachines
    .filter(machine => {
      const machineCategory = categorizeMachine(machine);
      const machineMaterial = detectMaterialType(machine);
      
      // Same material type, different category (workflow continuation)
      if (machineMaterial === selectedMaterial && machineCategory !== selectedCategory) {
        return true;
      }
      
      // Same category, different material (alternative material)
      if (machineCategory === selectedCategory && machineMaterial !== selectedMaterial) {
        return true;
      }
      
      return false;
    })
    .slice(0, 4); // Limit to 4 recommendations
  
  return recommendations;
};

// User behavior tracking for adaptive UI
export const trackCategoryUsage = (categoryId: string) => {
  const usage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
  usage[categoryId] = (usage[categoryId] || 0) + 1;
  localStorage.setItem('categoryUsage', JSON.stringify(usage));
};

// Get popular categories based on user behavior
export const getPopularCategories = (): string[] => {
  const usage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
  return Object.entries(usage)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .map(([categoryId]) => categoryId)
    .slice(0, 3); // Top 3 popular categories
};

// Legacy category mapping for backward compatibility
export const smartCategoryMapping: Record<string, string> = {
  // Smart categories map to legacy categories
  "cutting": "cutting-machines",
  "welding": "welding-machines", 
  "routing": "processing-centers",
  "finishing": "fabrication-equipment",
  "all": "all"
};
