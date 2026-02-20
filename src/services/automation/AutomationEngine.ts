/**
 * Automation Engine
 * 
 * Priority 3: Workflow Builder - Automation Engine
 * Main orchestration engine for workflow automation.
 * 
 * Gold Tier Implementation:
 * - Market-leading automation patterns
 * - Event-driven architecture
 * - Performance optimized
 * - Comprehensive error handling
 * - Scalable design
 */

import { ConditionEvaluator, type Condition, type ConditionGroup, type EvaluationContext } from './ConditionEvaluator';
import { ActionExecutor, type ActionConfig, type ActionContext } from './ActionExecutor';
import { TriggerDetector, type TriggerConfig, type TriggerEvent } from './TriggerDetector';
import { AutomationScheduler, type ScheduleConfig } from './AutomationScheduler';
import type { WorkflowDefinition, WorkflowNode } from '@/services/workflowsApi';

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerEvent?: TriggerEvent;
  data: Record<string, any>;
  nodeResults: Map<string, any>;
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  nextNodes?: string[];
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  executionId: string;
  success: boolean;
  completedNodes: string[];
  failedNodes: string[];
  results: NodeExecutionResult[];
  error?: string;
  executionTime?: number;
}

/**
 * Automation engine options
 */
export interface AutomationEngineOptions {
  maxExecutionTime?: number; // Maximum execution time in milliseconds
  stopOnError?: boolean; // Stop execution on first error
  enableScheduling?: boolean; // Enable schedule-based triggers
}

/**
 * Automation Engine Class
 * 
 * Main orchestration engine for workflow automation.
 */
export class AutomationEngine {
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;
  private triggerDetector: TriggerDetector;
  private scheduler: AutomationScheduler;
  private options: Required<AutomationEngineOptions>;

  constructor(options: AutomationEngineOptions = {}) {
    this.conditionEvaluator = new ConditionEvaluator();
    this.actionExecutor = new ActionExecutor();
    this.triggerDetector = new TriggerDetector();
    this.scheduler = new AutomationScheduler();
    this.options = {
      maxExecutionTime: options.maxExecutionTime || 300000, // 5 minutes default
      stopOnError: options.stopOnError ?? false,
      enableScheduling: options.enableScheduling ?? true,
    };
  }

