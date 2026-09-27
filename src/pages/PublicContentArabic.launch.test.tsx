import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import arabic from '../../locales/ar/public.json';
import english from '../../locales/en/public.json';
import { yilmazMachines } from '@/constants/yilmazMachines';
import { AlmonaPrestigeChatbot } from '@/components/prestige-agent/AlmonaPrestigeChatbot';
import { CompanyValues } from '@/components/about/CompanyValues';
import PolicyPage from './PolicyPage';
import { searchPublicMachines } from '@/lib/publicMachineSearch';

const backend = vi.hoisted(() => ({ send: vi.fn(), stats: vi.fn(), capabilities: vi.fn() }));
vi.mock('@/hooks/usePrestigeAgent', () => ({ usePrestigeAgent: () => ({
  sendMessage: backend.send, getKnowledgeStats: backend.stats,
  getMachineCapabilities: backend.capabilities, isLoading: false,
}) }));
vi.mock('@/components/prestige-agent/PrestigeMicroInteractions', () => ({
  PrestigeMicroInteractions: class { showKnowledgeRecall() {} showPersonaTransition() {} },
}));

async function setup(content: React.ReactNode) {
  const instance = createInstance();
  await instance.use(initReactI18next).init({ lng: 'ar', fallbackLng: 'en', resources: { ar: { public: arabic }, en: { public: english } }, interpolation: { escapeValue: false } });
  render(<I18nextProvider i18n={instance}><HelmetProvider><MemoryRouter>{content}</MemoryRouter></HelmetProvider></I18nextProvider>);
  return instance;
}

describe('Remaining public Arabic content', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); backend.send.mockResolvedValue({ success: false }); });

  it.each(['privacy', 'terms'] as const)('translates %s while retaining its draft warning and English switching', async kind => {
    const instance = await setup(<PolicyPage kind={kind} />);
    expect(screen.getByRole('note')).toHaveTextContent('ليست سياسة معتمدة أو سارية');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(kind === 'privacy' ? 'إشعار الخصوصية' : 'شروط استخدام الموقع');
    expect(screen.getByRole('navigation')).toHaveAccessibleName('روابط السياسات');
    await act(() => instance.changeLanguage('en'));
    expect(screen.getByRole('note')).toHaveTextContent('not an approved or effective policy');
  });

  it('updates shared About content when the site language changes', async () => {
    const instance = await setup(<CompanyValues />);
    expect(screen.getByRole('heading', { name: 'قيمنا' })).toBeInTheDocument();
    expect(screen.getByText('النزاهة')).toBeInTheDocument();
    await act(() => instance.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'Our Values' })).toBeInTheDocument();
  });

  it('has Arabic copy for every catalogue description, type, feature and accessory', () => {
    const dictionary = arabic as Record<string, string>;
    for (const machine of yilmazMachines) {
      for (const text of [machine.description, machine.type, ...machine.specifications, ...machine.tags, ...(machine.standardAccessories || []), ...(machine.optionalAccessories || [])]) {
        expect(dictionary[text], `${machine.name}: ${text}`).toBeTruthy();
      }
      expect(dictionary[machine.description]).toMatch(/[\u0600-\u06ff]/);
    }
  });

  it('sends the translated quick prompt with the selected persona and language', async () => {
    const instance = await setup(<AlmonaPrestigeChatbot />);
    expect(await screen.findByText(/أهلاً وسهلاً/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'شخّص عطلاً' }));
    await waitFor(() => expect(backend.send).toHaveBeenCalledWith('شخّص عطلاً', 'doctor', 'ar'));
    expect(await screen.findByText('تعذّر على المساعد الرد. حاول مرة أخرى أو تواصل مع ألمونا.')).toBeInTheDocument();
    await act(() => instance.changeLanguage('en'));
    expect(screen.getByRole('button', { name: 'Diagnose a fault' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome! I'm your YDT Agent/)).toBeInTheDocument();
    expect(screen.getByText('شخّص عطلاً')).toBeInTheDocument();
  });

  it('finds machines using Arabic descriptions, including diacritics, and keeps model searches', () => {
    const copy = (text: string) => (arabic as Record<string, string>)[text] || text;
    const results = searchPublicMachines('قَطع الألومنيوم', yilmazMachines, copy);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(machine => /قطع/.test(copy(machine.description)))).toBe(true);
    expect(searchPublicMachines('AIM 3410', yilmazMachines, copy).some(machine => machine.name.includes('AIM 3410'))).toBe(true);
  });
});
