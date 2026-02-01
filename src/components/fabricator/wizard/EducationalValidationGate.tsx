/**
 * EducationalValidationGate - Teacher-Style Validation UI
 * 
 * Transforms technical validation errors into friendly, educational messages
 * with safety context and actionable solutions for unskilled fabricators.
 * 
 * Designed for Ahmed persona: Workshop owners with minimal technical knowledge.
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertCircle, AlertTriangle, Info, Split, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ValidationViolation {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  field?: string;
  value?: number;
  limit?: number;
  message?: string;
}

interface EducationalValidationGateProps {
  violations: ValidationViolation[];
  onFix?: (fixType: string, violationCode: string) => void;
  onDismiss?: () => void;
}

// Educational message mappings for common violations
const EDUCATIONAL_MESSAGES: Record<string, {
  titleAr: string;
  titleEn: string;
  dangerAr: string;
  dangerEn: string;
  solutionAr: string;
  solutionEn: string;
  emoji: string;
  fixes?: Array<{ type: string; labelAr: string; labelEn: string; icon?: any }>;
}> = {
  WIDTH_LIMIT: {
    titleAr: 'الشباك عريض جداً',
    titleEn: 'Window too wide',
    dangerAr: '⚠️ الزجاج ممكن ينكسر من الوزن الزيادة',
    dangerEn: '⚠️ Glass might break from excessive weight',
    solutionAr: 'لازم إما تقسم الشباك لجزئين أو تستخدم بروفايل أقوى',
    solutionEn: 'You must either split the window into 2 parts or use a stronger profile',
    emoji: '🛑',
    fixes: [
      { type: 'SPLIT_WINDOW', labelAr: 'قسم الشباك', labelEn: 'Split Window', icon: Split },
      { type: 'UPGRADE_PROFILE', labelAr: 'استخدم بروفايل أقوى', labelEn: 'Upgrade Profile', icon: Wrench },
    ],
  },
  HEIGHT_LIMIT: {
    titleAr: 'الشباك طويل جداً',
    titleEn: 'Window too tall',
    dangerAr: '⚠️ الشباك مش هيكون مستقر وممكن يميل',
    dangerEn: '⚠️ Window will be unstable and might tilt',
    solutionAr: 'قلل الارتفاع أو قسم الشباك أفقياً',
    solutionEn: 'Reduce height or split window horizontally',
    emoji: '🛑',
    fixes: [
      { type: 'REDUCE_HEIGHT', labelAr: 'قلل الطول', labelEn: 'Reduce Height', icon: Wrench },
      { type: 'SPLIT_HORIZONTAL', labelAr: 'قسم أفقي', labelEn: 'Split Horizontally', icon: Split },
    ],
  },
  MIN_CLEARANCE: {
    titleAr: 'المسافة بين البروفايلات قليلة جداً',
    titleEn: 'Clearance between profiles too small',
    dangerAr: '⚠️ الشباك مش هيفتح ويقفل بسهولة',
    dangerEn: '⚠️ Window won\'t open and close smoothly',
    solutionAr: 'زود المسافة على الأقل {limit}mm',
    solutionEn: 'Increase clearance to at least {limit}mm',
    emoji: '⚠️',
    fixes: [
      { type: 'AUTO_FIX_CLEARANCE', labelAr: 'زود المسافة تلقائي', labelEn: 'Auto-fix Clearance', icon: Wrench },
    ],
  },
  GLASS_TOO_HEAVY: {
    titleAr: 'الزجاج تقيل جداً',
    titleEn: 'Glass too heavy',
    dangerAr: '⚠️ البروفايل مش هيستحمل الوزن وممكن الزجاج يقع',
    dangerEn: '⚠️ Profile can\'t support the weight and glass might fall',
    solutionAr: 'استخدم زجاج أخف أو قوي البروفايل',
    solutionEn: 'Use lighter glass or strengthen the profile',
    emoji: '🛑',
    fixes: [
      { type: 'LIGHTER_GLASS', labelAr: 'استخدم زجاج أخف', labelEn: 'Use Lighter Glass', icon: Wrench },
      { type: 'UPGRADE_PROFILE', labelAr: 'قوي البروفايل', labelEn: 'Strengthen Profile', icon: Wrench },
    ],
  },
  NON_STANDARD_SIZE: {
    titleAr: 'المقاس مش قياسي',
    titleEn: 'Non-standard size',
    dangerAr: 'ℹ️ مش خطر بس هيكلف أكتر في التصنيع',
    dangerEn: 'ℹ️ Not dangerous but will cost more to manufacture',
    solutionAr: 'حاول تقرب للمقاسات القياسية لو ممكن',
    solutionEn: 'Try to use standard sizes if possible',
    emoji: 'ℹ️',
    fixes: [
      { type: 'ROUND_TO_STANDARD', labelAr: 'استخدم مقاس قياسي', labelEn: 'Round to Standard', icon: Wrench },
    ],
  },
  COMPLEX_LAYOUT: {
    titleAr: 'التصميم معقد شوية',
    titleEn: 'Layout is complex',
    dangerAr: 'ℹ️ التصنيع هياخد وقت أطول',
    dangerEn: 'ℹ️ Manufacturing will take longer',
    solutionAr: 'استخدم تصميم أبسط لو ممكن',
    solutionEn: 'Use a simpler design if possible',
    emoji: 'ℹ️',
  },
};

export function EducationalValidationGate({
  violations,
  onFix,
  onDismiss,
}: EducationalValidationGateProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  if (!violations || violations.length === 0) {
    return null;
  }

  // Sort violations by severity
  const sortedViolations = [...violations].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
      case 'info':
        return <Info className="h-8 w-8 text-blue-500" />;
      default:
        return <AlertCircle className="h-8 w-8" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'warning':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <div className="space-y-4">
      {sortedViolations.map((violation, index) => {
        const educational = EDUCATIONAL_MESSAGES[violation.code] || {
          titleAr: violation.message || 'مشكلة في التصميم',
          titleEn: violation.message || 'Design issue',
          dangerAr: 'يرجى مراجعة التصميم',
          dangerEn: 'Please review the design',
          solutionAr: 'تحقق من القيم المدخلة',
          solutionEn: 'Check input values',
          emoji: '⚠️',
        };

        return (
          <Card
            key={`${violation.code}-${index}`}
            className={`border-2 ${getSeverityColor(violation.severity)}`}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="mt-1">{getSeverityIcon(violation.severity)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-4xl">{educational.emoji}</span>
                    <CardTitle className="text-2xl">
                      {locale === 'ar' ? educational.titleAr : educational.titleEn}
                    </CardTitle>
                    <Badge
                      variant={
                        violation.severity === 'critical'
                          ? 'destructive'
                          : violation.severity === 'warning'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-sm"
                    >
                      {violation.severity === 'critical' && (locale === 'ar' ? 'حرج' : 'Critical')}
                      {violation.severity === 'warning' && (locale === 'ar' ? 'تحذير' : 'Warning')}
                      {violation.severity === 'info' && (locale === 'ar' ? 'معلومة' : 'Info')}
                    </Badge>
                  </div>

                  {violation.field && violation.value !== undefined && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {locale === 'ar' ? 'القيمة الحالية' : 'Current value'}:{' '}
                      <span className="font-bold">{violation.value}</span>
                      {violation.limit !== undefined && (
                        <>
                          {' '}
                          | {locale === 'ar' ? 'الحد' : 'Limit'}:{' '}
                          <span className="font-bold">{violation.limit}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Danger explanation */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-dashed">
                <p className="text-lg font-medium mb-2">
                  {locale === 'ar' ? '⚠️ ليه ده خطر؟' : '⚠️ Why is this dangerous?'}
                </p>
                <p className="text-base">
                  {locale === 'ar'
                    ? educational.dangerAr.replace('{limit}', String(violation.limit || ''))
                    : educational.dangerEn.replace('{limit}', String(violation.limit || ''))}
                </p>
              </div>

              {/* Solution */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-dashed">
                <p className="text-lg font-medium mb-2 text-green-700 dark:text-green-400">
                  {locale === 'ar' ? '✅ الحل' : '✅ Solution'}
                </p>
                <p className="text-base">
                  {locale === 'ar'
                    ? educational.solutionAr.replace('{limit}', String(violation.limit || ''))
                    : educational.solutionEn.replace('{limit}', String(violation.limit || ''))}
                </p>
              </div>

              {/* Fix buttons */}
              {educational.fixes && educational.fixes.length > 0 && onFix && (
                <div className="flex flex-wrap gap-3">
                  {educational.fixes.map((fix) => {
                    const IconComponent = fix.icon || Wrench;
                    return (
                      <Button
                        key={fix.type}
                        onClick={() => onFix(fix.type, violation.code)}
                        variant="default"
                        size="lg"
                        className="text-lg"
                      >
                        <IconComponent className="mr-2 h-5 w-5" />
                        {locale === 'ar' ? fix.labelAr : fix.labelEn}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Summary footer */}
      {violations.length > 1 && (
        <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <p className="text-lg font-medium">
            {locale === 'ar'
              ? `عندك ${violations.length} مشاكل لازم تحلها`
              : `You have ${violations.length} issues to resolve`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'ar'
              ? 'حل المشاكل الحمراء (الحرجة) الأول قبل ما تكمل'
              : 'Resolve critical (red) issues first before continuing'}
          </p>
        </div>
      )}

      {/* Dismiss button for non-critical violations */}
      {onDismiss && !violations.some((v) => v.severity === 'critical') && (
        <div className="text-center">
          <Button onClick={onDismiss} variant="outline" size="lg" className="text-lg">
            {locale === 'ar' ? 'فهمت، هكمل' : 'I Understand, Continue'}
          </Button>
        </div>
      )}
    </div>
  );
}
