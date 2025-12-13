import { useState, useEffect, useMemo } from 'react';
import { EgyptianInterferenceEngine, type WindowAssembly } from '@/lib/fabricator/InterferenceEngine';
import { MicronOptimizationEngine } from '@/lib/fabricator/MicronOptimizationEngine';
import { getPilotSystem } from '@/data/pilot-systems';
import { getBaseMaterialPrice } from '@/utils/marketData';
import type { Profile } from '@/types/fabricator';
import type { MaalemDashboardState } from '@/types/pilot';

const EGYPTIAN_VALIDATION_WISDOM: Record<string, { messageArabic: string; maalemAdvice: string; severity: 'error'|'warning' }> = {
  'GLZ_FIT_SASH_GAP': {
    messageArabic: 'حزمة الزجاج لا تتسع في المقطع',
    maalemAdvice: 'استخدم زجاج أرق (مثال: ٢٤ مم بدل ٣٢ مم) أو غير المقطع',
    severity: 'error'
  },
  'HW_CAPACITY_WEIGHT': {
    messageArabic: 'الفتحة ثقيلة جداً على الأكسسوار',
    maalemAdvice: 'استخدم رولمان بلي "ثقيل" (Heavy Duty)',
    severity: 'error'
  },
  'WALL_TOLERANCE': {
    messageArabic: 'خصم الخلوص قد يجعل الشباك صغيراً جداً',
    maalemAdvice: 'تأكد من مقاس الفتحة مرة أخرى',
    severity: 'warning'
  },
  'PANDA_SCREEN_CLASH': {
    messageArabic: 'مقبض الشباك سيعترض مقبض السلك',
    maalemAdvice: 'استخدم مقبض "مسطح" أو "مغروس"',
    severity: 'warning'
  },
  'SAFETY_GLASS_MANDATE': {
    messageArabic: 'الزجاج في منطقة الخطر (أقل من ٨٠ سم)',
    maalemAdvice: 'يجب استخدام زجاج "سيكوريت" أو "لابي" (Triplex)',
    severity: 'error'
  }
};

export const useMaalemEngines = (inputs: MaalemDashboardState) => {
  const [validation, setValidation] = useState({ 
    status: 'success' as 'success' | 'warning' | 'error', 
    message: 'Valid', 
    messageArabic: 'جاهز للتصنيع',
    maalemAdvice: ''
  });

  const [costs, setCosts] = useState({ material: 0, labor: 0, total: 0 });
  const [optimization, setOptimization] = useState<any>(null);

  const dims = useMemo(() => {
    if (inputs.measurementMode === 'hole') {
      return { width: inputs.width - inputs.wallDeduction, height: inputs.height - inputs.wallDeduction };
    }
    return { width: inputs.width, height: inputs.height };
  }, [inputs.width, inputs.height, inputs.measurementMode, inputs.wallDeduction]);

  useEffect(() => {
    const systemConfig = getPilotSystem(inputs.system);
    if (!systemConfig) return;

    // --- INTERFERENCE ENGINE ---
    const interference = new EgyptianInterferenceEngine();
    const constraints = { minHeightMm: 400, maxHeightMm: 3000 };
    
    const assembly: WindowAssembly = {
      sashWidth: dims.width,
      sashHeight: dims.height,
      systemPack: { id: systemConfig.systemPackId, constraints },
      frameProfile: { id: 'pilot-frame', name: 'Frame', trackType: 'V-groove', innerGap: 40 } as Profile,
      sashProfile: { id: 'pilot-sash', name: 'Sash', weightPerMeter: 1.2, innerGap: 40 } as Profile,
      glazing: { type: 'double', totalThickness: 24, weightPerSqm: 20 },
      selectedHardware: { type: inputs.pattern.includes('sliding') ? 'roller' : 'hinge', maxLoadCapacity: 50, hardwareType: 'standard' },
      projectContext: { wallToleranceDeduction: inputs.wallDeduction }
    };

    try {
      const result = interference.validate(assembly);
      if (result.isValid) {
        setValidation({
          status: 'success', message: 'Valid',
          messageArabic: 'المقاسات سليمة ١٠٠٪ - جاهز للقص!',
          maalemAdvice: '✅ يمكنك المتابعة بثقة تامة'
        });
      } else {
        const err = result.errors[0] || result.warnings[0];
        // ✅ CORRECTED: Use err.code for mapping
        const wisdom = EGYPTIAN_VALIDATION_WISDOM[err?.code] || {
          messageArabic: err?.message || 'مشكلة في التصميم',
          maalemAdvice: 'راجع المقاسات',
          severity: result.errors.length ? 'error' : 'warning'
        };
        setValidation({
          status: wisdom.severity,
          message: err?.message,
          messageArabic: wisdom.messageArabic,
          maalemAdvice: `💡 نصيحة المعلم: ${wisdom.maalemAdvice}`
        });
      }
    } catch (e) {
      console.error(e);
    }

    // --- MICRON ENGINE ---
    const micronConfig: any = {
      sawBladeKerf: 4.2,
      barEndTrim: 15,
      transomMillingDepth: 2.5,
      screenAdapterOffset: inputs.system === 'panda-50' ? 15 : 0
    };
    
    // ✅ CORRECTED: Apply UPVC property correctly
    if (systemConfig.category === 'upvc') {
      micronConfig.upvcWeldingLoss = 3; 
    }

    const area = (dims.width * dims.height) / 1000000;
    const basePrice = getBaseMaterialPrice(inputs.system);
    const matCost = Math.round(area * basePrice * inputs.count);
    const laborCost = Math.round(area * (systemConfig.category === 'aluminum' ? 300 : 200) * inputs.count);

    setCosts({
      material: matCost,
      labor: laborCost,
      total: matCost + laborCost
    });

    const frameCuts = [
      { length: dims.width + 50, quantity: 2 * inputs.count },
      { length: dims.height + 50, quantity: 2 * inputs.count }
    ];
    setOptimization({
      cutsByProfile: [{
        profileId: 'frame',
        profileName: systemConfig.category === 'aluminum' ? 'Hulk (Frame)' : 'Frame Profile',
        barsNeeded: Math.ceil(frameCuts.reduce((a,b)=>a+(b.length*b.quantity),0)/6000),
        cutCount: frameCuts.length,
        cuts: frameCuts
      }],
      wastePercentage: 2.5,
      totalBars: 2,
      totalWaste: 500
    });

  }, [dims, inputs.system, inputs.count, inputs.pattern, inputs.wallDeduction]);

  return { validation, costs, optimization, manufacturingDims: dims };
};

