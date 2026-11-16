// Cursor evidence / correction: F-01 Support review route (not Spark evidence).
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const authState = {
  user: null as null | { id: string; role: string },
  supabaseUser: null as null | { id: string },
  loading: false,
  isProfileResolved: true,
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const listInReview = vi.fn()
const preview = vi.fn()
const recordReview = vi.fn()

vi.mock('@/lib/serviceRoutinesApi', () => ({
  serviceRoutinesApi: {
    listVersionsInReview: (...args: unknown[]) => listInReview(...args),
    preview: (...args: unknown[]) => preview(...args),
    recordReview: (...args: unknown[]) => recordReview(...args),
  },
}))

import SupportRoutineReviewPage from './SupportRoutineReviewPage'

const DRAFT_MARKER = 'SECRET-DRAFT-INSTRUCTION-LOTO'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/support/routines"
          element={
            <ProtectedRoute requireRoles={['admin', 'support']}>
              <SupportRoutineReviewPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div data-testid="home">home</div>} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <div data-testid="admin-only">admin-dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupportRoutineReviewPage route (F-01 Cursor evidence)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.loading = false
    authState.isProfileResolved = true
    listInReview.mockResolvedValue([
      {
        id: 'ver-in-review',
        routine_id: 'r1',
        version_ordinal: null,
        status: 'in_review',
        draft_revision: 'rev-abc',
        author_id: 'admin-1',
        published_at: null,
        retired_at: null,
        created_at: '2026-11-16T00:00:00Z',
        payload: {
          sections: [
            {
              id: 'safety',
              kind: 'safety',
              items: [{ id: 'sg1', type: 'safety_gate', instruction: DRAFT_MARKER }],
            },
          ],
        },
        routine_code: 'RA-SAW-OK',
        routine_name: 'Saw OK',
      },
    ])
  })

  it('lets Support open the review surface and see in-review queue', async () => {
    authState.user = { id: 'support-1', role: 'support' }
    authState.supabaseUser = { id: 'support-1' }
    renderAt('/support/routines')
    await waitFor(() => expect(screen.getByTestId('support-routine-review-page')).toBeInTheDocument())
    expect(screen.getByTestId('service-routine-review-panel')).toBeInTheDocument()
    expect(screen.getByText('RA-SAW-OK')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Record review/i })).toBeInTheDocument()
    expect(listInReview).toHaveBeenCalled()
  })

  it('keeps Admin dashboard requireAdmin — Support cannot open /admin', async () => {
    authState.user = { id: 'support-1', role: 'support' }
    authState.supabaseUser = { id: 'support-1' }
    renderAt('/admin')
    await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument())
    expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument()
  })

  it('denies Technician the review route and does not expose draft content', async () => {
    authState.user = { id: 'tech-1', role: 'technician' }
    authState.supabaseUser = { id: 'tech-1' }
    renderAt('/support/routines')
    await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument())
    expect(screen.queryByTestId('support-routine-review-page')).not.toBeInTheDocument()
    expect(screen.queryByText(DRAFT_MARKER)).not.toBeInTheDocument()
    expect(screen.queryByText('RA-SAW-OK')).not.toBeInTheDocument()
    expect(listInReview).not.toHaveBeenCalled()
  })

  it('denies Customer the review route and does not expose draft content', async () => {
    authState.user = { id: 'cust-1', role: 'customer' }
    authState.supabaseUser = { id: 'cust-1' }
    renderAt('/support/routines')
    await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument())
    expect(screen.queryByTestId('support-routine-review-page')).not.toBeInTheDocument()
    expect(screen.queryByText(DRAFT_MARKER)).not.toBeInTheDocument()
    expect(listInReview).not.toHaveBeenCalled()
  })
})
