import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { StaffDailyOpsStrip } from './StaffDailyOpsStrip'

const getStaffDailyOpsWorkspace = vi.fn()

vi.mock('@/lib/staffDailyOpsApi', () => ({
  getStaffDailyOpsWorkspace: (...a: unknown[]) => getStaffDailyOpsWorkspace(...a),
}))

const emptyWorkspace = {
  as_of: '2026-11-19',
  overdue_occurrences: { count: 0, items: [] },
  unassigned_jobs: { count: 0, items: [] },
  jobs_awaiting_review: { count: 0, items: [] },
  awaiting_customer: { count: 0, items: [] },
}

function renderStrip() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StaffDailyOpsStrip />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StaffDailyOpsStrip (DO-1)', () => {
  beforeEach(() => {
    getStaffDailyOpsWorkspace.mockReset()
  })

  it('DO-01: shows four zero chips and muted empty when queue opened', async () => {
    getStaffDailyOpsWorkspace.mockResolvedValue(emptyWorkspace)
    renderStrip()
    await waitFor(() => expect(screen.getByTestId('staff-daily-ops-chips')).toBeTruthy())
    expect(screen.getByTestId('staff-daily-ops-count-overdue_occurrences').textContent).toBe('0')
    expect(screen.getByTestId('staff-daily-ops-count-unassigned_jobs').textContent).toBe('0')
    expect(screen.getByTestId('staff-daily-ops-count-jobs_awaiting_review').textContent).toBe('0')
    expect(screen.getByTestId('staff-daily-ops-count-awaiting_customer').textContent).toBe('0')
    expect(screen.queryByTestId('staff-daily-ops-error')).toBeNull()
    fireEvent.click(screen.getByTestId('staff-daily-ops-chip-overdue_occurrences'))
    expect(screen.getByTestId('staff-daily-ops-empty').textContent).toMatch(/No overdue generated/)
  })

  it('DO-02/05/06: count equals listed rows and next-action links tickets', async () => {
    getStaffDailyOpsWorkspace.mockResolvedValue({
      as_of: '2026-11-19',
      overdue_occurrences: {
        count: 2,
        items: [
          {
            occurrence_id: 'o1',
            coverage_id: 'c1',
            sequence: 1,
            planned_due_date: '2026-11-01',
            ticket_id: 't-open-1',
            job_id: 'j1',
            ticket_number: 'T-1',
            ticket_title: 'Maint A',
            ticket_status: 'in_progress',
          },
          {
            occurrence_id: 'o2',
            coverage_id: 'c1',
            sequence: 2,
            planned_due_date: '2026-11-02',
            ticket_id: 't-open-2',
            job_id: 'j2',
            ticket_number: 'T-2',
            ticket_title: 'Maint B',
            ticket_status: 'assigned',
          },
        ],
      },
      unassigned_jobs: {
        count: 1,
        items: [
          {
            job_id: 'ju1',
            ticket_id: 't-u',
            job_sequence: 1,
            job_title: 'Job 1',
            job_state: 'unassigned',
            assigned_technician_id: null,
            ticket_number: 'T-U',
            ticket_title: 'Open',
            ticket_status: 'in_progress',
          },
        ],
      },
      jobs_awaiting_review: {
        count: 1,
        items: [
          {
            job_id: 'jr1',
            ticket_id: 't-r',
            job_sequence: 1,
            job_title: 'Job review',
            job_state: 'awaiting_review',
            assigned_technician_id: 'tech',
            ticket_number: 'T-R',
            ticket_title: 'Review me',
            ticket_status: 'in_progress',
          },
        ],
      },
      awaiting_customer: {
        count: 1,
        items: [
          {
            ticket_id: 't-ac',
            ticket_number: 'T-AC',
            ticket_title: 'Need reply',
            ticket_status: 'awaiting_customer',
            priority: 'medium',
          },
        ],
      },
    })
    renderStrip()
    await waitFor(() => expect(screen.getByTestId('staff-daily-ops-count-overdue_occurrences').textContent).toBe('2'))
    fireEvent.click(screen.getByTestId('staff-daily-ops-chip-overdue_occurrences'))
    const overdueRows = screen.getAllByTestId('staff-daily-ops-row')
    expect(overdueRows).toHaveLength(2)
    expect(screen.getByTestId('staff-daily-ops-queue-count').textContent).toBe('2')
    const links = screen.getAllByTestId('staff-daily-ops-next-action')
    expect(links[0].getAttribute('href')).toBe('/support/tickets/t-open-1')

    fireEvent.click(screen.getByTestId('staff-daily-ops-chip-jobs_awaiting_review'))
    expect(screen.getByTestId('staff-daily-ops-chip-jobs_awaiting_review').textContent).toMatch(/Jobs awaiting review/)
    expect(screen.getByTestId('staff-daily-ops-queue-items').querySelectorAll('[data-testid="staff-daily-ops-row"]')).toHaveLength(1)
  })

  it('DO-09: query failure shows alert, not successful zeros', async () => {
    getStaffDailyOpsWorkspace.mockRejectedValue(
      Object.assign(new Error('db down'), { detailCode: 'db_error', status: 500 }),
    )
    renderStrip()
    await waitFor(() => expect(screen.getByTestId('staff-daily-ops-error')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/Queues unavailable/)
    expect(screen.queryByTestId('staff-daily-ops-chips')).toBeNull()
    expect(screen.queryByTestId('staff-daily-ops-count-overdue_occurrences')).toBeNull()
  })

  it('DO-07/08 shaped: 403 surfaces as error, not empty chips', async () => {
    getStaffDailyOpsWorkspace.mockRejectedValue(
      Object.assign(new Error('Not permitted'), {
        detailCode: 'staff_daily_ops_authz_denied',
        status: 403,
      }),
    )
    renderStrip()
    await waitFor(() => expect(screen.getByTestId('staff-daily-ops-error').textContent).toMatch(/staff_daily_ops_authz_denied/))
    expect(screen.getByRole('alert').textContent).toMatch(/staff only/)
    expect(screen.queryByTestId('staff-daily-ops-chips')).toBeNull()
  })

  it('DO-10: strip has no generate control', async () => {
    getStaffDailyOpsWorkspace.mockResolvedValue(emptyWorkspace)
    renderStrip()
    await waitFor(() => expect(screen.getByTestId('staff-daily-ops-chips')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /generate/i })).toBeNull()
  })
})
