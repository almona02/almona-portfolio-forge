import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = React.memo(() => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  }, [language, setLanguage]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="font-mono text-xs">
        {language === 'en' ? 'العربية' : 'English'}
      </span>
    </Button>
  );
});

LanguageToggle.displayName = 'LanguageToggle';