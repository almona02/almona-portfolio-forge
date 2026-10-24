import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, MessageCircle, User } from 'lucide-react'
import { assignTicket, buildTicketAssignmentMessage, buildTicketWhatsAppLink, getAvailableAssignees } from '@/lib/adminTicketApi'
import { TicketWithDetails } from '@/types/tickets'
import { toast } from 'sonner'

interface TicketAssignmentDialogProps {
  ticket: TicketWithDetails | null
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

export const TicketAssignmentDialog: React.FC<TicketAssignmentDialogProps> = ({
  ticket,
  isOpen,
  onClose,
  currentUserId
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const queryClient = useQueryClient()

  // Fetch available assignees
  const { data: assignees, isLoading: loadingAssignees, isError: assigneesFailed } = useQuery({
    queryKey: ['assignees'],
    queryFn: getAvailableAssignees,
    enabled: isOpen
  })

  const selected = assignees?.find(assignee => assignee.id === selectedAssignee)
  const whatsappHref = selected?.phone && ticket
    ? buildTicketWhatsAppLink(selected.phone, buildTicketAssignmentMessage(
        { ticket_number: ticket.ticket_number, title: ticket.title, priority: ticket.priority },
        ticket.user_profile?.full_name,
      ))
    : null

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string }) =>
      assignTicket(ticketId, assigneeId, currentUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      void queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] })
      if (whatsappHref) {
        window.open(whatsappHref, '_blank', 'noopener,noreferrer')
        toast.success(`Ticket assigned — WhatsApp opened for ${selected?.full_name || 'technician'}`)
      } else {
        toast.success('Ticket assigned successfully')
      }
      onClose()
      setSelectedAssignee('')
    },
    onError: (error) => {
      toast.error('Failed to assign ticket: ' + error.message)
    }
  })

  const handleAssign = () => {
    if (!ticket || !selectedAssignee || !assignees?.some(assignee => assignee.id === selectedAssignee)) return
    
    assignMutation.mutate({
      ticketId: ticket.id,
      assigneeId: selectedAssignee
    })
  }

  const handleClose = () => {
    if (assignMutation.isPending) return
    onClose()
    setSelectedAssignee('')
  }

  if (!ticket) return null

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assign Ticket
          </DialogTitle>
          <DialogDescription>
            Assign ticket #{ticket.ticket_number} to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket Info */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Ticket:</span> {ticket.title}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Customer:</span> {ticket.user_profile?.full_name || 'Unknown'}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Priority:</span> 
              <span className={`ml-1 capitalize ${
                ticket.priority === 'urgent' || ticket.priority === 'critical' 
                  ? 'text-red-600' 
                  : ticket.priority === 'high' 
                  ? 'text-amber-600' 
                  : 'text-blue-600'
              }`}>
                {ticket.priority}
              </span>
            </div>
            {ticket.assigned_to && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Currently assigned to:</span> {ticket.assigned_user?.full_name || 'Unknown'}
              </div>
            )}
          </div>

          {/* Assignee Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee" className="typography-label">Assign to</Label>
            <Select
              value={selectedAssignee}
              onValueChange={setSelectedAssignee}
              disabled={loadingAssignees || assigneesFailed || assignMutation.isPending}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {loadingAssignees ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  </SelectItem>
                ) : (
                  assignees?.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{assignee.full_name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({assignee.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {assigneesFailed && <p role="alert">Unable to load team members. Reopen this dialog to retry.</p>}
          </div>
        </div>

        <DialogFooter>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
              aria-label={`Notify ${selected?.full_name || 'technician'} on WhatsApp`}
            >
              <MessageCircle className="h-4 w-4" />
              Notify on WhatsApp
            </a>
          )}
          <Button variant="outline" onClick={handleClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedAssignee || loadingAssignees || assigneesFailed || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
