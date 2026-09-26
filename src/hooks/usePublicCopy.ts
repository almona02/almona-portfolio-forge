import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/** Public enquiry copy uses English source text as a readable fallback. */
export function usePublicCopy() {
  const { t } = useTranslation('public');
  return useCallback((text: string) => t(text, { defaultValue: text, keySeparator: false, nsSeparator: false }), [t]);
}
