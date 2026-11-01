import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ManufacturingConfigPanel } from './ManufacturingConfigPanel'
import { MANUFACTURING_ADMIN_LINKS, MANUFACTURING_READ_ONLY_CONSTRAINTS } from '@/components/admin/manufacturingAdminLinks'

vi.mock('@/components/fabricator/FabricatorConfigurator', () => ({
  FabricatorConfigurator: () => <div data-testid="fabricator-configurator">configurator</div>,
}))

afterEach(cleanup)

describe('ManufacturingConfigPanel', () => {
  it('renders one "Open" link per registered configurator with the registry href', () => {
    render(<MemoryRouter><ManufacturingConfigPanel /></MemoryRouter>)
    for (const link of MANUFACTURING_ADMIN_LINKS) {
      expect(screen.getByTestId(`manufacturing-link-${link.id}`)).toHaveAttribute('href', link.href)
      expect(screen.getByText(link.label)).toBeInTheDocument()
    }
  })

  it('embeds the workshop configurator', () => {
    render(<MemoryRouter><ManufacturingConfigPanel /></MemoryRouter>)
    expect(screen.getByTestId('fabricator-configurator')).toBeInTheDocument()
  })

  it('shows hard constraints read-only — no inputs inside the constraints card', () => {
    render(<MemoryRouter><ManufacturingConfigPanel /></MemoryRouter>)
    const card = screen.getByTestId('manufacturing-constraints')
    expect(within(card).queryAllByRole('textbox')).toHaveLength(0)
    expect(within(card).queryAllByRole('spinbutton')).toHaveLength(0)
    expect(within(card).queryAllByRole('checkbox')).toHaveLength(0)
    expect(within(card).queryAllByRole('button')).toHaveLength(0)
    for (const c of MANUFACTURING_READ_ONLY_CONSTRAINTS) {
      expect(within(card).getByTestId(`manufacturing-constraint-${c.id}`)).toHaveTextContent(c.label)
    }
  })
})
