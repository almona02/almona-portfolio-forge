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
  { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', flag: '🇪🇬' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
];

export const LanguageSwitcher: React.FC<{
  variant?: 'default' | 'compact' | 'minimal' | 'minimal-text' | 'solid' | 'icons';
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

  const renderMenu = (showFlag: boolean, textVariant: 'native' | 'name' | 'both') => {
    const solid = variant === 'solid';
    const baseButtonClasses = solid
      ? 'bg-slate-900 text-white border-slate-700 hover:border-orange-500/60 hover:bg-slate-800 shadow-sm'
      : 'border-gray-700/50 hover:border-orange-500/50 text-gray-300 hover:text-white bg-transparent hover:bg-white/5 backdrop-blur-sm';

    return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`${className} group relative overflow-hidden transition-all duration-200 font-semibold text-xs xl:text-xs 2xl:text-sm ${baseButtonClasses}`}
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
          {!solid && (
            <span className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRTLMode ? 'start' : 'end'}
        sideOffset={24}
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
  };

  if (variant === 'minimal') {
    return renderMenu(true, 'name');
  }

  if (variant === 'minimal-text') {
    return renderMenu(false, 'native');
  }

  if (variant === 'solid') {
    return renderMenu(true, 'native');
  }

  if (variant === 'icons') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {languages.map((lang) => {
          const isActive = i18n.language === lang.code || i18n.language.startsWith(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              aria-label={lang.name}
              className={`
                h-9 w-9 rounded-full flex items-center justify-center text-base
                ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-500/60' : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-orange-400 hover:text-white'}
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/70
              `}
            >
              <span>{lang.flag}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return renderMenu(true, 'both');
  }

  // Default variant
  return renderMenu(true, 'native');
};

export default LanguageSwitcher;

