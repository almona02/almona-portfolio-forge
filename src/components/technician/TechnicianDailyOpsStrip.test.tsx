import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TechnicianDailyOpsStrip } from './TechnicianDailyOpsStrip'

const getTechnicianDailyOpsWorkspace = vi.fn()

vi.mock('@/lib/technicianDailyOpsApi', () => ({
  getTechnicianDailyOpsWorkspace: (...a: unknown[]) => getTechnicianDailyOpsWorkspace(...a),
}))

const emptyWorkspace = {
  as_of: '2026-03-15',
  window_end: '2026-03-22',
  timezone: 'Africa/Cairo',
  assigned_jobs: { count: 0, items: [] },
  upcoming_visits: { count: 0, items: [] },
  needs_attention: { count: 0, items: [] },
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TechnicianDailyOpsStrip (DO-2)', () => {
  beforeEach(() => {
    getTechnicianDailyOpsWorkspace.mockReset()
  })

  it('shows distinct empty zeros (not error)', async () => {
    getTechnicianDailyOpsWorkspace.mockResolvedValue(emptyWorkspace)
    wrap(<TechnicianDailyOpsStrip />)
    await waitFor(() => expect(screen.getByTestId('technician-daily-ops-chips')).toBeTruthy())
    expect(screen.getByTestId('technician-daily-ops-count-assigned_jobs').textContent).toBe('0')
    expect(screen.queryByTestId('technician-daily-ops-error')).toBeNull()
    fireEvent.click(screen.getByTestId('technician-daily-ops-chip-assigned_jobs'))
    expect(screen.getByTestId('technician-daily-ops-empty').textContent).toMatch(/No assigned open jobs/)
  })

  it('links match counted needs-attention href with panel', async () => {
    getTechnicianDailyOpsWorkspace.mockResolvedValue({
      ...emptyWorkspace,
      needs_attention: {
        count: 1,
        items: [
          {
            visit_id: 'v1',
            job_id: 'j1',
            ticket_id: 't1',
            job_title: 'Job',
            reason_code: 'report_submit',
            panel: 'report',
            href: '/support/tickets/t1?job=j1&visit=v1&panel=report',
          },
        ],
      },
    })
    wrap(<TechnicianDailyOpsStrip />)
    await waitFor(() =>
      expect(screen.getByTestId('technician-daily-ops-count-needs_attention').textContent).toBe('1'),
    )
    fireEvent.click(screen.getByTestId('technician-daily-ops-chip-needs_attention'))
    const link = screen.getByTestId('technician-daily-ops-next-action')
    expect(link.getAttribute('href')).toBe('/support/tickets/t1?job=j1&visit=v1&panel=report')
  })

  it('shows error UI without successful zero chips', async () => {
    getTechnicianDailyOpsWorkspace.mockRejectedValue(
      Object.assign(new Error('denied'), {
        status: 403,
        detailCode: 'technician_daily_ops_authz_denied',
      }),
    )
    wrap(<TechnicianDailyOpsStrip />)
    await waitFor(() => expect(screen.getByTestId('technician-daily-ops-error')).toBeTruthy())
    expect(screen.queryByTestId('technician-daily-ops-chips')).toBeNull()
    expect(screen.queryByTestId('technician-daily-ops-count-assigned_jobs')).toBeNull()
  })
})
