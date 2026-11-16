// Cursor evidence: Lane A authoring panel smoke (not Spark evidence).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/lib/serviceRoutinesApi', () => ({
  defaultRoutinePayload: () => ({
    sections: [{ id: 'safety', kind: 'safety', title: 'Safety', items: [] }],
  }),
  serviceRoutinesApi: {
    listRoutines: vi.fn(),
    listVersions: vi.fn(),
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    submitForReview: vi.fn(),
    recordReview: vi.fn(),
    publish: vi.fn(),
    retire: vi.fn(),
    setApplicability: vi.fn(),
    preview: vi.fn(),
    createNextDraft: vi.fn(),
  },
}))

import { serviceRoutinesApi } from '@/lib/serviceRoutinesApi'
import { ServiceRoutinesAuthoringPanel } from './ServiceRoutinesAuthoringPanel'

const listRoutines = serviceRoutinesApi.listRoutines as ReturnType<typeof vi.fn>
const listVersions = serviceRoutinesApi.listVersions as ReturnType<typeof vi.fn>

describe('ServiceRoutinesAuthoringPanel (Cursor evidence)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listRoutines.mockResolvedValue([
      {
        id: 'r1',
        code: 'RA-SAW-01',
        name_en: 'Saw PM',
        name_ar: '',
        description: '',
        status: 'draft',
        updated_at: '2026-11-16T00:00:00Z',
      },
    ])
    listVersions.mockResolvedValue([
      {
        id: 'v1',
        routine_id: 'r1',
        version_ordinal: null,
        status: 'draft',
        draft_revision: 'abc123',
        author_id: 'a1',
        published_at: null,
        retired_at: null,
        created_at: '2026-11-16T00:00:00Z',
        payload: { sections: [] },
      },
    ])
  })

  it('lists routines and opens lifecycle actions for a draft', async () => {
    const user = userEvent.setup()
    render(<ServiceRoutinesAuthoringPanel />)
    await waitFor(() => expect(screen.getByText('RA-SAW-01')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for review' })).toBeInTheDocument())
    expect(listVersions).toHaveBeenCalledWith('r1')
  })

  it('exposes new draft dialog without technician result controls', async () => {
    const user = userEvent.setup()
    render(<ServiceRoutinesAuthoringPanel />)
    await waitFor(() => expect(screen.getByText('Service Routines')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /New draft/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInTheDocument()
    expect(screen.queryByText(/result capture/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit results/i })).not.toBeInTheDocument()
  })
})
