/**
 * @file consequenceMapper.ts
 * @description Maps validation errors to real-world industrial consequences.
 * Replaces generic error messages with industrial impact warnings.
 */

import type { ValidationError } from '@/lib/fabricatorValidation';

export type ConsequenceType = 'machine' | 'compliance' | 'material' | 'legal' | 'financial';

export interface Consequence {
  type: ConsequenceType;
  severity: 'info' | 'warning' | 'critical';
  title: {
    en: string;
    ar: string;
  };
  impact: {
    en: string;
    ar: string;
  };
  action: {
    en: string;
    ar: string;
  };
  icon?: string;
}

export interface ValidationErrorWithConsequences extends ValidationError {
  consequences?: Consequence[];
}

/**
 * Maps validation error fields/messages to industrial consequences.
 * This is the single source of truth for consequence mapping.
 */
export function mapErrorToConsequences(error: ValidationError): Consequence[] {
  const field = error.field.toLowerCase();
  const message = error.message.toLowerCase();
  const consequences: Consequence[] = [];

  // Machine-related consequences
  if (field.includes('width') || field.includes('height') || field.includes('area')) {
    if (message.includes('exceed') || message.includes('maximum')) {
      consequences.push({
        type: 'machine',
        severity: 'critical',
        title: {
          en: 'Machine Collision Risk',
          ar: 'خطر اصطدام الآلة'
        },
        impact: {
          en: 'Dimensions exceed machine capacity. Cutting this size may cause tool damage, material waste, or production delays.',
          ar: 'الأبعاد تتجاوز سعة الآلة. قطع هذا الحجم قد يسبب تلف الأدوات أو هدر المواد أو تأخير الإنتاج.'
        },
        action: {
          en: 'Reduce dimensions to within system limits or use a different system pack.',
          ar: 'قلل الأبعاد إلى الحدود المسموحة للنظام أو استخدم نظامًا مختلفًا.'
        }
      });
    } else if (message.includes('below') || message.includes('minimum')) {
      consequences.push({
        type: 'machine',
        severity: 'warning',
        title: {
          en: 'Manufacturing Difficulty',
          ar: 'صعوبة التصنيع'
        },
        impact: {
          en: 'Dimensions below minimum may cause assembly issues, weak joints, or premature failure.',
          ar: 'الأبعاد الأقل من الحد الأدنى قد تسبب مشاكل في التجميع أو مفاصل ضعيفة أو فشل مبكر.'
        },
        action: {
          en: 'Increase dimensions to meet system minimum requirements.',
          ar: 'زد الأبعاد لتلبية الحد الأدنى المطلوب للنظام.'
        }
      });
    }
  }

  // Compliance-related consequences
  if (field.includes('egyptian') || message.includes('standard') || message.includes('code')) {
    consequences.push({
      type: 'compliance',
      severity: 'critical',
      title: {
        en: 'Code Violation',
        ar: 'انتهاك الكود'
      },
      impact: {
        en: 'Design does not meet Egyptian building codes. Installation may be rejected by inspectors, voiding warranty and insurance.',
        ar: 'التصميم لا يلبي كود البناء المصري. قد يتم رفض التثبيت من قبل المفتشين، مما يبطل الضمان والتأمين.'
      },
      action: {
        en: 'Review Egyptian standards and adjust design to meet code requirements.',
        ar: 'راجع المعايير المصرية وعدل التصميم ليلبي متطلبات الكود.'
      }
    });
  }

  // Material-related consequences
  if (field.includes('profile') || field.includes('component') || message.includes('inventory')) {
    consequences.push({
      type: 'material',
      severity: 'warning',
      title: {
        en: 'Material Unavailable',
        ar: 'المواد غير متوفرة'
      },
      impact: {
        en: 'Selected profile or component is not in inventory. Production cannot proceed, causing delays and potential customer dissatisfaction.',
        ar: 'البروفيل أو المكون المحدد غير متوفر في المخزون. لا يمكن المتابعة بالإنتاج، مما يسبب تأخيرات وعدم رضا العملاء.'
      },
      action: {
        en: 'Select an available profile from inventory or add the required material to stock.',
        ar: 'اختر بروفيل متوفر من المخزون أو أضف المادة المطلوبة إلى المخزون.'
      }
    });
  }

  // Financial consequences
  if (field.includes('cost') || field.includes('price') || message.includes('overrun')) {
    consequences.push({
      type: 'financial',
      severity: 'warning',
      title: {
        en: 'Cost Overrun Risk',
        ar: 'خطر تجاوز التكلفة'
      },
      impact: {
        en: 'Current configuration may exceed quoted price, reducing profit margin or requiring price renegotiation.',
        ar: 'التكوين الحالي قد يتجاوز السعر المتفق عليه، مما يقلل هامش الربح أو يتطلب إعادة التفاوض على السعر.'
      },
      action: {
        en: 'Review pricing and adjust configuration or update quote to reflect actual costs.',
        ar: 'راجع التسعير وعدل التكوين أو حدث العرض ليعكس التكاليف الفعلية.'
      }
    });
  }

  // Legal consequences (warranty, liability)
  if (message.includes('warranty') || message.includes('liability') || field.includes('certification')) {
    consequences.push({
      type: 'legal',
      severity: 'critical',
      title: {
        en: 'Liability Exposure',
        ar: 'تعرض للمسؤولية القانونية'
      },
      impact: {
        en: 'Design deviation may void warranty coverage and expose workshop to legal liability in case of failure or injury.',
        ar: 'انحراف التصميم قد يبطل تغطية الضمان ويعرض الورشة للمسؤولية القانونية في حالة الفشل أو الإصابة.'
      },
      action: {
        en: 'Correct design to meet certified specifications before production.',
        ar: 'صحح التصميم ليلبي المواصفات المعتمدة قبل الإنتاج.'
      }
    });
  }

  // Default consequence for unmapped errors
  if (consequences.length === 0) {
    consequences.push({
      type: 'compliance',
      severity: 'warning',
      title: {
        en: 'Validation Issue',
        ar: 'مشكلة في التحقق'
      },
      impact: {
        en: 'This validation error may affect production quality or compliance.',
        ar: 'خطأ التحقق هذا قد يؤثر على جودة الإنتاج أو الامتثال.'
      },
      action: {
        en: 'Review and correct the indicated field.',
        ar: 'راجع وصحح الحقل المحدد.'
      }
    });
  }

  return consequences;
}

/**
 * Enhances a validation result with consequences for all errors.
 */
export function enhanceValidationWithConsequences(
  errors: ValidationError[]
): ValidationErrorWithConsequences[] {
  return errors.map(error => ({
    ...error,
    consequences: mapErrorToConsequences(error)
  }));
}













