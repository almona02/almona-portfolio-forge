import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceMachineCoveragePanel } from './ServiceMachineCoveragePanel'

const createMachineCoverage = vi.fn()
const pauseMachineCoverage = vi.fn()
const listMachineCoverageSchedule = vi.fn()

vi.mock('@/lib/serviceMachineCoverageApi', () => ({
  createMachineCoverage: (...a: unknown[]) => createMachineCoverage(...a),
  pauseMachineCoverage: (...a: unknown[]) => pauseMachineCoverage(...a),
  resumeMachineCoverage: vi.fn(),
  endMachineCoverage: vi.fn(),
  generateMachineCoverageOccurrences: vi.fn(),
  listMachineCoverageSchedule: (...a: unknown[]) => listMachineCoverageSchedule(...a),
  adoptMachineCoverageRoutineVersion: vi.fn(),
  changeMachineCoverageCadence: vi.fn(),
}))

describe('ServiceMachineCoveragePanel', () => {
  beforeEach(() => {
    createMachineCoverage.mockReset()
    pauseMachineCoverage.mockReset()
    listMachineCoverageSchedule.mockReset()
  })

  it('renders create and manage controls', () => {
    render(<ServiceMachineCoveragePanel />)
    expect(screen.getByTestId('service-machine-coverage-panel')).toBeInTheDocument()
    expect(screen.getByTestId('coverage-create')).toBeInTheDocument()
    expect(screen.getByTestId('coverage-pause')).toBeInTheDocument()
    expect(screen.getByTestId('coverage-generate')).toBeInTheDocument()
  })

  it('creates coverage and shows result', async () => {
    createMachineCoverage.mockResolvedValue({
      coverage_id: 'cov-1',
      status: 'active',
      routine_version_id: 'v1',
      machine_id: 'm1',
      routine_id: 'r1',
      start_date: '2026-01-01',
      end_date: null,
      cadence_interval: 30,
      cadence_unit: 'days',
      first_planned_due_date: '2026-01-31',
      schedule_anchor_day: 31,
    })
    render(<ServiceMachineCoveragePanel />)
    fireEvent.change(screen.getByLabelText(/Machine id/i), { target: { value: 'm1' } })
    fireEvent.change(screen.getByLabelText(/Published routine version id/i), { target: { value: 'v1' } })
    fireEvent.change(screen.getByLabelText(/Start date/i), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText(/First due/i), { target: { value: '2026-01-31' } })
    fireEvent.click(screen.getByTestId('coverage-create'))
    await waitFor(() => expect(screen.getByTestId('coverage-message')).toHaveTextContent('cov-1'))
    expect(createMachineCoverage).toHaveBeenCalled()
  })

  it('surfaces authz deny detail for technician/customer-shaped errors', async () => {
    pauseMachineCoverage.mockRejectedValue(
      Object.assign(new Error('Not permitted'), {
        detailCode: 'coverage_authz_denied',
        status: 403,
      }),
    )
    render(<ServiceMachineCoveragePanel />)
    fireEvent.change(screen.getByLabelText(/^Coverage id$/i), { target: { value: 'cov-1' } })
    fireEvent.click(screen.getByTestId('coverage-pause'))
    await waitFor(() =>
      expect(screen.getByTestId('coverage-error')).toHaveTextContent('coverage_authz_denied'),
    )
  })
})
