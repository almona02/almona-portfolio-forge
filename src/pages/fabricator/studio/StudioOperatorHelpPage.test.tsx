import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../../locales/en/operator_help.json';
import ar from '../../../../locales/ar/operator_help.json';
import tr from '../../../../locales/tr/operator_help.json';
import { StudioOperatorHelpPage } from './StudioOperatorHelpPage';

describe('StudioOperatorHelpPage', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['operator_help'],
      defaultNS: 'operator_help',
      resources: {
        en: { operator_help: en },
        ar: { operator_help: ar },
        tr: { operator_help: tr },
      },
      interpolation: { escapeValue: false },
    });
  });

  it('renders English floor principles without hype wording', async () => {
    await i18n.changeLanguage('en');
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <StudioOperatorHelpPage />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(screen.getByTestId('studio-operator-help')).toBeInTheDocument();
    expect(screen.getByText('Workshop Operator Reference')).toBeInTheDocument();
    expect(screen.getByText('Human validation')).toBeInTheDocument();
    expect(screen.getByText(/ROCK 60/)).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b|artificial intelligence|smart ai/i)).not.toBeInTheDocument();
  });

  it('renders formal Arabic technician copy', async () => {
    await i18n.changeLanguage('ar');
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <StudioOperatorHelpPage />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(screen.getByText('مرجع مشغّل الورشة')).toBeInTheDocument();
    expect(screen.getByText('التحقق البشري')).toBeInTheDocument();
    expect(screen.getByText(/إقرار المخزون الناعم/)).toBeInTheDocument();
  });

  it('renders formal Turkish technician copy', async () => {
    await i18n.changeLanguage('tr');
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <StudioOperatorHelpPage />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(screen.getByText('Atölye Operatör Referansı')).toBeInTheDocument();
    expect(screen.getByText('İnsan doğrulaması')).toBeInTheDocument();
    expect(screen.getByText(/Yumuşak stok onayı/)).toBeInTheDocument();
  });
});
