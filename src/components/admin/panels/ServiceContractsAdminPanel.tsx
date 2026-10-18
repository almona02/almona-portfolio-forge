import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, RefreshCw, Loader2, Trash2, CalendarPlus, CheckCircle2, Printer, Camera } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { serviceContractApi, VISIT_FREQUENCIES, type ServiceContract, type ServiceVisit } from '@/lib/serviceContractApi'
import { listAdminUsers, type AdminUserRow } from '@/lib/adminUsersApi'

const freqLabel = (f: string) => f.replace(/i/, 'i').replace(/([a-z])(?=[A-Z])/g, '$1 ')

export const ServiceContractsAdminPanel: React.FC = () => {
  const { toast } = useToast()
  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [createOpen, setCreateOpen] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<AdminUserRow[]>([])
  const [owner, setOwner] = useState<AdminUserRow | null>(null)
  const [factoryName, setFactoryName] = useState('')
  const [machineName, setMachineName] = useState('')
  const [frequency, setFrequency] = useState<ServiceContract['visit_frequency']>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [price, setPrice] = useState('')
  const [terms, setTerms] = useState('')
  const [saving, setSaving] = useState(false)

  // selected contract visits
  const [selected, setSelected] = useState<ServiceContract | null>(null)
  const [visits, setVisits] = useState<ServiceVisit[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [visitDialog, setVisitDialog] = useState<{ contract: ServiceContract; visit: ServiceVisit } | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<ServiceContract | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setContracts(await serviceContractApi.listContracts()) }
    catch (e) { setError('Unable to load service contracts.'); console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  // customer autofill
  useEffect(() => {
    if (!customerQuery.trim()) { setCustomerResults([]); return }
    const t = setTimeout(() => {
      void listAdminUsers(0, customerQuery).then((p) => setCustomerResults(p.users)).catch(() => setCustomerResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [customerQuery])

  const loadVisits = async (c: ServiceContract) => {
    setSelected(c)
    setVisitsLoading(true)
    try { setVisits(await serviceContractApi.listVisits(c.id)) }
    catch (e) { toast({ title: 'Unable to load visits', variant: 'destructive' }) }
    finally { setVisitsLoading(false) }
  }

  const createContract = async () => {
    if (!owner) { toast({ title: 'Select a customer first', variant: 'destructive' }); return }
    if (!factoryName.trim() || !machineName.trim()) { toast({ title: 'Enter factory and machine names', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await serviceContractApi.createContract({
        owner_id: owner.id,
        factory_name: factoryName.trim(),
        machine_name: machineName.trim(),
        visit_frequency: frequency,
        start_date: startDate,
        end_date: endDate || null,
        price: price ? Number(price) : null,
        terms: terms.trim() || null,
      })
      toast({ title: 'Contract created' })
      setCreateOpen(false)
      setOwner(null); setCustomerQuery(''); setFactoryName(''); setMachineName(''); setPrice(''); setTerms(''); setEndDate('')
      await refresh()
    } catch (e) {
      toast({ title: 'Create failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const scheduleVisit = async (contract: ServiceContract) => {
    const date = new Date().toISOString().slice(0, 10)
    try {
      await serviceContractApi.createVisit({ contract_id: contract.id, scheduled_at: date, type: 'preventive' })
      toast({ title: 'Visit scheduled' })
      await loadVisits(contract)
    } catch (e) { toast({ title: 'Schedule failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Service Contracts</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New contract</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No service contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Factory</th><th className="p-2">Machine</th><th className="p-2">Frequency</th>
                <th className="p-2">Period</th><th className="p-2">Status</th><th className="p-2">Actions</th>
              </tr></thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b align-top">
                    <td className="p-2 font-medium">{c.factory_name}</td>
                    <td className="p-2">{c.machine_name}</td>
                    <td className="p-2 capitalize">{freqLabel(c.visit_frequency)}</td>
                    <td className="p-2">{c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}</td>
                    <td className="p-2"><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => void loadVisits(c)}>Visits</Button>
                        <Button size="sm" variant="outline" onClick={() => void scheduleVisit(c)}><CalendarPlus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected contract visits */}
        {selected && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{selected.factory_name} — {selected.machine_name} visits</div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
            {visitsLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              : visits.length === 0 ? <p className="text-sm text-muted-foreground">No visits scheduled.</p>
              : (
                <div className="space-y-2">
                  {visits.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 rounded-md border p-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{v.scheduled_at} · {v.type}</div>
                        {v.technician && <div className="text-xs text-muted-foreground">Technician: {v.technician}</div>}
                        {v.summary && <div className="text-xs text-muted-foreground">{v.summary}</div>}
                      </div>
                      <Badge variant={v.status === 'completed' ? 'default' : v.status === 'cancelled' ? 'destructive' : 'secondary'}>{v.status}</Badge>
                      {v.status === 'scheduled' && (
                        <Button size="sm" variant="outline" onClick={() => setVisitDialog({ contract: selected, visit: v })}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </CardContent>

      {/* Create contract dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New service contract</DialogTitle><DialogDescription>Keyed by customer, factory and machine.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Label>Customer</Label>
              <Input value={owner ? (owner.full_name || owner.username || owner.id) : customerQuery} onChange={(e) => { setCustomerQuery(e.target.value); setOwner(null) }} placeholder="Search customer by name/company…" />
              {!owner && customerResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border rounded-md bg-popover text-popover-foreground max-h-48 overflow-y-auto shadow-md">
                  {customerResults.map((u) => (
                    <button key={u.id} type="button" onClick={() => { setOwner(u); setCustomerQuery(''); setCustomerResults([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                      {u.full_name || u.username || u.id} {u.company_name ? `· ${u.company_name}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Factory</Label><Input value={factoryName} onChange={(e) => setFactoryName(e.target.value)} placeholder="Factory name" /></div>
              <div><Label>Machine</Label><Input value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="Machine name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Visit frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as ServiceContract['visit_frequency'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VISIT_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{freqLabel(f)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (EGP)</Label><Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>
            <div><Label>Terms</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Contract terms…" /></div>
            <Button disabled={saving} onClick={() => void createContract()}>{saving ? 'Creating…' : 'Create contract'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visit ticket dialog (complete + photos) */}
      <VisitTicketDialog
        ticket={visitDialog}
        onClose={() => setVisitDialog(null)}
        onSaved={async () => { setVisitDialog(null); if (selected) await loadVisits(selected) }}
      />

      {/* Delete confirm */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>Deleting {confirmDelete?.factory_name} — {confirmDelete?.machine_name} also removes its visit tickets. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void (async () => { if (confirmDelete) { await serviceContractApi.deleteContract(confirmDelete.id); toast({ title: 'Contract deleted' }); setConfirmDelete(null); setSelected(null); await refresh() } })() }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** Completes a visit with technician, summary and photo evidence, then offers a printable ticket. */
const VisitTicketDialog: React.FC<{
  ticket: { contract: ServiceContract; visit: ServiceVisit } | null
  onClose: () => void
  onSaved: () => void
}> = ({ ticket, onClose, onSaved }) => {
  const { toast } = useToast()
  const [technician, setTechnician] = useState('')
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setTechnician(''); setSummary(''); setFiles(null); setSaving(false); setSaved(false)
  }, [ticket])

  if (!ticket) return null

  const complete = async () => {
    setSaving(true)
    try {
      const photos: string[] = []
      if (files) {
        for (const f of Array.from(files).slice(0, 6)) photos.push(await serviceContractApi.uploadPhoto(f))
      }
      await serviceContractApi.completeVisit(ticket.visit.id, { technician: technician.trim() || null, summary: summary.trim() || null, photos })
      toast({ title: 'Visit completed with evidence' })
      setSaved(true)
      onSaved()
    } catch (e) {
      toast({ title: 'Completion failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Visit ticket — {ticket.visit.scheduled_at}</DialogTitle>
          <DialogDescription>{ticket.contract.factory_name} · {ticket.contract.machine_name}</DialogDescription>
        </DialogHeader>
        {!saved ? (
          <div className="space-y-3">
            <div><Label>Technician</Label><Input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Technician name" /></div>
            <div><Label>Visit summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What was done…" /></div>
            <div><Label>Photo evidence</Label>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Attach up to 6 photos as visit proof.</p>
            </div>
            <Button disabled={saving} onClick={() => void complete()}>{saving ? 'Saving…' : 'Complete visit'}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Visit completed and recorded with photo evidence.</p>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print ticket</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ServiceContractsAdminPanel
