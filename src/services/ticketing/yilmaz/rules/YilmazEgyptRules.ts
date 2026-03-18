/**
 * @tier Tier 3 Execution (Deterministic Rules)
 * @constitutional_compliance AICS-001 §6.1 (Deterministic constraints only)
 * @authority Absolute - No AI, no inference, no learning
 * @region Egypt-specific rules (24 years of YILMAZ dealer experience)
 * 
 * GOVERNANCE:
 * - These rules are derived from 24 years of YILMAZ dealer experience in Egypt (2000-2024)
 * - Rules are deterministic and based on environmental, electrical, and operational constraints
 * - Each rule maps to specific YILMAZ part numbers for Egyptian inventory
 * - Rules must never be modified by ML or adaptive systems
 */

// YILMAZ Machine Models targeted for Egypt
export type YilmazMachineModel = 'AIM_4410' | 'AIM_7510' | 'ALM_6510';

// YILMAZ Service Issue Categories (Egypt-specific)
export type YilmazIssueCategory = 
  | 'DUST_KHAMSIN_CLOG'
  | 'VOLTAGE_FLUCTUATION'
  | 'SUMMER_OVERHEATING'
  | 'HYDRAULIC_PRESSURE_LOW'
  | 'SPINDLE_THERMAL_SHUTDOWN'
  | 'SERVO_DRIFT'
  | 'COOLANT_EVAPORATION'
  | 'ELECTRICAL_SURGE_DAMAGE';

// Egypt Environmental Constants
export const EGYPT_ENV_CONSTANTS = {
  KHAMSIN_SEASON_START: 3, // March (month index)
  KHAMSIN_SEASON_END: 5,   // May (month index)
  SUMMER_TEMP_THRESHOLD: 40, // °C
  VOLTAGE_MIN: 200, // Volts (Egypt grid instability)
  VOLTAGE_MAX: 240,
  VOLTAGE_NOMINAL: 220,
  DUST_LEVEL_WARNING: 3, // Scale 1-5
  HUMIDITY_MIN: 15, // % (Egypt dry climate)
  HUMIDITY_MAX: 65  // % (coastal areas)
} as const;

