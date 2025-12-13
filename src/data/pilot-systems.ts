export const PILOT_SYSTEMS = [
  // --- ALUMINUM SYSTEMS ---
  {
    id: 'panda-50',
    name: 'Panda 50',
    nameArabic: 'باندة 50',
    description: '90% من السوق السكني - النظام الأكثر شعبية',
    features: ['مجرى سلك مدمج', 'دوران (أرش)', 'اكسسوار مصري'],
    color: '#003366',
    systemPackId: 'panda-50', // ✅ VERIFIED
    priceRange: '850-1200 EGP/m²',
    leadTime: '3 days',
    marketShare: 90,
    category: 'aluminum',
    goldTierRank: 1
  },
  {
    id: 'rock-60',
    name: 'ROCK 60',
    nameArabic: 'روك 60',
    description: 'نظام تركي قوي - للاستخدام التجاري',
    features: ['عزل حراري', 'تحمل رياح عالي', 'اكسسوار تركي'],
    color: '#c0392b',
    systemPackId: 'rock60', // ✅ VERIFIED
    priceRange: '950-1400 EGP/m²',
    leadTime: '2-3 days',
    marketShare: 10,
    category: 'aluminum',
    goldTierRank: 2
  },
  {
    id: 'ps-aluminium',
    name: 'PS Aluminium',
    nameArabic: 'PS ألومنيوم',
    description: 'نظام ألماني عالي الجودة - للواجهات التجارية',
    features: ['نظام ألماني', 'تحمل عالي للرياح', 'عزل حراري ممتاز'],
    color: '#2c3e50',
    systemPackId: 'caluminium-ps', // ✅ VERIFIED
    priceRange: '1300-1800 EGP/m²',
    leadTime: '10-15 days',
    marketShare: 5,
    category: 'aluminum',
    goldTierRank: 3
  },
  // --- UPVC SYSTEMS ---
  {
    id: 'kompen-upvc',
    name: 'Kompen UPVC',
    nameArabic: 'كومبن UPVC',
    description: 'اقتصادي - 40% من سوق UPVC',
    features: ['عزل صوتي', 'لحام حراري', 'سعر اقتصادي'],
    color: '#27ae60',
    systemPackId: 'kompen_60_eco', // ✅ VERIFIED
    priceRange: '600-900 EGP/m²',
    leadTime: '5-7 days',
    marketShare: 40,
    category: 'upvc',
    goldTierRank: 4
  },
  {
    id: 'emapen-upvc',
    name: 'EMAPEN UPVC',
    nameArabic: 'إيمابين UPVC',
    description: 'نظام تركي جودة عالية - 5 غرف هواء',
    features: ['5 غرف هواء', 'مقاومة الأشعة فوق البنفسجية', 'ثبات حراري'],
    color: '#3498db',
    systemPackId: 'emapen_ema60_complete', // ✅ VERIFIED
    priceRange: '700-950 EGP/m²',
    leadTime: '7-10 days',
    marketShare: 15,
    category: 'upvc',
    goldTierRank: 1
  },
  {
    id: 'katra-upvc',
    name: 'KATRA UPVC',
    nameArabic: 'كاترا UPVC',
    description: 'نظام هندي اقتصادي - 3 غرف هواء',
    features: ['3 غرف هواء', 'تصميم بسيط', 'سعر منافس'],
    color: '#9b59b6',
    systemPackId: 'katra_pro_red_series', // ✅ VERIFIED
    priceRange: '550-750 EGP/m²',
    leadTime: '10-14 days',
    marketShare: 20,
    category: 'upvc',
    goldTierRank: 2
  },
  {
    id: 'foxywin-upvc',
    name: 'FOXYWIN UPVC',
    nameArabic: 'فوكسي وين UPVC',
    description: 'نظام تركي حديث - تصميم أوروبي',
    features: ['تصميم أوروبي', 'مفصلات مخفية', 'مقاومة الصدأ'],
    color: '#e67e22',
    systemPackId: 'foxywin_eco_smart_50', // ✅ VERIFIED
    priceRange: '800-1100 EGP/m²',
    leadTime: '7-10 days',
    marketShare: 10,
    category: 'upvc',
    goldTierRank: 3
  }
] as const;

export type PilotSystemId = typeof PILOT_SYSTEMS[number]['id'];

export function getPilotSystem(id: PilotSystemId) {
  return PILOT_SYSTEMS.find(s => s.id === id);
}

export function getSystemsByCategory(category: 'aluminum' | 'upvc' | 'all' = 'all') {
  if (category === 'all') return PILOT_SYSTEMS;
  return PILOT_SYSTEMS.filter(s => s.category === category);
}

export const SYSTEM_CATEGORIES = [
  { id: 'all', name: 'All', nameArabic: 'الكل' },
  { id: 'aluminum', name: 'Aluminum', nameArabic: 'ألومنيوم' },
  { id: 'upvc', name: 'UPVC', nameArabic: 'UPVC' }
];

