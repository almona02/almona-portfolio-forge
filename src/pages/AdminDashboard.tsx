import { SparePartsImportPanel } from '@/components/admin/SparePartsImportPanel'
import { AdminTicketDashboard } from '@/components/support/AdminTicketDashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { adminNavigationItems } from '@/components/admin/adminNavigation'
import {
  AlertCircle,
  Bell,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
// Dashboard components
import { YDTPerformanceDashboard } from '@/components/admin/YDTPerformanceDashboard'
import { GovernanceHealthMini } from '@/components/governance/GovernanceHealthMini'
import { CustomerActivity } from '../components/admin/CustomerActivity'
import { DashboardStats } from '../components/admin/DashboardStats'
import { LowStockAlerts } from '../components/admin/LowStockAlerts'
import { RecentOrders } from '../components/admin/RecentOrders'
import { TopProducts } from '../components/admin/TopProducts'
// PHASE 4: Use lazyRetry for better reliability
import { lazyRetry } from '@/utils/lazyImport'
import { AuditLogPanel } from '@/components/admin/panels/AuditLogPanel'
import { UserRolePanel } from '@/components/admin/panels/UserRolePanel'
import { TechnicianWorkloadPanel } from '@/components/admin/panels/TechnicianWorkloadPanel'

const SalesChart = lazyRetry(() => import('../components/admin/SalesChart').then(m => ({ default: m.SalesChart })), 'SalesChart')
const ProductsPanel = lazyRetry(() => import('@/components/admin/panels/ProductsPanel'), 'ProductsPanel')
const OrdersPanel = lazyRetry(() => import('@/components/admin/panels/OrdersPanel'), 'OrdersPanel')
const CustomersPanel = lazyRetry(() => import('@/components/admin/panels/CustomersPanel'), 'CustomersPanel')
const InventoryPanel = lazyRetry(() => import('@/components/admin/panels/InventoryPanel'), 'InventoryPanel')
const FinancePanel = lazyRetry(() => import('@/components/admin/panels/FinancePanel'), 'FinancePanel')
const ReportsPanel = lazyRetry(() => import('@/components/admin/panels/ReportsPanel'), 'ReportsPanel')
const SettingsPanel = lazyRetry(() => import('@/components/admin/panels/SettingsPanel'), 'SettingsPanel')
// BusinessKPIDashboard is heavy (charts + ML) - lazy load only when analytics tab is opened
const BusinessKPIDashboard = lazyRetry(() => import('../components/analytics/BusinessKPIDashboard'), 'BusinessKPIDashboard')
// Phase 4: Analytics components
const AnalyticsDashboard = lazyRetry(() => import('../components/ui/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })), 'AnalyticsDashboard')
const AnalyticsQueryBuilder = lazyRetry(() => import('../components/ui/AnalyticsQueryBuilder').then(m => ({ default: m.AnalyticsQueryBuilder })), 'AnalyticsQueryBuilder')

type Notification = { id: string; title: string; message: string; created_at: string }

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = adminNavigationItems.some(item => item.id === requestedTab) ? requestedTab! : 'overview'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef(false)
  const accountSelection = useRef(false)

  const navigationItems = adminNavigationItems

  const selectTab = (id: string) => {
    pendingFocus.current = sidebarOpen
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('tab', id)
      return next
    })
    setSidebarOpen(false)
    if (!sidebarOpen) requestAnimationFrame(() => {
      headingRef.current?.focus()
    })
  }

  useEffect(() => {
    fetchDashboardData()
    fetchNotifications()

    // realtime subscriptions
    const ordersSub = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    const productsSub = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      ordersSub.unsubscribe()
      productsSub.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: false })

      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount,status')
        .eq('status', 'delivered' as any)

      const rows = (revenueData ?? []) as Array<{ total_amount: number | null }>
      const totalRevenue = rows.reduce((sum: number, r) => sum + (r.total_amount ?? 0), 0)

      const { count: totalCustomers } = await supabase.from('profiles').select('*', { count: 'exact' })
      const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact' })

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .in('status', ['pending', 'confirmed', 'processing'] as any[])

      const { count: lowStockItems } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .lt('stock_quantity', 10)
        .gt('stock_quantity', 0)

      setStats({
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        pendingOrders: pendingOrders || 0,
        lowStockItems: lowStockItems || 0,
      })
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error)
      toast({ title: 'Error', description: 'Failed to fetch dashboard data', variant: 'destructive' })
    }
  }

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications((data as unknown as Notification[]) || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <DashboardStats stats={stats} />

            {/* Constitutional automation Governance Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <h3 className="typography-h3 text-lg">Constitutional automation Governance</h3>
              </div>
              <GovernanceHealthMini />
              <div className="p-4 bg-muted/50 border border-border rounded-lg text-sm">
                <div className="font-semibold mb-3 text-foreground">📊 Governance Metrics Explained</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-foreground">Constitutional Health</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Overall governance integrity (0-100). Measures tier compliance, reasoning quality, and violation rates.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Tier 1 Coverage</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      % of strategic decisions using YDT. Tier 1 decisions (pricing, viability, strategy) require YDT.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Reasoning Quality</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      % of YDT responses with proper reasoning. Every YDT decision must explain why.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Tier Violations</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Count of automation operating outside authority bounds. Should always be 0.
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <strong>Refactored Services:</strong> Pricing, Business Viability
                  <br />
                  <strong>Next:</strong> Optimization Strategy
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <React.Suspense fallback={<div role="status" className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>}>
                <SalesChart />
              </React.Suspense>
              <TopProducts />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LowStockAlerts />
              <div className="hidden lg:block" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentOrders />
              <CustomerActivity />
            </div>
          </div>
        )
      case 'ydt-performance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-400" />
              <h2 className="typography-h2 text-lg">YDT Performance Monitoring</h2>
            </div>
            <YDTPerformanceDashboard refreshInterval={5000} />
          </div>
        )
      case 'support':
        return <AdminTicketDashboard currentUserId={user?.id || ''} userRole="admin" />
      case 'technicians':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading technicians…</div>}>
            <TechnicianWorkloadPanel />
          </React.Suspense>
        )
      case 'users':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading users…</div>}>
            <UserRolePanel currentUserId={user?.id || ''} />
          </React.Suspense>
        )
      case 'audit-log':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading audit log…</div>}>
            <AuditLogPanel />
          </React.Suspense>
        )
      case 'spare-parts':
        return <SparePartsImportPanel />
      case 'products':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading products…</div>}>
            <ProductsPanel />
          </React.Suspense>
        )
      case 'orders':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading orders…</div>}>
            <OrdersPanel />
          </React.Suspense>
        )
      case 'customers':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading customers…</div>}>
            <CustomersPanel />
          </React.Suspense>
        )
      case 'inventory':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading inventory…</div>}>
            <InventoryPanel />
          </React.Suspense>
        )
      case 'finance':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading finance…</div>}>
            <FinancePanel />
          </React.Suspense>
        )
      case 'reports':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading reports…</div>}>
            <ReportsPanel />
          </React.Suspense>
        )
      case 'analytics':
        return (
          <div className="space-y-6">
            <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading analytics dashboard…</div>}>
              <AnalyticsDashboard />
            </React.Suspense>
            <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading query builder…</div>}>
              <AnalyticsQueryBuilder />
            </React.Suspense>
            <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading business KPIs…</div>}>
              <BusinessKPIDashboard />
            </React.Suspense>
          </div>
        )
      case 'settings':
        return (
          <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading settings…</div>}>
            <SettingsPanel />
          </React.Suspense>
        )
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management</CardTitle>
              <CardDescription>Manage your {activeTab} from this panel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This section is under development. Check back soon for updates.</p>
            </CardContent>
          </Card>
        )
    }
  }

  // Role guard: only allow admin users
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-3 focus:text-gray-900 focus:ring-2 focus:ring-almona-orange">
        Skip to admin content
      </a>
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        aria-label="Admin sections"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-r border-white/20 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-almona-orange rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Almona Admin</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="h-full overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab === item.id ? 'bg-almona-orange text-white' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t bg-white/60">
          <div className="flex items-center space-x-3">
            <Avatar aria-hidden="true">
              <AvatarImage src={user?.avatar_url || undefined} alt="" />
              <AvatarFallback>{(user?.email || 'A').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || user?.email}</p>
              <p className="text-sm text-gray-500 truncate">Administrator</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-white/20 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input type="search" placeholder="Search..." className="w-full pl-8" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${notifications.length})`}>
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                        {notifications.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem key={n.id} className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-sm text-muted-foreground">{n.message}</p>
                            <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="Account menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} alt="" />
                      <AvatarFallback>{(user?.email || 'A').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onCloseAutoFocus={event => {
                  if (accountSelection.current) {
                    event.preventDefault()
                    accountSelection.current = false
                    headingRef.current?.focus()
                  }
                }}>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { accountSelection.current = true; selectTab('settings') }}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { accountSelection.current = true; selectTab('settings') }}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} aria-labelledby="admin-heading" className="p-6">
          <div className="mb-6">
            <h1 id="admin-heading" ref={headingRef} tabIndex={-1} className="typography-h1 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{navigationItems.find((i) => i.id === activeTab)?.label || 'Dashboard'}</h1>
            <p className="text-muted-foreground">Manage your industrial e-commerce platform</p>
          </div>
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
