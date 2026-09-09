import { Monitor } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Deliberate notice when CAD layout cannot fit the viewport.
 * Prefer this over a broken compressed drafting surface.
 */
export const DesktopWorkspaceNotice: React.FC<{ feature?: string }> = ({
  feature = 'Design',
}) => {
  const { t } = useTranslation('fabricator');
  return (
    <div
      className="h-full min-h-[240px] flex items-center justify-center p-6"
      data-testid="desktop-workspace-notice"
      role="status"
    >
      <div className="max-w-sm text-center space-y-3">
        <Monitor className="w-8 h-8 text-amber-500 mx-auto" aria-hidden />
        <h2 className="text-sm font-semibold text-amber-100">
          {t('industrial.mobile_cad.title', '{{feature}} needs a larger display', {
            feature,
          })}
        </h2>
        <p className="text-xs text-slate-400">
          {t(
            'industrial.mobile_cad.body',
            'The engineering canvas is not compressed onto phones. Use Measure, status, quote, or open this workspace on a tablet landscape / desktop.',
          )}
        </p>
      </div>
    </div>
  );
};
