import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  results: {} as Record<string, any>,
  packs: [] as any[],
  versions: [] as any[],
  provenance: null as any,
  history: [] as any[],
  toast: ((..._args: any[]) => undefined) as (...args: any[]) => void,
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'admin' } }),
}))

// Stable toast identity: a fresh fn per render would retrigger loading effects forever.
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast, toasts: [] }),
}))

vi.mock('@/lib/performance-monitoring', () => ({
  trackError: (..._args: any[]) => undefined,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const result = mocks.results[table] ?? { data: [], error: null }
      const query: any = {}
      for (const key of ['select', 'eq', 'order', 'limit', 'is']) query[key] = vi.fn(() => query)
      query.then = (resolve: any) => resolve(result)
      return query
    },
  },
}))

vi.mock('@/lib/fabricator/customSystemStorage', () => ({
  loadCustomSystemsAsync: vi.fn(() => Promise.resolve(mocks.packs)),
}))

vi.mock('@/lib/fabricator/systemPackSupabase', () => ({
  listPackVersionsFromSupabase: vi.fn(() => Promise.resolve(mocks.versions)),
  rollbackSystemPackInSupabase: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('@/lib/pricing/PricingProvenanceService', () => ({
  pricingProvenanceService: {
    resolvePricingProvenance: vi.fn(() => Promise.resolve(mocks.provenance)),
    savePricingWithProvenance: vi.fn(),
  },
}))

vi.mock('@/lib/pricing/PriceHistoryService', () => ({
  priceHistoryService: { getPriceHistory: vi.fn(() => Promise.resolve(mocks.history)) },
}))

vi.mock('@/components/fabricator/PricingTuningStudio', () => ({
  PricingTuningStudio: () => <div data-testid="pricing-studio-mock">studio</div>,
}))

import { CatalogAdminPanel } from './CatalogAdminPanel'

afterEach(() => {
  cleanup()
  mocks.results = {}
  mocks.packs = []
  mocks.versions = []
  mocks.provenance = null
  mocks.history = []
})

function renderPanel() {
  return render(
    <MemoryRouter>
      <CatalogAdminPanel />
    </MemoryRouter>
  )
}

describe('CatalogAdminPanel', () => {
  it('lists workshop profiles grouped by pack with pricing status', async () => {
    mocks.results['fabricator_profiles'] = {
      data: [
        { id: 'prof-1', systemBrand: 'rock60', specifications: { window_system: 'rock60', system_pricing: { initialized: true } } },
        { id: 'prof-2', systemBrand: 'rock60', specifications: { window_system: 'rock60' } },
      ],
      error: null,
    }
    mocks.provenance = { version: 3, updatedBy: 'admin-1', updatedAt: '2026-11-06T00:00:00Z', source: 'admin_catalog', note: null, currency: 'EGP' }
    renderPanel()

    await waitFor(() => expect(screen.getByTestId('pricing-profile-prof-1')).toBeInTheDocument())
    expect(screen.getByTestId('pricing-profile-prof-2')).toBeInTheDocument()
    expect(screen.getByText('rock60')).toBeInTheDocument()
  })

  it('shows provenance and history for the selected profile', async () => {
    mocks.results['fabricator_profiles'] = {
      data: [{ id: 'prof-1', systemBrand: 'rock60', specifications: { window_system: 'rock60', system_pricing: { initialized: true } } }],
      error: null,
    }
    mocks.provenance = { version: 3, updatedBy: 'admin-1', updatedAt: '2026-11-06T00:00:00Z', source: 'admin_catalog', note: 'Q4', currency: 'EGP' }
    mocks.history = [
      { id: 'h1', systemPackId: 'rock60', profileId: 'prof-1', userId: 'admin-1', pricingData: {}, changeType: 'update', reason: 'Q4', versionNumber: 3, createdAt: new Date('2026-11-06T00:00:00Z') },
    ]
    renderPanel()

    fireEvent.click(await screen.findByTestId('pricing-profile-prof-1'))
    await waitFor(() => expect(screen.getByTestId('pricing-provenance')).toBeInTheDocument())
    expect(screen.getByTestId('pricing-provenance')).toHaveTextContent('v3')
  })

  it('lists versioned packs and their history on the packs tab', async () => {
    mocks.packs = [
      { meta: { id: 'pack-1', name: 'Pack One' }, version: 2, provenance: { version: 2, updatedBy: 'admin-1', updatedAt: '2026-11-06T00:00:00Z', changeNote: 'tune', source: 'tuning_studio' } },
    ]
    mocks.versions = [
      { id: 'h2', packId: 'pack-1', version: 2, spec: {}, changeNote: 'tune', source: 'tuning_studio', createdBy: 'admin-1', createdAt: '2026-11-06T00:00:00Z' },
      { id: 'h1', packId: 'pack-1', version: 1, spec: {}, changeNote: null, source: 'initial_setup', createdBy: 'admin-1', createdAt: '2026-11-05T00:00:00Z' },
    ]
    renderPanel()

    fireEvent.click(screen.getByRole('tab', { name: 'Supplier packs' }))
    fireEvent.click(await screen.findByTestId('pack-pack-1'))
    await waitFor(() => expect(screen.getByTestId('pack-provenance')).toBeInTheDocument())
    expect(screen.getByTestId('pack-provenance')).toHaveTextContent('v2')
  })

  it('shows the migration banner when pack versioning is not applied', async () => {
    mocks.results['fabricator_system_packs'] = {
      data: null,
      error: { code: 'PGRST204', message: "Could not find the 'version' column in the schema cache" },
    }
    renderPanel()

    fireEvent.click(screen.getByRole('tab', { name: 'Supplier packs' }))
    await waitFor(() => expect(screen.getByTestId('catalog-migration-banner')).toBeInTheDocument())
    expect(screen.getByTestId('catalog-migration-banner')).toHaveTextContent('20261106000000_admin_catalog_versioning.sql')
  })
})
