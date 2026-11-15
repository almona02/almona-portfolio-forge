// @vitest-environment jsdom
// Run: npx vitest run src/components/support/CustomerReportAcknowledgmentPanel.b6.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerReportAcknowledgmentPanel } from './CustomerReportAcknowledgmentPanel'

const getAck = vi.fn()
const recordAck = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  getEffectiveAcknowledgment: (...args: unknown[]) => getAck(...args),
  recordServiceAcknowledgment: (...args: unknown[]) => recordAck(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPanel(canRespond = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CustomerReportAcknowledgmentPanel
        issuedRevisionId="rev-1"
        revisionNumber={1}
        canRespond={canRespond}
      />
    </QueryClientProvider>,
  )
}

describe('CustomerReportAcknowledgmentPanel B6', () => {
  beforeEach(() => {
    getAck.mockReset()
    recordAck.mockReset()
    getAck.mockResolvedValue(null)
  })

  it('records acceptance for the exact issued revision', async () => {
    recordAck.mockResolvedValue({
      id: 'a1',
      issued_revision_id: 'rev-1',
      response: 'accepted',
      comment: null,
      responded_by: 'cust-1',
      responded_at: '2026-11-15T12:00:00.000Z',
    })
    const user = userEvent.setup()
    renderPanel()
    expect(await screen.findByTestId('customer-ack-panel')).toBeInTheDocument()
    await user.click(screen.getByTestId('customer-ack-accept'))
    await waitFor(() =>
      expect(recordAck).toHaveBeenCalledWith({
        issuedRevisionId: 'rev-1',
        response: 'accepted',
        comment: undefined,
      }),
    )
  })

  it('requires comment path for refusal (sends comment)', async () => {
    recordAck.mockResolvedValue({
      id: 'a2',
      issued_revision_id: 'rev-1',
      response: 'refused',
      comment: 'not fixed',
      responded_by: 'cust-1',
      responded_at: '2026-11-15T12:00:00.000Z',
    })
    const user = userEvent.setup()
    renderPanel()
    await screen.findByTestId('customer-ack-panel')
    await user.type(screen.getByTestId('customer-ack-comment'), 'not fixed')
    await user.click(screen.getByTestId('customer-ack-refuse'))
    await waitFor(() =>
      expect(recordAck).toHaveBeenCalledWith({
        issuedRevisionId: 'rev-1',
        response: 'refused',
        comment: 'not fixed',
      }),
    )
  })

  it('hides respond controls when canRespond is false', async () => {
    getAck.mockResolvedValue({
      id: 'a1',
      issued_revision_id: 'rev-1',
      response: 'unavailable',
      comment: 'no reply',
      responded_by: 'sup-1',
      responded_at: '2026-11-15T12:00:00.000Z',
    })
    renderPanel(false)
    expect(await screen.findByTestId('customer-ack-effective')).toHaveTextContent('unavailable')
    expect(screen.queryByTestId('customer-ack-accept')).not.toBeInTheDocument()
  })
})
