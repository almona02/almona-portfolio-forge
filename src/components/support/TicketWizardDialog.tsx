import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { createTicket } from '@/lib/ticketApi';
import { getPresignedUrl, uploadFile } from '@/lib/uploads/ticketAttachments';
import { UnifiedTicketFormData, createTicketZodSchema } from '@/lib/validation/ticket';
import { ServiceTicket, TicketPriority, TicketType } from '@/types/tickets';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
// Removed Select components after converting machine serial to pill selection
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/useToast';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy } from 'lucide-react';

export interface TicketWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: (ticketId: string) => void;
  initialValues?: Partial<UnifiedTicketFormData>;
}

const getTypeMeta = (t: any): Record<string, { label: string; desc: string }> => ({
  general: { label: t('ticket.general_inquiry'), desc: t('ticket.general_inquiry_desc') },
  technical: { label: t('ticket.technical_support'), desc: t('ticket.technical_support_desc') },
  installation: { label: t('ticket.installation'), desc: t('ticket.installation_desc') },
  maintenance: { label: t('ticket.maintenance'), desc: t('ticket.maintenance_desc') },
  spare_parts: { label: t('ticket.spare_parts'), desc: t('ticket.spare_parts_desc') },
  warranty: { label: t('ticket.warranty'), desc: t('ticket.warranty_desc') },
  billing: { label: t('ticket.billing'), desc: t('ticket.billing_desc') },
  sales: { label: t('ticket.sales'), desc: t('ticket.sales_desc') },
  complaint: { label: t('ticket.complaint'), desc: t('ticket.complaint_desc') },
  other: { label: t('ticket.other'), desc: t('ticket.other_desc') }
});

const getPriorityMeta = (t: any): { value: TicketPriority; label: string; desc: string }[] => [
  { value: 'low', label: t('ticket.low'), desc: t('ticket.low_desc') },
  { value: 'medium', label: t('ticket.medium'), desc: t('ticket.medium_desc') },
  { value: 'high', label: t('ticket.high'), desc: t('ticket.high_desc') },
  { value: 'urgent', label: t('ticket.urgent'), desc: t('ticket.urgent_desc') },
  { value: 'critical', label: t('ticket.critical'), desc: t('ticket.critical_desc') },
];

const getSteps = (t: any) => [
  { id: 'category', label: t('ticket.category_priority'), fields: ['type','priority'] as const },
  { id: 'details', label: t('ticket.details'), fields: ['title','description'] as const },
  { id: 'attachments', label: t('ticket.attachments'), fields: [] as const },
  { id: 'contact', label: t('ticket.contact_context'), fields: ['contact_phone','contact_email','preferred_contact_method','site_location','machine_serial_number'] as const },
  { id: 'preview', label: t('ticket.preview'), fields: [] as const },
  { id: 'success', label: t('ticket.success'), fields: [] as const }
] as const;

// (removed unused StepId type)

