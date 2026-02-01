/**
 * WizardModeWrapper - Simplified 5-Step Workflow for Unskilled Fabricators
 * 
 * Linear progression: Type → System → Dimensions → Template → Review
 * Blocks progression if validation fails.
 * Auto-saves on each step completion.
 * 
 * Designed for Ahmed persona: Workshop owners with minimal technical knowledge.
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Eye,
    Factory,
    Home,
    Layout,
    Package,
    Ruler,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EducationalValidationGate, ValidationViolation } from './EducationalValidationGate';
import { OptimizationCheck } from './OptimizationCheck';
import { ProductionQueue } from './ProductionQueue';

// Simple window templates (predefined layouts)
const SIMPLE_TEMPLATES = [
  { id: '1-fixed', nameAr: 'شباك ثابت', nameEn: '1 Fixed Window', openings: 1, type: 'fixed' },
  { id: '1-sliding', nameAr: 'شباك جرار', nameEn: '1 Sliding Window', openings: 1, type: 'sliding' },
  { id: '2-sliding', nameAr: '2 شباك جرار', nameEn: '2 Sliding Windows', openings: 2, type: 'sliding' },
  { id: '1-turn', nameAr: 'شباك مفصلي', nameEn: '1 Turn Window', openings: 1, type: 'turn' },
  { id: '2-turn', nameAr: '2 شباك مفصلي', nameEn: '2 Turn Windows', openings: 2, type: 'turn' },
  { id: 'door', nameAr: 'باب', nameEn: 'Door', openings: 1, type: 'door' },
];

export interface WizardState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  windowType: 'fixed' | 'sliding' | 'turn' | 'door' | null;
  systemPackId: string | null;
  dimensions: { width: number; height: number } | null;
  quantity: number;
  templateId: string | null;
  violations: ValidationViolation[];
}

interface WizardModeWrapperProps {
  projectId?: string;
  onComplete?: (wizardData: WizardState) => void;
  onExit?: () => void;
  profiles?: any[]; // Using any[] temporarily to avoid import cycles, or better import Profile
}

export function WizardModeWrapper({ projectId, onComplete, profiles = [] }: WizardModeWrapperProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // Recommended system packs for beginners
  const RECOMMENDED_SYSTEMS = useMemo(() => [
    {
      id: 'panda-50',
      nameAr: 'نظام PANDA-50',
      nameEn: 'PANDA-50 System',
      pricePerSqm: 450,
      maxWidth: 180,
      maxHeight: 220,
      recommended: true,
      description: locale === 'ar' ? 'نظام قوي ومناسب لمعظم الاحتياجات' : 'Strong system suitable for most needs',
    },
    {
      id: 'eco-40',
      nameAr: 'نظام ECO-40',
      nameEn: 'ECO-40 System',
      pricePerSqm: 350,
      maxWidth: 150,
      maxHeight: 200,
      recommended: false,
      description: locale === 'ar' ? 'نظام اقتصادي للشبابيك الصغيرة' : 'Budget system for small windows',
    },
    {
      id: 'premium-60',
      nameAr: 'نظام PREMIUM-60',
      nameEn: 'PREMIUM-60 System',
      pricePerSqm: 650,
      maxWidth: 250,
      maxHeight: 280,
      recommended: false,
      description: locale === 'ar' ? 'نظام فاخر للشبابيك الكبيرة جداً' : 'Premium system for very large windows',
    }
  ], [locale]); // Was implicitly constant but changes on render due to locale

  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    windowType: null,
    systemPackId: null,
    dimensions: null,
    quantity: 1,
    templateId: null,
    violations: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to scroll to top
  const scrollToTop = () => {
    if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Validate current step
  const canProceed = useCallback(() => {
    switch (wizardState.currentStep) {
      case 1:
        return !!wizardState.windowType;
      case 2:
        return !!wizardState.systemPackId;
      case 3:
        // Must have dimensions AND no critical violations
        if (!wizardState.dimensions) return false;
        const criticalViolations = wizardState.violations.filter((v) => v.severity === 'critical');
        return criticalViolations.length === 0;
      case 4:
        return !!wizardState.templateId;
      case 5:
        // Review step
        const finalCritical = wizardState.violations.filter((v) => v.severity === 'critical');
        return finalCritical.length === 0;
      case 6:
        // Optimization check - always proceedable
        return true;
      case 7:
        // Production Queue - final step
        return true;
      default:
        return false;
    }
  }, [wizardState]);

  // Auto-save function
  const autoSave = useCallback(async (step: number, data: Partial<WizardState>) => {
    console.log('[WIZARD AUTO-SAVE]', { step, data });
    // Save to localStorage
    localStorage.setItem(
      `wizard_${projectId || 'new'}`,
      JSON.stringify({ ...wizardState, ...data, lastModified: Date.now() })
    );
    // TODO: Sync to server
    toast.success(locale === 'ar' ? 'تم الحفظ تلقائياً ✓' : 'Auto-saved ✓', { duration: 2000 });
  }, [wizardState, projectId, locale]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!canProceed()) return;

    const nextStep = (wizardState.currentStep + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    setWizardState((prev) => ({ ...prev, currentStep: nextStep }));
    autoSave(nextStep, { currentStep: nextStep });

    setWizardState((prev) => ({ ...prev, currentStep: nextStep }));
    autoSave(nextStep, { currentStep: nextStep });

    scrollToTop();
  }, [wizardState.currentStep, canProceed, autoSave]);

  // Handle back step
  const handleBack = useCallback(() => {
    if (wizardState.currentStep === 1) return;

    const prevStep = (wizardState.currentStep - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    setWizardState((prev) => ({ ...prev, currentStep: prevStep }));
    scrollToTop();
  }, [wizardState.currentStep]);

  // Handle window type selection
  const handleWindowTypeSelect = useCallback((type: WizardState['windowType']) => {
    setWizardState((prev) => ({ ...prev, windowType: type }));
    autoSave(1, { windowType: type });
  }, [autoSave]);

  // Handle system pack selection
  const handleSystemSelect = useCallback((systemId: string) => {
    setWizardState((prev) => ({ ...prev, systemPackId: systemId }));
    autoSave(2, { systemPackId: systemId });
  }, [autoSave]);

  // Handle dimensions input
  const handleDimensionsChange = useCallback((width: number, height: number, qty: number = 1) => {
    const newDimensions = { width, height };
    // Ensure quantity is at least 1
    const newQuantity = Math.max(1, qty);
    
    // Validate dimensions
    const violations: ValidationViolation[] = [];
    const selectedSystem = RECOMMENDED_SYSTEMS.find(s => s.id === wizardState.systemPackId);
    
    if (selectedSystem) {
      if (width > selectedSystem.maxWidth) {
        violations.push({
          code: 'WIDTH_LIMIT',
          severity: 'critical',
          field: 'width',
          value: width,
          limit: selectedSystem.maxWidth,
          message: `Width exceeds maximum of ${selectedSystem.maxWidth}cm`,
        });
      }
      
      if (height > selectedSystem.maxHeight) {
        violations.push({
          code: 'HEIGHT_LIMIT',
          severity: 'critical',
          field: 'height',
          value: height,
          limit: selectedSystem.maxHeight,
          message: `Height exceeds maximum of ${selectedSystem.maxHeight}cm`,
        });
      }
      
      // Check for non-standard sizes (warning only)
      if (width % 10 !== 0 || height % 10 !== 0) {
        violations.push({
          code: 'NON_STANDARD_SIZE',
          severity: 'info',
          message: 'Using non-standard size',
        });
      }
    }

    setWizardState((prev) => ({ ...prev, dimensions: newDimensions, quantity: newQuantity, violations }));
    autoSave(3, { dimensions: newDimensions, quantity: newQuantity, violations });
  }, [wizardState.systemPackId, autoSave, RECOMMENDED_SYSTEMS]);

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: string) => {
    setWizardState((prev) => ({ ...prev, templateId }));
    autoSave(4, { templateId });
  }, [autoSave]);

  // Handle fix application
  const handleFix = useCallback((fixType: string, violationCode: string) => {
    console.log('[WIZARD FIX]', { fixType, violationCode });
    
    // Apply auto-fix logic
    if (fixType === 'SPLIT_WINDOW' && wizardState.dimensions) {
      const newWidth = Math.floor(wizardState.dimensions.width / 2);
      handleDimensionsChange(newWidth, wizardState.dimensions.height, wizardState.quantity);
      toast.success(locale === 'ar' ? 'تم تقسيم الشباك ✓' : 'Window split applied ✓');
    } else if (fixType === 'REDUCE_HEIGHT' && wizardState.dimensions) {
      const selectedSystem = RECOMMENDED_SYSTEMS.find(s => s.id === wizardState.systemPackId);
      if (selectedSystem) {
        handleDimensionsChange(wizardState.dimensions.width, selectedSystem.maxHeight, wizardState.quantity);
        toast.success(locale === 'ar' ? 'تم تقليل الطول ✓' : 'Height reduced ✓');
      }
    } else if (fixType === 'ROUND_TO_STANDARD' && wizardState.dimensions) {
      const roundedWidth = Math.round(wizardState.dimensions.width / 10) * 10;
      const roundedHeight = Math.round(wizardState.dimensions.height / 10) * 10;
      handleDimensionsChange(roundedWidth, roundedHeight, wizardState.quantity);
      toast.success(locale === 'ar' ? 'تم التقريب للمقاس القياسي ✓' : 'Rounded to standard size ✓');
    }
  }, [wizardState, handleDimensionsChange, locale, RECOMMENDED_SYSTEMS]);

  // Handle wizard completion
  const handleComplete = useCallback(() => {
    if (!canProceed()) return;

    toast.success(locale === 'ar' ? 'تم الحفظ بنجاح! ✓' : 'Saved successfully! ✓');
    onComplete?.(wizardState);
  }, [wizardState, canProceed, onComplete, locale]);

  // Progress calculation
  const progress = (wizardState.currentStep / 7) * 100;

  // Step icons
  const stepIcons = [Home, Package, Ruler, Layout, Eye, Package, Factory];
  const StepIcon = stepIcons[wizardState.currentStep - 1];

  return (
    <div ref={containerRef} className="wizard-container w-full h-full max-h-[85vh] overflow-y-auto bg-background p-6 pb-40">
      {/* Header with progress */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold">
              {locale === 'ar' ? 'معالج التصميم' : 'Design Wizard'}
            </h1>
            <p className="text-xl text-muted-foreground mt-2">
              {locale === 'ar' ? `الخطوة ${wizardState.currentStep} من 7` : `Step ${wizardState.currentStep} of 7`}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <StepIcon className="mr-2 h-5 w-5" />
              {progress.toFixed(0)}% {locale === 'ar' ? 'مكتمل' : 'Complete'}
            </Badge>
          </div>
        </div>

        <Progress value={progress} className="h-3" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => {
            const Icon = stepIcons[step - 1];
            const isActive = step === wizardState.currentStep;
            const isComplete = step < wizardState.currentStep;

            return (
              <div
                key={step}
                className={`flex flex-col items-center ${
                  isActive ? 'text-primary' : isComplete ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? 'border-primary bg-primary/10'
                      : isComplete
                      ? 'border-green-600 bg-green-600/10'
                      : 'border-muted'
                  }`}
                >
                  {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <span className="text-xs mt-1">{step}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {wizardState.currentStep === 1 && (locale === 'ar' ? 'اختر نوع الشباك' : 'Select Window Type')}
              {wizardState.currentStep === 2 && (locale === 'ar' ? 'اختر النظام' : 'Select System')}
              {wizardState.currentStep === 3 && (locale === 'ar' ? 'حدد المقاسات' : 'Set Dimensions')}
              {wizardState.currentStep === 4 && (locale === 'ar' ? 'اختر التصميم' : 'Select Template')}
              {wizardState.currentStep === 5 && (locale === 'ar' ? 'مراجعة أولية' : 'Initial Review')}
              {wizardState.currentStep === 6 && (locale === 'ar' ? 'تحليل التحسين' : 'Optimization Check')}
              {wizardState.currentStep === 7 && (locale === 'ar' ? 'طابور الإنتاج' : 'Production Queue')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Window Type Selection */}
            {wizardState.currentStep === 1 && (
              <div className="grid grid-cols-2 gap-6">
                {['fixed', 'sliding', 'turn', 'door'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleWindowTypeSelect(type as any)}
                    className={`p-8 border-2 rounded-xl text-center transition-all ${
                      wizardState.windowType === type
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="text-6xl mb-4">
                      {type === 'fixed' && '🪟'}
                      {type === 'sliding' && '↔️'}
                      {type === 'turn' && '🚪'}
                      {type === 'door' && '🚪'}
                    </div>
                    <p className="text-2xl font-bold">
                      {type === 'fixed' && (locale === 'ar' ? 'شباك ثابت' : 'Fixed Window')}
                      {type === 'sliding' && (locale === 'ar' ? 'شباك جرار' : 'Sliding Window')}
                      {type === 'turn' && (locale === 'ar' ? 'شباك مفصلي' : 'Turn Window')}
                      {type === 'door' && (locale === 'ar' ? 'باب' : 'Door')}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: System Pack Selection */}
            {wizardState.currentStep === 2 && (
              <div className="space-y-4">
                {RECOMMENDED_SYSTEMS.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => handleSystemSelect(system.id)}
                    className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                      wizardState.systemPackId === system.id
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-2xl font-bold">
                            {locale === 'ar' ? system.nameAr : system.nameEn}
                          </p>
                          {system.recommended && (
                            <Badge variant="default" className="text-sm">
                              {locale === 'ar' ? '⭐ موصى به' : '⭐ Recommended'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">{system.description}</p>
                        <div className="flex gap-4 text-sm">
                          <span>
                            {locale === 'ar' ? 'السعر' : 'Price'}: {system.pricePerSqm} {locale === 'ar' ? 'ج.م/م²' : 'EGP/m²'}
                          </span>
                          <span>|</span>
                          <span>
                            {locale === 'ar' ? 'الحد الأقصى' : 'Max'}: {system.maxWidth}×{system.maxHeight}cm
                          </span>
                        </div>
                      </div>
                      {wizardState.systemPackId === system.id && (
                        <Check className="h-8 w-8 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Dimensions Input */}
            {wizardState.currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xl font-medium mb-3">
                      {locale === 'ar' ? 'العرض (سم)' : 'Width (cm)'}
                    </label>
                    <input
                      type="number"
                      value={wizardState.dimensions?.width || ''}
                      onChange={(e) =>
                        handleDimensionsChange(
                          Number(e.target.value),
                          wizardState.dimensions?.height || 0,
                          wizardState.quantity
                        )
                      }
                      className="w-full text-3xl p-4 border-2 rounded-lg focus:border-primary"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-medium mb-3">
                      {locale === 'ar' ? 'الارتفاع (سم)' : 'Height (cm)'}
                    </label>
                    <input
                      type="number"
                      value={wizardState.dimensions?.height || ''}
                      onChange={(e) =>
                        handleDimensionsChange(
                          wizardState.dimensions?.width || 0,
                          Number(e.target.value),
                          wizardState.quantity
                        )
                      }
                      className="w-full text-3xl p-4 border-2 rounded-lg focus:border-primary"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                {/* Validation Gate */}
                {wizardState.violations.length > 0 && (
                  <EducationalValidationGate
                    violations={wizardState.violations}
                    onFix={handleFix}
                  />
                )}

                {wizardState.dimensions && wizardState.violations.length === 0 && (
                  <div className="p-6 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg text-center">
                    <Check className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {locale === 'ar' ? '✅ المقاسات صحيحة!' : '✅ Dimensions Valid!'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Template Selection */}
            {wizardState.currentStep === 4 && (
              <div className="grid grid-cols-2 gap-4">
                {SIMPLE_TEMPLATES.filter(
                  (t) => !wizardState.windowType || t.type === wizardState.windowType || t.type === 'door'
                ).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-6 border-2 rounded-xl text-center transition-all ${
                      wizardState.templateId === template.id
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="text-5xl mb-3">{template.type === 'door' ? '🚪' : '🪟'}</div>
                    <p className="text-xl font-bold mb-1">
                      {locale === 'ar' ? template.nameAr : template.nameEn}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {template.openings} {locale === 'ar' ? 'فتحة' : 'opening(s)'}
                    </p>
                    {wizardState.templateId === template.id && (
                      <Check className="h-6 w-6 text-primary mx-auto mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 5: Review */}
            {wizardState.currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg">
                  <h3 className="text-2xl font-bold mb-4">
                    {locale === 'ar' ? 'ملخص التصميم' : 'Design Summary'}
                  </h3>
                  <div className="space-y-3 text-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'ar' ? 'النوع:' : 'Type:'}</span>
                      <span className="font-medium">{wizardState.windowType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'ar' ? 'النظام:' : 'System:'}</span>
                      <span className="font-medium">{wizardState.systemPackId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'ar' ? 'المقاسات:' : 'Dimensions:'}</span>
                      <span className="font-medium">
                        {wizardState.dimensions?.width}×{wizardState.dimensions?.height}cm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'ar' ? 'التصميم:' : 'Template:'}</span>
                      <span className="font-medium">{wizardState.templateId}</span>
                    </div>
                  </div>
                </div>

                {/* Final validation */}
                {wizardState.violations.length > 0 && (
                  <EducationalValidationGate violations={wizardState.violations} onFix={handleFix} />
                )}

                {wizardState.violations.filter((v) => v.severity === 'critical').length === 0 && (
                   <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center text-blue-700 dark:text-blue-300">
                      {locale === 'ar' ? 'اضغط التالي لعرض خيارات الإنتاج' : 'Click Next to see production options'}
                   </div>
                )}
              </div>
            )}

            {/* Step 6: Optimization Check */}
            {wizardState.currentStep === 6 && (
                <OptimizationCheck wizardData={wizardState} profiles={profiles} />
            )}

            {/* Step 7: Production Queue */}
            {wizardState.currentStep === 7 && (
                <ProductionQueue wizardData={wizardState} onConfirm={handleComplete} />
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            onClick={handleBack}
            variant="outline"
            size="lg"
            disabled={wizardState.currentStep === 1}
            className="text-xl px-8 py-6"
          >
            <ChevronLeft className="mr-2 h-6 w-6" />
            {locale === 'ar' ? 'رجوع' : 'Back'}
          </Button>

          {wizardState.currentStep < 7 && (
            <Button
              onClick={handleNext}
              size="lg"
              disabled={!canProceed()}
              className="text-xl px-8 py-6"
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
