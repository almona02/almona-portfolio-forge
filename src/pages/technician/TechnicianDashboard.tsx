import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ticketMessageApi } from '@/lib/ticketMessageApi'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { Loader2, RefreshCw, Share2, Wrench, CheckCircle2, XCircle, PlayCircle, RotateCcw, Lock } from 'lucide-react'
import { format } from 'date-fns'

interface TicketRow {
  id: string
  ticket_number: string
  title: string
  status: string
  priority: string
  type: string
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [spareTicket, setSpareTicket] = useState<TicketRow | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data } = await supabase.from('service_tickets').select('*').eq('assigned_to', user.id).order('updated_at', { ascending: false })
      setTickets((data ?? []) as TicketRow[])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { void refresh() }, [refresh])

  const updateStatus = async (t: TicketRow, status: string, extra: Record<string, unknown> = {}) => {
    try {
      await db.from('service_tickets').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', t.id)
      toast({ title: `Ticket ${status.replace(/_/g, ' ')}` })
      await refresh()
    } catch (e) { toast({ title: 'Update failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const escalate = async (t: TicketRow) => {
    try {
      const { url } = await ticketMessageApi.createShare(t.id)
      await navigator.clipboard.writeText(url).catch(() => {})
      await db.from('service_tickets').update({ escalated: true, escalated_at: new Date().toISOString() }).eq('id', t.id)
      toast({ title: 'Escalation report link copied for the Turkish team' })
      await refresh()
    } catch (e) { toast({ title: 'Escalation failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technician Workspace</h1>
          <p className="text-muted-foreground text-sm">Your assigned tickets and field tools.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : tickets.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No tickets assigned to you yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <button className="flex-1 min-w-[240px] text-left" onClick={() => navigate(`/support/tickets/${t.id}`)}>
                  <div className="font-mono text-xs text-muted-foreground">{t.ticket_number}</div>
                  <div className="font-medium">{t.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">{t.priority}</Badge>
                    <span>{format(new Date(t.created_at), 'MMM dd')}</span>
                  </div>
                </button>
                <TicketStatusBadge status={t.status as never} />
                <div className="flex items-center gap-1">
                  {t.status === 'assigned' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void updateStatus(t, 'in_progress')}><PlayCircle className="mr-1 h-4 w-4" /> Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => void updateStatus(t, 'open', { assigned_to: null })}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                    </>
                  )}
                  {t.status === 'in_progress' && (
                    <Button size="sm" variant="outline" onClick={() => void updateStatus(t, 'resolved')}><CheckCircle2 className="mr-1 h-4 w-4" /> Resolve</Button>
                  )}
                  {(t.status === 'resolved' || t.status === 'open') && (
                    <Button size="sm" variant="outline" onClick={() => void updateStatus(t, 'closed')}><Lock className="mr-1 h-4 w-4" /> Close</Button>
                  )}
                  {t.status === 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => void updateStatus(t, 'open')}><RotateCcw className="mr-1 h-4 w-4" /> Reopen</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSpareTicket(t)} title="Spare-part request"><Wrench className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => void escalate(t)} title="Escalate to Turkish team"><Share2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SparePartsDialog ticket={spareTicket} onClose={() => setSpareTicket(null)} authorId={user?.id || ''} />
    </div>
  )
}

const SparePartsDialog: React.FC<{ ticket: TicketRow | null; authorId: string; onClose: () => void }> = ({ ticket, authorId, onClose }) => {
  const { toast } = useToast()
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [urgency, setUrgency] = useState('medium')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setSku(''); setName(''); setQty('1'); setUrgency('medium'); setNote(''); setSaving(false) }, [ticket])

  if (!ticket) return null

  const submit = async () => {
    if (!sku.trim() || !name.trim()) { toast({ title: 'Enter SKU and part name', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await ticketMessageApi.sendSparePartsRequest({
        ticketId: ticket.id,
        authorId,
        note: note.trim() || undefined,
        parts: [{ sku: sku.trim(), name: name.trim(), quantity: Number(qty) || 1, urgency }],
      })
      toast({ title: 'Spare-part request sent', description: `Linked to ${ticket.ticket_number}` })
      onClose()
    } catch (e) { toast({ title: 'Request failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Spare-part request</DialogTitle>
          <DialogDescription>Linked to ticket {ticket.ticket_number} and its customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. ALM-123" /></div>
            <div><Label>Part name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Part name" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity</Label><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" /></div>
          <Button disabled={saving} onClick={() => void submit()}>{saving ? 'Sending…' : 'Send request'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TechnicianDashboard
