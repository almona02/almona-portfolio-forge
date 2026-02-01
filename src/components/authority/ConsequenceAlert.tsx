/**
 * @file ConsequenceAlert.tsx
 * @description Replaces generic error alerts with industrial impact warnings.
 * Shows real-world consequences of validation errors.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Consequence, ConsequenceType } from '@/lib/authority/consequenceMapper';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  Shield,
  Package,
  Scale,
  DollarSign,
} from 'lucide-react';

interface ConsequenceAlertProps {
  consequences: Consequence[];
  className?: string;
  compact?: boolean;
}

const CONSEQUENCE_ICONS: Record<ConsequenceType, React.ComponentType<{ className?: string }>> = {
  machine: Wrench,
  compliance: Shield,
  material: Package,
  legal: Scale,
  financial: DollarSign,
};

const CONSEQUENCE_COLORS: Record<ConsequenceType, { bg: string; border: string; text: string }> = {
  machine: {
    bg: 'bg-red-950/90',
    border: 'border-red-500/50',
    text: 'text-red-300',
  },
  compliance: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
  },
  material: {
    bg: 'bg-yellow-950/90',
    border: 'border-yellow-500/50',
    text: 'text-yellow-300',
  },
  legal: {
    bg: 'bg-purple-950/90',
    border: 'border-purple-500/50',
    text: 'text-purple-300',
  },
  financial: {
    bg: 'bg-blue-950/90',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
  },
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

export const ConsequenceAlert: React.FC<ConsequenceAlertProps> = ({
  consequences,
  className,
  compact = false,
}) => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';

  if (consequences.length === 0) return null;

  // Group by severity (critical first)
  const sorted = [...consequences].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Show most severe consequence as primary alert
  const primary = sorted[0];
  const Icon = CONSEQUENCE_ICONS[primary.type];
  const SeverityIcon = SEVERITY_ICONS[primary.severity];
  const colors = CONSEQUENCE_COLORS[primary.type];

  if (compact) {
    return (
      <Alert
        variant="destructive"
        className={cn(
          colors.bg,
          colors.border,
          'backdrop-blur-sm',
          className
        )}
      >
        <SeverityIcon className={cn('h-4 w-4', colors.text)} />
        <AlertTitle className={colors.text}>{primary.title[lang]}</AlertTitle>
        <AlertDescription className={cn('text-sm mt-1', colors.text)}>
          {primary.impact[lang]}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Consequence */}
      <Alert
        variant="destructive"
        className={cn(
          colors.bg,
          colors.border,
          'backdrop-blur-sm border-2',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', colors.bg, colors.border, 'border')}>
            <Icon className={cn('h-5 w-5', colors.text)} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityIcon className={cn('h-4 w-4', colors.text)} />
              <AlertTitle className={colors.text}>{primary.title[lang]}</AlertTitle>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs uppercase tracking-wider',
                  colors.border,
                  colors.text,
                  'bg-transparent'
                )}
              >
                {primary.type}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  primary.severity === 'critical'
                    ? 'border-red-500 text-red-300'
                    : primary.severity === 'warning'
                    ? 'border-yellow-500 text-yellow-300'
                    : 'border-blue-500 text-blue-300'
                )}
              >
                {primary.severity}
              </Badge>
            </div>
            <AlertDescription className={cn('text-sm leading-relaxed', colors.text)}>
              <div className="font-semibold mb-1">{primary.impact[lang]}</div>
              <div className="text-xs opacity-90 mt-2">
                <span className="font-medium">Action Required:</span> {primary.action[lang]}
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Additional Consequences (if any) */}
      {sorted.length > 1 && (
        <div className="space-y-2">
          {sorted.slice(1).map((consequence, idx) => {
            const AdditionalIcon = CONSEQUENCE_ICONS[consequence.type];
            const AdditionalSeverityIcon = SEVERITY_ICONS[consequence.severity];
            const additionalColors = CONSEQUENCE_COLORS[consequence.type];

            return (
              <Alert
                key={idx}
                variant="destructive"
                className={cn(
                  additionalColors.bg,
                  additionalColors.border,
                  'backdrop-blur-sm opacity-90'
                )}
              >
                <div className="flex items-start gap-2">
                  <AdditionalIcon className={cn('h-4 w-4 mt-0.5', additionalColors.text)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AdditionalSeverityIcon className={cn('h-3 w-3', additionalColors.text)} />
                      <AlertTitle className={cn('text-sm', additionalColors.text)}>
                        {consequence.title[lang]}
                      </AlertTitle>
                    </div>
                    <AlertDescription className={cn('text-xs', additionalColors.text)}>
                      {consequence.impact[lang]}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      )}
    </div>
  );
};




























