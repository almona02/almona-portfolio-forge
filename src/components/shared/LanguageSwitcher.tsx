/**
 * LanguageSwitcher Component
 * One-click RTL + Language Switcher - Drop in anywhere
 * Supports: English (LTR), Arabic (RTL), Turkish (LTR)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/ui/button';
import { Globe, ChevronDown } from 'lucide-react';
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
  { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', flag: '🇪🇬' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🌐' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

export const LanguageSwitcher: React.FC<{
  variant?: 'default' | 'compact' | 'minimal' | 'minimal-text';
  className?: string;
}> = ({ variant = 'default', className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const currentLang =
    languages.find(
      (lang) => i18n.language === lang.code || i18n.language.startsWith(lang.code),
    ) || languages[0];
  const isRTLMode = isRTL(i18n.language);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
    // RTL is automatically handled by i18n.ts languageChanged event
  };

  const renderMenu = (showFlag: boolean, textVariant: 'native' | 'name' | 'both') => (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`${className} group relative overflow-hidden transition-all duration-200 font-semibold text-xs xl:text-xs 2xl:text-sm`}
        >
          <span className="relative z-10 flex items-center gap-1.5 xl:gap-2">
            {textVariant === 'both' && <Globe className="h-3.5 w-3.5 xl:h-4 xl:w-4 transition-transform group-hover:rotate-12" />}
            {showFlag && <span className="text-base xl:text-lg leading-none">{currentLang.flag}</span>}
            {textVariant === 'native' && (
              <>
                <span className="hidden sm:inline">{currentLang.nativeName}</span>
                <span className="sm:hidden">{currentLang.name}</span>
              </>
            )}
            {textVariant === 'name' && <span>{currentLang.name}</span>}
            {textVariant === 'both' && <span className="hidden sm:inline">{currentLang.nativeName}</span>}
            <ChevronDown className={`h-3 w-3 xl:h-3.5 xl:w-3.5 2xl:h-4 2xl:w-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </span>
          {/* Hover gradient overlay */}
          <span className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRTLMode ? 'start' : 'end'}
        className="bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden min-w-[180px] p-1"
      >
        {languages.map((lang) => {
          const isActive = i18n.language === lang.code || i18n.language.startsWith(lang.code);
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10' 
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
                }
                group/item
              `}
            >
              {showFlag && (
                <span className="text-lg leading-none flex-shrink-0 transition-transform group-hover/item:scale-110">
                  {lang.flag}
                </span>
              )}
              <span className="flex-1 font-medium text-sm">{lang.nativeName}</span>
              {isActive && (
                <span className="ml-auto text-orange-400 font-bold text-sm flex-shrink-0">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === 'minimal') {
    return renderMenu(true, 'name');
  }

  if (variant === 'minimal-text') {
    return renderMenu(false, 'native');
  }

  if (variant === 'compact') {
    return renderMenu(true, 'both');
  }

  // Default variant
  return renderMenu(true, 'native');
};

export default LanguageSwitcher;

