import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ProductsPanel from './ProductsPanel'
import CustomersPanel from './CustomersPanel'
import InventoryPanel from './InventoryPanel'
import FinancePanel from './FinancePanel'
import OrdersPanel from './OrdersPanel'
import ReportsPanel from './ReportsPanel'

const { eq } = vi.hoisted(() => ({ eq: vi.fn() }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/lib/data/clientCore', () => ({ table: vi.fn() }))
vi.mock('@/components/admin/dialogs/ProductDetailDialog', () => ({ default: () => null }))
vi.mock('@/components/admin/dialogs/OrderDetailDialog', () => ({ default: () => null }))
vi.mock('@/components/ui/data-table', () => ({ DataTable: () => <div>Table</div> }))
vi.mock('@/lib/supabase', () => ({ supabase: {
  from: () => {
    const query: Record<string, unknown> = {}
    for (const key of ['select', 'gt', 'gte', 'lt', 'lte', 'order', 'range', 'ilike', 'or']) query[key] = () => query
    query.eq = (...args: unknown[]) => { eq(...args); return query }
    query.then = (resolve: (value: unknown) => void) => resolve({ data: [], count: 0, error: null })
    return query
  },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel, unsubscribe: vi.fn() }; return channel },
  removeChannel: vi.fn(),
} }))

// jsdom omits the scrolling API used by the real Radix listbox.
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn() })
afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

afterEach(() => { cleanup(); eq.mockClear() })

describe('Admin panel filter accessibility', () => {
  it.each([
    ['Products', ProductsPanel, ['Search SKU', 'Category', 'Stock', 'Active']],
    ['Customers', CustomersPanel, ['Search name/company/username', 'Role', 'Sector', 'Governorate', 'Verified']],
    ['Inventory', InventoryPanel, ['Search SKU/Name', 'Category', 'Stock', 'Active']],
    ['Finance', FinancePanel, ['Payment', 'From', 'To']],
    ['Orders', OrdersPanel, ['Search ID', 'Status', 'From', 'To']],
    ['Reports', ReportsPanel, ['From', 'To']],
  ] as const)('%s associates visible labels with focusable controls', async (_name, Panel, labels) => {
    const { container } = render(<Panel />)
    for (const label of labels) {
      const control = screen.getByLabelText(label)
      expect(['INPUT', 'BUTTON']).toContain(control.tagName)
      expect(control).toHaveAccessibleName(label)
    }
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    // Layout and contrast require a browser; panels are scanned as isolated fragments.
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => node.html) }))).toEqual([])
  })

  it('selects a customer role using only the keyboard and applies the filter', async () => {
    const user = userEvent.setup()
    render(<CustomersPanel />)
    const role = screen.getByRole('combobox', { name: 'Role' })
    role.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{End}{Enter}')
    await waitFor(() => expect(eq).toHaveBeenCalledWith('role', 'support'))
    expect(role).toHaveTextContent(/support/i)
    expect(role).toHaveFocus()
  })
})
