import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Loader2, RefreshCw } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface ServicePackage { id: string; package_id: string; title_en: string; title_ar: string; price: number; currency: string; is_active: boolean }

export const ServicePackagesPanel: React.FC = () => {
  const { toast } = useToast()
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('service_packages').select('*').order('package_id')
      setPackages((data ?? []) as ServicePackage[])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const save = async (p: ServicePackage) => {
    const price = Number(drafts[p.id] ?? p.price)
    if (!Number.isFinite(price) || price < 0) { toast({ title: 'Enter a valid price', variant: 'destructive' }); return }
    try {
      await db.from('service_packages').update({ price, updated_at: new Date().toISOString() }).eq('id', p.id)
      toast({ title: `Saved ${p.title_en}` })
      await refresh()
    } catch (e) { toast({ title: 'Save failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const toggle = async (p: ServicePackage) => {
    try {
      await db.from('service_packages').update({ is_active: !p.is_active }).eq('id', p.id)
      toast({ title: `${p.title_en} ${p.is_active ? 'deactivated' : 'activated'}` })
      await refresh()
    } catch { toast({ title: 'Update failed', variant: 'destructive' }) }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div><CardTitle>Service Packages</CardTitle><CardDescription>Set real prices for the maintenance packages.</CardDescription></div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : packages.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm font-medium">{p.title_en} <span className="text-muted-foreground">· {p.title_ar}</span></div>
              <div className="text-xs text-muted-foreground font-mono">{p.package_id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" className="w-28" value={drafts[p.id] ?? String(p.price)} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} />
              <span className="text-xs text-muted-foreground">{p.currency}</span>
              <Button size="sm" variant="outline" onClick={() => void save(p)}>Save</Button>
              <Button size="sm" variant={p.is_active ? 'outline' : 'default'} onClick={() => void toggle(p)}>{p.is_active ? 'Deactivate' : 'Activate'}</Button>
              <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'active' : 'inactive'}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default ServicePackagesPanel
