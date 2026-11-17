import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const getWs = vi.fn()
const record = vi.fn()

vi.mock('@/lib/serviceVisitChecklistApi', () => ({
  getVisitChecklistWorkspace: (...args: unknown[]) => getWs(...args),
  recordVisitChecklistAnswer: (...args: unknown[]) => record(...args),
  isChecklistStaleRevision: () => false,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ServiceVisitChecklistPanel } from './ServiceVisitChecklistPanel'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ServiceVisitChecklistPanel', () => {
  beforeEach(() => {
    getWs.mockReset()
    record.mockReset()
  })

  it('shows unavailable when no active pin', async () => {
    getWs.mockResolvedValue({
      visit_id: 'v1',
      has_active_pin: false,
      checklist_revision: 0,
      payload: null,
      current: null,
    })
    wrap(<ServiceVisitChecklistPanel visitId="v1" viewerRole="technician" />)
    expect(await screen.findByText(/No active job routine pin/i)).toBeInTheDocument()
  })

  it('renders pinned version identity and items', async () => {
    getWs.mockResolvedValue({
      visit_id: 'v1',
      has_active_pin: true,
      checklist_revision: 2,
      routine_version_id: 'ver-exact',
      routine_name_en: 'Saw Routine',
      version_ordinal: 1,
      can_write: true,
      payload: {
        sections: [
          {
            id: 'safety',
            kind: 'safety',
            title: 'Safety',
            items: [
              {
                id: 'sg1',
                type: 'safety_gate',
                requirement_class: 'safety_gate',
                instruction: 'LOTO',
              },
            ],
          },
        ],
      },
      current: null,
    })
    wrap(<ServiceVisitChecklistPanel visitId="v1" viewerRole="technician" />)
    expect(await screen.findByText(/Saw Routine/)).toBeInTheDocument()
    expect(screen.getByText('ver-exact')).toBeInTheDocument()
    expect(screen.getByText(/LOTO/)).toBeInTheDocument()
    expect(screen.getByTestId('service-visit-checklist-v1')).toBeInTheDocument()
  })
})
