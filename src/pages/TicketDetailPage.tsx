import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ticketMessageApi, type TicketAttachment } from '@/lib/ticketMessageApi'
import { ArrowLeft, Clock, MapPin, Phone, Mail, Cpu, Loader2, AlertCircle, Send, ImagePlus, Share2, User, Headset } from 'lucide-react'
import { format } from 'date-fns'

interface TicketRow {
  id: string
  user_id: string | null
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
  attachments: TicketAttachment[]
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
  const [searchParams] = useSearchParams()
  const shareToken = searchParams.get('share')
  const { user } = useAuth()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<TicketRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reply, setReply] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [sending, setSending] = useState(false)
  const [sharing, setSharing] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const isSharedView = !!shareToken

  const loadAuthenticated = async () => {
    if (!ticketId) return
    const { data, error: err } = await supabase.from('service_tickets').select('*').eq('id', ticketId).maybeSingle()
    if (err || !data) { setError('Ticket not found or unavailable.'); setLoading(false); return }
    setTicket(data as TicketRow)
    const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
    setMessages((msgs ?? []) as MessageRow[])
    setLoading(false)
  }

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    if (shareToken) {
      void ticketMessageApi.getSharedTicket(shareToken)
        .then((data) => {
          setTicket(data.ticket as TicketRow)
          setMessages(data.messages as MessageRow[])
          setLoading(false)
        })
        .catch(() => { setError('Invalid or expired share link.'); setLoading(false) })
    } else {
      void loadAuthenticated()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, shareToken])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async () => {
    if (!reply.trim() || !user || !ticket || sending) return
    setSending(true)
    try {
      const attachments: TicketAttachment[] = []
      if (files) {
        for (const f of Array.from(files).slice(0, 6)) attachments.push(await ticketMessageApi.uploadAttachment(f))
      }
      await ticketMessageApi.sendMessage({ ticketId: ticket.id, authorId: user.id, message: reply.trim(), attachments })
      setReply('')
      setFiles(null)
      const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true })
      setMessages((msgs ?? []) as MessageRow[])
      toast({ title: 'Message sent' })
    } catch (e) {
      toast({ title: 'Send failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' })
    } finally { setSending(false) }
  }

  const share = async () => {
    if (!ticket || sharing) return
    setSharing(true)
    try {
      const { url } = await ticketMessageApi.createShare(ticket.id)
      await navigator.clipboard.writeText(url).catch(() => {})
      toast({ title: 'Share link copied for the YILMAZ support team' })
    } catch (e) {
      toast({ title: 'Share failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' })
    } finally { setSharing(false) }
  }

  if (loading) {
    return <div className="container mx-auto py-16 flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading ticketâ€¦</div>
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        {!isSharedView && (
          <Button variant="outline" size="sm" onClick={() => void share()} disabled={sharing}>
            <Share2 className="mr-2 h-4 w-4" /> {sharing ? 'Generatingâ€¦' : 'Share with YILMAZ'}
          </Button>
        )}
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{ticket.ticket_number}</span>
                {ticket.maintenance_type && <Badge variant="outline" className="capitalize">{ticket.maintenance_type}</Badge>}
                {isSharedView && <Badge variant="secondary">Shared view</Badge>}
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
            <CardContent><p className="text-sm whitespace-pre-wrap text-foreground/90">{ticket.description || 'â€”'}</p></CardContent>
          </Card>

          {ticket.resolution_summary && (
            <Card className="border-emerald-500/30">
              <CardHeader><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-foreground/90">{ticket.resolution_summary}</p></CardContent>
            </Card>
          )}

          {/* Conversation */}
          <Card>
            <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((m) => {
                  const isCustomer = ticket.user_id != null && m.author_id === ticket.user_id
                  return (
                    <div key={m.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                      <div className="w-9 h-9 shrink-0 rounded-full border flex items-center justify-center bg-muted">
                        {isCustomer ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                      </div>
                      <div className={`max-w-[80%] ${isCustomer ? 'text-right' : ''}`}>
                        <div className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${isCustomer ? 'bg-primary/10 border-primary/20' : 'bg-muted/40 border-border'}`}>
                          {m.message}
                          {m.attachments?.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {m.attachments.map((a, i) => (
                                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                                  <img src={a.url} alt={a.filename} className="w-full h-20 object-cover rounded border" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`mt-1 text-[10px] text-muted-foreground flex items-center gap-1 ${isCustomer ? 'justify-end' : ''}`}>
                          <Clock className="h-3 w-3" />
                          {format(new Date(m.created_at), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={endRef} />
            </CardContent>

            {/* Composer (authenticated only) */}
            {!isSharedView && user && (
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
                  {files && files.length > 0 && <span className="text-xs text-muted-foreground">{files.length} photo(s) attached</span>}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply to this ticketâ€¦"
                    className="flex-1 min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="sm" onClick={() => void send()} disabled={!reply.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>
            )}
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
