/**
 * @file OutputClarity.tsx
 * @description Explicitly distinguishes visual preview (85% accuracy) from production data (99.8% accuracy).
 * Reads from ACCURACY_CONTRACT (frozen values) to prevent accuracy inflation.
 */

import React from 'react';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ACCURACY_CONTRACT } from '@/lib/authority/ACCURACY_CONTRACT';
import { Eye, Factory, Info } from 'lucide-react';

export type OutputType = 'visual' | 'production';

interface OutputClarityProps {
  type: OutputType;
  className?: string;
  compact?: boolean;
}

export const OutputClarity: React.FC<OutputClarityProps> = ({
  type,
  className,
  compact = false,
}) => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';

  const config = type === 'visual' 
    ? {
        accuracy: ACCURACY_CONTRACT.visual_preview,
        label: ACCURACY_CONTRACT.labels.visual[lang],
        icon: Eye,
        bgColor: 'bg-blue-950/90',
        borderColor: 'border-blue-500/50',
        textColor: 'text-blue-300',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
        description: isRTL 
          ? 'هذه معاينة تقريبية للأغراض التصورية. البيانات الفعلية للإنتاج دقيقة بنسبة 99.8%'
          : 'This is an approximate preview for visualization purposes. Actual production data is 99.8% accurate',
      }
    : {
        accuracy: ACCURACY_CONTRACT.production_output,
        label: ACCURACY_CONTRACT.labels.production[lang],
        icon: Factory,
        bgColor: 'bg-green-950/90',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-300',
        badgeColor: 'bg-green-500/20 text-green-300 border-green-500/50',
        description: isRTL
          ? 'بيانات الإنتاج المعتمدة - دقيقة بنسبة 99.8% ومعدة للاستخدام في التصنيع'
          : 'Certified production data - 99.8% accurate and ready for manufacturing use',
      };

  const Icon = config.icon;
  const accuracyPercent = (config.accuracy * 100).toFixed(1);

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-xs font-semibold px-2 py-1',
          config.badgeColor,
          className
        )}
      >
        <Icon className="h-3 w-3 mr-1" />
        {config.label} ({accuracyPercent}%)
      </Badge>
    );
  }

  return (
    <Alert
      className={cn(
        config.bgColor,
        config.borderColor,
        'backdrop-blur-sm border',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bgColor, config.borderColor, 'border')}>
          <Icon className={cn('h-5 w-5', config.textColor)} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Info className={cn('h-4 w-4', config.textColor)} />
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                config.badgeColor
              )}
            >
              {config.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-mono',
                config.badgeColor
              )}
            >
              {accuracyPercent}% Accuracy
            </Badge>
          </div>
          <AlertDescription className={cn('text-sm leading-relaxed', config.textColor)}>
            {config.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};




























