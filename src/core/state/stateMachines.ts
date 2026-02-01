/**
 * Predefined State Machines
 * 
 * Enterprise-grade state machine definitions for common workflows.
 * These machines enforce explicit state transitions with validation.
 */

import type { StateMachine } from './StateMachine';

/**
 * Commercial Quote/Invoice State Machine
 * 
 * Enforces explicit lifecycle: draft → submitted → approved → locked → executed
 * Also supports cancellation from draft/submitted states.
 */
export type CommercialState = 'draft' | 'submitted' | 'approved' | 'locked' | 'executed' | 'cancelled';

export const COMMERCIAL_STATE_MACHINE: StateMachine<CommercialState> = {
  states: ['draft', 'submitted', 'approved', 'locked', 'executed', 'cancelled'],
  initialState: 'draft',
  transitions: [
    // Draft → Submitted (send to customer/manager)
    {
      from: 'draft',
      to: 'submitted',
      condition: async (_context) => {
        // Can submit if entity has required data
        return true; // Add validation logic as needed
      }
    },
    // Submitted → Approved (manager approval)
    {
      from: 'submitted',
      to: 'approved',
      guard: async (_context) => {
        // Only managers can approve
        // Add role check: return context.metadata?.userRole === 'manager';
        return true;
      }
    },
    // Approved → Locked (ready for execution, no more changes)
    {
      from: 'approved',
      to: 'locked',
      condition: async (_context) => {
        // Can lock if all requirements met
        return true;
      }
    },
    // Locked → Executed (payment received, order placed, etc.)
    {
      from: 'locked',
      to: 'executed',
      condition: async (context) => {
        // Can execute if payment confirmed or order placed
        return context.metadata?.paymentConfirmed === true || 
               context.metadata?.orderPlaced === true;
      }
    },
    // Draft/Submitted → Cancelled
    {
      from: ['draft', 'submitted'],
      to: 'cancelled',
      condition: async (_context) => {
        // Can cancel if not yet approved
        return true;
      }
    }
  ],
  onTransition: async (from, to, context) => {
    // Machine-level callback for all transitions
    console.log(`Commercial state transition: ${from} → ${to}`, context);
  },
  onInvalidTransition: async (from, to, context) => {
    console.warn(`Invalid commercial transition attempted: ${from} → ${to}`, context);
  }
};

/**
 * Workflow Step State Machine
 * 
 * Manages workflow step progression: pending → in_progress → completed
 * Supports blocking and unblocking.
 */
export type WorkflowState = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export const WORKFLOW_STATE_MACHINE: StateMachine<WorkflowState> = {
  states: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
  initialState: 'pending',
  transitions: [
    // Pending → In Progress
    {
      from: 'pending',
      to: 'in_progress'
    },
    // In Progress → Blocked (waiting on dependency)
    {
      from: 'in_progress',
      to: 'blocked',
      condition: async (context) => {
        // Can block if dependency exists
        return context.metadata?.hasDependency === true;
      }
    },
    // In Progress → Completed
    {
      from: 'in_progress',
      to: 'completed',
      condition: async (context) => {
        // Can complete if all requirements met
        return context.metadata?.requirementsMet === true;
      }
    },
    // Blocked → In Progress (dependency resolved)
    {
      from: 'blocked',
      to: 'in_progress',
      condition: async (context) => {
        // Can resume if dependency resolved
        return context.metadata?.dependencyResolved === true;
      }
    },
    // Any state → Cancelled (except completed)
    {
      from: ['pending', 'in_progress', 'blocked'],
      to: 'cancelled'
    }
  ]
};

/**
 * Production Order State Machine
 * 
 * Manages production lifecycle: planned → scheduled → in_production → completed
 */
export type ProductionState = 'planned' | 'scheduled' | 'in_production' | 'paused' | 'completed' | 'cancelled';

export const PRODUCTION_STATE_MACHINE: StateMachine<ProductionState> = {
  states: ['planned', 'scheduled', 'in_production', 'paused', 'completed', 'cancelled'],
  initialState: 'planned',
  transitions: [
    // Planned → Scheduled
    {
      from: 'planned',
      to: 'scheduled',
      condition: async (context) => {
        // Can schedule if resources available
        return context.metadata?.resourcesAvailable === true;
      }
    },
    // Scheduled → In Production
    {
      from: 'scheduled',
      to: 'in_production'
    },
    // In Production → Paused
    {
      from: 'in_production',
      to: 'paused',
      condition: async (context) => {
        // Can pause if reason provided
        return !!context.reason;
      }
    },
    // Paused → In Production
    {
      from: 'paused',
      to: 'in_production'
    },
    // In Production → Completed
    {
      from: 'in_production',
      to: 'completed',
      condition: async (context) => {
        // Can complete if QC passed
        return context.metadata?.qcPassed === true;
      }
    },
    // Planned/Scheduled → Cancelled
    {
      from: ['planned', 'scheduled'],
      to: 'cancelled'
    }
  ]
};

/**
 * Payment State Machine
 * 
 * Manages payment lifecycle: pending → processing → completed/failed
 */
export type PaymentState = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export const PAYMENT_STATE_MACHINE: StateMachine<PaymentState> = {
  states: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
  initialState: 'pending',
  transitions: [
    // Pending → Processing
    {
      from: 'pending',
      to: 'processing'
    },
    // Processing → Completed
    {
      from: 'processing',
      to: 'completed',
      condition: async (context) => {
        // Payment confirmed by processor
        return context.metadata?.paymentConfirmed === true;
      }
    },
    // Processing → Failed
    {
      from: 'processing',
      to: 'failed',
      condition: async (context) => {
        // Payment failed
        return context.metadata?.paymentFailed === true;
      }
    },
    // Completed → Refunded
    {
      from: 'completed',
      to: 'refunded',
      condition: async (context) => {
        // Refund processed
        return context.metadata?.refundProcessed === true;
      }
    },
    // Pending/Processing → Cancelled
    {
      from: ['pending', 'processing'],
      to: 'cancelled'
    }
  ]
};

/**
 * Helper function to create a state machine engine for a specific entity
 */
export function createStateMachine<TState extends string>(
  machine: StateMachine<TState>,
  initialState?: TState
): StateMachineEngine<TState> {
  return new StateMachineEngine(machine, initialState);
}

/**
 * Helper function to get state machine by type
 */
export function getStateMachine(type: 'commercial' | 'workflow' | 'production' | 'payment'): StateMachine<any> {
  switch (type) {
    case 'commercial':
      return COMMERCIAL_STATE_MACHINE;
    case 'workflow':
      return WORKFLOW_STATE_MACHINE;
    case 'production':
      return PRODUCTION_STATE_MACHINE;
    case 'payment':
      return PAYMENT_STATE_MACHINE;
    default:
      throw new Error(`Unknown state machine type: ${type}`);
  }
}

