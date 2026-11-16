// Spark independent Lane A panel scope (no Lane B/C controls).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/serviceRoutinesApi', () => ({
  defaultRoutinePayload: () => ({ sections: [] }),
  serviceRoutinesApi: {
    listRoutines: vi.fn(), listVersions: vi.fn(), listApplicability: vi.fn(),
    createDraft: vi.fn(), updateDraft: vi.fn(), submitForReview: vi.fn(),
    recordReview: vi.fn(), publish: vi.fn(), retire: vi.fn(),
    setApplicability: vi.fn(), setManufacturerRestrictions: vi.fn(),
    preview: vi.fn(), createNextDraft: vi.fn(),
  },
}))
import { serviceRoutinesApi } from '@/lib/serviceRoutinesApi'
import { ServiceRoutinesAuthoringPanel } from './ServiceRoutinesAuthoringPanel'

const api = serviceRoutinesApi as unknown as Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.clearAllMocks()
  api.listRoutines.mockResolvedValue([{ id: 'r1', code: 'RA-1', name_en: 'N', name_ar: '', description: '', status: 'in_review', updated_at: '2026-11-16' }])
  api.listVersions.mockResolvedValue([{ id: 'v1', routine_id: 'r1', version_ordinal: null, status: 'in_review', draft_revision: 'abc123def456', author_id: 'a1', published_at: null, retired_at: null, created_at: '2026-11-16', payload: { sections: [] } }])
})

describe('Spark Lane A panel scope (independent)', () => {
  it('C6: review/publish/preview present; no assignment/pin/recurrence/result controls', async () => {
    const user = userEvent.setup()
    render(<ServiceRoutinesAuthoringPanel />)
    await waitFor(() => expect(screen.getByText('RA-1')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record review' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Preview/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/assignment override/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coverage pin/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/recurrence/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/checklist_results/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/result capture/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit results/i })).not.toBeInTheDocument()
  })
})
