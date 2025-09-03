import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Settings } from 'lucide-react'
import { updateTicketStatusAndPriority } from '@/lib/adminTicketApi'
import { TicketWithDetails, TicketStatus, TicketPriority } from '@/types/tickets'
import { TicketStatusBadge } from './TicketStatusBadge'
import { toast } from 'sonner'

interface TicketStatusUpdateDialogProps {
  ticket: TicketWithDetails | null
  isOpen: boolean
  onClose: () => void
}

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_parts', label: 'Awaiting Parts' },
  { value: 'awaiting_customer', label: 'Awaiting Customer' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const priorityOptions: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-700' }
]

export const TicketStatusUpdateDialog: React.FC<TicketStatusUpdateDialogProps> = ({
  ticket,
  isOpen,
  onClose
}) => {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>('')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const queryClient = useQueryClient()

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updates: {
      status?: TicketStatus
      priority?: TicketPriority
      resolution_summary?: string
    }) => updateTicketStatusAndPriority(ticket!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] })
      toast.success('Ticket updated successfully')
      onClose()
      resetForm()
    },
    onError: (error) => {
      toast.error('Failed to update ticket: ' + error.message)
    }
  })

  const resetForm = () => {
    setSelectedStatus('')
    setSelectedPriority('')
    setResolutionSummary('')
  }

  const handleUpdate = () => {
    if (!ticket) return
    
    const updates: {
      status?: TicketStatus
      priority?: TicketPriority
      resolution_summary?: string
    } = {}
    
    if (selectedStatus && selectedStatus !== ticket.status) {
      updates.status = selectedStatus
    }
    
    if (selectedPriority && selectedPriority !== ticket.priority) {
      updates.priority = selectedPriority
    }
    
    if (resolutionSummary.trim() && (selectedStatus === 'resolved' || selectedStatus === 'closed')) {
      updates.resolution_summary = resolutionSummary.trim()
    }
    
    if (Object.keys(updates).length === 0) {
      toast.error('No changes to update')
      return
    }
    
    updateMutation.mutate(updates)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  // Set initial values when dialog opens
  React.useEffect(() => {
    if (isOpen && ticket) {
      setSelectedStatus(ticket.status)
      setSelectedPriority(ticket.priority)
      setResolutionSummary(ticket.resolution_summary || '')
    }
  }, [isOpen, ticket])

  if (!ticket) return null

  const isResolutionRequired = selectedStatus === 'resolved' || selectedStatus === 'closed'
  const hasChanges = 
    (selectedStatus && selectedStatus !== ticket.status) ||
    (selectedPriority && selectedPriority !== ticket.priority) ||
    (resolutionSummary.trim() && resolutionSummary !== (ticket.resolution_summary || ''))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Update Ticket Status & Priority
          </DialogTitle>
          <DialogDescription>
            Update ticket #{ticket.ticket_number} status and priority
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
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Current Status:</span>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Current Priority:</span> 
              <span className={`ml-1 capitalize ${
                ticket.priority === 'urgent' || ticket.priority === 'critical' 
                  ? 'text-red-600' 
                  : ticket.priority === 'high' 
                  ? 'text-orange-600' 
                  : ticket.priority === 'medium'
                  ? 'text-blue-600'
                  : 'text-green-600'
              }`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as TicketStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <TicketStatusBadge status={option.value} />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={selectedPriority}
              onValueChange={(value) => setSelectedPriority(value as TicketPriority)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        option.value === 'critical' || option.value === 'urgent' 
                          ? 'bg-red-500' 
                          : option.value === 'high' 
                          ? 'bg-orange-500' 
                          : option.value === 'medium'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`} />
                      <span className={`capitalize ${option.color}`}>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution Summary */}
          {isResolutionRequired && (
            <div className="space-y-2">
              <Label htmlFor="resolution">
                Resolution Summary {isResolutionRequired && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="resolution"
                placeholder="Describe how the ticket was resolved..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                rows={3}
              />
              {isResolutionRequired && !resolutionSummary.trim() && (
                <p className="text-sm text-red-500">Resolution summary is required when resolving or closing tickets</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={
              !hasChanges || 
              updateMutation.isPending ||
              (isResolutionRequired && !resolutionSummary.trim())
            }
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
