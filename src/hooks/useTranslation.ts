import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { TranslationKey } from '../types/i18n';

// Type-safe translation hook
export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nextTranslation(namespace);

  // Type-safe translation function
  const translate = (key: TranslationKey, options?: Record<string, unknown>) => {
    return t(key, options);
  };

  return {
    t: translate,
    i18n,
    ready: i18n.isInitialized
  };
};

// Helper for getting current language
export const useCurrentLanguage = () => {
  const { i18n } = useI18nextTranslation();
  return i18n.language.startsWith('ar') ? 'ar' : 'en';
};

// Helper for RTL detection
export const useIsRTL = () => {
  const language = useCurrentLanguage();
  return language === 'ar';
};
