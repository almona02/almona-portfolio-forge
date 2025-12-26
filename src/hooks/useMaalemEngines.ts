import { getPilotSystem } from '@/data/pilot-systems';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { EgyptianInterferenceEngine, type WindowAssembly } from '@/lib/fabricator/InterferenceEngine';
import { unitProfileGatherer } from '@/lib/fabricator/UnitProfileGatherer';
import { ShapeInferenceEngine, type InferredShape, type UserInput as ShapeUserInput } from '@/lib/intelligence/ShapeInferenceEngine';
import { SegmentationOptimizer } from '@/lib/intelligence/SegmentationOptimizer';
import type { Profile, WindowUnit } from '@/types/fabricator';
import type { MaalemDashboardState } from '@/types/pilot';
import { getBaseMaterialPrice } from '@/utils/marketData';
import { useEffect, useMemo, useState } from 'react';

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
  const [inferredShape, setInferredShape] = useState<InferredShape | null>(null);
  const [shapeIntelligence, setShapeIntelligence] = useState<any>(null);

  const dims = useMemo(() => {
    if (inputs.measurementMode === 'hole') {
      return { width: inputs.width - inputs.wallDeduction, height: inputs.height - inputs.wallDeduction };
    }
    return { width: inputs.width, height: inputs.height };
  }, [inputs.width, inputs.height, inputs.measurementMode, inputs.wallDeduction]);

  // Shape Intelligence: Detect non-symmetric shapes
  useEffect(() => {
    const shapeEngine = new ShapeInferenceEngine();
    
    const shapeInput: ShapeUserInput = {
      description: inputs.description || inputs.pattern,
      dimensions: {
        width: dims.width,
        height: dims.height
      },
      roomType: inputs.roomType as any,
      location: inputs.location as any
    };
    
    shapeEngine.inferNonSymmetricShape(shapeInput).then((inferred) => {
      setInferredShape(inferred);
      
      // If non-rectangular shape detected, optimize segmentation
      if (inferred.shapeType !== 'rectangular' && inferred.pattern) {
        const optimizer = new SegmentationOptimizer();
        const optimized = optimizer.optimize(inferred.segmentation, inferred.pattern);
        setShapeIntelligence({
          shapeType: inferred.shapeType,
          pattern: inferred.pattern,
          segmentation: optimized,
          materialStrategy: inferred.materialStrategy,
          maalemAdvice: inferred.maalemAdvice
        });
      }
    }).catch((error) => {
      console.error('Shape inference error:', error);
      // Fallback to rectangular
      setInferredShape(null);
      setShapeIntelligence(null);
    });
  }, [dims.width, dims.height, inputs.description, inputs.pattern, inputs.roomType, inputs.location]);

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

    // --- COMPREHENSIVE PROFILE GATHERING (University-Grade Precision) ---
    // Gather ALL profiles from unit preset, not just frame profiles
    try {
      // Get system pack from pilot system
      const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemConfig.systemPackId);
      
      if (systemPack) {
        // Create a window unit from inputs for profile gathering
        const windowUnit: WindowUnit = {
          id: 'maalem-preview',
          orderNumber: 'PREVIEW',
          posNumber: 'P-01',
          type: inputs.pattern.includes('sliding') ? 'sliding_window' : 'casement',
          components: [],
          overallWidth: dims.width,
          overallHeight: dims.height,
          color: inputs.color || 'Silver',
          glazing: {
            type: inputs.glazing || 'double',
            totalThickness: 24,
            weightPerSqm: 20
          },
          hardware: [],
          status: 'design',
          optimization: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          systemPackId: systemConfig.systemPackId,
          quantity: inputs.count,
        };

        // Gather ALL profiles with comprehensive validation
        const gatheringResult = unitProfileGatherer.gatherAllProfiles(windowUnit, systemPack);

        // Convert to optimization format with ALL profiles
        const cutsByProfile = gatheringResult.profilesWithCuts.map(item => {
          // Calculate bars needed for this profile
          const totalLength = item.totalMaterialLength * inputs.count;
          const stockLength = systemPack.meta.defaultStockLengthMm || 6000;
          const barsNeeded = Math.ceil(totalLength / stockLength);

          return {
            profileId: item.profile.id,
            profileName: item.profile.name,
            profileRole: item.profile.profileRole || 'frame',
            category: item.category,
            barsNeeded,
            cutCount: item.requiredCuts.length,
            pieceCount: item.pieceCount * inputs.count,
            cuts: item.requiredCuts.map(cut => ({
              id: cut.id,
              label: cut.label,
              length: cut.finalLength,
              quantity: cut.quantity * inputs.count,
              role: cut.role,
              cuttingFormula: cut.cuttingFormula,
            })),
            totalMaterialLength: item.totalMaterialLength * inputs.count,
          };
        });

        // Calculate total waste percentage
        const totalMaterialLength = gatheringResult.summary.totalMaterialLength * inputs.count;
        const totalBars = cutsByProfile.reduce((sum, p) => sum + p.barsNeeded, 0);
        const totalStockLength = totalBars * (systemPack.meta.defaultStockLengthMm || 6000);
        const totalWaste = Math.max(0, totalStockLength - totalMaterialLength);
        const wastePercentage = totalStockLength > 0 
          ? (totalWaste / totalStockLength) * 100 
          : 0;

        setOptimization({
          cutsByProfile,
          wastePercentage: Math.round(wastePercentage * 100) / 100,
          totalBars,
          totalWaste: Math.round(totalWaste),
          summary: {
            totalProfiles: gatheringResult.summary.totalProfiles,
            totalCuts: gatheringResult.summary.totalCuts * inputs.count,
            byCategory: Object.fromEntries(
              Object.entries(gatheringResult.summary.byCategory).map(([cat, data]) => [
                cat,
                {
                  profileCount: data.profileCount,
                  cutCount: data.cutCount * inputs.count,
                  materialLength: data.materialLength * inputs.count,
                }
              ])
            ),
          },
          warnings: gatheringResult.warnings,
          errors: gatheringResult.errors,
        });
      } else {
        // Fallback to simple frame-only calculation if system pack not found
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
          totalWaste: 500,
          warnings: ['System pack not found - using simplified frame-only calculation'],
          errors: [],
        });
      }
    } catch (error) {
      console.error('Error gathering profiles:', error);
      // Fallback to simple calculation on error
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
        totalWaste: 500,
        warnings: [`Profile gathering error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        errors: [],
      });
    }

  }, [dims, inputs.system, inputs.count, inputs.pattern, inputs.wallDeduction, inputs.color, inputs.glazing]);

  return { 
    validation, 
    costs, 
    optimization, 
    manufacturingDims: dims,
    inferredShape,
    shapeIntelligence
  };
};

