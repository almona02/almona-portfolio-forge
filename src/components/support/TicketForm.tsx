import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketZodSchema, UnifiedTicketFormData } from '@/lib/validation/ticket';
import { useAuth } from '@/context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { createTicket } from '@/lib/ticketApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { TicketPriority, TicketType } from '@/types/tickets';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import clsx from 'clsx';

/**
 * Props for the TicketForm component
 */
export interface TicketFormProps {
  /** Display mode - either in a dialog or as a full page */
  mode: 'dialog' | 'page';
  /** Initial form values for editing existing tickets */
  initialValues?: Partial<UnifiedTicketFormData>;
  /** Callback called when ticket is successfully created */
  onSuccess?: () => void;
  /** Whether to show attachment upload functionality (placeholder for future integration) */
  showAttachments?: boolean;
  /** Whether to show contact information fields */
  showContactFields?: boolean;
  /** Additional context data (structure not required inside form component) */
  context?: unknown;
}

const typeMeta: Record<string, { label: string; desc: string }> = {
  general: { label: 'General Inquiry', desc: 'General questions or information requests' },
  technical: { label: 'Technical Support', desc: 'Issues with equipment or software' },
  installation: { label: 'Installation', desc: 'Help with installing or configuring equipment' },
  maintenance: { label: 'Maintenance', desc: 'Scheduled or emergency maintenance' },
  spare_parts: { label: 'Spare Parts', desc: 'Requests for replacement parts' },
  warranty: { label: 'Warranty', desc: 'Warranty coverage or claims' },
  billing: { label: 'Billing', desc: 'Invoice or payment questions' },
  sales: { label: 'Sales', desc: 'Product / quote inquiries' },
  complaint: { label: 'Complaint', desc: 'Service or product complaint' },
  other: { label: 'Other', desc: 'Not covered by other categories' }
};

const priorityMeta: { value: TicketPriority; label: string; desc: string }[] = [
  { value: 'low', label: 'Low', desc: 'Can wait several days' },
  { value: 'medium', label: 'Medium', desc: 'Normal response' },
  { value: 'high', label: 'High', desc: 'Needs attention soon' },
  { value: 'urgent', label: 'Urgent', desc: 'Immediate attention' },
  { value: 'critical', label: 'Critical', desc: 'Production stopped' },
];

/**
 * TicketForm Component
 * 
 * A comprehensive form for creating support tickets with multiple input methods.
 * Features:
 * - Multiple ticket types with visual selection pills
 * - Priority levels with descriptions
 * - Maintenance type selection for maintenance tickets
 * - Contact information fields
 * - Multi-step form with attachments and preview (when in page mode)
 * - Form validation using Zod schema
 * - Animated transitions between form steps
 * - Error handling with user feedback
 * 
 * Supports both dialog and full-page display modes.
 */
