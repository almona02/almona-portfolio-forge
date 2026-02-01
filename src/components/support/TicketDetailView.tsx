import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getTicketById, getTicketMessages, createMessage, updateTicketStatus } from '@/lib/ticketApi'
import { CreateMessageData } from '@/types/tickets'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { TicketStatusBadge } from './TicketStatusBadge'
import { useToast } from '@/hooks/useToast'
import { format } from 'date-fns'

interface TicketDetailViewProps {
  ticketId: string
  onBack: () => void
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({ ticketId, onBack }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch ticket details
  const { data: ticket, isLoading: isLoadingTicket } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicketById(ticketId),
  })

  // Fetch ticket messages
  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => getTicketMessages(ticketId),
  })

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: (messageData: CreateMessageData & { author_id: string }) => createMessage(messageData),
    onSuccess: () => {
      setNewMessage('')
      refetchMessages()
      toast({
        title: 'Success',
        description: 'Your message has been sent.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
      console.error('Error sending message:', error)
    },
  })

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, resolution }: { status: string; resolution?: string }) => 
      updateTicketStatus(ticketId, status as 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled', resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      toast({
        title: 'Success',
        description: 'Ticket status updated.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update ticket status.',
        variant: 'destructive',
      })
      console.error('Error updating status:', error)
    },
  })

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    setIsSubmitting(true)
    try {
      await createMessageMutation.mutateAsync({
        ticket_id: ticketId,
        author_id: user.id,
        message: newMessage.trim(),
        message_type: 'message',
        is_internal_note: false,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({ status })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage()
    }
  }

  if (isLoadingTicket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Ticket not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
        <div className="flex-1">
          <h1 className="typography-h1 text-2xl">{ticket.ticket_number}</h1>
          <p className="text-muted-foreground">{ticket.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <Badge variant="outline">
            {ticket.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="typography-h4 font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {ticket.description || 'No description provided.'}
                  </p>
                </div>
                
                {ticket.machine_serial_number && (
                  <div>
                    <h4 className="typography-h4 font-medium mb-2">Machine Serial Number</h4>
                    <p className="text-muted-foreground">{ticket.machine_serial_number}</p>
                  </div>
                )}
                
                {ticket.site_location && (
                  <div>
                    <h4 className="typography-h4 font-medium mb-2">Site Location</h4>
                    <p className="text-muted-foreground">{ticket.site_location}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Messages and updates for this ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.author?.avatar_url || undefined} />
                        <AvatarFallback>
                          {message.author?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.author?.full_name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.author?.role || 'customer'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          
                          {message.spare_parts_details && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                              <h5 className="font-medium text-sm mb-2">Spare Parts Request</h5>
                              <div className="space-y-1">
                                {message.spare_parts_details.parts.map((part, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="font-medium">{part.name}</span> 
                                    <span className="text-muted-foreground"> (SKU: {part.sku})</span>
                                    <span className="text-muted-foreground"> - Qty: {part.quantity}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {part.urgency}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {message.status_change && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                              <p className="text-sm">
                                <span className="font-medium">Status changed:</span> {message.status_change.from} → {message.status_change.to}
                              </p>
                              {message.status_change.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {message.status_change.reason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No messages yet. Start the conversation below.
                  </p>
                )}
              </div>

              <Separator className="my-6" />

              {/* New Message Form */}
              <div className="space-y-4">
                <h4 className="typography-h4 font-medium">Add a message</h4>
                <Textarea
                  placeholder="Type your message here... (Ctrl+Enter to send)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach File
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium capitalize">{ticket.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <p className="font-medium capitalize">{ticket.priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <p className="font-medium">
                    {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {ticket.assigned_user && (
                <div>
                  <span className="text-muted-foreground text-sm">Assigned to:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {ticket.assigned_user.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                      {ticket.assigned_user.full_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ticket.assigned_user.role}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.contact_email}</span>
                </div>
              )}
              {ticket.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.contact_phone}</span>
                </div>
              )}
              {ticket.site_location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.site_location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Preferred: {ticket.preferred_contact_method}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ticket.status === 'open' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate('resolved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleStatusUpdate('closed')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
