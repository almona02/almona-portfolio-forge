// Unified Ticketing Helper
// Provides a single way to prefill the CreateTicketPage from multiple platform touchpoints

export type TicketSource = 'services' | 'quote' | 'spare_parts' | 'training' | 'emergency' | 'maintenance' | 'machine';

export interface TicketContext {
  source: TicketSource;
  quoteId?: string;
  machineId?: string;
  maintenanceType?: 'preventive' | 'corrective' | 'emergency';
  trainingProgramId?: string;
  trainingProgramName?: string;
  sparePartsItems?: Array<{ partId: string; name: string; quantity: number }>;
  notes?: string;
}

export interface TicketPrefill {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  machine_id?: string;
  maintenance_type?: 'preventive' | 'corrective' | 'emergency';
  scheduled_date?: string;
}

// Build a prefill object based on context
export function buildTicketPrefill(ctx: TicketContext): TicketPrefill {
  switch (ctx.source) {
    case 'emergency':
      return {
        type: 'maintenance',
        maintenance_type: 'emergency',
        priority: 'urgent',
        title: 'Emergency Repair Request',
        description: ctx.notes || 'Immediate attention required for critical machine failure.'
      };
    case 'maintenance':
      return {
        type: 'maintenance',
        maintenance_type: ctx.maintenanceType || 'preventive',
        priority: 'high',
        title: `${capitalize(ctx.maintenanceType || 'preventive')} Maintenance Scheduling`,
        description: ctx.notes || 'Request to schedule planned maintenance.'
      };
    case 'training':
      return {
        type: 'other',
        priority: 'medium',
        title: 'Training Support Request',
        description: `Need assistance regarding training program${ctx.trainingProgramName ? ': ' + ctx.trainingProgramName : ''}.` + (ctx.notes ? '\n' + ctx.notes : '')
      };
    case 'spare_parts':
      return {
        type: 'spare_parts',
        priority: 'medium',
        title: 'Spare Parts Quote Follow-up',
        description: ctx.sparePartsItems?.length
          ? 'Parts Required:\n' + ctx.sparePartsItems.map(p => `- ${p.name} x${p.quantity}`).join('\n')
          : 'Requesting assistance with spare parts procurement.'
      };
    case 'quote':
      return {
        type: 'sales',
        priority: 'medium',
        title: 'Sales Quote Support',
        description: 'Follow-up regarding sales quote ' + (ctx.quoteId || '')
      };
    case 'machine':
      return {
        type: 'technical',
        priority: 'medium',
        machine_id: ctx.machineId,
        title: 'Machine Support Request',
        description: 'Assistance requested for registered machine.'
      };
    case 'services':
    default:
      return { type: 'general', priority: 'low', title: 'Service Inquiry', description: ctx.notes || 'General service inquiry.' };
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Utility to build navigation state for react-router
export function buildNavigationState(ctx: TicketContext) {
  return { prefill: buildTicketPrefill(ctx), context: ctx };
}
