import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

/**
 * Finance Panel Component
 * 
 * Provides comprehensive financial data management for administrators.
 * Features:
 * - Real-time order and payment tracking
 * - Advanced filtering by payment status and date ranges
 * - Server-side pagination for large datasets
 * - CSV export functionality
 * - Live updates via Supabase real-time subscriptions
 * 
 * Displays orders with payment status, amounts, and creation dates.
 * Supports filtering by payment status (pending, paid, failed, refunded).
 */

type Order = Database['public']['Tables']['orders']['Row']

type ServerPage<T> = { rows: T[]; total: number }

function toCSV(rows: Order[]) {
  const headers = ['id','status','payment_status','total_amount','currency','created_at']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([
      r.id,
      r.status,
      r.payment_status,
      String(r.total_amount ?? 0),
      r.currency,
      r.created_at,
    ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
  }
  return lines.join('\n')
}

export const FinancePanel: React.FC = () => {
  const [data, setData] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // filters
  const [payment, setPayment] = React.useState<'all' | 'pending' | 'paid' | 'failed' | 'refunded'>('all')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  // server-side paging
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)

  const fetchServerPage = React.useCallback(async (): Promise<ServerPage<Order>> => {
    let query = supabase.from('orders').select('*', { count: 'exact' })
    if (payment !== 'all') query = query.eq('payment_status', payment)
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
  }, [payment, dateFrom, dateTo, page, pageSize])

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    void fetchServerPage()
      .then(({ rows, total }) => { if (!mounted) return; setData(rows); setTotal(total); })
      .catch((e) => { if (!mounted) return; setError('Failed to load finance'); console.error(e); })
      .finally(() => mounted && setLoading(false));

    const ch = supabase
      .channel('finance-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchServerPage().then(({ rows, total }) => { setData(rows); setTotal(total); });
      })
      .subscribe()
    return () => { mounted = false; void ch.unsubscribe(); };
  }, [fetchServerPage])

  const columns: ColumnDef<Order>[] = [
    { accessorKey: 'id', header: 'Order ID' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge variant="outline" className="capitalize">{String(getValue())}</Badge> },
    { accessorKey: 'payment_status', header: 'Payment', cell: ({ getValue }) => <Badge variant="secondary">{String(getValue())}</Badge> },
    { accessorKey: 'total_amount', header: 'Total', cell: ({ getValue }) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(Number(getValue() ?? 0)) },
    { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => new Date(String(getValue())).toLocaleString() },
  ]

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleExportCSV = () => {
    const csv = toCSV(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance_page_${page}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Finance</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>Export CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="typography-label text-xs text-muted-foreground">Payment</label>
            <Select value={payment} onValueChange={(v: string) => { setPayment(v as typeof payment); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
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
            <Button variant="outline" onClick={() => { setPayment('all'); setDateFrom(''); setDateTo(''); setPage(1) }}>Reset</Button>
          </div>
        </div>

        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <DataTable columns={columns} data={data} searchKey={undefined} showPagination={false} />
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {total} orders</div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FinancePanel
