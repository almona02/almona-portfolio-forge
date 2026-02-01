/**
 * Automation Engine - Public API
 * 
 * Priority 3: Workflow Builder - Automation Engine
 * Central export point for automation services.
 */

export { AutomationEngine, automationEngine } from './AutomationEngine';
export type {
  WorkflowExecutionContext,
  NodeExecutionResult,
  WorkflowExecutionResult,
  AutomationEngineOptions,
} from './AutomationEngine';

export { ConditionEvaluator, conditionEvaluator } from './ConditionEvaluator';
export type {
  ConditionOperator,
  Condition,
  LogicalOperator,
  ConditionGroup,
  EvaluationContext,
  ConditionEvaluationResult,
} from './ConditionEvaluator';

export { ActionExecutor, actionExecutor } from './ActionExecutor';
export type {
  ActionType,
  ActionConfig,
  ActionContext,
  ActionExecutionResult,
  ActionHandler,
} from './ActionExecutor';

export { TriggerDetector, triggerDetector } from './TriggerDetector';
export type {
  TriggerType,
  EventTriggerConfig,
  ScheduleTriggerConfig,
  ManualTriggerConfig,
  WebhookTriggerConfig,
  APITriggerConfig,
  TriggerConfig,
  TriggerEvent,
  TriggerDetectionResult,
  TriggerListener,
} from './TriggerDetector';

export { AutomationScheduler, automationScheduler } from './AutomationScheduler';
export type {
  ScheduleType,
  ScheduleConfig,
  ScheduledTask,
  SchedulerOptions,
} from './AutomationScheduler';
