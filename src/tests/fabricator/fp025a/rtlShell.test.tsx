import { FabricatorWorkflowBar } from '@/components/fabricator/shell/FabricatorWorkflowBar';
import { isRTL } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const langState = vi.hoisted(() => ({ language: 'ar' }));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (_k: string, d?: string) => d || _k,
      i18n: { language: langState.language },
    }),
  };
});

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      currentProject: null,
      measurementData: null,
      designData: null,
      bom: null,
      quote: null,
      optimizationResult: null,
      productionDocuments: null,
      completedSteps: new Set(),
      activeStep: 'measuring',
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

describe('FP-025A RTL', () => {
  it('treats Arabic as RTL', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ar-EG')).toBe(true);
    expect(isRTL('en')).toBe(false);
  });

  it('sets dir=rtl on the workflow bar in Arabic', () => {
    langState.language = 'ar';
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/projects']}>
        <FabricatorWorkflowBar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('fabricator-workflow-bar')).toHaveAttribute('dir', 'rtl');
  });
});
