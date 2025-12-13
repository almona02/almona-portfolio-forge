import type { SystemGalleryItem } from '@/types/gallery';

export const SYSTEM_GALLERY_DATA: SystemGalleryItem[] = [
  // --- GOLD TIER ALUMINUM ---
  {
    id: 'panda-50',
    name: 'Panda 50',
    nameArabic: 'باندة ٥٠',
    manufacturer: 'Al Sherif / Al Aharam',
    category: 'aluminum',
    description: 'The standard residential system in Egypt. Proven durability and wide availability.',
    descriptionArabic: 'النظام السكني الأساسي في مصر. متوفر وقطع غيار مضمونة.',
    marketShare: 90,
    priceRange: { min: 850, max: 1200, currency: 'EGP' },
    tier: 'gold',
    availability: 'stock',
    pilotAvailable: true,
    pilotSystemId: 'panda-50',
    specs: {
      uValue: 2.8,
      windLoadClass: 'C3',
      airPermeability: 'Class 3',
      waterTightness: '7A',
      soundReduction: 32,
      profileDepth: 50,
      glazingCapacity: { min: 4, max: 24 }
    },
    certifications: {
      egyptian: ['EOS 1234/2020']
    }
  },
  {
    id: 'rock-60',
    name: 'ROCK 60',
    nameArabic: 'روك ٦٠',
    manufacturer: 'Caluminium',
    category: 'aluminum',
    description: 'Turkish-designed system for commercial and high-end residential use.',
    descriptionArabic: 'نظام بتصميم تركي للاستخدام التجاري والسكني الراقي.',
    marketShare: 10,
    priceRange: { min: 950, max: 1400, currency: 'EGP' },
    tier: 'gold',
    availability: 'stock',
    pilotAvailable: true,
    pilotSystemId: 'rock-60',
    specs: {
      uValue: 2.4,
      windLoadClass: 'C4',
      airPermeability: 'Class 4',
      waterTightness: '9A',
      soundReduction: 36,
      profileDepth: 60,
      glazingCapacity: { min: 6, max: 32 }
    },
    certifications: {
      en: ['EN 14351-1'],
      egyptian: ['EOS Certified']
    }
  },
  {
    id: 'ps-aluminium',
    name: 'PS Aluminium',
    nameArabic: 'PS ألومنيوم',
    manufacturer: 'CALUMINIUM',
    category: 'aluminum',
    description: 'Premium German-designed system for commercial facades and high-rise buildings.',
    descriptionArabic: 'نظام ألماني راقي للواجهات التجارية والمباني العالية.',
    marketShare: 5,
    priceRange: { min: 1300, max: 1800, currency: 'EGP' },
    tier: 'gold',
    availability: 'order',
    pilotAvailable: true,
    pilotSystemId: 'ps-aluminium',
    specs: {
      uValue: 2.0,
      windLoadClass: 'C5',
      airPermeability: 'Class 4',
      waterTightness: '9A',
      soundReduction: 40,
      profileDepth: 65,
      glazingCapacity: { min: 6, max: 40 }
    },
    certifications: {
      en: ['EN 14351-1', 'EN 13830'],
      iso: ['ISO 9001'],
      egyptian: ['EOS Certified']
    }
  },
  
  // --- GOLD TIER UPVC ---
  {
    id: 'kompen-upvc',
    name: 'Kompen UPVC',
    nameArabic: 'كومبن UPVC',
    manufacturer: 'Kompen (Turkey)',
    category: 'upvc',
    description: 'Budget-friendly UPVC system with excellent thermal properties.',
    descriptionArabic: 'نظام UPVC اقتصادي مع عزل حراري ممتاز.',
    marketShare: 40,
    priceRange: { min: 600, max: 900, currency: 'EGP' },
    tier: 'gold',
    availability: 'stock',
    pilotAvailable: true,
    pilotSystemId: 'kompen-upvc',
    specs: {
      uValue: 1.8,
      windLoadClass: 'B3',
      airPermeability: 'Class 3',
      waterTightness: '8A',
      soundReduction: 38,
      profileDepth: 60,
      glazingCapacity: { min: 4, max: 30 }
    },
    certifications: {
      en: ['EN 12608'],
      iso: ['ISO 9001']
    }
  },
  {
    id: 'emapen-upvc',
    name: 'EMAPEN UPVC',
    nameArabic: 'إيمابين UPVC',
    manufacturer: 'EMAPEN (Turkey)',
    category: 'upvc',
    description: 'Premium 5-chamber UPVC system with superior thermal and acoustic performance.',
    descriptionArabic: 'نظام UPVC راقي بخمس غرف هواء مع أداء حراري وصوتي ممتاز.',
    marketShare: 15,
    priceRange: { min: 700, max: 950, currency: 'EGP' },
    tier: 'gold',
    availability: 'stock',
    pilotAvailable: true,
    pilotSystemId: 'emapen-upvc',
    specs: {
      uValue: 1.6,
      windLoadClass: 'B4',
      airPermeability: 'Class 4',
      waterTightness: '9A',
      soundReduction: 42,
      profileDepth: 60,
      glazingCapacity: { min: 4, max: 32 }
    },
    certifications: {
      en: ['EN 12608', 'EN 14351-1'],
      iso: ['ISO 9001', 'ISO 14001']
    }
  },
  {
    id: 'katra-upvc',
    name: 'KATRA UPVC',
    nameArabic: 'كاترا UPVC',
    manufacturer: 'Katra (India)',
    category: 'upvc',
    description: 'Economy 3-chamber UPVC system with competitive pricing.',
    descriptionArabic: 'نظام UPVC اقتصادي بثلاث غرف هواء بسعر منافس.',
    marketShare: 20,
    priceRange: { min: 550, max: 750, currency: 'EGP' },
    tier: 'gold',
    availability: 'import',
    pilotAvailable: true,
    pilotSystemId: 'katra-upvc',
    specs: {
      uValue: 2.0,
      windLoadClass: 'B2',
      airPermeability: 'Class 2',
      waterTightness: '7A',
      soundReduction: 35,
      profileDepth: 58,
      glazingCapacity: { min: 4, max: 24 }
    },
    certifications: {
      iso: ['ISO 9001']
    }
  },
  {
    id: 'foxywin-upvc',
    name: 'FOXYWIN UPVC',
    nameArabic: 'فوكسي وين UPVC',
    manufacturer: 'FOXYWIN (Turkey)',
    category: 'upvc',
    description: 'Modern European-designed UPVC system with hidden hinges and premium finish.',
    descriptionArabic: 'نظام UPVC بتصميم أوروبي حديث مع مفصلات مخفية ونهائية راقية.',
    marketShare: 10,
    priceRange: { min: 800, max: 1100, currency: 'EGP' },
    tier: 'gold',
    availability: 'stock',
    pilotAvailable: true,
    pilotSystemId: 'foxywin-upvc',
    specs: {
      uValue: 1.7,
      windLoadClass: 'B4',
      airPermeability: 'Class 4',
      waterTightness: '9A',
      soundReduction: 40,
      profileDepth: 70,
      glazingCapacity: { min: 4, max: 36 }
    },
    certifications: {
      en: ['EN 12608', 'EN 14351-1'],
      iso: ['ISO 9001']
    }
  }
];

// Helper functions
export function getGallerySystemById(id: string): SystemGalleryItem | undefined {
  return SYSTEM_GALLERY_DATA.find(s => s.id === id);
}

export function getGallerySystemsByCategory(category: 'all' | 'aluminum' | 'upvc'): SystemGalleryItem[] {
  if (category === 'all') return SYSTEM_GALLERY_DATA;
  return SYSTEM_GALLERY_DATA.filter(s => s.category === category);
}

export function getGallerySystemsByTier(tier: 'all' | 'gold' | 'silver'): SystemGalleryItem[] {
  if (tier === 'all') return SYSTEM_GALLERY_DATA;
  return SYSTEM_GALLERY_DATA.filter(s => s.tier === tier);
}

export function getPilotSystems(): SystemGalleryItem[] {
  return SYSTEM_GALLERY_DATA.filter(s => s.pilotAvailable);
}