export const TicketForm: React.FC<TicketFormProps> = ({
  mode,
  initialValues,
  onSuccess,
  showAttachments = false,
  showContactFields = true,
  context: _context
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'preview'>('details');

  const form = useForm<UnifiedTicketFormData>({
    resolver: zodResolver(createTicketZodSchema),
    defaultValues: {
      type: 'general',
      priority: 'medium',
      maintenance_type: 'corrective',
      ...initialValues,
    }
  });

  const { control, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = form;
  const selectedType = watch('type');
  const selectedPriority = watch('priority');

  useEffect(() => {
    if (initialValues) {
      (Object.entries(initialValues) as Array<[keyof UnifiedTicketFormData, UnifiedTicketFormData[keyof UnifiedTicketFormData]]>).forEach(([k,v]) => {
        if (typeof v !== 'undefined') setValue(k, v, { shouldDirty: false });
      });
    }
  }, [initialValues, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: UnifiedTicketFormData) => {
      if (!user) throw new Error('Not authenticated');
      // Map to existing createTicket API shape
      return createTicket({
        title: data.title,
        description: data.description,
        type: data.type as TicketType,
        priority: data.priority as TicketPriority,
  maintenance_type: data.maintenance_type as ('preventive' | 'corrective' | 'predictive' | 'emergency' | undefined),
        contact_phone: data.contact_phone || undefined,
        contact_email: data.contact_email || undefined,
        preferred_contact_method: data.preferred_contact_method,
        site_location: data.site_location || undefined,
        machine_serial_number: data.machine_serial_number || undefined,
        related_product_id: undefined,
        related_quote_id: undefined,
        related_order_id: undefined,
      }, user.id);
    },
    onSuccess: () => {
      toast({ title: 'Ticket Created', description: 'Your support ticket has been submitted.' });
      onSuccess?.();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Failed to create ticket';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  });

  const onSubmit = (data: UnifiedTicketFormData) => {
    mutation.mutate(data);
  };

  const TypePills = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {Object.entries(typeMeta).map(([value, meta]) => (
        <button
          type="button"
          key={value}
          onClick={() => setValue('type', value as TicketType)}
          className={`text-left p-3 rounded-md border transition group ${selectedType === value ? 'border-almona-orange bg-almona-orange/10' : 'border-almona-light/20 hover:border-almona-orange/40'}`}
        >
          <div className="font-medium group-hover:text-almona-orange text-sm">{meta.label}</div>
          <div className="text-[11px] mt-1 text-gray-400 leading-snug">{meta.desc}</div>
        </button>
      ))}
    </div>
  );

  const PriorityPills = () => (
    <div className="flex flex-wrap gap-2">
      {priorityMeta.map(p => (
        <button
          key={p.value}
            type="button"
            onClick={() => setValue('priority', p.value)}
            className={`px-3 py-2 rounded-md border text-sm transition ${selectedPriority === p.value ? 'border-almona-orange bg-almona-orange/20' : 'border-almona-light/20 hover:border-almona-orange/40'}`}
        >
          <div className="font-medium">{p.label}</div>
          <div className="text-[10px] text-gray-400">{p.desc}</div>
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {mode === 'page' && showAttachments && (
        <div className="flex gap-4 border-b border-almona-light/10 pb-2 text-sm">
          {(['details','attachments','preview'] as const).map(t => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} className={`uppercase tracking-wide ${activeTab===t ? 'text-almona-orange' : 'text-gray-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>
      )}

      <LazyAnimatePresence mode="wait">
        {(activeTab === 'details' || mode === 'dialog' || !showAttachments) && (
          <LazyMotionDiv key="details" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Ticket Type</Label>
                <TypePills />
                {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <PriorityPills />
                {errors.priority && <p className="text-xs text-red-500">{errors.priority.message}</p>}
              </div>
            </div>

            {selectedType === 'maintenance' && (
              <div className="space-y-2">
                <Label>Maintenance Type</Label>
                <Controller name="maintenance_type" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="typography-label">Title</Label>
              <Controller name="title" control={control} render={({ field }) => (
                <Input id="title" {...field} placeholder="Brief description" className={clsx("bg-almona-darker border-almona-light/30 focus:border-almona-orange/50", { "border-red-500 focus:border-red-500": errors.title })} />
              )} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="typography-label">Description</Label>
              <Controller name="description" control={control} render={({ field }) => (
                <Textarea id="description" rows={6} {...field} placeholder="Details, steps to reproduce, error messages..." className={clsx("bg-almona-darker border-almona-light/30 focus:border-almona-orange/50", { "border-red-500 focus:border-red-500": errors.description })} />
              )} />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            {showContactFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Controller name="contact_phone" control={control} render={({ field }) => (
                    <Input {...field} placeholder="+20 123 456 789" className="bg-almona-darker border-almona-light/30" />
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Controller name="contact_email" control={control} render={({ field }) => (
                    <Input type="email" {...field} placeholder="user@example.com" className="bg-almona-darker border-almona-light/30" />
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Contact</Label>
                  <Controller name="preferred_contact_method" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Site Location</Label>
                  <Controller name="site_location" control={control} render={({ field }) => (
                    <Input {...field} placeholder="Cairo Workshop" className="bg-almona-darker border-almona-light/30" />
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Machine Serial</Label>
                  <Controller name="machine_serial_number" control={control} render={({ field }) => (
                    <Input {...field} placeholder="ALM-2024-001" className="bg-almona-darker border-almona-light/30" />
                  )} />
                </div>
              </div>
            )}

            {mode === 'page' && showAttachments && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={()=>setActiveTab('attachments')} className="border-almona-orange text-almona-orange hover:bg-almona-orange/10">Next: Attachments</Button>
              </div>
            )}
          </LazyMotionDiv>
        )}

        {mode === 'page' && showAttachments && activeTab==='attachments' && (
          <LazyMotionDiv key="attachments" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
            <p className="text-sm text-gray-400">Attachment handling to be implemented (placeholder).</p>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={()=>setActiveTab('details')}>Back</Button>
              <Button type="button" onClick={()=>setActiveTab('preview')}>Preview</Button>
            </div>
          </LazyMotionDiv>
        )}

        {mode === 'page' && showAttachments && activeTab==='preview' && (
          <LazyMotionDiv key="preview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
            <h3 className="typography-h3 text-lg">Preview</h3>
            <div className="bg-almona-darker/40 p-4 rounded border border-almona-light/20 text-sm space-y-2">
              <div><strong>Title:</strong> {watch('title')}</div>
              <div><strong>Type:</strong> {watch('type')}</div>
              <div><strong>Priority:</strong> {watch('priority')}</div>
              <div><strong>Description:</strong><pre className="whitespace-pre-wrap mt-1 text-gray-300 text-xs">{watch('description')}</pre></div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={()=>setActiveTab('attachments')}>Back</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting? 'Submitting...' : 'Submit Ticket'}</Button>
            </div>
          </LazyMotionDiv>
        )}
      </LazyAnimatePresence>

      {(!showAttachments || mode==='dialog') && (
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting? 'Submitting...' : 'Submit Ticket'}</Button>
        </div>
      )}
    </form>
  );
};

export default TicketForm;