// Spark independent F-01 route verification (correction tip). Scratch file.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/lib/serviceRoutinesApi', () => ({
  defaultRoutinePayload: () => ({ sections: [] }),
  serviceRoutinesApi: {
    listVersionsInReview: vi.fn(),
    recordReview: vi.fn(),
    preview: vi.fn(),
  },
}))
import { useAuth } from '@/context/AuthContext'
import { serviceRoutinesApi } from '@/lib/serviceRoutinesApi'
import SupportRoutineReviewPage from '@/pages/SupportRoutineReviewPage'

const authMock = useAuth as unknown as ReturnType<typeof vi.fn>
const api = serviceRoutinesApi as unknown as Record<string, ReturnType<typeof vi.fn>>

function renderAt(user: { role: string } | null) {
  authMock.mockReturnValue({ user, loading: false, isProfileResolved: true })
  api.listVersionsInReview.mockResolvedValue([
    { id: 'v1', routine_id: 'r1', version_ordinal: null, status: 'in_review', draft_revision: 'abc123def4567890', author_id: 'a1', published_at: null, retired_at: null, created_at: '2026-11-16', payload: { sections: [] }, routine_code: 'RA-9', routine_name: 'N' },
  ])
  return render(
    <MemoryRouter initialEntries={['/support/routines']}>
      <Routes>
        <Route path="/support/routines" element={<SupportRoutineReviewPage />} />
        <Route path="/" element={<div>home-landing</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Spark F-01 route (independent)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('R1: support reaches the review surface and sees Record review, no Publish', async () => {
    renderAt({ role: 'support' })
    await waitFor(() => expect(screen.getByTestId('support-routine-review-page')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record review' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /author|create draft|retire/i })).not.toBeInTheDocument()
  })

  it('R2: admin reaches the same surface', async () => {
    renderAt({ role: 'admin' })
    await waitFor(() => expect(screen.getByTestId('support-routine-review-page')).toBeInTheDocument())
  })

  it('R3: technician is redirected with no draft content', async () => {
    renderAt({ role: 'technician' })
    await waitFor(() => expect(screen.getByText('home-landing')).toBeInTheDocument())
    expect(screen.queryByTestId('support-routine-review-page')).not.toBeInTheDocument()
    expect(screen.queryByText('RA-9')).not.toBeInTheDocument()
  })

  it('R4: customer is redirected with no draft content', async () => {
    renderAt({ role: 'customer' })
    await waitFor(() => expect(screen.getByText('home-landing')).toBeInTheDocument())
    expect(screen.queryByTestId('support-routine-review-page')).not.toBeInTheDocument()
    expect(screen.queryByText('RA-9')).not.toBeInTheDocument()
  })

  it('R5: unauthenticated is redirected', async () => {
    renderAt(null)
    await waitFor(() => expect(screen.getByText('home-landing')).toBeInTheDocument())
    expect(screen.queryByTestId('support-routine-review-page')).not.toBeInTheDocument()
  })
})
