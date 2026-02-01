import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { MoreHorizontal, Eye } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import OrderDetailDialog from '@/components/admin/dialogs/OrderDetailDialog'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { table } from '@/lib/data/clientCore'
import type { Database, OrderStatus } from '@/types/database'

type Order = Database['public']['Tables']['orders']['Row']

type ServerPage<T> = {
  rows: T[]
  total: number
}

/**
 * Orders Panel Component
 * 
 * Provides comprehensive order management for administrators.
 * Features:
 * - Real-time order tracking and management
 * - Advanced filtering by status, date ranges, and order ID
 * - Bulk operations for status and payment updates
 * - Server-side pagination for large order datasets
 * - Live updates via Supabase real-time subscriptions
 * - Individual order detail viewing and editing
 * 
 * Displays orders with ID, status, total amount, payment status, and creation date.
 * Supports bulk operations for updating order status and payment status.
 * Includes detailed order view and editing capabilities.
 */
export const OrdersPanel: React.FC = () => {
  type InClient = { update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> } }
  const [data, setData] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { toast } = useToast()

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Order | null>(null)
  const [selectedRows, setSelectedRows] = React.useState<Order[]>([])
  const [selectionResetKey, setSelectionResetKey] = React.useState(0)
  const hasSelection = selectedRows.length > 0
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<
    | { type: 'status'; value: Order['status'] }
    | { type: 'payment'; value: Order['payment_status'] }
  >()
  const [bulkStatusValue, setBulkStatusValue] = React.useState<Order['status'] | ''>('')
  const [bulkPaymentValue, setBulkPaymentValue] = React.useState<Order['payment_status'] | ''>('')

  // filters
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<OrderStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')

  // server-side paging
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)

  const fetchServerPage = React.useCallback(async (): Promise<ServerPage<Order>> => {
    let query = supabase.from('orders').select('*', { count: 'exact' })

    if (status !== 'all') query = query.eq('status', status as any)
    if (search) query = query.ilike('id', `%${search}%`)
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
    if (dateTo) {
      const dt = new Date(dateTo)
      dt.setHours(23, 59, 59, 999)
      query = query.lte('created_at', dt.toISOString())
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })
    if (error) throw error
    return { rows: (data as unknown as Order[]) ?? [], total: count ?? 0 }
  }, [status, search, dateFrom, dateTo, page, pageSize])

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    fetchServerPage()
      .then(({ rows, total }) => {
        if (!mounted) return
        setData(rows)
        setTotal(total)
      })
      .catch((e) => {
        if (!mounted) return
        setError('Failed to load orders')
        console.error(e)
      })
      .finally(() => mounted && setLoading(false))

    const ch = supabase
      .channel('orders-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchServerPage().then(({ rows, total }) => {
          setData(rows)
          setTotal(total)
        })
      })
      .subscribe()
    return () => {
      mounted = false
      ch.unsubscribe()
    }
  }, [fetchServerPage])

  const handleUpdated = (patch: Partial<Order>) => {
    if (!selected) return
    setData((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...patch } as Order : r)))
    toast({ title: 'Order updated', description: `Order ${selected.id} saved.` })
  }

  const columns: ColumnDef<Order>[] = [
    { accessorKey: 'id', header: 'Order ID' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge variant="outline" className="capitalize">{String(getValue())}</Badge> },
    { accessorKey: 'total_amount', header: 'Total', cell: ({ getValue }) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(Number(getValue() ?? 0)) },
    { accessorKey: 'payment_status', header: 'Payment' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => new Date(String(getValue())).toLocaleString() },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original as Order
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelected(item); setDetailOpen(true) }}>
                <Eye className="mr-2 h-4 w-4" /> View / Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Bulk status:</span>
            <Select value={bulkStatusValue} onValueChange={(v: string) => { setBulkStatusValue(v as Order['status']); if (hasSelection) { setPendingAction({ type: 'status', value: v as Order['status'] }); setConfirmOpen(true) } }}>
              <SelectTrigger>
                <SelectValue placeholder={hasSelection ? 'Select status' : 'Select rows first'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Bulk payment:</span>
            <Select value={bulkPaymentValue} onValueChange={(v: string) => { setBulkPaymentValue(v as Order['payment_status']); if (hasSelection) { setPendingAction({ type: 'payment', value: v as Order['payment_status'] }); setConfirmOpen(true) } }}>
              <SelectTrigger>
                <SelectValue placeholder={hasSelection ? 'Select payment' : 'Select rows first'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <label className="typography-label text-xs text-muted-foreground">Search ID</label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="e.g. 8d2f..." />
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v: string) => { setStatus(v as OrderStatus | 'all'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo(''); setPage(1) }}>Reset</Button>
          </div>
        </div>

        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            searchKey={undefined}
            showPagination={false}
            showSelection
            onSelectionChange={setSelectedRows}
            clearSelectionKey={selectionResetKey}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {total} items</div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'status' && 'Apply status to selected orders?'}
              {pendingAction?.type === 'payment' && 'Apply payment status to selected orders?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update {selectedRows.length} order(s). This will apply the change to all selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingAction) return
                const ids = selectedRows.map((r) => r.id)
                if (!ids.length) return
                const prev = [...data]
                if (pendingAction.type === 'status') {
                  const value = pendingAction.value
                  setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, status: value } : r)))
                  type InClient = { update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> } }
                  const { error: err1 } = await (table('orders') as unknown as InClient)
                    .update({ status: value })
                    .in('id', ids)
                  if (err1) {
                    setData(prev)
                    const msg = (err1 as { message?: string } | null)?.message ?? 'Unknown error'
                    toast({ title: 'Bulk status failed', description: msg, variant: 'destructive' })
                    return
                  }
                  toast({ title: `Updated status for ${ids.length} order(s)` })
                } else if (pendingAction.type === 'payment') {
                  const value = pendingAction.value
                  setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, payment_status: value } : r)))
                  const { error: err2 } = await (table('orders') as unknown as InClient)
                    .update({ payment_status: value })
                    .in('id', ids)
                  if (err2) {
                    setData(prev)
                    const msg = (err2 as { message?: string } | null)?.message ?? 'Unknown error'
                    toast({ title: 'Bulk payment failed', description: msg, variant: 'destructive' })
                    return
                  }
                  toast({ title: `Updated payment for ${ids.length} order(s)` })
                }
                setSelectionResetKey((k) => k + 1)
                setBulkStatusValue('')
                setBulkPaymentValue('')
                setConfirmOpen(false)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={selected}
        onUpdated={handleUpdated}
      />
    </Card>
  )
}

export default OrdersPanel
