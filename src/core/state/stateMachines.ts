/**
 * Predefined State Machines
 *
 * Enterprise-grade state machine definitions for common workflows.
 * These machines enforce explicit state transitions with validation.
 */

import { StateMachineEngine, type StateMachine } from './StateMachine';

/**
 * Commercial Quote/Invoice State Machine
 *
 * Enforces explicit lifecycle: draft ? submitted ? approved ? locked ? executed
 * Also supports cancellation from draft/submitted states.
 */
export type CommercialState = 'draft' | 'submitted' | 'approved' | 'locked' | 'executed' | 'cancelled';

export const COMMERCIAL_STATE_MACHINE: StateMachine<CommercialState> = {
  states: ['draft', 'submitted', 'approved', 'locked', 'executed', 'cancelled'],
  initialState: 'draft',
  transitions: [
    // Draft ? Submitted (send to customer/manager)
    {
      from: 'draft',
      to: 'submitted',
      condition: (_context) => {
        // Can submit if entity has required data
        return Promise.resolve(true); // Add validation logic as needed
      }
    },
    // Submitted ? Approved (manager approval)
    {
      from: 'submitted',
      to: 'approved',
      guard: (_context) => {
        // Only managers can approve
        // Add role check: return context.metadata?.userRole === 'manager';
        return Promise.resolve(true);
      }
    },
    // Approved ? Locked (ready for execution, no more changes)
    {
      from: 'approved',
      to: 'locked',
      condition: (_context) => {
        // Can lock if all requirements met
        return Promise.resolve(true);
      }
    },
    // Locked ? Executed (payment received, order placed, etc.)
    {
      from: 'locked',
      to: 'executed',
      condition: (context) => {
        // Can execute if payment confirmed or order placed
        return Promise.resolve(context.metadata?.paymentConfirmed === true ||
               context.metadata?.orderPlaced === true);
      }
    },
    // Draft/Submitted ? Cancelled
    {
      from: ['draft', 'submitted'],
      to: 'cancelled',
      condition: (_context) => {
        // Can cancel if not yet approved
        return Promise.resolve(true);
      }
    }
  ],
  onTransition: (from, to, context) => {
    // Machine-level callback for all transitions
    console.log(`Commercial state transition: ${from} ? ${to}`, context);
    return Promise.resolve();
  },
  onInvalidTransition: (from, to, context) => {
    console.warn(`Invalid commercial transition attempted: ${from} ? ${to}`, context);
    return Promise.resolve();
  }
};

/**
 * Workflow Step State Machine
 *
 * Manages workflow step progression: pending ? in_progress ? completed
 * Supports blocking and unblocking.
 */
export type WorkflowState = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export const WORKFLOW_STATE_MACHINE: StateMachine<WorkflowState> = {
  states: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
  initialState: 'pending',
  transitions: [
    // Pending ? In Progress
    {
      from: 'pending',
      to: 'in_progress'
    },
    // In Progress ? Blocked (waiting on dependency)
    {
      from: 'in_progress',
      to: 'blocked',
      condition: (context) => {
        // Can block if dependency exists
        return Promise.resolve(context.metadata?.hasDependency === true);
      }
    },
    // In Progress ? Completed
    {
      from: 'in_progress',
      to: 'completed',
      condition: (context) => {
        // Can complete if all requirements met
        return Promise.resolve(context.metadata?.requirementsMet === true);
      }
    },
    // Blocked ? In Progress (dependency resolved)
    {
      from: 'blocked',
      to: 'in_progress',
      condition: (context) => {
        // Can resume if dependency resolved
        return Promise.resolve(context.metadata?.dependencyResolved === true);
      }
    },
    // Any state ? Cancelled (except completed)
    {
      from: ['pending', 'in_progress', 'blocked'],
      to: 'cancelled'
    }
  ]
};

/**
 * Production Order State Machine
 *
 * Manages production lifecycle: planned ? scheduled ? in_production ? completed
 */
export type ProductionState = 'planned' | 'scheduled' | 'in_production' | 'paused' | 'completed' | 'cancelled';

export const PRODUCTION_STATE_MACHINE: StateMachine<ProductionState> = {
  states: ['planned', 'scheduled', 'in_production', 'paused', 'completed', 'cancelled'],
  initialState: 'planned',
  transitions: [
    // Planned ? Scheduled
    {
      from: 'planned',
      to: 'scheduled',
      condition: (context) => {
        // Can schedule if resources available
        return Promise.resolve(context.metadata?.resourcesAvailable === true);
      }
    },
    // Scheduled ? In Production
    {
      from: 'scheduled',
      to: 'in_production'
    },
    // In Production ? Paused
    {
      from: 'in_production',
      to: 'paused',
      condition: (context) => {
        // Can pause if reason provided
        return Promise.resolve(!!context.reason);
      }
    },
    // Paused ? In Production
    {
      from: 'paused',
      to: 'in_production'
    },
    // In Production ? Completed
    {
      from: 'in_production',
      to: 'completed',
      condition: (context) => {
        // Can complete if QC passed
        return Promise.resolve(context.metadata?.qcPassed === true);
      }
    },
    // Planned/Scheduled ? Cancelled
    {
      from: ['planned', 'scheduled'],
      to: 'cancelled'
    }
  ]
};

/**
 * Payment State Machine
 *
 * Manages payment lifecycle: pending ? processing ? completed/failed
 */
export type PaymentState = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export const PAYMENT_STATE_MACHINE: StateMachine<PaymentState> = {
  states: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
  initialState: 'pending',
  transitions: [
    // Pending ? Processing
    {
      from: 'pending',
      to: 'processing'
    },
    // Processing ? Completed
    {
      from: 'processing',
      to: 'completed',
      condition: (context) => {
        // Payment confirmed by processor
        return Promise.resolve(context.metadata?.paymentConfirmed === true);
      }
    },
    // Processing ? Failed
    {
      from: 'processing',
      to: 'failed',
      condition: (context) => {
        // Payment failed
        return Promise.resolve(context.metadata?.paymentFailed === true);
      }
    },
    // Completed ? Refunded
    {
      from: 'completed',
      to: 'refunded',
      condition: (context) => {
        // Refund processed
        return Promise.resolve(context.metadata?.refundProcessed === true);
      }
    },
    // Pending/Processing ? Cancelled
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
      throw new Error(`Unknown state machine type: ${type as string}`);
  }
}
