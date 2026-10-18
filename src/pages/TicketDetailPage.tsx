import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge'
import { ArrowLeft, Clock, MapPin, Phone, Mail, Cpu, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface TicketRow {
  id: string
  ticket_number: string
  title: string
  description: string
  type: string
  priority: string
  status: string
  source: string | null
  maintenance_type: string | null
  machine_serial_number: string | null
  site_location: string | null
  contact_phone: string | null
  contact_email: string | null
  resolution_summary: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  author_id: string | null
  message: string
  message_type: string | null
  created_at: string
}

const priorityColor: Record<string, string> = {
  low: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  urgent: 'bg-red-500/15 text-red-300 border-red-500/30',
  critical: 'bg-red-600/20 text-red-200 border-red-500/40',
}

const TicketDetailPage = () => {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<TicketRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketId) return
    let mounted = true
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: err } = await supabase.from('service_tickets').select('*').eq('id', ticketId).maybeSingle()
      if (err || !data) {
        if (mounted) { setError('Ticket not found or unavailable.'); setLoading(false) }
        return
      }
      if (mounted) setTicket(data as TicketRow)
      const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
      if (mounted) { setMessages((msgs ?? []) as MessageRow[]); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [ticketId])

  if (loading) {
    return <div className="container mx-auto py-16 flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading ticket…</div>
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">{error ?? 'Ticket not found'}</p>
        <Button variant="outline" onClick={() => navigate('/services')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to services</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{ticket.ticket_number}</span>
                {ticket.maintenance_type && <Badge variant="outline" className="capitalize">{ticket.maintenance_type}</Badge>}
              </div>
              <CardTitle className="text-xl md:text-2xl">{ticket.title}</CardTitle>
            </div>
            <TicketStatusBadge status={ticket.status as never} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap text-foreground/90">{ticket.description || '—'}</p></CardContent>
          </Card>

          {ticket.resolution_summary && (
            <Card className="border-emerald-500/30">
              <CardHeader><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-foreground/90">{ticket.resolution_summary}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(m.created_at), 'MMM dd, yyyy HH:mm')}
                      {m.message_type && <Badge variant="secondary" className="capitalize text-[10px]">{m.message_type}</Badge>}
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Priority</span><Badge variant="outline" className={`capitalize ${priorityColor[ticket.priority] ?? ''}`}>{ticket.priority}</Badge></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Type</span><span className="capitalize text-right">{String(ticket.type).replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Created</span><span className="text-right">{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</span></div>
              {ticket.resolved_at && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resolved</span><span className="text-right">{format(new Date(ticket.resolved_at), 'MMM dd, yyyy HH:mm')}</span></div>}
              {ticket.machine_serial_number && <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Machine</span><span className="font-mono text-right">{ticket.machine_serial_number}</span></div>}
              {ticket.site_location && <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</span><span className="text-right">{ticket.site_location}</span></div>}
              {ticket.contact_phone && <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</span><a className="text-right" href={`tel:${ticket.contact_phone}`}>{ticket.contact_phone}</a></div>}
              {ticket.contact_email && <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span><a className="text-right break-all" href={`mailto:${ticket.contact_email}`}>{ticket.contact_email}</a></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default TicketDetailPage
