export const MACHINE_PRESETS = {
  // Cutting machines
  DK502: {
    id: 'DK-502',
    minWidth: 2.5,
    minLength: 3.2,
    minHeight: 2.1,
    powerRequired: '380V',
    clearance: 1.2
  },
  KM212: {
    id: 'KM-212',
    minWidth: 1.8,
    minLength: 2.5,
    minHeight: 1.9,
    powerRequired: '220V',
    clearance: 0.8
  },

  // Copy routers
  FR221S: {
    id: 'FR-221-S',
    minWidth: 2.1,
    minLength: 2.8,
    minHeight: 2.0,
    powerRequired: '380V',
    clearance: 1.0
  },

  // Welding machines
  KD402S: {
    id: 'KD-402-S',
    minWidth: 1.5,
    minLength: 1.2,
    minHeight: 1.0,
    powerRequired: '220V',
    clearance: 0.5
  }
} as const;
