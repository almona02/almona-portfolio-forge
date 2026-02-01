/**
 * @file InspectorOverlay.tsx
 * @description Read-only overlay for inspector (placeholder).
 * Yellow banner that disables all inputs.
 */

import React from 'react';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Eye, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export const InspectorOverlay: React.FC = () => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50',
      'bg-yellow-950/95 border-b-2 border-yellow-500/50',
      'backdrop-blur-md'
    )}>
      <Alert className="bg-transparent border-0 py-2">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-yellow-400" />
          <AlertDescription className="text-yellow-300 font-semibold">
            {lang === 'ar' 
              ? 'وضع المفتش - للقراءة فقط. جميع عمليات الكتابة معطلة.'
              : 'Inspector Mode - Read Only. All write operations are disabled.'}
          </AlertDescription>
          <Lock className="h-4 w-4 text-yellow-400 ml-auto" />
        </div>
      </Alert>
    </div>
  );
};




























