import { act, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import arabic from '../../locales/ar/public.json';
import english from '../../locales/en/public.json';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import Contact from './Contact';

vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/hocs/withErrorBoundary', () => ({ withErrorBoundary: (component: unknown) => component }));

async function languageInstance() {
  const instance = createInstance();
  await instance.use(initReactI18next).init({ lng: 'ar', fallbackLng: 'en', resources: { ar: { public: arabic }, en: { public: english } }, interpolation: { escapeValue: false } });
  return instance;
}

describe('Public Arabic enquiries', () => {
  it('shows Arabic form labels and validation while keeping phone/email left-to-right', async () => {
    const instance = await languageInstance();
    render(<I18nextProvider i18n={instance}><MemoryRouter><Contact /></MemoryRouter></I18nextProvider>);
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('رقم الهاتف')).toHaveAttribute('type', 'tel');
    fireEvent.click(screen.getByRole('button', { name: 'جهّز رسالة البريد' }));
    expect(await screen.findByText('أدخل بريداً إلكترونياً صحيحاً')).toBeInTheDocument();
  });

  it('keeps legacy service translations synchronized with the global language', async () => {
    const instance = await languageInstance();
    localStorage.setItem('language', 'en');
    const Probe = () => { const { language, t } = useLanguage(); return <p>{language}: {t('services.title')}</p>; };
    render(<I18nextProvider i18n={instance}><LanguageProvider><Probe /></LanguageProvider></I18nextProvider>);
    expect(screen.getByText('ar: الخدمات')).toBeInTheDocument();
    await act(() => instance.changeLanguage('en'));
    expect(screen.getByText('en: Services')).toBeInTheDocument();
  });
});
