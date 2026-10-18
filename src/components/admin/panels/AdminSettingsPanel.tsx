import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { appSettingsApi, type AppSetting, type SettingType } from '@/lib/appSettingsApi'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { Loader2, RefreshCw, Plus, Trash2 } from 'lucide-react'

export const AdminSettingsPanel: React.FC = () => {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('pricing')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  // add form
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState<SettingType>('text')
  const [newDesc, setNewDesc] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setSettings(await appSettingsApi.listSettings()) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const categories = useMemo(() => [...new Set(settings.map((s) => s.category))], [settings])
  const current = settings.filter((s) => s.category === category)

  useEffect(() => {
    if (categories.length && !categories.includes(category)) setCategory(categories[0])
  }, [categories, category])

  const save = async (s: AppSetting) => {
    const v = drafts[s.id] ?? s.value
    try {
      await appSettingsApi.saveSetting(s.category, s.key, v, s.type, s.description)
      toast({ title: `Saved ${s.key}` })
      await refresh()
    } catch (e) { toast({ title: 'Save failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const add = async () => {
    if (!newKey.trim()) { toast({ title: 'Enter a key', variant: 'destructive' }); return }
    try {
      await appSettingsApi.addSetting({ category, key: newKey.trim(), value: newValue, type: newType, description: newDesc.trim() || null })
      toast({ title: 'Setting added' })
      setNewKey(''); setNewValue(''); setNewDesc('')
      await refresh()
    } catch (e) { toast({ title: 'Add failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const renderInput = (s: AppSetting) => {
    const v = drafts[s.id] ?? s.value
    if (s.type === 'boolean') {
      return (
        <Select value={v} onValueChange={(val) => setDrafts((d) => ({ ...d, [s.id]: val }))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="true">true</SelectItem><SelectItem value="false">false</SelectItem></SelectContent>
        </Select>
      )
    }
    return <Input type={s.type === 'number' ? 'number' : 'text'} value={v} onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))} />
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Pricing, regional, flags, SLA and content settings.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)} className="capitalize">{c.replace(/_/g, ' ')}</Button>
          ))}
        </div>

        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
          <div className="space-y-2">
            {current.length === 0 ? <p className="text-sm text-muted-foreground">No settings in this category.</p> : current.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium font-mono">{s.key}</div>
                  {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                </div>
                <div className="w-40">{renderInput(s)}</div>
                <Button size="sm" variant="outline" onClick={() => void save(s)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => void appSettingsApi.deleteSetting(s.id).then(refresh)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Add setting to {category}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Key</Label><Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. labor_rate_cairo_hour" /></div>
            <div><Label>Type</Label><Select value={newType} onValueChange={(v) => setNewType(v as SettingType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">text</SelectItem><SelectItem value="number">number</SelectItem><SelectItem value="boolean">boolean</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Value</Label><Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="value" /></div>
            <div><Label>Description</Label><Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="optional" /></div>
          </div>
          <Button size="sm" onClick={() => void add()}><Plus className="mr-2 h-4 w-4" /> Add setting</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminSettingsPanel
