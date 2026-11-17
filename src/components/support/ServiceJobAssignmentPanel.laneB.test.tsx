import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/adminTicketApi', () => ({
  getAvailableAssignees: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/ticketGovernanceApi', () => ({
  listServiceJobsForTicket: vi.fn().mockResolvedValue([
    {
      id: 'job-1',
      ticket_id: 't1',
      job_sequence: 1,
      title: 'Job 1',
      state: 'planned',
      assigned_technician_id: 'tech-1',
      technician_name: 'Tech',
      required: true,
    },
  ]),
  createServiceJob: vi.fn(),
  assignServiceJob: vi.fn(),
  declineServiceJob: vi.fn(),
}))

vi.mock('@/components/support/ServiceVisitPanel', () => ({
  ServiceVisitPanel: () => <div data-testid="visit-stub" />,
}))

vi.mock('@/components/support/ServiceJobRoutinePinPanel', () => ({
  ServiceJobRoutinePinPanel: (props: { jobId: string }) => (
    <div data-testid={`pin-panel-${props.jobId}`} />
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ServiceJobAssignmentPanel } from './ServiceJobAssignmentPanel'

describe('ServiceJobAssignmentPanel Lane B mount', () => {
  it('mounts Routines pin panel on each job card', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ServiceJobAssignmentPanel
          ticketId="t1"
          currentUserId="support-1"
          viewerRole="support"
        />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('pin-panel-job-1')).toBeInTheDocument())
  })
})
