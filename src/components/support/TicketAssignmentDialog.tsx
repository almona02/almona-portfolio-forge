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
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, User } from 'lucide-react'
import { assignTicket, getAvailableAssignees } from '@/lib/adminTicketApi'
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
  const { data: assignees, isLoading: loadingAssignees } = useQuery({
    queryKey: ['assignees'],
    queryFn: getAvailableAssignees,
    enabled: isOpen
  })

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string }) =>
      assignTicket(ticketId, assigneeId, currentUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] })
      toast.success('Ticket assigned successfully')
      onClose()
      setSelectedAssignee('')
    },
    onError: (error) => {
      toast.error('Failed to assign ticket: ' + error.message)
    }
  })

  const handleAssign = () => {
    if (!ticket || !selectedAssignee) return
    
    assignMutation.mutate({
      ticketId: ticket.id,
      assigneeId: selectedAssignee
    })
  }

  const handleClose = () => {
    onClose()
    setSelectedAssignee('')
  }

  if (!ticket) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {loadingAssignees ? (
                  <SelectItem value="loading">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedAssignee || assignMutation.isPending}
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
