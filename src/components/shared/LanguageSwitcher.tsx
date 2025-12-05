/**
 * LanguageSwitcher Component
 * One-click RTL + Language Switcher - Drop in anywhere
 * Supports: English (LTR), Arabic (RTL), Turkish (LTR)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import { isRTL } from '@/lib/i18n';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇪🇬' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

export const LanguageSwitcher: React.FC<{
  variant?: 'default' | 'compact' | 'minimal' | 'minimal-text';
  className?: string;
}> = ({ variant = 'default', className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];
  const isRTLMode = isRTL(i18n.language);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // RTL is automatically handled by i18n.ts languageChanged event
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-2 py-1 rounded text-sm transition ${
              i18n.language === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
            title={lang.name}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'minimal-text') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <span className="hidden sm:inline">{currentLang.nativeName}</span>
            <span className="sm:hidden">{currentLang.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRTLMode ? 'start' : 'end'}
          className="bg-slate-900 text-white border border-slate-700 shadow-xl"
        >
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-2 ${
                i18n.language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <span>{lang.nativeName}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Globe className="h-4 w-4 mr-2" />
            <span className="mr-2">{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.nativeName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRTLMode ? 'start' : 'end'}
          className="bg-slate-900 text-white border border-slate-700 shadow-xl"
        >
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-2 ${
                i18n.language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeName}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant - horizontal buttons
  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`px-4 py-2 rounded-lg transition-all ${
            i18n.language === lang.code
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
          }`}
        >
          <span className="mr-2">{lang.flag}</span>
          {lang.nativeName}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;

