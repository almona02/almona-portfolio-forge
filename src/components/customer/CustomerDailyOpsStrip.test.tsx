import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomerDailyOpsStrip } from './CustomerDailyOpsStrip'

const getCustomerDailyOpsWorkspace = vi.fn()

vi.mock('@/lib/customerDailyOpsApi', () => ({
  getCustomerDailyOpsWorkspace: (...a: unknown[]) => getCustomerDailyOpsWorkspace(...a),
}))

const emptyWorkspace = {
  as_of: '2026-03-15',
  timezone: 'Africa/Cairo',
  active_tickets: { count: 0, items: [] },
  issued_reports: { count: 0, items: [] },
  awaiting_acknowledgment: { count: 0, items: [] },
  upcoming_service: { count: 0, items: [] },
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

describe('CustomerDailyOpsStrip (DO-3)', () => {
  beforeEach(() => {
    getCustomerDailyOpsWorkspace.mockReset()
  })

  it('shows distinct empty zeros (not error)', async () => {
    getCustomerDailyOpsWorkspace.mockResolvedValue(emptyWorkspace)
    wrap(<CustomerDailyOpsStrip />)
    await waitFor(() => expect(screen.getByTestId('customer-daily-ops-chips')).toBeTruthy())
    expect(screen.getByTestId('customer-daily-ops-count-active_tickets').textContent).toBe('0')
    expect(screen.getByTestId('customer-daily-ops-count-issued_reports').textContent).toBe('0')
    expect(screen.queryByTestId('customer-daily-ops-error')).toBeNull()
    fireEvent.click(screen.getByTestId('customer-daily-ops-chip-active_tickets'))
    expect(screen.getByTestId('customer-daily-ops-empty').textContent).toMatch(/No active service tickets/)
  })

  it('links match counted awaiting-ack href with panel=issued', async () => {
    getCustomerDailyOpsWorkspace.mockResolvedValue({
      ...emptyWorkspace,
      awaiting_acknowledgment: {
        count: 1,
        items: [
          {
            revision_id: 'rev2',
            report_id: 'rep1',
            visit_id: 'v1',
            ticket_id: 't1',
            job_title: 'Job',
            revision_number: 2,
            href: '/support/tickets/t1?visit=v1&panel=issued&revision=rev2',
          },
        ],
      },
    })
    wrap(<CustomerDailyOpsStrip />)
    await waitFor(() =>
      expect(screen.getByTestId('customer-daily-ops-count-awaiting_acknowledgment').textContent).toBe(
        '1',
      ),
    )
    fireEvent.click(screen.getByTestId('customer-daily-ops-chip-awaiting_acknowledgment'))
    const link = screen.getByTestId('customer-daily-ops-next-action')
    expect(link.getAttribute('href')).toBe(
      '/support/tickets/t1?visit=v1&panel=issued&revision=rev2',
    )
  })

  it('shows error UI without successful zero chips', async () => {
    getCustomerDailyOpsWorkspace.mockRejectedValue(
      Object.assign(new Error('denied'), {
        status: 403,
        detailCode: 'customer_daily_ops_authz_denied',
      }),
    )
    wrap(<CustomerDailyOpsStrip />)
    await waitFor(() => expect(screen.getByTestId('customer-daily-ops-error')).toBeTruthy())
    expect(screen.queryByTestId('customer-daily-ops-chips')).toBeNull()
  })
})
