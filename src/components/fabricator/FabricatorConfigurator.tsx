import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { fabricatorRoutes } from '@/lib/fabricator/routes'
import { fabricatorConfigApi, ACCESSORY_TYPES, MATERIALS, RULE_TYPES, TUNING_PARAM_DEFS, validateTuningValue, type FabricatorProfile, type FabricatorAccessory, type ManufacturingRule, type TuningParam, type TuningParamDef, type SystemPack } from '@/lib/fabricatorConfigApi'
import { Loader2, RefreshCw, Plus, Trash2, Layers, Package, Link2, CheckCircle2, XCircle, Settings2, Boxes } from 'lucide-react'

type Tab = 'profiles' | 'accessories' | 'kits' | 'rules' | 'tuning' | 'packs'

const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Unknown error')

export const FabricatorConfigurator: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('profiles')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<FabricatorProfile[]>([])
  const [accessories, setAccessories] = useState<FabricatorAccessory[]>([])
  const [loading, setLoading] = useState(true)
  const [profileDialog, setProfileDialog] = useState(false)
  const [accessoryDialog, setAccessoryDialog] = useState(false)
  const [kitProfile, setKitProfile] = useState<FabricatorProfile | null>(null)
  const [kitAccessories, setKitAccessories] = useState<FabricatorAccessory[]>([])
  const [rules, setRules] = useState<ManufacturingRule[]>([])
  const [tuning, setTuning] = useState<TuningParam[]>([])
  const [packs, setPacks] = useState<SystemPack[]>([])
  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState<string>(RULE_TYPES[0])
  const [ruleAppliesTo, setRuleAppliesTo] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const results = await Promise.allSettled([fabricatorConfigApi.listProfiles(), fabricatorConfigApi.listAccessories(), fabricatorConfigApi.listRules(), fabricatorConfigApi.listTuning(), fabricatorConfigApi.listPacks()])
    const [p, a, r, t, pk] = results
    if (p.status === 'fulfilled') setProfiles(p.value)
    if (a.status === 'fulfilled') setAccessories(a.value)
    if (r.status === 'fulfilled') setRules(r.value)
    if (t.status === 'fulfilled') setTuning(t.value)
    if (pk.status === 'fulfilled') setPacks(pk.value)
    const failed = results.filter((x): x is PromiseRejectedResult => x.status === 'rejected')
    if (failed.length) {
      console.error('FabricatorConfigurator load failed', failed.map((f) => f.reason))
      setLoadError(`${failed.length} of 5 configuration sources failed to load: ${errorMessage(failed[0].reason)}`)
    }
    setLoading(false)
  }, [])

  /** Run a mutation, refresh, and surface the real error (no silent failures). */
  const run = useCallback(async (action: () => Promise<unknown>, success: string, failure: string) => {
    try { await action(); await refresh(); toast({ title: success }) }
    catch (e) { toast({ title: failure, description: errorMessage(e), variant: 'destructive' }) }
  }, [refresh, toast])

  const addRule = async () => {
    if (!ruleName.trim()) { toast({ title: 'Enter a rule name', variant: 'destructive' }); return }
    await run(
      () => fabricatorConfigApi.createRule({ name: ruleName.trim(), rule_type: ruleType, applies_to: ruleAppliesTo.trim() || null }).then(() => { setRuleName(''); setRuleAppliesTo('') }),
      'Rule added', 'Add failed',
    )
  }

  const setRuleStatus = (id: string, status: 'approved' | 'rejected') =>
    run(() => fabricatorConfigApi.setRuleStatus(id, status), `Rule ${status}`, 'Update failed')

  const saveTuning = (key: string, value: number) =>
    run(() => fabricatorConfigApi.saveTuning(key, value), 'Tuning saved', 'Save failed')

  useEffect(() => { void refresh() }, [refresh])

  const loadKit = async (p: FabricatorProfile) => {
    setKitProfile(p)
    try {
      const rows = await fabricatorConfigApi.listProfileAccessories(p.id)
      setKitAccessories(rows.map((r) => r.accessory))
    } catch (e) { toast({ title: 'Unable to load kit', description: errorMessage(e), variant: 'destructive' }) }
  }

  const link = async (accessoryId: string) => {
    if (!kitProfile) return
    try { await fabricatorConfigApi.linkAccessory(kitProfile.id, accessoryId); await loadKit(kitProfile); toast({ title: 'Accessory added to kit' }) }
    catch (e) { toast({ title: 'Link failed', description: errorMessage(e), variant: 'destructive' }) }
  }
  const unlink = async (accessoryId: string) => {
    if (!kitProfile) return
    try { await fabricatorConfigApi.unlinkAccessory(kitProfile.id, accessoryId); await loadKit(kitProfile); toast({ title: 'Accessory removed' }) }
    catch (e) { toast({ title: 'Unlink failed', description: errorMessage(e), variant: 'destructive' }) }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
    { id: 'profiles', label: 'Profiles', icon: Layers },
    { id: 'accessories', label: 'Accessories', icon: Package },
    { id: 'kits', label: 'Set Kits', icon: Link2 },
    { id: 'rules', label: 'Rules', icon: CheckCircle2 },
    { id: 'tuning', label: 'Tuning', icon: Settings2 },
    { id: 'packs', label: 'Packs', icon: Boxes },
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
        {loadError && (
          <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300" data-testid="fabricator-configurator-load-error">
            {loadError}
          </p>
        )}
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
                    <td className="p-2"><Button size="sm" variant="ghost" aria-label={`Delete profile ${p.name}`} onClick={() => void run(() => fabricatorConfigApi.deleteProfile(p.id), 'Profile deleted', 'Delete failed')}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
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
                    <td className="p-2"><Button size="sm" variant="ghost" aria-label={`Delete accessory ${a.name}`} onClick={() => void run(() => fabricatorConfigApi.deleteAccessory(a.id), 'Accessory deleted', 'Delete failed')}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
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

        {tab === 'rules' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="w-56"><Label>Rule name</Label><Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Frame end-mill" /></div>
              <div><Label>Type</Label><Select value={ruleType} onValueChange={setRuleType}><SelectTrigger className="w-40 capitalize"><SelectValue /></SelectTrigger><SelectContent>{RULE_TYPES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select></div>
              <div className="w-56"><Label>Applies to</Label><Input value={ruleAppliesTo} onChange={(e) => setRuleAppliesTo(e.target.value)} placeholder="Profile role / brand" /></div>
              <Button size="sm" onClick={() => void addRule()}><Plus className="mr-2 h-4 w-4" /> Add rule</Button>
            </div>
            <p className="text-xs text-muted-foreground">Workshop rule drafts. Approving here marks a draft as reviewed for this workshop; it does not grant manufacturing authority — that is the admin <Link className="underline" to={fabricatorRoutes.studioApprovals()}>Approvals</Link> queue.</p>
            {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rules yet.</p> : (
              <div className="space-y-2">
                {rules.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2">
                    <div className="flex-1 min-w-[160px]"><div className="text-sm font-medium">{r.name}</div><div className="text-xs text-muted-foreground capitalize">{r.rule_type}{r.applies_to ? ` · ${r.applies_to}` : ''}</div></div>
                    <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                    {r.status !== 'approved' && <Button size="sm" variant="outline" onClick={() => void setRuleStatus(r.id, 'approved')}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>}
                    {r.status !== 'rejected' && <Button size="sm" variant="ghost" onClick={() => void setRuleStatus(r.id, 'rejected')}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>}
                    <Button size="sm" variant="ghost" aria-label={`Delete rule ${r.name}`} onClick={() => void run(() => fabricatorConfigApi.deleteRule(r.id), 'Rule deleted', 'Delete failed')}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'tuning' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Workshop defaults for optimization and cut lists. Saw kerf and bar end trim pre-fill the values an admin
              confirms on the <Link className="underline" to={fabricatorRoutes.studioApprovals()}>Approvals</Link> page; production
              always reads the approved authority (fail-closed), never this table directly.
            </p>
            {TUNING_PARAM_DEFS.map((def) => (
              <TuningRow key={def.key} def={def} tuning={tuning} onSave={saveTuning} />
            ))}
          </div>
        )}

        {tab === 'packs' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Vendor packs are read-only. Create or edit your own packs in the studio so every pack carries a complete spec.</p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline"><Link to={fabricatorRoutes.studioDataProfiles()}>System packs library</Link></Button>
                <Button asChild size="sm"><Link to={fabricatorRoutes.studioDataProfileStudio()}><Plus className="mr-2 h-4 w-4" /> New custom pack</Link></Button>
              </div>
            </div>
            {packs.length === 0 ? <p className="text-sm text-muted-foreground">No system packs visible to this account.</p> : (
              <div className="space-y-2">
                {packs.map((pk) => {
                  const owned = Boolean(user?.id) && pk.owner_user_id === user?.id
                  return (
                    <div key={pk.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2" data-testid={`configurator-pack-${pk.id}`}>
                      <div className="flex-1 min-w-[160px]"><div className="text-sm font-medium">{pk.label}</div><div className="text-xs text-muted-foreground capitalize">{owned ? 'your workshop' : pk.scope}{pk.brands?.length ? ` · ${pk.brands.join(', ')}` : ''}</div></div>
                      <Badge variant={pk.is_active ? 'default' : 'secondary'}>{pk.is_active ? 'active' : 'inactive'}</Badge>
                      <Button asChild size="sm" variant="outline"><Link to={`${fabricatorRoutes.studioData('tuning')}?systemPackId=${encodeURIComponent(pk.id)}`}>Tune</Link></Button>
                      {owned ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => void run(() => fabricatorConfigApi.togglePack(pk.id, !pk.is_active), pk.is_active ? 'Pack deactivated' : 'Pack activated', 'Update failed')}>{pk.is_active ? 'Deactivate' : 'Activate'}</Button>
                          <Button size="sm" variant="ghost" aria-label={`Delete pack ${pk.label}`} onClick={() => void run(() => fabricatorConfigApi.deletePack(pk.id), 'Pack deleted', 'Delete failed')}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </>
                      ) : (
                        <Badge variant="outline">read-only</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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

const TuningRow: React.FC<{ def: TuningParamDef; tuning: TuningParam[]; onSave: (key: string, value: number) => Promise<void> }> = ({ def, tuning, onSave }) => {
  const current = tuning.find((t) => t.key === def.key)
  const [val, setVal] = useState(current ? String(current.value) : '')
  const [touched, setTouched] = useState(false)
  // Tuning loads asynchronously; keep the field in sync with the saved value until the user edits it.
  useEffect(() => { if (!touched) setVal(current ? String(current.value) : '') }, [current, touched])
  const problem = val === '' ? null : validateTuningValue(def.key, val)
  const dirty = current ? Number(val) !== current.value : val !== ''
  const inputId = `tuning-${def.key}`
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid={`tuning-row-${def.key}`}>
      <Label htmlFor={inputId} className="w-52 text-sm">{def.label} ({def.unit})</Label>
      <Input id={inputId} type="number" inputMode="decimal" min={def.min} max={def.max} step="0.1" value={val} onChange={(e) => { setTouched(true); setVal(e.target.value) }} className="w-32" aria-invalid={problem ? true : undefined} aria-describedby={`${inputId}-help`} />
      <Button size="sm" variant="outline" disabled={Boolean(problem) || val === '' || !dirty} onClick={() => void onSave(def.key, Number(val)).then(() => setTouched(false))}>Save</Button>
      <span id={`${inputId}-help`} className={`text-xs ${problem ? 'text-red-400' : 'text-muted-foreground'}`}>
        {problem ?? (current ? `saved: ${current.value} ${current.unit}` : `not set · allowed ${def.min}–${def.max} ${def.unit}`)}
      </span>
      <span className="basis-full text-xs text-muted-foreground sm:basis-auto">{def.description}</span>
    </div>
  )
}
