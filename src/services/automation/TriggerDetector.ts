/**
 * Trigger Detector
 * 
 * Priority 3: Workflow Builder - Automation Engine
 * Detects workflow triggers and determines when workflows should be executed.
 * 
 * Gold Tier Implementation:
 * - Market-leading trigger detection patterns
 * - Type-safe trigger handling
 * - Performance optimized
 * - Event-based and scheduled triggers
 */

/**
 * Trigger type definitions
 */
export type TriggerType =
  | 'event'
  | 'schedule'
  | 'manual'
  | 'webhook'
  | 'api';

/**
 * Event trigger configuration
 */
export interface EventTriggerConfig {
  trigger_type: 'event';
  event_name: string;
  event_filters?: Record<string, any>;
}

/**
 * Schedule trigger configuration (cron-like)
 */
export interface ScheduleTriggerConfig {
  trigger_type: 'schedule';
  schedule: string; // Cron expression or interval
  timezone?: string;
}

/**
 * Manual trigger configuration
 */
export interface ManualTriggerConfig {
  trigger_type: 'manual';
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTriggerConfig {
  trigger_type: 'webhook';
  webhook_path: string;
  method?: string;
}

/**
 * API trigger configuration
 */
export interface APITriggerConfig {
  trigger_type: 'api';
  endpoint: string;
}

/**
 * Trigger configuration union type
 */
export type TriggerConfig =
  | EventTriggerConfig
  | ScheduleTriggerConfig
  | ManualTriggerConfig
  | WebhookTriggerConfig
  | APITriggerConfig;

/**
 * Trigger event data
 */
export interface TriggerEvent {
  type: TriggerType;
  name: string;
  data: Record<string, any>;
  timestamp: Date;
  source?: string;
}

/**
 * Trigger detection result
 */
export interface TriggerDetectionResult {
  shouldExecute: boolean;
  triggerType: TriggerType;
  event?: TriggerEvent;
  error?: string;
}

/**
 * Trigger listener callback
 */
export type TriggerListener = (event: TriggerEvent) => void;

/**
 * Trigger Detector Class
 * 
 * Detects and evaluates workflow triggers.
 */
export class TriggerDetector {
  private eventListeners: Map<string, Set<TriggerListener>> = new Map();
  private scheduleIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register an event listener for a specific event name
   */
  on(eventName: string, listener: TriggerListener): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    };
  }

  /**
   * Emit an event (trigger detection)
   */
  emit(event: TriggerEvent): void {
    const listeners = this.eventListeners.get(event.name);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in trigger listener for ${event.name}:`, error);
        }
      });
    }
  }

  /**
   * Detect if a trigger should execute based on configuration and event
   */
  detect(
    triggerConfig: TriggerConfig,
    event?: TriggerEvent
  ): TriggerDetectionResult {
    try {
      switch (triggerConfig.trigger_type) {
        case 'event':
          return this.detectEventTrigger(
            triggerConfig as EventTriggerConfig,
            event
          );

        case 'schedule':
          return this.detectScheduleTrigger(
            triggerConfig as ScheduleTriggerConfig
          );

        case 'manual':
          return {
            shouldExecute: true,
            triggerType: 'manual',
          };

        case 'webhook':
          return {
            shouldExecute: event?.type === 'webhook',
            triggerType: 'webhook',
            event,
          };

        case 'api':
          return {
            shouldExecute: event?.type === 'api',
            triggerType: 'api',
            event,
          };

        default:
          return {
            shouldExecute: false,
            triggerType: 'manual',
            error: `Unknown trigger type: ${(triggerConfig as any).trigger_type}`,
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        shouldExecute: false,
        triggerType: triggerConfig.trigger_type,
        error: errorMessage,
      };
    }
  }

  /**
   * Detect event trigger
   */
  private detectEventTrigger(
    config: EventTriggerConfig,
    event?: TriggerEvent
  ): TriggerDetectionResult {
    if (!event) {
      return {
        shouldExecute: false,
        triggerType: 'event',
      };
    }

    // Check event name match
    if (event.name !== config.event_name) {
      return {
        shouldExecute: false,
        triggerType: 'event',
      };
    }

    // Check event filters if provided
    if (config.event_filters) {
      const matches = this.evaluateEventFilters(
        config.event_filters,
        event.data
      );

      if (!matches) {
        return {
          shouldExecute: false,
          triggerType: 'event',
        };
      }
    }

    return {
      shouldExecute: true,
      triggerType: 'event',
      event,
    };
  }

  /**
   * Detect schedule trigger (basic implementation)
   */
  private detectScheduleTrigger(
    _config: ScheduleTriggerConfig
  ): TriggerDetectionResult {
    // Note: Full cron parsing would require a library like 'cron-parser'
    // This is a simplified implementation
    // In production, this would integrate with a scheduler service

    // For now, schedule triggers are detected by the AutomationScheduler
    return {
      shouldExecute: false,
      triggerType: 'schedule',
      error: 'Schedule triggers are handled by AutomationScheduler',
    };
  }

  /**
   * Evaluate event filters
   */
  private evaluateEventFilters(
    filters: Record<string, any>,
    eventData: Record<string, any>
  ): boolean {
    for (const [key, expectedValue] of Object.entries(filters)) {
      const actualValue = eventData[key];

      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cleanup: Remove all listeners and intervals
   */
  cleanup(): void {
    this.eventListeners.clear();
    this.scheduleIntervals.forEach((interval) => clearInterval(interval));
    this.scheduleIntervals.clear();
  }
}

/**
 * Singleton instance
 */
export const triggerDetector = new TriggerDetector();
