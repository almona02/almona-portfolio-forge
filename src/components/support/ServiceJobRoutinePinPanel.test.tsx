import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const getPin = vi.fn()
const listHistory = vi.fn()
const pin = vi.fn()
const replace = vi.fn()
const unpin = vi.fn()

vi.mock('@/lib/serviceJobRoutinePinsApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/serviceJobRoutinePinsApi')>(
    '@/lib/serviceJobRoutinePinsApi',
  )
  return {
    ...actual,
    getServiceJobRoutinePin: (...args: unknown[]) => getPin(...args),
    listServiceJobRoutinePinHistory: (...args: unknown[]) => listHistory(...args),
    pinServiceJobRoutine: (...args: unknown[]) => pin(...args),
    replaceServiceJobRoutinePin: (...args: unknown[]) => replace(...args),
    unpinServiceJobRoutine: (...args: unknown[]) => unpin(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ServiceJobRoutinePinPanel } from './ServiceJobRoutinePinPanel'
import { pinErrorDetailCode } from '@/lib/serviceJobRoutinePinsApi'

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('ServiceJobRoutinePinPanel', () => {
  beforeEach(() => {
    getPin.mockReset()
    listHistory.mockReset()
    pin.mockReset()
    replace.mockReset()
    unpin.mockReset()
    listHistory.mockResolvedValue({ job_id: 'j1', history: [] })
  })

  it('shows active pin and retired badge for technician read-only', async () => {
    getPin.mockResolvedValue({
      job_id: 'j1',
      pin_locked: false,
      work_started_boundary_at: null,
      active: {
        pin_id: 'p1',
        routine_id: 'r1',
        routine_code: 'LB-1',
        routine_name_en: 'Routine',
        routine_version_id: 'v1',
        version_ordinal: 1,
        version_status: 'retired',
        status: 'active',
        reason: 'was pinned',
        pinned_by: 'a',
        pinned_at: '2026-01-01',
        retired_badge: true,
      },
    })
    wrap(<ServiceJobRoutinePinPanel jobId="j1" viewerRole="technician" />)
    await waitFor(() => expect(screen.getByTestId('active-job-routine-pin')).toBeInTheDocument())
    expect(screen.getByTestId('retired-badge')).toHaveTextContent('Retired')
    expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument()
  })

  it('surfaces exact DETAIL code on mutation denial', async () => {
    getPin.mockResolvedValue({
      job_id: 'j1',
      pin_locked: false,
      work_started_boundary_at: null,
      active: null,
    })
    const err = Object.assign(new Error('locked'), {
      detailCode: 'routine_pin_locked_after_start',
      details: 'routine_pin_locked_after_start',
    })
    pin.mockRejectedValue(err)
    wrap(<ServiceJobRoutinePinPanel jobId="j1" viewerRole="support" />)
    await waitFor(() => expect(screen.getByTestId('no-active-pin')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Published version id/i), 'v1')
    await user.type(screen.getByLabelText(/Reason/i), 'try')
    await user.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() =>
      expect(screen.getByTestId('pin-action-error')).toHaveTextContent(
        'routine_pin_locked_after_start',
      ),
    )
    expect(pinErrorDetailCode(err)).toBe('routine_pin_locked_after_start')
  })

  it('hides panel for customer', () => {
    const { container } = wrap(<ServiceJobRoutinePinPanel jobId="j1" viewerRole="customer" />)
    expect(container).toBeEmptyDOMElement()
  })
})
