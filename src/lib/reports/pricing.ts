// Egyptian market pricing data (2024)
export const MATERIAL_PRICES = {
  aluminum: {
    basePrice: 165, // EGP/kg
    accessories: {
      locks: 25,
      handles: 15,
      espanglites: 8,
      rails: 12
    }
  },
  upvc: {
    basePrice: {
      min: 150, // EGP/meter
      max: 180
    },
    accessories: {
      locks: 30,
      handles: 20,
      glazingBeads: 5
    }
  },
  energyCost: 2.5 // EGP/kWh
};

export const BLADE_COSTS = {
  aluminum: 1200, // EGP/blade
  upvc: 800 // EGP/blade
};

export const LABOR_RATES = {
  cutting: 50, // EGP/hour
  assembly: 40 // EGP/hour
};

// Machine specifications for comparison
export const MACHINE_SPECS = {
  'KM-212': { // YILMAZ machine
    power: 5.5, // kW
    maxCutLength: 6.5, // meters
    weight: 1200, // kg
    price: 450000 // EGP
  },
  'Chinese-1': { // Generic Chinese machine
    power: 3.5,
    maxCutLength: 6,
    weight: 900,
    price: 280000
  },
  'Chinese-2': { // Lower-end Chinese machine
    power: 2.8,
    maxCutLength: 5.5,
    weight: 750,
    price: 220000
  }
};