  /**
   * Register a workflow for automation
   */
  registerWorkflow(
    workflowId: string,
    workflowDefinition: WorkflowDefinition,
    triggerConfig: TriggerConfig,
    scheduleConfig?: ScheduleConfig
  ): void {
    // Register trigger listener if event-based
    if (triggerConfig.trigger_type === 'event') {
      const eventConfig = triggerConfig;
      this.triggerDetector.on(eventConfig.event_name, (event) => {
        void this.executeWorkflow(workflowId, workflowDefinition, event);
      });
    }

    // Register schedule if provided
    if (scheduleConfig && this.options.enableScheduling) {
      this.scheduler.schedule(
        workflowId,
        workflowId,
        scheduleConfig,
        async () => {
          await this.executeWorkflow(workflowId, workflowDefinition);
        }
      );
    }
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.scheduler.unschedule(workflowId);
    // Note: Event listeners would need to be tracked and removed
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    workflowDefinition: WorkflowDefinition,
    triggerEvent?: TriggerEvent
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: WorkflowExecutionContext = {
      workflowId,
      executionId,
      userId: triggerEvent?.data?.user_id || 'system',
      triggerEvent,
      data: triggerEvent?.data || {},
      nodeResults: new Map(),
    };

    const results: NodeExecutionResult[] = [];
    const completedNodes: string[] = [];
    const failedNodes: string[] = [];

    try {
      // Find start node
      const startNode = workflowDefinition.nodes.find((n) => n.type === 'start');

      if (!startNode) {
        return {
          executionId,
          success: false,
          completedNodes,
          failedNodes,
          results,
          error: 'No start node found in workflow',
          executionTime: Date.now() - startTime,
        };
      }

      // Execute workflow nodes
      const executionQueue: string[] = [startNode.id];
      const executedNodes = new Set<string>();

      while (executionQueue.length > 0) {
        const nodeId = executionQueue.shift()!;

        if (executedNodes.has(nodeId)) {
          continue; // Skip already executed nodes (cycle prevention)
        }

        executedNodes.add(nodeId);

        // Check execution time limit
        if (Date.now() - startTime > this.options.maxExecutionTime) {
          return {
            executionId,
            success: false,
            completedNodes,
            failedNodes,
            results,
            error: 'Workflow execution timeout',
            executionTime: Date.now() - startTime,
          };
        }

        const node = workflowDefinition.nodes.find((n) => n.id === nodeId);
        if (!node) {
          continue;
        }

        // Execute node
        const nodeResult = await this.executeNode(node, workflowDefinition, context);

        results.push(nodeResult);
        context.nodeResults.set(nodeId, nodeResult.data || {});

        if (nodeResult.success) {
          completedNodes.push(nodeId);

          // Add next nodes to queue
          if (nodeResult.nextNodes) {
            executionQueue.push(...nodeResult.nextNodes);
          }
        } else {
          failedNodes.push(nodeId);

          if (this.options.stopOnError) {
            break;
          }
        }
      }

      const success = failedNodes.length === 0;

      return {
        executionId,
        success,
        completedNodes,
        failedNodes,
        results,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        executionId,
        success: false,
        completedNodes,
        failedNodes,
        results,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      switch (node.type) {
        case 'start':
          return this.executeStartNode(node, workflowDefinition);

        case 'end':
          return this.executeEndNode(node, workflowDefinition);

        case 'task':
          return this.executeTaskNode(node, workflowDefinition, context);

        case 'decision':
          return this.executeDecisionNode(node, workflowDefinition, context);

        case 'automation':
          return this.executeAutomationNode(node, workflowDefinition, context);

        case 'approval':
          return this.executeApprovalNode(node, workflowDefinition, context);

        case 'notification':
          return this.executeNotificationNode(node, workflowDefinition, context);

        default:
          return {
            nodeId: node.id,
            success: false,
            error: `Unknown node type: ${node.type}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        nodeId: node.id,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute start node
   */
  private executeStartNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition
  ): NodeExecutionResult {
    const nextNodes = this.getNextNodes(node.id, workflowDefinition);
    return {
      nodeId: node.id,
      success: true,
      nextNodes,
    };
  }

  /**
   * Execute end node
   */
  private executeEndNode(
    node: WorkflowNode,
    _workflowDefinition: WorkflowDefinition
  ): NodeExecutionResult {
    return {
      nodeId: node.id,
      success: true,
    };
  }

  /**
   * Execute task node
   */
  private async executeTaskNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    _context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    // Task nodes are manual and require user interaction
    // For automation, we skip them or mark as pending
    const nextNodes = this.getNextNodes(node.id, workflowDefinition);
    return {
      nodeId: node.id,
      success: true,
      data: { status: 'pending', requires_manual_action: true },
      nextNodes,
    };
  }

  /**
   * Execute decision node
   */
  private async executeDecisionNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.config || {};
    const condition = config.condition as Condition | ConditionGroup | undefined;

    if (!condition) {
      return {
        nodeId: node.id,
        success: false,
        error: 'Decision node requires a condition',
      };
    }

    // Evaluate condition
    const evaluationContext: EvaluationContext = {
      ...context.data,
      workflow: {
        workflowId: context.workflowId,
        executionId: context.executionId,
      },
    };

    const evaluationResult = this.conditionEvaluator.evaluate(condition, evaluationContext);

    if (evaluationResult.error) {
      return {
        nodeId: node.id,
        success: false,
        error: evaluationResult.error,
      };
    }

    // Get edges from this node
    const edges = workflowDefinition.edges.filter((e) => e.source === node.id);
    const nextNodes: string[] = [];

    // Route to true/false branch based on condition result
    if (evaluationResult.result) {
      const trueEdge = edges.find((e) => e.sourceHandle === 'true' || e.label === 'true');
      if (trueEdge) {
        nextNodes.push(trueEdge.target);
      }
    } else {
      const falseEdge = edges.find((e) => e.sourceHandle === 'false' || e.label === 'false');
      if (falseEdge) {
        nextNodes.push(falseEdge.target);
      }
    }

    return {
      nodeId: node.id,
      success: true,
      data: { condition_result: evaluationResult.result },
      nextNodes,
    };
  }

  /**
   * Execute automation node
   */
  private async executeAutomationNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.config || {};
    const actionConfig = config.action as ActionConfig | undefined;

    if (!actionConfig) {
      return {
        nodeId: node.id,
        success: false,
        error: 'Automation node requires an action configuration',
      };
    }

    // Execute action
    const actionContext: ActionContext = {
      workflowId: context.workflowId,
      nodeId: node.id,
      executionId: context.executionId,
      userId: context.userId,
      data: context.data,
    };

    const actionResult = await this.actionExecutor.execute(actionConfig, actionContext);

    const nextNodes = actionResult.success
      ? this.getNextNodes(node.id, workflowDefinition)
      : [];

    return {
      nodeId: node.id,
      success: actionResult.success,
      data: actionResult.data,
      error: actionResult.error,
      nextNodes,
    };
  }

  /**
   * Execute approval node
   */
  private async executeApprovalNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    _context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    // Approval nodes require manual approval
    // For automation, we mark as pending
    const nextNodes = this.getNextNodes(node.id, workflowDefinition);
    return {
      nodeId: node.id,
      success: true,
      data: { status: 'pending', requires_approval: true },
      nextNodes,
    };
  }

  /**
   * Execute notification node
   */
  private async executeNotificationNode(
    node: WorkflowNode,
    workflowDefinition: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.config || {};
    const actionConfig: ActionConfig = {
      action_type: 'notification',
      params: {
        title: config.title || 'Workflow Notification',
        message: config.message || '',
        type: config.type || 'info',
        user_id: context.userId,
      },
    };

    const actionContext: ActionContext = {
      workflowId: context.workflowId,
      nodeId: node.id,
      executionId: context.executionId,
      userId: context.userId,
      data: context.data,
    };

    const actionResult = await this.actionExecutor.execute(actionConfig, actionContext);

    const nextNodes = actionResult.success
      ? this.getNextNodes(node.id, workflowDefinition)
      : [];

    return {
      nodeId: node.id,
      success: actionResult.success,
      data: actionResult.data,
      error: actionResult.error,
      nextNodes,
    };
  }

  /**
   * Get next nodes from edges
   */
  private getNextNodes(nodeId: string, workflowDefinition: WorkflowDefinition): string[] {
    return workflowDefinition.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);
  }

  /**
   * Cleanup: Stop all scheduled tasks and listeners
   */
  cleanup(): void {
    this.scheduler.clear();
    this.triggerDetector.cleanup();
  }
}

/**
 * Singleton instance
 */
export const automationEngine = new AutomationEngine();
