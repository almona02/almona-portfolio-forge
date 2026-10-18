import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Loader2, RefreshCw, Star } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface Machine { id: string; model_code: string; name: string; category: string; power_consumption: string | null; is_featured: boolean }

export const MachinesAdminPanel: React.FC = () => {
  const { toast } = useToast()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Machine | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('yilmaz_machines').select('id,model_code,name,category,power_consumption,is_featured').order('model_code')
      setMachines((data ?? []) as Machine[])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const toggleFeatured = async (m: Machine) => {
    try {
      await db.from('yilmaz_machines').update({ is_featured: !m.is_featured }).eq('id', m.id)
      toast({ title: `${m.model_code} ${m.is_featured ? 'unfeatured' : 'featured'}` })
      await refresh()
    } catch (e) { toast({ title: 'Update failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div><CardTitle>Machine Catalog</CardTitle><CardDescription>YILMAZ machine catalog — edit specs and featured status.</CardDescription></div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Model</th><th className="p-2">Name</th><th className="p-2">Category</th><th className="p-2">Power</th><th className="p-2">Featured</th><th className="p-2" /></tr></thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-2 font-mono">{m.model_code}</td>
                    <td className="p-2">{m.name}</td>
                    <td className="p-2 capitalize">{String(m.category).replace(/-/g, ' ')}</td>
                    <td className="p-2">{m.power_consumption || '—'}</td>
                    <td className="p-2">
                      <Button size="sm" variant="ghost" onClick={() => void toggleFeatured(m)} title="Toggle featured">
                        <Star className={`h-4 w-4 ${m.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </Button>
                    </td>
                    <td className="p-2"><Button size="sm" variant="outline" onClick={() => setEdit(m)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <MachineEditDialog machine={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void refresh() }} />
    </Card>
  )
}

const MachineEditDialog: React.FC<{ machine: Machine | null; onClose: () => void; onSaved: () => void }> = ({ machine, onClose, onSaved }) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [power, setPower] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (machine) { setName(machine.name); setCategory(machine.category); setPower(machine.power_consumption || '') }
  }, [machine])

  if (!machine) return null

  const save = async () => {
    setSaving(true)
    try {
      await db.from('yilmaz_machines').update({ name: name.trim(), category: category.trim(), power_consumption: power.trim() || null }).eq('id', machine.id)
      toast({ title: 'Machine updated' })
      onSaved()
    } catch (e) { toast({ title: 'Save failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Edit {machine.model_code}</DialogTitle><DialogDescription>Update machine catalog details.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div><Label>Power consumption</Label><Input value={power} onChange={(e) => setPower(e.target.value)} /></div>
          <Button disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MachinesAdminPanel
