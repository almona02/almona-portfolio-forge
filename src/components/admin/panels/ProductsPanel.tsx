import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { MoreHorizontal, Pencil, CheckCircle2, XCircle, Star, ArrowUpDown } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ProductEditDialog, { ProductEditValues } from '@/components/admin/dialogs/ProductEditDialog'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { table } from '@/lib/data/clientCore'
import type { Database, ProductCategory } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']

type ServerPage<T> = {
  rows: T[]
  total: number
}

/**
 * Products Panel Component
 * 
 * Provides comprehensive product management for administrators.
 * Features:
 * - Real-time product catalog management
 * - Advanced filtering by category, stock status, and active status
 * - Bulk operations for product activation, featuring, and stock management
 * - Server-side pagination for large product datasets
 * - Live updates via Supabase real-time subscriptions
 * - Product editing and status management
 * 
 * Displays products with SKU, name, category, price, stock levels, and status.
 * Supports bulk operations for activation, featuring, and stock adjustments.
 * Includes individual product editing capabilities.
 */
export const ProductsPanel: React.FC = () => {
  type InClient = { update: (v: unknown) => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> } }
  type EqClient = { update: (v: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
  const [data, setData] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { toast } = useToast()

  // edit dialog state
  const [editOpen, setEditOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Product | null>(null)
  const [selectedRows, setSelectedRows] = React.useState<Product[]>([])
  const [selectionResetKey, setSelectionResetKey] = React.useState(0)
  const hasSelection = selectedRows.length > 0

  // confirm dialog state
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<
    | { type: 'activate' }
    | { type: 'deactivate' }
    | { type: 'feature' }
    | { type: 'unfeature' }
    | { type: 'stock'; delta: number | '' }
  >()

  // filters
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<ProductCategory | 'all'>('all')
  const [stock, setStock] = React.useState<'all' | 'low' | 'out' | 'in'>('all')
  const [active, setActive] = React.useState<'all' | 'active' | 'inactive'>('all')

  // server-side paging
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)

  const fetchServerPage = React.useCallback(async (): Promise<ServerPage<Product>> => {
    // Build query with filters
    let query = supabase.from('products').select('*', { count: 'exact' })

    if (category !== 'all') query = query.eq('category', category as any)
    if (active !== 'all') query = query.eq('is_active', (active === 'active') as any)
    if (stock === 'low') query = query.gt('stock_quantity', 0 as any).lte('stock_quantity', 10 as any)
    if (stock === 'out') query = query.eq('stock_quantity', 0 as any)
    if (stock === 'in') query = query.gt('stock_quantity', 10 as any)
    if (search) query = query.ilike('sku', `%${search}%`)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })

    if (error) throw error
    return { rows: (data as unknown as Product[]) ?? [], total: count ?? 0 }
  }, [page, pageSize, category, active, stock, search])

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
        setError('Failed to load products')
        console.error(e)
      })
      .finally(() => mounted && setLoading(false))

    const ch = supabase
      .channel('products-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
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

  const onEditSubmit = async (values: ProductEditValues) => {
    if (!selected) return
    // Optimistic update
    const prev = [...data]
    setData((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...values } as Product : r)))
    type EqClient = { update: (v: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
    const { error } = await (table('products') as unknown as EqClient)
      .update({ price: values.price, stock_quantity: values.stock_quantity, is_active: values.is_active })
      .eq('id', selected.id)
    if (error) {
      setData(prev)
      const msg = (error as { message?: string } | null)?.message ?? 'Unknown error'
      toast({ title: 'Update failed', description: msg, variant: 'destructive' })
      return
    }
    toast({ title: 'Product updated', description: `${selected.sku} saved successfully.` })
  }

  // bulk actions
  const bulkSetActive = async (active: boolean) => {
    const ids = selectedRows.map((r) => r.id)
    if (ids.length === 0) return
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
    toast({ title: `Marked ${ids.length} product(s) ${active ? 'active' : 'inactive'}` })
    setSelectionResetKey((k) => k + 1)
  }

  const bulkMarkFeatured = async (featured: boolean) => {
    const ids = selectedRows.map((r) => r.id)
    if (!ids.length) return
    const prev = [...data]
    setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, is_featured: featured } : r)))
    const { error } = await (table('products') as unknown as InClient)
      .update({ is_featured: featured })
      .in('id', ids)
    if (error) {
      setData(prev)
      const msg = (error as { message?: string } | null)?.message ?? 'Unknown error'
      toast({ title: 'Bulk update failed', description: msg, variant: 'destructive' })
      return
    }
    toast({ title: `${featured ? 'Featured' : 'Unfeatured'} ${ids.length} product(s)` })
    setSelectionResetKey((k) => k + 1)
  }

  const bulkAdjustStock = async (delta: number) => {
    const ids = selectedRows.map((r) => r.id)
    if (!ids.length) return
    const prev = [...data]
    setData((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, stock_quantity: Math.max(0, r.stock_quantity + delta) } : r)))
    // Apply per-row updates
    const errors = await Promise.all(
      ids.map(async (id) => {
        const row = prev.find((p) => p.id === id)!
        const newQty = Math.max(0, row.stock_quantity + delta)
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
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge> },
    { accessorKey: 'price', header: 'Price', cell: ({ getValue }) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(Number(getValue() ?? 0)) },
    { accessorKey: 'stock_quantity', header: 'Stock' },
    { accessorKey: 'is_active', header: 'Active', cell: ({ getValue }) => (getValue() ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>) },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original as Product
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelected(item); setEditOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
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
        <CardTitle>Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant="secondary" disabled={!hasSelection} onClick={() => { setPendingAction({ type: 'activate' }); setConfirmOpen(true) }}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
          </Button>
          <Button size="sm" variant="secondary" disabled={!hasSelection} onClick={() => { setPendingAction({ type: 'deactivate' }); setConfirmOpen(true) }}>
            <XCircle className="mr-2 h-4 w-4" /> Deactivate
          </Button>
          <Button size="sm" variant="secondary" disabled={!hasSelection} onClick={() => { setPendingAction({ type: 'feature' }); setConfirmOpen(true) }}>
            <Star className="mr-2 h-4 w-4" /> Mark featured
          </Button>
          <Button size="sm" variant="secondary" disabled={!hasSelection} onClick={() => { setPendingAction({ type: 'unfeature' }); setConfirmOpen(true) }}>
            <Star className="mr-2 h-4 w-4" /> Unmark featured
          </Button>
          <Button size="sm" variant="outline" disabled={!hasSelection} onClick={() => { setPendingAction({ type: 'stock', delta: 1 }); setConfirmOpen(true) }}>
            <ArrowUpDown className="mr-2 h-4 w-4" /> Adjust stock
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <label className="typography-label text-xs text-muted-foreground">Search SKU</label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="e.g. ALM-123" />
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Category</label>
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
            <label className="typography-label text-xs text-muted-foreground">Stock</label>
            <Select value={stock} onValueChange={(v: string) => { setStock(v as 'all' | 'low' | 'out' | 'in'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Active</label>
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
            <Button variant="outline" onClick={() => { setSearch(''); setCategory('all'); setStock('all'); setActive('all'); setPage(1) }}>Reset</Button>
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
      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'activate' && 'Activate selected products?'}
              {pendingAction?.type === 'deactivate' && 'Deactivate selected products?'}
              {pendingAction?.type === 'feature' && 'Mark selected as featured?'}
              {pendingAction?.type === 'unfeature' && 'Remove featured from selected?'}
              {pendingAction?.type === 'stock' && 'Adjust stock for selected?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update {selectedRows.length} product(s). This action can be reverted manually if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAction?.type === 'stock' && (
            <div className="mt-2">
              <label className="typography-label text-xs text-muted-foreground">Delta (can be negative)</label>
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
                if (pendingAction.type === 'feature') await bulkMarkFeatured(true)
                if (pendingAction.type === 'unfeature') await bulkMarkFeatured(false)
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
      <ProductEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={selected}
        onSubmit={onEditSubmit}
      />
    </Card>
  )
}

export default ProductsPanel
