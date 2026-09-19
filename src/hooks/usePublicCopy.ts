import { useTranslation } from 'react-i18next';

/** Public enquiry copy uses English source text as a readable fallback. */
export function usePublicCopy() {
  const { t } = useTranslation('public');
  return (text: string) => t(text, { defaultValue: text, keySeparator: false, nsSeparator: false });
}
