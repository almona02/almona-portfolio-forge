import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fabricatorConfigApi, ACCESSORY_TYPES, MATERIALS, type FabricatorProfile, type FabricatorAccessory } from '@/lib/fabricatorConfigApi'
import { Loader2, RefreshCw, Plus, Trash2, Layers, Package, Link2 } from 'lucide-react'

type Tab = 'profiles' | 'accessories' | 'kits'

export const FabricatorConfigurator: React.FC = () => {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('profiles')
  const [profiles, setProfiles] = useState<FabricatorProfile[]>([])
  const [accessories, setAccessories] = useState<FabricatorAccessory[]>([])
  const [loading, setLoading] = useState(true)
  const [profileDialog, setProfileDialog] = useState(false)
  const [accessoryDialog, setAccessoryDialog] = useState(false)
  const [kitProfile, setKitProfile] = useState<FabricatorProfile | null>(null)
  const [kitAccessories, setKitAccessories] = useState<FabricatorAccessory[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([fabricatorConfigApi.listProfiles(), fabricatorConfigApi.listAccessories()])
      setProfiles(p); setAccessories(a)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const loadKit = async (p: FabricatorProfile) => {
    setKitProfile(p)
    try {
      const rows = await fabricatorConfigApi.listProfileAccessories(p.id)
      setKitAccessories(rows.map((r) => r.accessory))
    } catch (e) { toast({ title: 'Unable to load kit', variant: 'destructive' }) }
  }

  const link = async (accessoryId: string) => {
    if (!kitProfile) return
    try { await fabricatorConfigApi.linkAccessory(kitProfile.id, accessoryId); await loadKit(kitProfile); toast({ title: 'Accessory added to kit' }) }
    catch (e) { toast({ title: 'Link failed', variant: 'destructive' }) }
  }
  const unlink = async (accessoryId: string) => {
    if (!kitProfile) return
    try { await fabricatorConfigApi.unlinkAccessory(kitProfile.id, accessoryId); await loadKit(kitProfile); toast({ title: 'Accessory removed' }) }
    catch (e) { toast({ title: 'Unlink failed', variant: 'destructive' }) }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
    { id: 'profiles', label: 'Profiles', icon: Layers },
    { id: 'accessories', label: 'Accessories', icon: Package },
    { id: 'kits', label: 'Set Kits', icon: Link2 },
  ]

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Fabricator Configurator</CardTitle>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button key={t.id} size="sm" variant={tab === t.id ? 'default' : 'outline'} onClick={() => setTab(t.id)}>
              <t.icon className="mr-2 h-4 w-4" /> {t.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tab === 'profiles' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{profiles.length} profile(s)</span>
              <Button size="sm" onClick={() => setProfileDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add profile</Button>
            </div>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : profiles.length === 0 ? <p className="text-sm text-muted-foreground">No profiles yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Name</th><th className="p-2">Material</th><th className="p-2">Brand</th><th className="p-2">Cost/m</th><th className="p-2">Cut allow.</th><th className="p-2" /></tr></thead>
                <tbody>{profiles.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2 font-medium">{p.name}</td><td className="p-2 capitalize">{p.material}</td><td className="p-2">{p.system_brand || '—'}</td>
                    <td className="p-2">{Number(p.cost_per_meter)}</td><td className="p-2">{Number(p.cutting_allowance ?? 0)}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => void fabricatorConfigApi.deleteProfile(p.id).then(refresh)}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                  </tr>
                ))}</tbody></table></div>
            )}
          </div>
        )}

        {tab === 'accessories' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{accessories.length} accessory(ies)</span>
              <Button size="sm" onClick={() => setAccessoryDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add accessory</Button>
            </div>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : accessories.length === 0 ? <p className="text-sm text-muted-foreground">No accessories yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Price</th><th className="p-2">Cost</th><th className="p-2" /></tr></thead>
                <tbody>{accessories.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2 font-medium">{a.name}</td><td className="p-2 capitalize">{a.type}</td><td className="p-2">{Number(a.unit_price)}</td><td className="p-2">{Number(a.base_cost)}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => void fabricatorConfigApi.deleteAccessory(a.id).then(refresh)}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                  </tr>
                ))}</tbody></table></div>
            )}
          </div>
        )}

        {tab === 'kits' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <Button key={p.id} size="sm" variant={kitProfile?.id === p.id ? 'default' : 'outline'} onClick={() => void loadKit(p)}>{p.name}</Button>
              ))}
            </div>
            {kitProfile ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Set kit for {kitProfile.name}</div>
                <div className="flex flex-wrap gap-2">
                  {kitAccessories.map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-1 capitalize">
                      {a.name} ({a.type})
                      <button onClick={() => void unlink(a.id)} className="ml-1 text-red-400">×</button>
                    </Badge>
                  ))}
                  {kitAccessories.length === 0 && <span className="text-sm text-muted-foreground">No accessories linked.</span>}
                </div>
                <div>
                  <Label>Add accessory to kit</Label>
                  <Select value="" onValueChange={(v) => void link(v)}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Select accessory…" /></SelectTrigger>
                    <SelectContent>{accessories.map((a) => <SelectItem key={a.id} value={a.id} className="capitalize">{a.name} ({a.type})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Select a profile to manage its set kit.</p>}
          </div>
        )}
      </CardContent>

      <ProfileDialog open={profileDialog} onClose={() => setProfileDialog(false)} onSaved={() => { setProfileDialog(false); void refresh() }} />
      <AccessoryDialog open={accessoryDialog} onClose={() => setAccessoryDialog(false)} onSaved={() => { setAccessoryDialog(false); void refresh() }} />
    </Card>
  )
}

const ProfileDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [material, setMaterial] = useState<FabricatorProfile['material']>('aluminum')
  const [brand, setBrand] = useState('')
  const [width, setWidth] = useState('60')
  const [cost, setCost] = useState('0')
  const [cut, setCut] = useState('3')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { toast({ title: 'Enter a profile name', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await fabricatorConfigApi.createProfile({ name: name.trim(), material, system_brand: brand.trim() || null, width: Number(width) || 1, cost_per_meter: Number(cost) || 0, cutting_allowance: Number(cut) || 0 })
      toast({ title: 'Profile added' }); setName(''); onSaved()
    } catch (e) { toast({ title: 'Add failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Add profile</DialogTitle><DialogDescription>Window/door profile with cost and cutting allowance.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PS-6601" /></div>
            <div><Label>Material</Label><Select value={material} onValueChange={(v) => setMaterial(v as FabricatorProfile['material'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MATERIALS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>System brand</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Yilmaz, Kale" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Width (mm)</Label><Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} /></div>
            <div><Label>Cost/m</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
            <div><Label>Cut allow. (mm)</Label><Input type="number" value={cut} onChange={(e) => setCut(e.target.value)} /></div>
          </div>
          <Button disabled={saving} onClick={() => void save()}>{saving ? 'Adding…' : 'Add profile'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const AccessoryDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<FabricatorAccessory['type']>('hinge')
  const [price, setPrice] = useState('0')
  const [cost, setCost] = useState('0')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { toast({ title: 'Enter an accessory name', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await fabricatorConfigApi.createAccessory({ name: name.trim(), type, unit_price: Number(price) || 0, base_cost: Number(cost) || 0 })
      toast({ title: 'Accessory added' }); setName(''); onSaved()
    } catch (e) { toast({ title: 'Add failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Add accessory</DialogTitle><DialogDescription>Hardware / accessory with pricing.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hinge set" /></div>
          <div><Label>Type</Label><Select value={type} onValueChange={(v) => setType(v as FabricatorAccessory['type'])}><SelectTrigger className="capitalize"><SelectValue /></SelectTrigger><SelectContent>{ACCESSORY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Unit price</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><Label>Base cost</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          </div>
          <Button disabled={saving} onClick={() => void save()}>{saving ? 'Adding…' : 'Add accessory'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FabricatorConfigurator
