import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { Database, UserRole, SectorType } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

type ServerPage<T> = { rows: T[]; total: number }

/**
 * Customers Panel Component
 * 
 * Provides comprehensive customer management for administrators.
 * Features:
 * - Real-time customer profile tracking
 * - Advanced filtering by role, sector, verification status, and location
 * - Server-side pagination for large customer datasets
 * - Live updates via Supabase real-time subscriptions
 * - Search functionality across name, company, and username
 * 
 * Displays customer profiles with verification status, roles, and contact information.
 * Supports filtering by user roles (customer, admin, sales_rep, technician, support)
 * and business sectors (ALUMINIUM, UPVC, STEEL, GLASS, GENERAL).
 */
export const CustomersPanel: React.FC = () => {
  const [data, setData] = React.useState<Profile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // filters
  const [search, setSearch] = React.useState('')
  const [role, setRole] = React.useState<UserRole | 'all'>('all')
  const [sector, setSector] = React.useState<SectorType | 'all'>('all')
  const [governorate, setGovernorate] = React.useState('')
  const [verified, setVerified] = React.useState<'all' | 'verified' | 'unverified'>('all')

  // server-side paging
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)

  const fetchServerPage = React.useCallback(async (): Promise<ServerPage<Profile>> => {
    let query = supabase.from('profiles').select('*', { count: 'exact' })

    if (role !== 'all') query = query.eq('role', role)
    if (sector !== 'all') query = query.eq('sector', sector)
    if (verified !== 'all') query = query.eq('is_verified', verified === 'verified')
    if (governorate) query = query.ilike('governorate', `%${governorate}%`)
    if (search) {
      const s = search.replace(/%/g, '')
      query = query.or(
        `full_name.ilike.%${s}%,company_name.ilike.%${s}%,username.ilike.%${s}%`
      )
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })

    if (error) throw error
    return { rows: (data as unknown as Profile[]) ?? [], total: count ?? 0 }
  }, [role, sector, verified, governorate, search, page, pageSize])

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    void fetchServerPage()
      .then(({ rows, total }) => { if (!mounted) return; setData(rows); setTotal(total); })
      .catch((e) => { if (!mounted) return; setError('Failed to load customers'); console.error(e); })
      .finally(() => mounted && setLoading(false));

    const ch = supabase
      .channel('customers-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void fetchServerPage().then(({ rows, total }) => { setData(rows); setTotal(total); });
      })
      .subscribe()
    return () => { mounted = false; void ch.unsubscribe(); };
  }, [fetchServerPage])

  const columns: ColumnDef<Profile>[] = [
    { accessorKey: 'full_name', header: 'Name' },
    { accessorKey: 'company_name', header: 'Company' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'governorate', header: 'Governorate' },
    { accessorKey: 'sector', header: 'Sector', cell: ({ getValue }) => { const v = getValue(); return <Badge variant="outline">{typeof v === 'string' ? v : v == null ? '' : typeof v === 'object' ? '[object Object]' : String(v as string | number | boolean)}</Badge>; } },
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <Badge variant="secondary">{String(getValue())}</Badge> },
    { accessorKey: 'is_verified', header: 'Verified', cell: ({ getValue }) => (getValue() ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>) },
  ]

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Customers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <label className="typography-label text-xs text-muted-foreground">Search name/company/username</label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="e.g. Mohamed / Almona / m.ahmed" />
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v: string) => { setRole(v as UserRole | 'all'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Sector</label>
            <Select value={sector} onValueChange={(v: string) => { setSector(v as SectorType | 'all'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ALUMINIUM">Aluminium</SelectItem>
                <SelectItem value="UPVC">UPVC</SelectItem>
                <SelectItem value="STEEL">Steel</SelectItem>
                <SelectItem value="GLASS">Glass</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="typography-label text-xs text-muted-foreground">Governorate</label>
            <Input value={governorate} onChange={(e) => { setGovernorate(e.target.value); setPage(1) }} placeholder="Cairo, Giza..." />
          </div>
          <div>
            <label className="typography-label text-xs text-muted-foreground">Verified</label>
            <Select value={verified} onValueChange={(v: string) => { setVerified(v as 'all' | 'verified' | 'unverified'); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => { setSearch(''); setRole('all'); setSector('all'); setGovernorate(''); setVerified('all'); setPage(1) }}>Reset</Button>
          </div>
        </div>

        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <DataTable columns={columns} data={data} searchKey={undefined} showPagination={false} />
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {total} customers</div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CustomersPanel
