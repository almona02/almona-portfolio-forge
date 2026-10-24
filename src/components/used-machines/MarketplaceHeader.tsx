import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { usePublicCopy } from '@/hooks/usePublicCopy';

/**
 * Minimal, brand-neutral header for the public used-machines marketplace.
 * Deliberately omits the marketing navigation so the marketplace stays
 * an open, neutral C2C surface that does not promote any single brand.
 */
const MarketplaceHeader: React.FC = () => {
  const copy = usePublicCopy();
  const { i18n } = useTranslation();
  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar');

  useEffect(() => {
    // The marketplace is Arabic-first: default to Arabic unless the visitor
    // already chose a language (?lng= or a persisted choice).
    try {
      const explicit = new URLSearchParams(window.location.search).has('lng')
        || !!window.localStorage.getItem('i18nextLng');
      if (!explicit && !(i18n.language || '').toLowerCase().startsWith('ar')) {
        void i18n.changeLanguage('ar');
      }
    } catch {
      // Storage blocked: keep the detected language.
    }
  }, [i18n]);

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-almona-dark border-b border-almona-light/20">
      <div className="container mx-auto px-4 h-full flex items-center justify-between gap-3">
        <Link to="/used-machines" className="flex items-center gap-2 text-white font-semibold min-w-0">
          <Wrench className="h-5 w-5 text-almona-orange shrink-0" aria-hidden="true" />
          <span className="truncate">{copy('Machines Market')}</span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
            className="text-sm text-gray-300 hover:text-almona-orange px-2 py-1 transition-colors"
            aria-label={copy('Language')}
          >
            {isArabic ? 'English' : 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©'}
          </button>
          <Link
            to="/used-machines?tab=sell"
            className="btn-primary inline-flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {copy('Post a machine')}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default MarketplaceHeader;