export const TicketWizardDialog: React.FC<TicketWizardDialogProps> = ({ open, onOpenChange, onTicketCreated, initialValues }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language: _language } = useLanguage();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [createdTicketTwin, setCreatedTicketTwin] = useState<string | null>(null);
  interface AttachmentMeta { name: string; size: number; type: string; lastModified: number; uploadedUrl?: string; status: 'pending' | 'uploading' | 'uploaded' | 'error'; error?: string; tempFile?: File; progress?: number; selected?: boolean }
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const toggleSelectAttachment = (index: number) => {
    setAttachments(prev => prev.map((a,i) => i===index ? { ...a, selected: !a.selected } : a));
  };
  const uploadingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const DRAFT_KEY = user ? `ticket_wizard_draft_${user.id}` : undefined;
  const [mdMode, setMdMode] = useState<'edit' | 'preview'>('edit');
  const [richMode, setRichMode] = useState(false);
  type RichEditorComponent = React.ComponentType<{ value?: string; onChange?: (v: string) => void; preview?: string; height?: number; textareaProps?: any }>;
  const [RichEditor, setRichEditor] = useState<RichEditorComponent | null>(null);
  const [mdRenderer, setMdRenderer] = useState<null | { render: (src: string) => string }>(null);
  const [sanitizer, setSanitizer] = useState<null | ((html: string) => string)>(null);

  useEffect(() => {
    if (open && mdMode === 'preview' && (!mdRenderer || !sanitizer)) {
      Promise.all([
        import('markdown-it'),
        import('dompurify')
      ]).then(([mdModule, dpModule]) => {
        const inst = mdModule.default({ breaks: true, linkify: true });
        setMdRenderer(inst);
        type DomPurifyLike = { sanitize: (html: string, opts?: unknown) => string };
        const domPurifyLib = (dpModule as unknown as { default?: DomPurifyLike } ).default || (dpModule as unknown as DomPurifyLike);
        const purifyFn = domPurifyLib.sanitize;
        const purify = (html: string) => purifyFn(html, { USE_PROFILES: { html: true } });
        setSanitizer(() => purify);
      }).catch(() => {/* ignore load errors */});
    }
  }, [open, mdMode, mdRenderer, sanitizer]);

  // Lazy load rich editor when toggled on
  useEffect(() => {
    if (richMode && !RichEditor) {
      // Load CSS dynamically to avoid bundling it in main CSS
      const loadCSS = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/@uiw/react-md-editor@4.0.8/esm/index.css';
        link.onload = () => {
          import('@uiw/react-md-editor').then(mod => {
            setRichEditor(() => (mod.default as unknown as RichEditorComponent));
          }).catch(() => setRichMode(false));
        };
        link.onerror = () => {
          // Fallback: load without external CSS
          import('@uiw/react-md-editor').then(mod => {
            setRichEditor(() => (mod.default as unknown as RichEditorComponent));
          }).catch(() => setRichMode(false));
        };
        document.head.appendChild(link);
      };
      
      loadCSS();
    }
    
    // Cleanup function to remove CSS when component unmounts
    return () => {
      const existingLink = document.querySelector('link[href*="@uiw/react-md-editor"]');
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, [richMode, RichEditor]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  // Prevent late hydration or initialValues effects from overwriting user selections after first interaction
  const userInteractedRef = useRef(false);

  const form = useForm<UnifiedTicketFormData>({
    resolver: zodResolver(createTicketZodSchema),
    defaultValues: {
      // Default to maintenance preventive for requested behavior
      type: 'maintenance',
      priority: 'medium',
      // maintenance_type: 'preventive', // Removed - field doesn't exist in API
      preferred_contact_method: 'email',
      attachments: [],
      ...initialValues
    }
  });

  const { control, handleSubmit, watch, trigger, setValue, register, formState: { isSubmitting, errors } } = form;
  const selectedType = watch('type');
  const selectedPriority = watch('priority');
  
  // Get translated data
  const steps = getSteps(t);
  const typeMeta = getTypeMeta(t);
  const priorityMeta = getPriorityMeta(t);
  // const selectedMaintenanceType = watch('maintenance_type'); // Removed - field doesn't exist in API
  const selectedContactMethod = watch('preferred_contact_method');
  // Local UI state to avoid any watch timing issues and guarantee immediate highlight
  const [uiType, setUiType] = useState<string>(selectedType || 'maintenance');
  const [uiPriority, setUiPriority] = useState<string>(selectedPriority || 'medium');

  // Sync local state when external form value changes (draft load/reset) but not after user has interacted
  useEffect(() => { if (!userInteractedRef.current && selectedType && selectedType !== uiType) setUiType(selectedType); }, [selectedType, uiType]);
  useEffect(() => { if (!userInteractedRef.current && selectedPriority && selectedPriority !== uiPriority) setUiPriority(selectedPriority); }, [selectedPriority, uiPriority]);

  // After user interaction, ensure form values don't drift from UI (last-write-wins = UI)
  useEffect(() => {
    if (!userInteractedRef.current) return;
    if (uiType && uiType !== selectedType) {
      setValue('type', uiType as TicketType, { shouldDirty: true, shouldTouch: true });
      if (import.meta.env.DEV) console.debug('[TicketWizard] Force-sync form.type ->', uiType, ' (was ', selectedType, ')');
    }
    if (uiPriority && uiPriority !== selectedPriority) {
      setValue('priority', uiPriority as TicketPriority, { shouldDirty: true, shouldTouch: true });
      if (import.meta.env.DEV) console.debug('[TicketWizard] Force-sync form.priority ->', uiPriority, ' (was ', selectedPriority, ')');
    }
  }, [uiType, uiPriority, selectedType, selectedPriority, setValue]);

  // Apply initialValues only when they actually change (prevents flicker resetting user selection)
  const prevInitialRef = useRef<Partial<UnifiedTicketFormData> | null>(null);
  useEffect(() => {
    if (!initialValues) return;
    // Patch A: If user has already interacted, do not override their selections with initialValues
    if (userInteractedRef.current) return;
    const prev = prevInitialRef.current;
    const changed = !prev || (Object.keys(initialValues) as (keyof UnifiedTicketFormData)[])
      .some(key => prev[key as keyof UnifiedTicketFormData] !== initialValues[key as keyof UnifiedTicketFormData]);
    if (!changed) return; // skip re-applying identical values
    (Object.entries(initialValues) as Array<[keyof UnifiedTicketFormData, UnifiedTicketFormData[keyof UnifiedTicketFormData]]>).forEach(([k,v]) => {
      if (typeof v !== 'undefined') setValue(k, v, { shouldDirty: false, shouldTouch: false });
    });
    prevInitialRef.current = initialValues;
  }, [initialValues, setValue]);

  // Load draft once per dialog open
  useEffect(() => {
    if (!open || !DRAFT_KEY) return;
    if (draftLoadedRef.current) return; // already loaded this open session
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { values: Partial<UnifiedTicketFormData>; step: number; attachments?: Partial<AttachmentMeta>[] };
        if (draft.values) {
          Object.entries(draft.values).forEach(([k,v]) => {
            if (v !== undefined) setValue(k as keyof UnifiedTicketFormData, v as unknown as UnifiedTicketFormData[keyof UnifiedTicketFormData], { shouldDirty: false, shouldTouch: false });
          });
        }
        if (draft.attachments) {
          setAttachments(draft.attachments.map(a => ({
            name: a.name || 'unknown',
            size: a.size || 0,
            type: a.type || 'application/octet-stream',
            lastModified: a.lastModified || Date.now(),
            uploadedUrl: a.uploadedUrl,
            status: a.uploadedUrl ? 'uploaded' : (a.status === 'uploaded' ? 'uploaded' : 'error'),
            error: a.uploadedUrl ? undefined : 'File no longer available (reload)',
            progress: a.uploadedUrl ? 100 : 0,
            selected: false
          })));
        }
        if (typeof draft.step === 'number' && draft.step < steps.length -1) setActiveStepIndex(draft.step);
      }
    } catch { /* ignore */ }
    draftLoadedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, DRAFT_KEY]);

  // Persist draft with debounce to avoid race overwrites causing flicker
  useEffect(() => {
    if (!DRAFT_KEY) return;
    const sub = form.watch((values) => {
      if (import.meta.env.DEV) {
        try { console.debug('[TicketWizard] watch emission', { type: values.type, priority: values.priority }); } catch {/* ignore */}
      }
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        const sanitized = attachments.map(({ tempFile: _tempFile, selected: _sel, ...rest }) => rest);
        const toStore = { values, step: activeStepIndex, attachments: sanitized };
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(toStore)); } catch { /* ignore */ }
      }, 250);
    });
    return () => {
      sub.unsubscribe();
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [form, DRAFT_KEY, activeStepIndex, attachments]);

  const mutation = useMutation({
    mutationFn: async (data: UnifiedTicketFormData) => {
      if (!user) throw new Error('Not authenticated');
      return createTicket({
        title: data.title,
        description: data.description,
        type: data.type as TicketType,
        priority: data.priority as TicketPriority,
        // maintenance_type: data.maintenance_type as ('preventive' | 'corrective' | 'predictive' | 'emergency' | undefined), // Removed - field doesn't exist in API
        contact_phone: data.contact_phone || undefined,
        contact_email: data.contact_email || undefined,
        preferred_contact_method: data.preferred_contact_method,
        site_location: data.site_location || undefined,
        machine_serial_number: data.machine_serial_number || undefined,
        machine_model: (data as UnifiedTicketFormData & { machine_model?: string }).machine_model || undefined,
        related_product_id: undefined,
        related_quote_id: undefined,
        related_order_id: undefined,
      }, user.id);
    },
    onSuccess: (ticket: ServiceTicket) => {
      console.log('[TicketWizardDialog] Ticket created successfully:', ticket);
      console.log('[TicketWizardDialog] Digital twin code:', ticket.digital_twin_code);
      toast({ title: 'Ticket Created', description: 'Your support ticket has been submitted.' });
      setCreatedTicketId(ticket.id);
      setCreatedTicketTwin(ticket.digital_twin_code || null);
      setActiveStepIndex(steps.findIndex(s => s.id === 'success'));
      onTicketCreated?.(ticket.id);
      if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Failed to create ticket';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  });

  const next = async () => {
    const step = steps[activeStepIndex];
    if (step.fields.length) {
      // Cast through unknown to satisfy react-hook-form typing expectations
      const fieldNames = step.fields.slice() as unknown as (keyof UnifiedTicketFormData)[];
      const valid = await trigger(fieldNames);
      if (!valid) {
        // focus first invalid field
        const firstErrorName = Object.keys(errors)[0];
        if (firstErrorName) {
          const el = document.querySelector(`[name="${firstErrorName}"]`) as HTMLElement | null;
          el?.focus();
        }
        return;
      }
    }
    setActiveStepIndex(i => Math.min(i + 1, steps.length - 1));
  };
  const back = () => setActiveStepIndex(i => Math.max(i - 1, 0));

  const onSubmit = (data: UnifiedTicketFormData) => {
    const uploaded = attachments.filter(a => a.status === 'uploaded' && a.uploadedUrl).map(a => a.uploadedUrl!) ;
    mutation.mutate({ ...data, attachments: uploaded });
  };

  const resetDraft = () => {
    // Clear stored draft
    if (DRAFT_KEY) {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    }
    form.reset({
      type: initialValues?.type || 'general',
      priority: initialValues?.priority || 'medium',
      // maintenance_type: initialValues?.maintenance_type || 'corrective', // Removed - field doesn't exist in API
      preferred_contact_method: initialValues?.preferred_contact_method || 'email',
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      contact_phone: initialValues?.contact_phone || '',
      contact_email: initialValues?.contact_email || '',
      site_location: initialValues?.site_location || '',
      machine_serial_number: initialValues?.machine_serial_number || '',
      attachments: []
    });
    setAttachments([]);
    setActiveStepIndex(0);
    setCreatedTicketId(null);
    setCreatedTicketTwin(null);
    draftLoadedRef.current = true;
    userInteractedRef.current = false; // allow re-sync after full reset
    toast({ title: 'Draft Reset', description: 'Form draft cleared.' });
  };

  // Process upload queue with simple sequential batching (concurrency = 2)
  useEffect(() => {
    const runQueue = async () => {
      if (uploadingRef.current) return;
      if (!attachments.some(a => a.status === 'pending')) return;
      uploadingRef.current = true;
      try {
        while (true) {
          const pending = () => attachments.filter(a => a.status === 'pending');
          const batch = pending().slice(0, 2);
            if (!batch.length) break;
            // Mark uploading
            batch.forEach(item => setAttachments(prev => prev.map(p => p === item ? { ...p, status: 'uploading', error: undefined, progress: 0 } : p)));
            await Promise.all(batch.map(async item => {
              try {
                if (!item.tempFile) throw new Error('Missing file blob');
                const presign = await getPresignedUrl({ name: item.tempFile.name, size: item.tempFile.size, type: item.tempFile.type });
                const result = await uploadFile(item.tempFile, presign, (pct) => {
                  setAttachments(prev => prev.map(p => p === item ? { ...p, progress: pct } : p));
                });
                if (!result.success) throw new Error(result.error || 'Upload failed');
                setAttachments(prev => prev.map(p => p === item ? { ...p, status: 'uploaded', uploadedUrl: presign.fileUrl, progress: 100 } : p));
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload error';
                setAttachments(prev => prev.map(p => p === item ? { ...p, status: 'error', error: message } : p));
              }
            }));
        }
      } finally {
        uploadingRef.current = false;
      }
    };
    runQueue();
  }, [attachments]);

  const handleTypeClick = useCallback((type: string) => {
    userInteractedRef.current = true;
    setUiType(type);
    setValue('type', type as TicketType, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const TypePills = useCallback(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {Object.entries(typeMeta).map(([value, meta]) => {
        const active = uiType === value;
        return (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={active}
            onMouseDown={() => { if (!userInteractedRef.current) userInteractedRef.current = true; }}
            onClick={() => handleTypeClick(value)}
            aria-pressed={active}
            className={`relative text-left p-3 rounded-md border transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-almona-orange/60 ${active ? 'border-almona-orange bg-gradient-to-br from-almona-orange/20 to-almona-orange/5 shadow-[0_0_0_1px_rgba(255,95,31,0.4)]' : 'border-almona-light/20 hover:border-almona-orange/40'}`}
          >
            <div className={`font-medium text-sm ${active ? 'text-almona-orange' : 'group-hover:text-almona-orange'}`}>{meta.label}</div>
            <div className="text-[11px] mt-1 text-gray-400 leading-snug pr-5">{meta.desc}</div>
            {active && <span className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-almona-orange text-[10px] font-bold text-black">✓</span>}
          </button>
        );
      })}
    </div>
  ), [uiType, handleTypeClick, typeMeta]);

  const handlePriorityClick = useCallback((priority: TicketPriority) => {
    userInteractedRef.current = true;
    setUiPriority(priority);
    setValue('priority', priority, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const PriorityPills = useCallback(() => (
    <div className="flex flex-wrap gap-2">
      {priorityMeta.map(p => {
        const active = uiPriority === p.value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onMouseDown={() => { if (!userInteractedRef.current) userInteractedRef.current = true; }}
            onClick={() => handlePriorityClick(p.value)}
            aria-pressed={active}
            className={`relative px-3 py-2 rounded-md border text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-almona-orange/60 ${active ? 'border-almona-orange bg-gradient-to-br from-almona-orange/25 to-almona-orange/5 shadow-[0_0_0_1px_rgba(255,95,31,0.4)]' : 'border-almona-light/20 hover:border-almona-orange/40'}`}
          >
            <div className={`font-medium ${active ? 'text-almona-orange' : ''}`}>{p.label}</div>
            <div className="text-[10px] text-gray-400 pr-4">{p.desc}</div>
            {active && <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-almona-orange text-[10px] font-bold text-black">✓</span>}
          </button>
        );
      })}
    </div>
  ), [uiPriority, handlePriorityClick, priorityMeta]);

  const activeStep = steps[activeStepIndex];
  const isLastFormStep = activeStep.id === 'preview';
  const isSuccess = activeStep.id === 'success';
  const progressPercent = (activeStepIndex / (steps.length - 1)) * 100;

  useEffect(() => {
    if (open) {
      setCreatedTicketId(null);
      setCreatedTicketTwin(null);
    }
  }, [open]);

  // Focus heading on step change
  useEffect(() => {
    headingRef.current?.focus();
  }, [activeStepIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[92vh] overflow-y-auto p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-almona-light/10 sticky top-0 bg-almona-dark/80 backdrop-blur z-10">
          <DialogTitle ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">{t('ticket.create_support_ticket')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2">
            {t('ticket.wizard_description')}
          </DialogDescription>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-almona-dark/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 via-red-500 to-rose-500 transition-all" style={{ width: `${progressPercent}%` }} aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} role="progressbar" />
            </div>
            <ol className="flex flex-wrap gap-2 mt-3 text-[11px] uppercase tracking-wide text-gray-400" aria-label="Steps">
              {steps.map((s, idx) => (
                <li key={s.id} className={`${idx === activeStepIndex ? 'text-amber-400 font-medium' : idx < activeStepIndex ? 'text-green-400' : ''}`}>{s.label}</li>
              ))}
            </ol>
          </div>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex-1 px-6 py-6 space-y-8">
          {/* Hidden registered inputs to ensure react-hook-form tracks these programmatic selections */}
          <input type="hidden" {...register('type')} />
          <input type="hidden" {...register('priority')} />
          {/* <input type="hidden" {...register('maintenance_type')} /> */} {/* Removed - field doesn't exist in API */}
          <input type="hidden" {...register('preferred_contact_method')} />
          <input type="hidden" {...register('machine_model')} />
            <LazyAnimatePresence mode="wait">
            {!isSuccess && activeStep.id === 'category' && (
              <LazyMotionDiv key="category" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="typography-label text-sm font-medium">Ticket Type</Label>
                    {/* Debug line removed for production cleanliness */}
                    <TypePills />
                    {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
                  </div>
                  <div className="space-y-4">
                    <Label className="typography-label text-sm font-medium">Priority</Label>
                    {import.meta.env.DEV && (
                      <div className="text-[10px] text-gray-500">debug: form.priority={selectedPriority} uiPriority={uiPriority}</div>
                    )}
                    <PriorityPills />
                    {errors.priority && <p className="text-xs text-red-500">{errors.priority.message}</p>}
                  </div>
                </div>
                {/* Maintenance Type selection removed - field doesn't exist in API */}
              </LazyMotionDiv>
            )}

            {!isSuccess && activeStep.id === 'details' && (
              <LazyMotionDiv key="details" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="typography-label">{t('ticket.title')}</Label>
                  <Controller name="title" control={control} render={({ field }) => (
                    <Input id="title" {...field} placeholder="Brief description" className="bg-almona-darker border-almona-light/30 focus:border-almona-orange/50" />
                  )} />
                  {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('ticket.description')} {richMode && <span className="text-xs text-gray-400 ml-1">({t('ticket.rich_editor')})</span>}</Label>
                    <div className="flex gap-2 items-center text-xs">
                      <button type="button" onClick={() => setRichMode(m => !m)} className="px-2 py-1 rounded border border-almona-light/30 hover:border-almona-orange/50">
                        {richMode ? t('ticket.plain_markdown') : t('ticket.rich_editor')}
                      </button>
                    </div>
                  </div>
                  <Controller name="description" control={control} render={({ field }) => {
                    if (richMode && RichEditor) {
                      return (
                        <div className="border border-almona-light/30 rounded-md overflow-hidden bg-almona-darker">
                          <Suspense fallback={<div className="p-4 text-xs text-gray-400">Loading editor...</div>}>
                            <RichEditor value={field.value} onChange={(val: string) => field.onChange(val)} preview={mdMode === 'preview' ? 'preview' : 'edit'} height={300} textareaProps={{ placeholder: t('ticket.describe_issue_placeholder') }} />
                          </Suspense>
                        </div>
                      );
                    }
                    // Fallback basic markdown editor
                    let previewHtml = '';
                    if (mdMode === 'preview' && mdRenderer && sanitizer) {
                      try { previewHtml = sanitizer(mdRenderer.render(field.value || '')); }
                      catch { previewHtml = `<p class="text-red-400 text-xs">${t('ticket.preview_error')}</p>`; }
                    }
                    return (
                      <div className="border border-almona-light/30 rounded-md overflow-hidden">
                        <div className="flex text-xs bg-almona-dark/60 border-b border-almona-light/10">
                          <button type="button" className={`px-3 py-2 transition-colors ${mdMode==='edit' ? 'text-amber-400' : 'hover:text-almona-orange'}`} onClick={() => setMdMode('edit')} aria-pressed={mdMode==='edit'}>{t('ticket.edit')}</button>
                          <button type="button" className={`px-3 py-2 transition-colors ${mdMode==='preview' ? 'text-amber-400' : 'hover:text-almona-orange'}`} onClick={() => setMdMode('preview')} aria-pressed={mdMode==='preview'} disabled={!mdRenderer && !sanitizer && mdMode==='preview'}>{t('ticket.preview')}</button>
                        </div>
                        {mdMode === 'edit' && (
                          <Textarea rows={8} {...field} placeholder="Details, steps to reproduce, error messages... (Markdown supported)" className="bg-almona-darker border-0 focus-visible:ring-0 focus:border-0" />
                        )}
                        {mdMode === 'preview' && (
                          <div className="prose prose-invert max-w-none p-4 bg-almona-darker/50 text-sm" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-500">Nothing to preview.</p>' }} />
                        )}
                      </div>
                    );
                  }} />
                  {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>
                {selectedType === 'maintenance' && ['critical','urgent'].includes(watch('priority') as string) && (
                  <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                    <strong>Emergency escalation:</strong> If production is halted, please call our 24/7 hotline +20-XX-XXX-XXXX after submitting.
                  </div>
                )}
              </LazyMotionDiv>
            )}

            {!isSuccess && activeStep.id === 'attachments' && (
              <LazyMotionDiv key="attachments" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
                <h3 className="typography-h3 text-lg">{t('ticket.attachments_optional')}</h3>
                <p className="text-xs text-gray-400">{t('ticket.add_reference_files')}</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).map(f => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified, status: 'pending' as const, tempFile: f, progress: 0, selected: false }));
                    setAttachments(prev => [...prev, ...files]);
                  }}
                  className="text-sm"
                />
                {attachments.length > 0 && (
                  <ul className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded-md p-2 border-almona-light/20">
                    {attachments.map((f,i) => (
                      <li
                        key={i}
                        onClick={() => toggleSelectAttachment(i)}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-1 cursor-pointer border ${f.selected ? 'border-almona-orange bg-almona-orange/10' : 'border-transparent hover:border-almona-light/20'} transition-colors`}
                        aria-selected={f.selected}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate inline-block max-w-[160px] align-middle" title={f.name}>{f.name}</span>
                            <span className="text-gray-500 text-[10px]">{Math.round(f.size/1024)} KB</span>
                            {f.error && <span className="text-red-400 text-[10px]">{f.error}</span>}
                          </div>
                          <div className="h-1 mt-1 rounded bg-almona-dark/40 overflow-hidden">
                            <div className={`h-full transition-all ${f.status==='error' ? 'bg-red-500' : f.status==='uploaded' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${f.progress || 0}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          {f.status === 'pending' && <span className="text-amber-400">Queued</span>}
                          {f.status === 'uploading' && <span className="text-blue-400">{f.progress ?? 0}%</span>}
                          {f.status === 'uploaded' && <span className="text-green-400">100%</span>}
                          {f.status === 'error' && <button type="button" className="text-red-400 underline" onClick={(e) => { e.stopPropagation(); setAttachments(a => a.map((at,idx) => idx===i ? { ...at, status: 'pending', error: undefined, progress: 0 } : at)); }}>{t('ticket.retry')}</button>}
                          <button type="button" className="text-red-400 hover:underline" onClick={(e) => { e.stopPropagation(); setAttachments(a => a.filter((_,idx)=> idx!==i)); }}>{t('ticket.remove')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={next}>{t('ticket.continue')}</Button>
                </div>
              </LazyMotionDiv>
            )}

            {!isSuccess && activeStep.id === 'contact' && (
              <LazyMotionDiv key="contact" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-6">
                <MachineAndContactSection control={control} setValue={setValue} userId={user?.id || null} selectedContactMethod={selectedContactMethod} />
              </LazyMotionDiv>
            )}

            {!isSuccess && activeStep.id === 'preview' && (
              <LazyMotionDiv key="preview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
                <h3 className="typography-h3 text-lg">{t('ticket.preview_title')}</h3>
                <div className="bg-almona-darker/40 p-4 rounded border border-almona-light/20 text-sm space-y-2">
                  <div><strong>{t('ticket.preview_title_label')}</strong> {watch('title')}</div>
                  <div><strong>Type:</strong> {watch('type')}</div>
                  <div><strong>Priority:</strong> {watch('priority')}</div>
                  <div><strong>{t('ticket.preview_description_label')}</strong><pre className="whitespace-pre-wrap mt-1 text-gray-300 text-xs">{watch('description')}</pre></div>
                  <div><strong>Contact:</strong> {watch('contact_email') || watch('contact_phone') || '—'}</div>
                  <div><strong>Machine Serial:</strong> {watch('machine_serial_number') || '—'}</div>
                  {['maintenance'].includes(watch('type') || '') && (
                    <div className="mt-2 p-2 rounded bg-almona-dark/60 border border-dashed border-almona-light/20 text-xs text-gray-400">
                      <strong className="text-gray-300">Digital Twin Code:</strong> Will be generated on submission.
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div>
                      <strong>{t('ticket.preview_attachments_label')}</strong> {attachments.filter(a=>a.status==='uploaded').length}/{attachments.length} {t('ticket.uploaded')}
                      <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto pr-1">
                        {attachments.map((a, idx) => (
                          <li key={idx} className="flex gap-2 items-center">
                            <span className={`truncate max-w-[160px] ${a.selected ? 'text-amber-400' : ''}`}>{a.name}</span>
                            <span className="text-gray-500 text-[10px]">{a.status}{a.progress != null && a.status !== 'uploaded' ? ` ${a.progress}%` : ''}</span>
                            {a.uploadedUrl && <span className=" text-[10px] status-valid">linked</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting || attachments.some(a=> a.status==='uploading' || a.status==='pending')}>
                    {isSubmitting ? 'Submitting...' : attachments.some(a=> a.status==='uploading' || a.status==='pending') ? 'Waiting for uploads...' : 'Submit Ticket'}
                  </Button>
                </div>
              </LazyMotionDiv>
            )}

            {isSuccess && (
              <LazyMotionDiv key="success" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="text-center py-12 space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </div>
                <div>
                  <h3 className="typography-h3 mb-2">{t('ticket.created')}</h3>
                  <p className="text-gray-400 max-w-md mx-auto">{t('ticket.created_message')}</p>
                  {createdTicketTwin ? (
                    <div className="mt-4 inline-flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">{t('ticket.digital_twin_code')}</span>
                        <code className="px-3 py-1 rounded bg-almona-dark/60 border border-almona-light/20 text-almona-orange text-sm font-mono">{createdTicketTwin}</code>
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1" 
                        onClick={async () => {
                          if (createdTicketTwin) {
                            await navigator.clipboard.writeText(createdTicketTwin);
                            toast({ title: 'Copied!', description: 'Digital twin code copied to clipboard.' });
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" /> {t('ticket.copy_code')}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-yellow-400">Digital Twin Code: Not available</p>
                      <p className="text-xs text-gray-500 mt-1">Debug: createdTicketTwin = {String(createdTicketTwin)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={() => { onOpenChange(false); }} variant="outline">{t('ticket.close')}</Button>
                  {createdTicketId && (
                    <Button onClick={() => window.location.assign(`/support/tickets/${createdTicketId}`)}>{t('ticket.view_ticket')}</Button>
                  )}
                  <Button variant="secondary" onClick={() => { setActiveStepIndex(0); setCreatedTicketId(null); }}>{t('ticket.create_another')}</Button>
                </div>
              </LazyMotionDiv>
            )}
          </LazyAnimatePresence>
        </form>

        {!isSuccess && (
          <div className="px-6 pb-6 pt-4 border-t border-almona-light/10 flex flex-wrap gap-4 justify-between items-center bg-almona-dark/60 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500">{t('ticket.step_of').replace('{current}', String(activeStepIndex + 1)).replace('{total}', String(steps.length))}</div>
              <button type="button" onClick={resetDraft} className="text-[11px] uppercase tracking-wide text-gray-400 hover:text-almona-orange transition-colors underline-offset-2 hover:underline">
{t('ticket.reset_draft')}
              </button>
            </div>
            <div className="flex gap-3">
              {activeStepIndex > 0 && <Button type="button" variant="outline" onClick={back} className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {t('ticket.back')}</Button>}
              {!isLastFormStep && <Button type="button" onClick={next} className="flex items-center gap-1">{t('ticket.next')} <ChevronRight className="h-4 w-4" /></Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketWizardDialog;

// Helper subcomponent for Contact & Machine section
const MachineAndContactSection: React.FC<{ control: any; setValue: any; userId: string | null; selectedContactMethod: string | undefined }> = ({ control, setValue, userId, selectedContactMethod }) => {
  const [machines, setMachines] = React.useState<Array<{ serial_number: string; model?: string | null }> | null>(null);
  const [loading, setLoading] = React.useState(false);
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.fetchUserMachines(userId).then(list => {
      setMachines(list.map(m => ({ serial_number: m.serial_number, model: (m as { model?: string }).model })));
    }).catch(() => setMachines([])).finally(() => setLoading(false));
  }, [userId]);
  const models = Array.from(new Set((machines?.map(m => m.model).filter(Boolean) as string[]) || []));
  // Watch current model via uncontrolled access (re-render occurs from RHF state updates)
  const currentModel = (control._formValues?.machine_model || '') as string;
  const serialsAll = machines?.map(m => m.serial_number).filter(Boolean) || [];
  const filteredSerials = currentModel ? machines?.filter(m => m.model === currentModel).map(m => m.serial_number).filter(Boolean) || [] : serialsAll;
  const currentSerial = (control._formValues?.machine_serial_number || '') as string;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
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
      <div className="space-y-2 md:col-span-2">
        <Label>Preferred Contact</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preferred Contact Method">
          {(['email','phone','sms'] as const).map(method => {
            const active = selectedContactMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setValue('preferred_contact_method', method, { shouldDirty: true })}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_0_1px_rgba(255,153,0,0.4)]' : 'border-almona-light/30 text-gray-400 hover:border-amber-400/60 hover:text-amber-300'}`}
              >{method.toUpperCase()}</button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Site Location</Label>
        <Controller name="site_location" control={control} render={({ field }) => (
          <Input {...field} placeholder="Cairo Workshop" className="bg-almona-darker border-almona-light/30" />
        )} />
      </div>
      <div className="space-y-2">
        <Label>Machine Model</Label>
        {loading ? (
          <div className="text-xs text-gray-400 py-2">Loading models...</div>
        ) : models.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Machine Model">
            {models.map(m => {
              const active = currentModel === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setValue('machine_model', active ? '' : m, { shouldDirty: true }); setValue('machine_serial_number',''); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_0_1px_rgba(255,153,0,0.4)]' : 'border-almona-light/30 text-gray-400 hover:border-amber-400/60 hover:text-amber-300'}`}
                  aria-pressed={active}
                >{m}</button>
              );
            })}
            {models.length === 0 && <div className="text-xs text-gray-500">No models</div>}
          </div>
        ) : (
          <Controller name="machine_model" control={control} render={({ field }) => (
            <Input {...field} placeholder="e.g. CNC-500" className="bg-almona-darker border-almona-light/30" />
          )} />
        )}
      </div>
      <div className="space-y-2">
        <Label>Machine Serial{currentModel && <span className="text-[10px] ml-1 text-gray-400">(Filtered)</span>}</Label>
        {loading ? (
          <div className="text-xs text-gray-400 py-2">Loading machines...</div>
        ) : filteredSerials.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Machine Serial">
            {filteredSerials.map(sn => {
              const active = currentSerial === sn;
              return (
                <button
                  key={sn}
                  type="button"
                  onClick={() => setValue('machine_serial_number', active ? '' : sn, { shouldDirty: true })}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_0_1px_rgba(255,153,0,0.4)]' : 'border-almona-light/30 text-gray-400 hover:border-amber-400/60 hover:text-amber-300'}`}
                >{sn}</button>
              );
            })}
            <button
              type="button"
              onClick={() => setValue('machine_serial_number','', { shouldDirty: true })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${currentSerial === '' ? 'bg-amber-500/10 border-amber-400/70 text-amber-300' : 'border-almona-light/30 text-gray-400 hover:border-amber-400/60 hover:text-amber-300'}`}
            >(None)</button>
          </div>
        ) : (
          <Controller name="machine_serial_number" control={control} render={({ field }) => (
            <Input {...field} placeholder={currentModel ? 'No serials for model' : 'ALM-2024-001'} className="bg-almona-darker border-almona-light/30" disabled={!!currentModel} />
          )} />
        )}
      </div>
    </div>
  );
};
