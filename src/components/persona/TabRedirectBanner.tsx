/**
 * @file TabRedirectBanner.tsx
 * @description Explains why tab was redirected (shown once per session).
 * Prevents user confusion and support tickets.
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { StrategicPersona } from '@/lib/persona/types';

interface TabRedirectBannerProps {
  fromTab: string;
  toTab: string;
  persona: StrategicPersona;
  onDismiss: () => void;
}

const PERSONA_LABELS: Record<StrategicPersona, { en: string; ar: string }> = {
  operator: { en: 'Operator', ar: 'مشغل' },
  supervisor: { en: 'Supervisor', ar: 'مشرف' },
  manager: { en: 'Manager', ar: 'مدير' },
  inspector: { en: 'Inspector', ar: 'مفتش' },
};

export const TabRedirectBanner: React.FC<TabRedirectBannerProps> = ({
  fromTab,
  toTab,
  persona,
  onDismiss,
}) => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was already shown this session
    const sessionKey = `tab_redirect_banner_${fromTab}_${persona}`;
    const wasShown = sessionStorage.getItem(sessionKey);
    
    if (!wasShown) {
      setIsVisible(true);
      sessionStorage.setItem(sessionKey, 'true');
    }
  }, [fromTab, persona]);

  if (!isVisible) return null;

  const personaLabel = PERSONA_LABELS[persona][lang];

  return (
    <Alert className={cn(
      'mb-4 bg-blue-950/90 border-blue-500/50',
      'backdrop-blur-sm'
    )}>
      <div className="flex items-start gap-3">
        <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <AlertDescription className="flex-1 text-blue-300">
          <div className="flex items-center justify-between gap-4">
            <div>
              {lang === 'ar' ? (
                <>
                  هذا القسم غير متاح لدورك ({personaLabel}). تم إعادة التوجيه إلى {toTab}.
                </>
              ) : (
                <>
                  This section is not available for your role ({personaLabel}). Redirected to {toTab}.
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
};













