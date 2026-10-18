import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminDashboard from './AdminDashboard'
import { AdminNavDropdown } from '@/components/admin/AdminNavDropdown'
import { adminNavigationItems, adminSectionHref } from '@/components/admin/adminNavigation'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin', role: 'admin', email: 'admin@example.test' }, signOut: vi.fn() }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const query: Record<string, unknown> = {}
      for (const key of ['select', 'eq', 'in', 'lt', 'gt', 'order', 'limit']) query[key] = () => query
      query.then = (resolve: (value: unknown) => void) => resolve({ data: [], count: 0 })
      return query
    },
    channel: () => { const channel = { on: () => channel, subscribe: () => channel, unsubscribe: vi.fn() }; return channel },
  },
}))
vi.mock('@/components/admin/SparePartsImportPanel', () => ({ SparePartsImportPanel: () => <div>SparePartsImportPanel</div> }))
vi.mock('@/components/admin/YDTPerformanceDashboard', () => ({ YDTPerformanceDashboard: () => <div>YDTPerformanceDashboard</div> }))
vi.mock('@/components/admin/CustomerActivity', () => ({ CustomerActivity: () => <div>CustomerActivity</div> }))
vi.mock('@/components/admin/DashboardStats', () => ({ DashboardStats: () => <div>DashboardStats</div> }))
vi.mock('@/components/admin/LowStockAlerts', () => ({ LowStockAlerts: () => <div>LowStockAlerts</div> }))
vi.mock('@/components/admin/RecentOrders', () => ({ RecentOrders: () => <div>RecentOrders</div> }))
vi.mock('@/components/admin/TopProducts', () => ({ TopProducts: () => <div>TopProducts</div> }))
vi.mock('@/components/support/AdminTicketDashboard', () => ({ AdminTicketDashboard: () => <div>Support content</div> }))
vi.mock('@/components/governance/GovernanceHealthMini', () => ({ GovernanceHealthMini: () => <div>Governance</div> }))
vi.mock('@/utils/lazyImport', () => ({ lazyRetry: (_loader: unknown, name: string) => () => <div>{name} content</div> }))

afterEach(cleanup)
function HistoryControls() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="Current URL">{location.search}</output><button onClick={() => navigate(-1)}>Back</button></>
}
function setup(url = '/admin') {
  return render(<MemoryRouter initialEntries={[url]}><AdminDashboard /><HistoryControls /></MemoryRouter>)
}

describe('Admin accessibility and navigation', () => {
  it('loads deep links and provides named landmarks and controls', () => {
    setup('/admin?tab=orders')
    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Orders' })).toHaveAttribute('id', 'admin-main')
    expect(screen.getByRole('link', { name: 'Skip to admin content' })).toHaveAttribute('href', '#admin-main')
    expect(screen.getByRole('button', { name: 'Notifications (0)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps section selection in browser history and focuses its heading', async () => {
    const user = userEvent.setup()
    setup('/admin?keep=yes')
    await user.click(screen.getByRole('button', { name: 'Products' }))
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('?keep=yes&tab=products')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Products' })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
  })

  it('falls back safely for unknown sections', () => {
    setup('/admin?tab=not-a-section')
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
  })

  it('traps keyboard focus in the mobile drawer and restores its trigger on Escape', async () => {
    const user = userEvent.setup()
    setup()
    const trigger = screen.getByRole('button', { name: 'Open admin navigation' })
    await user.click(trigger)
    const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
    const close = within(drawer).getByRole('button', { name: 'Close admin navigation' })
    await waitFor(() => expect(close).toHaveFocus())
    await user.tab({ shift: true })
    expect(within(drawer).getByRole('button', { name: 'Settings' })).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('closes the drawer after selecting a section and focuses the new heading', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Open admin navigation' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reports' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Reports', level: 1 })).toHaveFocus())
  })

  it('opens Settings from the account menu and focuses the section', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toHaveFocus())
  })

  it('global admin menu links every implemented section to its dashboard URL', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AdminNavDropdown /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Admin Panel' }))
    for (const item of adminNavigationItems) {
      expect(screen.getByRole('menuitem', { name: item.label })).toHaveAttribute('href', adminSectionHref(item.id))
    }
  })
})
