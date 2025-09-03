import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { createTicket } from '@/lib/ticketApi'
import { CreateTicketData, TicketType, TicketPriority } from '@/types/tickets'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  type: z.enum(['general', 'technical', 'billing', 'sales', 'spare_parts', 'warranty', 'complaint', 'installation', 'maintenance']),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  preferred_contact_method: z.enum(['email', 'phone', 'sms']).optional(),
  site_location: z.string().optional(),
  machine_serial_number: z.string().optional(),
})

type CreateTicketFormData = z.infer<typeof createTicketSchema>

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTicketCreated: () => void
}

export const CreateTicketDialog: React.FC<CreateTicketDialogProps> = ({
  open,
  onOpenChange,
  onTicketCreated,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      type: 'general',
      priority: 'medium',
      preferred_contact_method: 'email',
    },
  })

  const createTicketMutation = useMutation({
    mutationFn: (data: CreateTicketData) => {
      if (!user) throw new Error('User not authenticated')
      return createTicket(data, user.id)
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Your support ticket has been created successfully.',
      })
      reset()
      onTicketCreated()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      })
      console.error('Error creating ticket:', error)
    },
  })

  const onSubmit = async (data: CreateTicketFormData) => {
    setIsSubmitting(true)
    try {
      // Convert form data to CreateTicketData format
      const ticketData: CreateTicketData = {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        preferred_contact_method: data.preferred_contact_method,
        site_location: data.site_location,
        machine_serial_number: data.machine_serial_number,
      }
      await createTicketMutation.mutateAsync(ticketData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const ticketTypes: { value: TicketType; label: string; description: string }[] = [
    { value: 'general', label: 'General Inquiry', description: 'General questions or information requests' },
    { value: 'technical', label: 'Technical Support', description: 'Technical issues with equipment or software' },
    { value: 'installation', label: 'Installation Help', description: 'Assistance with equipment installation' },
    { value: 'maintenance', label: 'Maintenance Request', description: 'Scheduled or emergency maintenance' },
    { value: 'spare_parts', label: 'Spare Parts', description: 'Request for replacement parts' },
    { value: 'warranty', label: 'Warranty Claim', description: 'Issues covered under warranty' },
    { value: 'billing', label: 'Billing Support', description: 'Questions about invoices or payments' },
    { value: 'sales', label: 'Sales Inquiry', description: 'Questions about products or quotes' },
    { value: 'complaint', label: 'Complaint', description: 'Service or product complaints' },
  ]

  const priorities: { value: TicketPriority; label: string; description: string }[] = [
    { value: 'low', label: 'Low', description: 'Non-urgent, can wait several days' },
    { value: 'medium', label: 'Medium', description: 'Normal priority, within 1-2 days' },
    { value: 'high', label: 'High', description: 'Important, needs attention within hours' },
    { value: 'urgent', label: 'Urgent', description: 'Very important, immediate attention needed' },
    { value: 'critical', label: 'Critical', description: 'Production stopped, emergency response' },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and we'll help you resolve it as quickly as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ticket Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Ticket Type *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as TicketType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket type" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as TicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div>
                        <div className="font-medium">{priority.label}</div>
                        <div className="text-sm text-muted-foreground">{priority.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-600">{errors.priority.message}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of your issue"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you've already tried..."
              rows={6}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                placeholder="+20 123 456 7890"
                {...register('contact_phone')}
              />
              {errors.contact_phone && (
                <p className="text-sm text-red-600">{errors.contact_phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="your.email@example.com"
                {...register('contact_email')}
              />
              {errors.contact_email && (
                <p className="text-sm text-red-600">{errors.contact_email.message}</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_location">Site Location</Label>
              <Input
                id="site_location"
                placeholder="e.g., Cairo Workshop, Alexandria Factory"
                {...register('site_location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine_serial_number">Machine Serial Number</Label>
              <Input
                id="machine_serial_number"
                placeholder="e.g., ALM-2024-001"
                {...register('machine_serial_number')}
              />
            </div>
          </div>

          {/* Preferred Contact Method */}
          <div className="space-y-2">
            <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
            <Select
              value={watch('preferred_contact_method')}
              onValueChange={(value) => setValue('preferred_contact_method', value as 'email' | 'phone' | 'sms')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
