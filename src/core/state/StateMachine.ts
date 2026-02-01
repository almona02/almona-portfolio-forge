/**
 * State Machine Framework
 * 
 * Gold-tier state machine engine for explicit, auditable state transitions.
 * Provides enterprise-grade state management with validation and activity logging.
 * 
 * Features:
 * - Generic state machine engine
 * - Transition validation
 * - Activity logging integration
 * - Predefined machines for common workflows
 * - Type-safe state management
 * 
 * Usage:
 * ```typescript
 * const machine = new StateMachineEngine(COMMERCIAL_STATE_MACHINE);
 * if (machine.canTransition('approved')) {
 *   await machine.transition('approved', { entityType: 'invoice', entityId: invoiceId });
 * }
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';

/**
 * State transition definition
 */
export interface StateTransition<TState extends string> {
  /** Source state(s) - can be single state or array */
  from: TState | TState[];
  /** Target state */
  to: TState;
  /** Optional condition function to validate transition */
  condition?: (context: TransitionContext) => boolean | Promise<boolean>;
  /** Optional guard function that can prevent transition */
  guard?: (context: TransitionContext) => boolean | Promise<boolean>;
  /** Optional callback before transition */
  onBefore?: (context: TransitionContext) => void | Promise<void>;
  /** Optional callback after transition */
  onAfter?: (context: TransitionContext) => void | Promise<void>;
}

/**
 * Transition context
 */
export interface TransitionContext {
  /** Entity type (customer, project, invoice, etc.) */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** User ID performing the transition */
  userId?: string;
  /** Reason for transition */
  reason?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Previous state */
  fromState?: string;
  /** New state */
  toState?: string;
}

/**
 * State machine definition
 */
export interface StateMachine<TState extends string> {
  /** All possible states */
  states: TState[];
  /** Initial state */
  initialState: TState;
  /** Valid transitions */
  transitions: StateTransition<TState>[];
  /** Optional callback on any transition */
  onTransition?: (from: TState, to: TState, context: TransitionContext) => void | Promise<void>;
  /** Optional callback on invalid transition attempt */
  onInvalidTransition?: (from: TState, to: TState, context: TransitionContext) => void | Promise<void>;
}

/**
 * State Machine Engine
 * 
 * Executes state transitions with validation, logging, and callbacks.
 */
export class StateMachineEngine<TState extends string> {
  private currentState: TState;
  private machine: StateMachine<TState>;
  private history: Array<{ from: TState; to: TState; timestamp: Date; context: TransitionContext }> = [];

  constructor(machine: StateMachine<TState>, initialState?: TState) {
    this.machine = machine;
    this.currentState = initialState || machine.initialState;
  }

  /**
   * Get current state
   */
  getState(): TState {
    return this.currentState;
  }

  /**
   * Get state history
   */
  getHistory(): Array<{ from: TState; to: TState; timestamp: Date; context: TransitionContext }> {
    return [...this.history];
  }

  /**
   * Check if transition is valid
   */
  canTransition(to: TState, _context?: Partial<TransitionContext>): boolean {
    const transitions = this.machine.transitions.filter(t => t.to === to);
    
    if (transitions.length === 0) {
      return false;
    }

    // Check if any transition matches current state
    return transitions.some(t => {
      if (Array.isArray(t.from)) {
        return t.from.includes(this.currentState);
      }
      return t.from === this.currentState;
    });
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): TState[] {
    return this.machine.transitions
      .filter(t => {
        if (Array.isArray(t.from)) {
          return t.from.includes(this.currentState);
        }
        return t.from === this.currentState;
      })
      .map(t => t.to);
  }

  /**
   * Execute state transition
   */
  async transition(to: TState, context: TransitionContext): Promise<void> {
    // Find matching transition
    const transition = this.machine.transitions.find(t => {
      if (Array.isArray(t.from)) {
        return t.from.includes(this.currentState) && t.to === to;
      }
      return t.from === this.currentState && t.to === to;
    });

    if (!transition) {
      const error = new Error(
        `Invalid transition from "${this.currentState}" to "${to}". Available transitions: ${this.getAvailableTransitions().join(', ')}`
      );
      
      // Call invalid transition handler
      if (this.machine.onInvalidTransition) {
        await this.machine.onInvalidTransition(this.currentState, to, context);
      }
      
      throw error;
    }

    // Check guard condition
    if (transition.guard) {
      const guardResult = await transition.guard(context);
      if (!guardResult) {
        throw new Error(`Transition guard failed: cannot transition from "${this.currentState}" to "${to}"`);
      }
    }

    // Check condition
    if (transition.condition) {
      const conditionResult = await transition.condition(context);
      if (!conditionResult) {
        throw new Error(`Transition condition failed: cannot transition from "${this.currentState}" to "${to}"`);
      }
    }

    // Execute before callback
    if (transition.onBefore) {
      await transition.onBefore(context);
    }

    // Log transition activity
    await ActivityLogger.log({
      entityType: context.entityType as any,
      entityId: context.entityId,
      eventType: `${context.entityType}.status_changed` as any,
      userId: context.userId,
      metadata: {
        description: `State changed from "${this.currentState}" to "${to}"`,
        from: this.currentState,
        to: to,
        reason: context.reason,
        ...context.metadata
      }
    });

    // Update state
    const previousState = this.currentState;
    this.currentState = to;

    // Record in history
    this.history.push({
      from: previousState,
      to: to,
      timestamp: new Date(),
      context: { ...context, fromState: previousState, toState: to }
    });

    // Execute after callback
    if (transition.onAfter) {
      await transition.onAfter({ ...context, fromState: previousState, toState: to });
    }

    // Execute machine-level callback
    if (this.machine.onTransition) {
      await this.machine.onTransition(previousState, to, { ...context, fromState: previousState, toState: to });
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = this.machine.initialState;
    this.history = [];
  }

  /**
   * Check if state is terminal (no outgoing transitions)
   */
  isTerminal(state?: TState): boolean {
    const checkState = state || this.currentState;
    return !this.machine.transitions.some(t => {
      if (Array.isArray(t.from)) {
        return t.from.includes(checkState);
      }
      return t.from === checkState;
    });
  }

  /**
   * Get all states that can reach a target state
   */
  getPredecessors(targetState: TState): TState[] {
    return this.machine.transitions
      .filter(t => t.to === targetState)
      .flatMap(t => Array.isArray(t.from) ? t.from : [t.from]);
  }
}

