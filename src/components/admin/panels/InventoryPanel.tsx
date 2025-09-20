import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { useToast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { Button as Btn } from '@/components/ui/button'
import { CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { table } from '@/lib/data/clientCore'
import type { Database, ProductCategory } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']

type ServerPage<T> = { rows: T[]; total: number }

export const InventoryPanel: React.FC = () => {
  const [data, setData] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { toast } = useToast()

  // filters
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<ProductCategory | 'all'>('all')
  const [stockStatus, setStockStatus] = React.useState<'all' | 'ok' | 'low' | 'out'>('all')
  const [active, setActive] = React.useState<'all' | 'active' | 'inactive'>('all')

  // server-side paging
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)

  // selection + bulk
  const [selectedRows, setSelectedRows] = React.useState<Product[]>([])
  const [selectionResetKey, setSelectionResetKey] = React.useState(0)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<
    | { type: 'activate' }
    | { type: 'deactivate' }
    | { type: 'stock'; delta: number | '' }
  >()

  const fetchServerPage = React.useCallback(async (): Promise<ServerPage<Product>> => {
    let query = supabase.from('products').select('*', { count: 'exact' })

    if (category !== 'all') query = query.eq('category', category)
    if (active !== 'all') query = query.eq('is_active', active === 'active')
    if (stockStatus === 'ok') query = query.gt('stock_quantity', 10)
    if (stockStatus === 'low') query = query.gt('stock_quantity', 0).lte('stock_quantity', 10)
    if (stockStatus === 'out') query = query.eq('stock_quantity', 0)
    if (search) query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%`)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to).order('stock_quantity', { ascending: true })

    if (error) throw error
    return { rows: (data as Product[]) ?? [], total: count ?? 0 }
  }, [page, pageSize, category, stockStatus, active, search])

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    fetchServerPage()
      .then(({ rows, total }) => { if (!mounted) return; setData(rows); setTotal(total) })
      .catch((e) => { if (!mounted) return; setError('Failed to load inventory'); console.error(e) })
      .finally(() => mounted && setLoading(false))

    const ch = supabase
      .channel('inventory-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchServerPage().then(({ rows, total }) => { setData(rows); setTotal(total) })
      })
      .subscribe()
    return () => { mounted = false; ch.unsubscribe() }
  }, [fetchServerPage])

  // bulk helpers (similar to ProductsPanel)
  const bulkSetActive = async (active: boolean) => {
    const ids = selectedRows.map((r) => r.id)
    if (!ids.length) return
    const prev = [...data]
    setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, is_active: active } : r)))
    type InClient = { update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> } }
    const { error } = await (table('products') as unknown as InClient)
      .update({ is_active: active })
      .in('id', ids)
    if (error) {
      setData(prev)
      const msg = (error as { message?: string } | null)?.message ?? 'Unknown error'
      toast({ title: 'Bulk update failed', description: msg, variant: 'destructive' })
      return
    }
    toast({ title: `Updated ${ids.length} product(s)` })
    setSelectionResetKey((k) => k + 1)
  }

  const bulkAdjustStock = async (delta: number) => {
    const ids = selectedRows.map((r) => r.id)
    if (!ids.length) return
    const prev = [...data]
    setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, stock_quantity: Math.max(0, r.stock_quantity + delta) } : r)))
    const errors = await Promise.all(
      ids.map(async (id) => {
        const row = prev.find((p) => p.id === id)!
        const newQty = Math.max(0, row.stock_quantity + delta)
        type EqClient = { update: (v: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
        const { error } = await (table('products') as unknown as EqClient)
          .update({ stock_quantity: newQty })
          .eq('id', id)
        return error
      })
    )
    const failed = errors.find((e) => e)
    if (failed) {
      setData(prev)
      const msg = (failed as { message?: string } | null)?.message ?? 'Unknown error'
      toast({ title: 'Stock adjustment failed', description: msg, variant: 'destructive' })
      return
    }
    toast({ title: `Adjusted stock for ${ids.length} product(s)` })
    setSelectionResetKey((k) => k + 1)
  }

  const columns: ColumnDef<Product>[] = [
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'name_en', header: 'Name' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'stock_quantity', header: 'Stock' },
    { accessorKey: 'min_stock_level', header: 'Min' },
    { accessorKey: 'max_stock_level', header: 'Max' },
    { accessorKey: 'is_active', header: 'Active', cell: ({ getValue }) => (getValue() ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>) },
  ]

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Btn size="sm" variant="secondary" disabled={selectedRows.length === 0} onClick={() => { setPendingAction({ type: 'activate' }); setConfirmOpen(true) }}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
          </Btn>
          <Btn size="sm" variant="secondary" disabled={selectedRows.length === 0} onClick={() => { setPendingAction({ type: 'deactivate' }); setConfirmOpen(true) }}>
            <XCircle className="mr-2 h-4 w-4" /> Deactivate
          </Btn>
          <Btn size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => { setPendingAction({ type: 'stock', delta: 1 }); setConfirmOpen(true) }}>
            <ArrowUpDown className="mr-2 h-4 w-4" /> Adjust stock
          </Btn>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <label className="text-xs text-muted-foreground">Search SKU/Name</label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="e.g. ALM-123 or Saw" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v: string) => { setCategory(v as ProductCategory | 'all'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="machine">Machine</SelectItem>
                <SelectItem value="spare_part">Spare Part</SelectItem>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="accessory">Accessory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Stock</label>
            <Select value={stockStatus} onValueChange={(v: string) => { setStockStatus(v as 'all' | 'ok' | 'low' | 'out'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="out">Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Active</label>
            <Select value={active} onValueChange={(v: string) => { setActive(v as 'all' | 'active' | 'inactive'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => { setSearch(''); setCategory('all'); setStockStatus('all'); setActive('all'); setPage(1) }}>Reset</Button>
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
              {pendingAction?.type === 'activate' && 'Activate selected products?'}
              {pendingAction?.type === 'deactivate' && 'Deactivate selected products?'}
              {pendingAction?.type === 'stock' && 'Adjust stock for selected?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update {selectedRows.length} product(s). This action can be reverted manually if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAction?.type === 'stock' && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground">Delta (can be negative)</label>
              <Input
                type="number"
                step="1"
                value={pendingAction.delta === '' ? '' : String(pendingAction.delta)}
                onChange={(e) => {
                  const v = e.target.value
                  setPendingAction({ type: 'stock', delta: v === '' ? '' : Number(v) })
                }}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingAction) return
                if (pendingAction.type === 'activate') await bulkSetActive(true)
                if (pendingAction.type === 'deactivate') await bulkSetActive(false)
                if (pendingAction.type === 'stock' && pendingAction.delta !== '' && Number.isFinite(Number(pendingAction.delta))) {
                  await bulkAdjustStock(Number(pendingAction.delta))
                }
                setConfirmOpen(false)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default InventoryPanel
