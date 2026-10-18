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
import * as Dialog from '@radix-ui/react-dialog'
import { adminNavigationItems } from '@/components/admin/adminNavigation'
import '@/styles/admin-theme.css'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Bell,
  LogOut,
  Menu,
  Settings,
  Shield,
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
const AuditLogPanel = lazyRetry(() => import('@/components/admin/panels/AuditLogPanel'), 'AuditLogPanel')
const UserRolePanel = lazyRetry(() => import('@/components/admin/panels/UserRolePanel'), 'UserRolePanel')
const TechnicianWorkloadPanel = lazyRetry(() => import('@/components/admin/panels/TechnicianWorkloadPanel'), 'TechnicianWorkloadPanel')
const UsedMachinesAdminPanel = lazyRetry(() => import('@/components/admin/panels/UsedMachinesAdminPanel'), 'UsedMachinesAdminPanel')
const MachinesAdminPanel = lazyRetry(() => import('@/components/admin/panels/MachinesAdminPanel'), 'MachinesAdminPanel')
const ServiceContractsAdminPanel = lazyRetry(() => import('@/components/admin/panels/ServiceContractsAdminPanel'), 'ServiceContractsAdminPanel')
const AdminSettingsPanel = lazyRetry(() => import('@/components/admin/panels/AdminSettingsPanel'), 'AdminSettingsPanel')
const ServicePackagesPanel = lazyRetry(() => import('@/components/admin/panels/ServicePackagesPanel'), 'ServicePackagesPanel')

type Notification = { id: string; title: string; message: string; created_at: string }

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = adminNavigationItems.some(item => item.id === requestedTab) ? requestedTab! : 'overview'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef(false)
  const accountSelection = useRef(false)
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  })

  const navigationItems = adminNavigationItems

  useEffect(() => {
    document.body.classList.add('almona-admin-theme')
    return () => document.body.classList.remove('almona-admin-theme')
  }, [])

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
      case 'used-machines':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading used machines…</div>}>
            <UsedMachinesAdminPanel />
          </React.Suspense>
        )
      case 'machines':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading machine catalog…</div>}>
            <MachinesAdminPanel />
          </React.Suspense>
        )
      case 'service-contracts':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading service contracts…</div>}>
            <ServiceContractsAdminPanel />
          </React.Suspense>
        )
      case 'service-packages':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading service packages…</div>}>
            <ServicePackagesPanel />
          </React.Suspense>
        )
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
      case 'configuration':
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading configuration…</div>}>
            <AdminSettingsPanel />
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

  const navigation = (
    <nav aria-label="Admin sections" className="space-y-1 p-3">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="ghost"
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => selectTab(id)}
          className={cn('min-h-11 w-full justify-start gap-3', activeTab === id && 'border border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25')}
        >
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
          {label}
        </Button>
      ))}
    </nav>
  )

  return (
    <div className="almona-admin-theme almona-admin-shell min-h-screen bg-background text-foreground">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-background focus:p-3 focus:text-foreground focus:ring-2 focus:ring-ring">
        Skip to admin content
      </a>
      <aside aria-label="Administration" className="admin-desktop-sidebar fixed bottom-0 left-0 z-40 hidden w-64 flex-col border-r border-amber-500/15 bg-slate-950 lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Shield aria-hidden="true" className="h-6 w-6 text-amber-400" />
          <span className="text-xl font-semibold">Almona Admin</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{navigation}</div>
        <div className="flex shrink-0 items-center gap-3 border-t p-4">
          <Avatar aria-hidden="true">
            <AvatarImage src={user?.avatar_url || undefined} alt="" />
            <AvatarFallback>{(user?.email || 'A').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.full_name || user?.email}</p>
            <p className="text-sm text-muted-foreground">Administrator</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky z-30 border-b border-amber-500/15 bg-slate-950/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <Dialog.Trigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin navigation">
                    <Menu aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-[1090] bg-black/60" />
                  <Dialog.Content
                    className="fixed inset-y-0 left-0 z-[1100] flex w-72 max-w-[90vw] flex-col bg-background text-foreground shadow-xl"
                    onCloseAutoFocus={event => {
                      if (pendingFocus.current) {
                        event.preventDefault()
                        headingRef.current?.focus()
                        pendingFocus.current = false
                      }
                    }}
                  >
                    <div className="flex min-h-16 items-center justify-between border-b px-4">
                      <Dialog.Title className="text-lg font-semibold">Admin navigation</Dialog.Title>
                      <Dialog.Close asChild>
                        <Button variant="ghost" size="icon" aria-label="Close admin navigation">×</Button>
                      </Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">Choose an administration section.</Dialog.Description>
                    <div className="min-h-0 flex-1 overflow-y-auto">{navigation}</div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <span className="truncate font-semibold">Almona Administration</span>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${notifications.length})`}>
                    <Bell aria-hidden="true" className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                        {notifications.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
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
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Account menu">
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
                    <Settings aria-hidden="true" className="mr-2 h-4 w-4" />
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

        <main id="admin-main" tabIndex={-1} aria-labelledby="admin-heading" className="min-w-0 p-4 sm:p-6">
          <div className="mb-6">
            <h1 id="admin-heading" ref={headingRef} tabIndex={-1} className="typography-h1 break-words focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{navigationItems.find((i) => i.id === activeTab)?.label || 'Dashboard'}</h1>
            <p className="text-muted-foreground">Manage your industrial e-commerce platform</p>
          </div>
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
