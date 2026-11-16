// Cursor evidence: Lane A authoring panel smoke + STG-01 conflict recovery (not Spark evidence).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('@/lib/serviceRoutinesApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/serviceRoutinesApi')>('@/lib/serviceRoutinesApi')
  return {
    ...actual,
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
  }
})

import { serviceRoutinesApi } from '@/lib/serviceRoutinesApi'
import { ServiceRoutinesAuthoringPanel } from './ServiceRoutinesAuthoringPanel'

const listRoutines = serviceRoutinesApi.listRoutines as ReturnType<typeof vi.fn>
const listVersions = serviceRoutinesApi.listVersions as ReturnType<typeof vi.fn>
const updateDraft = serviceRoutinesApi.updateDraft as ReturnType<typeof vi.fn>

const baseVersion = {
  id: 'v1',
  routine_id: 'r1',
  version_ordinal: null,
  status: 'draft',
  draft_revision: 'abc123',
  author_id: 'a1',
  published_at: null,
  retired_at: null,
  created_at: '2026-11-16T00:00:00Z',
  payload: { sections: [{ id: 'safety', kind: 'safety', title: 'Safety', items: [] }] },
}

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
    listVersions.mockResolvedValue([{ ...baseVersion }])
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

  it('retains unsaved input on conflict and requires explicit reconcile (STG-01 browser recovery)', async () => {
    const user = userEvent.setup()
    const conflictErr = Object.assign(new Error('Stale draft revision'), {
      status: 409,
      code: 'PT409',
      conflictCode: 'routine_draft_stale_revision',
      details: 'routine_draft_stale_revision',
    })
    updateDraft.mockRejectedValueOnce(conflictErr)
    const serverPayload = {
      sections: [{ id: 'safety', kind: 'safety', title: 'ServerSafety', items: [{ id: 'g1' }] }],
    }
    listVersions
      .mockResolvedValueOnce([{ ...baseVersion }]) // open
      .mockResolvedValueOnce([
        { ...baseVersion, draft_revision: 'server999', payload: serverPayload },
      ]) // after conflict fetch

    render(<ServiceRoutinesAuthoringPanel />)
    await waitFor(() => expect(screen.getByText('RA-SAW-01')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByLabelText(/Draft payload/i)).toBeInTheDocument())

    const editor = screen.getByLabelText(/Draft payload/i)
    const retainedPayload = { sections: [{ id: 'safety', kind: 'safety', title: 'LocalEdit', items: [] }] }
    const retained = JSON.stringify(retainedPayload, null, 2)
    fireEvent.change(editor, { target: { value: retained } })

    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(screen.getByTestId('draft-conflict-panel')).toBeInTheDocument())
    expect(screen.getAllByText(/Your unsaved input/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Server content now/i)).toBeInTheDocument()
    expect(screen.getAllByText(/ServerSafety/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/LocalEdit/).length).toBeGreaterThan(0)
    expect(updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedDraftRevision: 'abc123',
        payload: retainedPayload,
      }),
    )

    // Without reconcile, a second save still uses the stale token (two-writer protection).
    updateDraft.mockRejectedValueOnce(conflictErr)
    listVersions.mockResolvedValueOnce([
      { ...baseVersion, draft_revision: 'server999', payload: serverPayload },
    ])
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() =>
      expect(updateDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({ expectedDraftRevision: 'abc123' }),
      ),
    )

    await user.click(screen.getByRole('button', { name: /Reconcile to server content/i }))
    await waitFor(() => expect(screen.queryByTestId('draft-conflict-panel')).not.toBeInTheDocument())
    expect(screen.getByLabelText(/Draft payload/i)).toHaveValue(JSON.stringify(serverPayload, null, 2))
  })
})