// YILMAZ Part Number Registry (Egypt Stock)
export const YILMAZ_EGYPT_PARTS = {
  // Dust/Air Filtration
  'YIL-FLT-AIR-001': {
    name: 'High-Capacity Cabinet Air Filter (Khamsin-Spec)',
    nameAr: 'فلتر هواء عالي السعة (مواصفات الخماسين)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 2850,
    stockLevel: 'high',
    leadTimeDays: 2
  },
  'YIL-FLT-AIR-002': {
    name: 'Spindle Cooling Fan Filter Cartridge',
    nameAr: 'خرطوشة فلتر مروحة تبريد المحور',
    machineModels: ['AIM_4410', 'AIM_7510'] as YilmazMachineModel[],
    priceEGP: 1650,
    stockLevel: 'medium',
    leadTimeDays: 3
  },
  'YIL-CLN-001': {
    name: 'Compressed Air Blow-off Kit',
    nameAr: 'طقم نفخ الهواء المضغوط',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 950,
    stockLevel: 'high',
    leadTimeDays: 1
  },

  // Electrical Protection
  'YIL-ELC-AVR-001': {
    name: 'Industrial AVR (Automatic Voltage Regulator) 15kVA',
    nameAr: 'منظم جهد أوتوماتيكي صناعي 15 كيلو فولت أمبير',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 18500,
    stockLevel: 'medium',
    leadTimeDays: 5,
    critical: true
  },
  'YIL-ELC-SPD-001': {
    name: 'Surge Protection Device (Egypt Grid)',
    nameAr: 'جهاز حماية من زيادة التيار (شبكة مصر)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 6700,
    stockLevel: 'high',
    leadTimeDays: 2
  },
  'YIL-ELC-FUSE-001': {
    name: 'Servo Drive Fuse Set (Egypt Rating)',
    nameAr: 'مجموعة فيوزات محرك سيرفو (تصنيف مصر)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 1200,
    stockLevel: 'high',
    leadTimeDays: 1
  },

  // Thermal Management
  'YIL-THM-CLR-001': {
    name: 'Enhanced Spindle Cooler (Summer-Spec)',
    nameAr: 'مبرد محور محسّن (مواصفات الصيف)',
    machineModels: ['AIM_4410', 'AIM_7510'] as YilmazMachineModel[],
    priceEGP: 12400,
    stockLevel: 'medium',
    leadTimeDays: 7
  },
  'YIL-THM-FAN-001': {
    name: 'Cabinet Cooling Fan Assembly (High-Temp)',
    nameAr: 'مجموعة مروحة تبريد الخزانة (درجة حرارة عالية)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 3200,
    stockLevel: 'high',
    leadTimeDays: 3
  },
  'YIL-THM-PASTE-001': {
    name: 'Thermal Interface Paste (Industrial Grade)',
    nameAr: 'معجون واجهة حرارية (درجة صناعية)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 580,
    stockLevel: 'high',
    leadTimeDays: 1
  },

  // Hydraulic System
  'YIL-HYD-SEAL-001': {
    name: 'Hydraulic Seal Kit (Egypt Climate)',
    nameAr: 'طقم حشوات هيدروليكية (مناخ مصر)',
    machineModels: ['AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 4500,
    stockLevel: 'medium',
    leadTimeDays: 4
  },
  'YIL-HYD-PUMP-001': {
    name: 'Hydraulic Pump Assembly',
    nameAr: 'مجموعة مضخة هيدروليكية',
    machineModels: ['AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 23500,
    stockLevel: 'low',
    leadTimeDays: 14,
    critical: true
  },
  'YIL-HYD-OIL-001': {
    name: 'Hydraulic Oil (High-Temp Synthetic)',
    nameAr: 'زيت هيدروليكي (صناعي مقاوم للحرارة)',
    machineModels: ['AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 1850,
    stockLevel: 'high',
    leadTimeDays: 1
  },

  // Servo & Motion
  'YIL-SRV-ENC-001': {
    name: 'Servo Encoder Module',
    nameAr: 'وحدة تشفير محرك سيرفو',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 8900,
    stockLevel: 'low',
    leadTimeDays: 10
  },
  'YIL-SRV-DRV-001': {
    name: 'Servo Drive Board (Voltage-Hardened)',
    nameAr: 'لوحة محرك سيرفو (مقواة ضد الجهد)',
    machineModels: ['AIM_4410', 'AIM_7510'] as YilmazMachineModel[],
    priceEGP: 32000,
    stockLevel: 'low',
    leadTimeDays: 21,
    critical: true
  },

  // Coolant System
  'YIL-CLT-TANK-001': {
    name: 'Coolant Tank (Evaporation-Resistant)',
    nameAr: 'خزان سائل تبريد (مقاوم للتبخر)',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 5600,
    stockLevel: 'medium',
    leadTimeDays: 5
  },
  'YIL-CLT-PUMP-001': {
    name: 'Coolant Circulation Pump',
    nameAr: 'مضخة دوران سائل التبريد',
    machineModels: ['AIM_4410', 'AIM_7510', 'ALM_6510'] as YilmazMachineModel[],
    priceEGP: 3400,
    stockLevel: 'medium',
    leadTimeDays: 3
  }
} as const;

export type YilmazPartNumber = keyof typeof YILMAZ_EGYPT_PARTS;

/**
 * Deterministic Rule Definition
 */
export interface YilmazDeterministicRule {
  ruleId: string;
  category: YilmazIssueCategory;
  nameEn: string;
  nameAr: string;
  condition: (input: YilmazTechnicianInput) => boolean;
  recommendedParts: YilmazPartNumber[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntimeHours: number;
  preventiveActions: string[];
  preventiveActionsAr: string[];
  seasonalFactor?: 'KHAMSIN' | 'SUMMER' | 'WINTER';
}

/**
 * Technician Input (Human-as-a-Sensor)
 */
export interface YilmazTechnicianInput {
  machineModel: YilmazMachineModel;
  machineSerial: string;
  installationYear: number;
  
  // Manual Sensor Readings
  hydraulicPressureBar?: number;
  spindleTempCelsius?: number;
  inputVoltage?: number;
  dustLevel?: number; // Scale 1-5
  ambientTempCelsius?: number;
  
  // Observed Symptoms
  symptoms: string[];
  
  // Environmental Context
  currentMonth: number; // 0-11
  location: 'cairo' | 'giza' | 'alexandria' | 'suez' | 'port_said' | 'other';
  
  // Machine History
  lastMaintenanceDate?: Date;
  operatingHours?: number;
}

/**
 * Rule Execution Result
 */
export interface YilmazRuleResult {
  ruleMatched: boolean;
  ruleId?: string;
  category?: YilmazIssueCategory;
  recommendedParts: Array<{
    partNumber: YilmazPartNumber;
    name: string;
    nameAr: string;
    priceEGP: number;
    stockLevel: string;
    leadTimeDays: number;
    critical?: boolean;
  }>;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntimeHours: number;
  totalCostEGP: number;
  preventiveActions: string[];
  preventiveActionsAr: string[];
  seasonalWarning?: string;
  seasonalWarningAr?: string;
}

/**
 * DETERMINISTIC RULES ENGINE (Tier 3)
 * 
 * These rules are ABSOLUTE and based on 24 years of operational experience.
 * They are NOT subject to ML modification or adaptive tuning.
 */
export class YilmazEgyptRulesEngine {
  
  private readonly rules: YilmazDeterministicRule[] = [
    
    // RULE 1: Khamsin Dust Clog
    {
      ruleId: 'YIL-EGY-001',
      category: 'DUST_KHAMSIN_CLOG',
      nameEn: 'Khamsin Dust Infiltration & Cabinet Clog',
      nameAr: 'تسلل غبار الخماسين وانسداد الخزانة',
      condition: (input) => {
        const isKhamsinSeason = input.currentMonth >= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_START 
                              && input.currentMonth <= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_END;
        const highDust = (input.dustLevel ?? 0) >= EGYPT_ENV_CONSTANTS.DUST_LEVEL_WARNING;
        const spindleHot = (input.spindleTempCelsius ?? 0) > 70;
        
        return isKhamsinSeason && (highDust || spindleHot);
      },
      recommendedParts: ['YIL-FLT-AIR-001', 'YIL-FLT-AIR-002', 'YIL-CLN-001'],
      urgency: 'high',
      estimatedDowntimeHours: 3,
      preventiveActions: [
        'Immediate cabinet air filter replacement (use Khamsin-spec filters)',
        'Compressed air blow-off of all electronic cabinets',
        'Spindle cooling fan filter cartridge replacement',
        'Implement daily dust removal protocol during Khamsin season',
        'Verify cabinet seals and door gaskets'
      ],
      preventiveActionsAr: [
        'استبدال فلتر هواء الخزانة فورًا (استخدم فلاتر مواصفات الخماسين)',
        'نفخ الهواء المضغوط لجميع خزانات الإلكترونيات',
        'استبدال خرطوشة فلتر مروحة تبريد المحور',
        'تنفيذ بروتوكول إزالة الغبار اليومي خلال موسم الخماسين',
        'التحقق من أختام الخزانة وحشوات الأبواب'
      ],
      seasonalFactor: 'KHAMSIN'
    },

    // RULE 2: Voltage Fluctuation
    {
      ruleId: 'YIL-EGY-002',
      category: 'VOLTAGE_FLUCTUATION',
      nameEn: 'Egypt Grid Voltage Instability & Servo Damage Risk',
      nameAr: 'عدم استقرار جهد الشبكة المصرية وخطر تلف السيرفو',
      condition: (input) => {
        const voltage = input.inputVoltage ?? EGYPT_ENV_CONSTANTS.VOLTAGE_NOMINAL;
        const outOfRange = voltage < EGYPT_ENV_CONSTANTS.VOLTAGE_MIN || voltage > EGYPT_ENV_CONSTANTS.VOLTAGE_MAX;
        const hasDriftSymptom = input.symptoms.some(s => 
          s.toLowerCase().includes('drift') || 
          s.toLowerCase().includes('positioning') ||
          s.toLowerCase().includes('accuracy')
        );
        
        return outOfRange || hasDriftSymptom;
      },
      recommendedParts: ['YIL-ELC-AVR-001', 'YIL-ELC-SPD-001', 'YIL-ELC-FUSE-001'],
      urgency: 'critical',
      estimatedDowntimeHours: 6,
      preventiveActions: [
        'CRITICAL: Install 15kVA Industrial AVR immediately',
        'Install surge protection device (Egypt grid-rated)',
        'Inspect and replace blown servo drive fuses',
        'Perform servo encoder calibration after voltage stabilization',
        'Document voltage log for insurance/warranty claims',
        'Consider backup UPS if outages are frequent'
      ],
      preventiveActionsAr: [
        'حرج: تركيب منظم جهد أوتوماتيكي صناعي 15 كيلو فولت أمبير فورًا',
        'تركيب جهاز حماية من زيادة التيار (مصنف لشبكة مصر)',
        'فحص واستبدال فيوزات محرك السيرفو المحترقة',
        'إجراء معايرة مشفر السيرفو بعد استقرار الجهد',
        'توثيق سجل الجهد لمطالبات التأمين/الضمان',
        'النظر في UPS احتياطي إذا كانت الانقطاعات متكررة'
      ]
    },

    // RULE 3: Summer Overheating
    {
      ruleId: 'YIL-EGY-003',
      category: 'SUMMER_OVERHEATING',
      nameEn: 'Summer Ambient Overheating & Thermal Shutdown',
      nameAr: 'ارتفاع درجة الحرارة المحيطة في الصيف والإغلاق الحراري',
      condition: (input) => {
        const isSummer = input.currentMonth >= 5 && input.currentMonth <= 8; // June-September
        const highAmbient = (input.ambientTempCelsius ?? 0) > EGYPT_ENV_CONSTANTS.SUMMER_TEMP_THRESHOLD;
        const spindleOverheat = (input.spindleTempCelsius ?? 0) > 75;
        
        return isSummer && (highAmbient || spindleOverheat);
      },
      recommendedParts: ['YIL-THM-CLR-001', 'YIL-THM-FAN-001', 'YIL-THM-PASTE-001'],
      urgency: 'high',
      estimatedDowntimeHours: 5,
      preventiveActions: [
        'Install enhanced spindle cooler (summer-spec) immediately',
        'Replace cabinet cooling fans with high-temp assembly',
        'Reapply thermal interface paste on servo drives',
        'Implement workshop air conditioning or exhaust fans',
        'Reduce spindle RPM by 10% during peak summer hours',
        'Schedule heavy cutting operations for early morning/evening'
      ],
      preventiveActionsAr: [
        'تركيب مبرد محور محسّن (مواصفات الصيف) فورًا',
        'استبدال مراوح تبريد الخزانة بمجموعة درجة حرارة عالية',
        'إعادة تطبيق معجون الواجهة الحرارية على محركات السيرفو',
        'تنفيذ تكييف هواء الورشة أو مراوح العادم',
        'تقليل دورات المحور بنسبة 10% خلال ساعات الصيف الذروة',
        'جدولة عمليات القطع الثقيلة في الصباح الباكر/المساء'
      ],
      seasonalFactor: 'SUMMER'
    },

    // RULE 4: Hydraulic Pressure Low
    {
      ruleId: 'YIL-EGY-004',
      category: 'HYDRAULIC_PRESSURE_LOW',
      nameEn: 'Hydraulic System Pressure Drop & Seal Degradation',
      nameAr: 'انخفاض ضغط النظام الهيدروليكي وتدهور الحشوات',
      condition: (input) => {
        const lowPressure = (input.hydraulicPressureBar ?? 150) < 120; // Normal: 140-160 bar
        const hasClampingIssue = input.symptoms.some(s => 
          s.toLowerCase().includes('clamp') || 
          s.toLowerCase().includes('hydraulic') ||
          s.toLowerCase().includes('pressure')
        );
        
        return lowPressure || (hasClampingIssue && ['AIM_7510', 'ALM_6510'].includes(input.machineModel));
      },
      recommendedParts: ['YIL-HYD-SEAL-001', 'YIL-HYD-OIL-001'],
      urgency: 'medium',
      estimatedDowntimeHours: 4,
      preventiveActions: [
        'Replace hydraulic seals (Egypt climate-rated)',
        'Top-up or replace hydraulic oil (high-temp synthetic)',
        'Inspect hydraulic pump for wear (consider replacement if >5 years)',
        'Check for oil leaks around cylinder connections',
        'Verify hydraulic filter is not clogged'
      ],
      preventiveActionsAr: [
        'استبدال الحشوات الهيدروليكية (مصنفة لمناخ مصر)',
        'تعبئة أو استبدال الزيت الهيدروليكي (صناعي مقاوم للحرارة)',
        'فحص المضخة الهيدروليكية للبلى (النظر في الاستبدال إذا > 5 سنوات)',
        'التحقق من تسرب الزيت حول توصيلات الأسطوانة',
        'التحقق من عدم انسداد فلتر الهيدروليك'
      ]
    },

    // RULE 5: Spindle Thermal Shutdown (Critical)
    {
      ruleId: 'YIL-EGY-005',
      category: 'SPINDLE_THERMAL_SHUTDOWN',
      nameEn: 'Spindle Thermal Overload Shutdown (Critical)',
      nameAr: 'إغلاق الحمل الحراري للمحور (حرج)',
      condition: (input) => {
        const criticalTemp = (input.spindleTempCelsius ?? 0) > 80;
        const hasShutdown = input.symptoms.some(s => 
          s.toLowerCase().includes('shutdown') || 
          s.toLowerCase().includes('thermal') ||
          s.toLowerCase().includes('spindle')
        );
        
        return criticalTemp || hasShutdown;
      },
      recommendedParts: ['YIL-THM-CLR-001', 'YIL-FLT-AIR-002', 'YIL-THM-PASTE-001'],
      urgency: 'critical',
      estimatedDowntimeHours: 6,
      preventiveActions: [
        'IMMEDIATE SHUTDOWN - Do not operate until cooler is replaced',
        'Install enhanced spindle cooler (summer-spec)',
        'Replace spindle cooling fan filter',
        'Reapply thermal paste on spindle bearing housing',
        'Verify coolant circulation pump is functioning',
        'Check for coolant tank evaporation (refill if <50%)'
      ],
      preventiveActionsAr: [
        'إيقاف فوري - لا تشغل حتى يتم استبدال المبرد',
        'تركيب مبرد محور محسّن (مواصفات الصيف)',
        'استبدال فلتر مروحة تبريد المحور',
        'إعادة تطبيق معجون حراري على غلاف محمل المحور',
        'التحقق من أن مضخة دوران سائل التبريد تعمل',
        'التحقق من تبخر خزان سائل التبريد (أعد ملؤه إذا < 50%)'
      ]
    },

    // RULE 6: Servo Drift (Voltage + Temperature)
    {
      ruleId: 'YIL-EGY-006',
      category: 'SERVO_DRIFT',
      nameEn: 'Servo Positioning Drift (Voltage + Heat)',
      nameAr: 'انحراف موضع السيرفو (الجهد + الحرارة)',
      condition: (input) => {
        const voltage = input.inputVoltage ?? EGYPT_ENV_CONSTANTS.VOLTAGE_NOMINAL;
        const voltageIssue = Math.abs(voltage - EGYPT_ENV_CONSTANTS.VOLTAGE_NOMINAL) > 10;
        const hasDrift = input.symptoms.some(s => 
          s.toLowerCase().includes('drift') || 
          s.toLowerCase().includes('positioning') ||
          s.toLowerCase().includes('accuracy') ||
          s.toLowerCase().includes('tolerance')
        );
        
        return hasDrift && (voltageIssue || (input.spindleTempCelsius ?? 0) > 70);
      },
      recommendedParts: ['YIL-SRV-ENC-001', 'YIL-ELC-AVR-001'],
      urgency: 'high',
      estimatedDowntimeHours: 8,
      preventiveActions: [
        'Install AVR to stabilize input voltage',
        'Replace servo encoder module if drift persists',
        'Perform full servo calibration (home position, backlash)',
        'Verify servo drive board is not thermally damaged',
        'Check for loose mechanical couplings on axes'
      ],
      preventiveActionsAr: [
        'تركيب منظم جهد أوتوماتيكي لتثبيت جهد الدخل',
        'استبدال وحدة مشفر السيرفو إذا استمر الانحراف',
        'إجراء معايرة سيرفو كاملة (موضع الصفر، الارتداد)',
        'التحقق من أن لوحة محرك السيرفو غير تالفة حراريًا',
        'التحقق من أن الوصلات الميكانيكية على المحاور غير مفكوكة'
      ]
    },

    // RULE 7: Coolant Evaporation (Egypt Dryness)
    {
      ruleId: 'YIL-EGY-007',
      category: 'COOLANT_EVAPORATION',
      nameEn: 'Coolant Rapid Evaporation (Egypt Climate)',
      nameAr: 'تبخر سائل التبريد السريع (مناخ مصر)',
      condition: (input) => {
        const dryClimate = (input.location === 'cairo' || input.location === 'giza' || input.location === 'suez');
        const hasOverheat = (input.spindleTempCelsius ?? 0) > 70 || (input.ambientTempCelsius ?? 0) > 35;
        const hasCoolantSymptom = input.symptoms.some(s => 
          s.toLowerCase().includes('coolant') || 
          s.toLowerCase().includes('low fluid')
        );
        
        return dryClimate && (hasOverheat || hasCoolantSymptom);
      },
      recommendedParts: ['YIL-CLT-TANK-001', 'YIL-CLT-PUMP-001'],
      urgency: 'medium',
      estimatedDowntimeHours: 3,
      preventiveActions: [
        'Install evaporation-resistant coolant tank',
        'Check coolant circulation pump for proper flow',
        'Implement daily coolant level check protocol',
        'Add coolant additives to reduce evaporation rate',
        'Consider tank lid or cover to minimize evaporation'
      ],
      preventiveActionsAr: [
        'تركيب خزان سائل تبريد مقاوم للتبخر',
        'التحقق من مضخة دوران سائل التبريد للتدفق المناسب',
        'تنفيذ بروتوكول فحص مستوى سائل التبريد اليومي',
        'إضافة مضافات سائل التبريد لتقليل معدل التبخر',
        'النظر في غطاء أو غطاء خزان لتقليل التبخر'
      ]
    },

    // RULE 8: Electrical Surge Damage (Grid Instability)
    {
      ruleId: 'YIL-EGY-008',
      category: 'ELECTRICAL_SURGE_DAMAGE',
      nameEn: 'Electrical Surge Damage from Grid Instability',
      nameAr: 'تلف زيادة التيار الكهربائي من عدم استقرار الشبكة',
      condition: (input) => {
        const voltage = input.inputVoltage ?? EGYPT_ENV_CONSTANTS.VOLTAGE_NOMINAL;
        const surgeDetected = voltage > EGYPT_ENV_CONSTANTS.VOLTAGE_MAX;
        const hasDamageSymptom = input.symptoms.some(s => 
          s.toLowerCase().includes('blown') || 
          s.toLowerCase().includes('fuse') ||
          s.toLowerCase().includes('board') ||
          s.toLowerCase().includes('error code')
        );
        
        return surgeDetected || hasDamageSymptom;
      },
      recommendedParts: ['YIL-ELC-SPD-001', 'YIL-ELC-FUSE-001', 'YIL-SRV-DRV-001'],
      urgency: 'critical',
      estimatedDowntimeHours: 12,
      preventiveActions: [
        'CRITICAL: Install surge protection device immediately',
        'Replace blown fuses on servo drives',
        'Inspect servo drive boards for burn marks (may need replacement)',
        'Document incident for YILMAZ warranty claim',
        'Install backup UPS for critical machines',
        'Coordinate with electrical utility for grid stability assessment'
      ],
      preventiveActionsAr: [
        'حرج: تركيب جهاز حماية من زيادة التيار فورًا',
        'استبدال الفيوزات المحترقة على محركات السيرفو',
        'فحص لوحات محرك السيرفو لعلامات الاحتراق (قد تحتاج إلى استبدال)',
        'توثيق الحادث لمطالبة ضمان YILMAZ',
        'تركيب UPS احتياطي للآلات الحرجة',
        'التنسيق مع شركة الكهرباء لتقييم استقرار الشبكة'
      ]
    }
  ];

  /**
   * Execute rules against technician input
   */
  public executeRules(input: YilmazTechnicianInput): YilmazRuleResult {
    // Find first matching rule (deterministic, ordered by priority)
    for (const rule of this.rules) {
      if (rule.condition(input)) {
        // Rule matched - compile result
        const parts = rule.recommendedParts.map(partNum => {
          const partInfo = YILMAZ_EGYPT_PARTS[partNum];
          if (!partInfo) throw new Error(`Invalid part number: ${partNum}`);
          return {
            partNumber: partNum,
            name: partInfo.name,
            nameAr: partInfo.nameAr,
            priceEGP: partInfo.priceEGP,
            stockLevel: partInfo.stockLevel,
            leadTimeDays: partInfo.leadTimeDays,
            critical: partInfo.critical as boolean | undefined
          };
        });

        const totalCostEGP = parts.reduce((sum, part) => sum + part.priceEGP, 0);

        let seasonalWarning: string | undefined;
        let seasonalWarningAr: string | undefined;
        
        if (rule.seasonalFactor === 'KHAMSIN') {
          seasonalWarning = '⚠️ KHAMSIN SEASON ALERT: This is a recurring seasonal issue. Recommend preventive filter replacement every March.';
          seasonalWarningAr = '⚠️ تنبيه موسم الخماسين: هذه مشكلة موسمية متكررة. يوصى باستبدال الفلتر الوقائي كل مارس.';
        } else if (rule.seasonalFactor === 'SUMMER') {
          seasonalWarning = '⚠️ SUMMER HEAT ALERT: This issue intensifies during June-September. Consider workshop cooling upgrades.';
          seasonalWarningAr = '⚠️ تنبيه حرارة الصيف: تتفاقم هذه المشكلة خلال يونيو-سبتمبر. النظر في ترقيات تبريد الورشة.';
        }

        return {
          ruleMatched: true,
          ruleId: rule.ruleId,
          category: rule.category,
          recommendedParts: parts,
          urgency: rule.urgency,
          estimatedDowntimeHours: rule.estimatedDowntimeHours,
          totalCostEGP,
          preventiveActions: rule.preventiveActions,
          preventiveActionsAr: rule.preventiveActionsAr,
          seasonalWarning,
          seasonalWarningAr
        };
      }
    }

    // No rule matched - return default "schedule inspection"
    return {
      ruleMatched: false,
      recommendedParts: [],
      urgency: 'low',
      estimatedDowntimeHours: 2,
      totalCostEGP: 0,
      preventiveActions: [
        'No specific issue detected by rules engine',
        'Schedule routine maintenance inspection',
        'Verify all manual sensor readings are accurate'
      ],
      preventiveActionsAr: [
        'لم يتم اكتشاف مشكلة محددة بواسطة محرك القواعد',
        'جدولة فحص الصيانة الروتيني',
        'التحقق من دقة جميع قراءات المستشعرات اليدوية'
      ]
    };
  }

  /**
   * Get all rules (for audit/documentation)
   */
  public getAllRules(): YilmazDeterministicRule[] {
    return [...this.rules]; // Return copy
  }

  /**
   * Get rule by ID
   */
  public getRuleById(ruleId: string): YilmazDeterministicRule | undefined {
    return this.rules.find(r => r.ruleId === ruleId);
  }

  /**
   * Get parts catalog
   */
  public getPartsCatalog(): typeof YILMAZ_EGYPT_PARTS {
    return YILMAZ_EGYPT_PARTS;
  }

  /**
   * Validate technician input
   */
  public validateInput(input: YilmazTechnicianInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.machineModel || !['AIM_4410', 'AIM_7510', 'ALM_6510'].includes(input.machineModel)) {
      errors.push('Invalid machine model');
    }

    if (!input.machineSerial || input.machineSerial.length < 5) {
      errors.push('Invalid machine serial number');
    }

    if (input.installationYear && (input.installationYear < 2000 || input.installationYear > new Date().getFullYear())) {
      errors.push('Invalid installation year');
    }

    if (input.hydraulicPressureBar !== undefined && (input.hydraulicPressureBar < 0 || input.hydraulicPressureBar > 200)) {
      errors.push('Hydraulic pressure out of range (0-200 bar)');
    }

    if (input.spindleTempCelsius !== undefined && (input.spindleTempCelsius < 0 || input.spindleTempCelsius > 150)) {
      errors.push('Spindle temperature out of range (0-150°C)');
    }

    if (input.inputVoltage !== undefined && (input.inputVoltage < 150 || input.inputVoltage > 300)) {
      errors.push('Input voltage out of range (150-300V)');
    }

    if (input.dustLevel !== undefined && (input.dustLevel < 1 || input.dustLevel > 5)) {
      errors.push('Dust level must be 1-5');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Singleton instance (Tier 3 deterministic)
 */
export const yilmazEgyptRulesEngine = new YilmazEgyptRulesEngine();
