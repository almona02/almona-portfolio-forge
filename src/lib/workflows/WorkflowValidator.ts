/**
 * Workflow Validator
 * 
 * Priority 3: Workflow Builder - Validation Engine
 * Validates workflow structure, nodes, edges, and configurations.
 */

import type { WorkflowNode, WorkflowEdge, WorkflowDefinition } from '@/services/workflowsApi';

/**
 * Validation error
 */
export interface WorkflowValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

/**
 * Validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationError[];
}

/**
 * Workflow Validator
 * 
 * Validates workflow structure according to business rules:
 * - Must have exactly one start node
 * - Must have at least one end node
 * - Node IDs must be unique
 * - Edges must reference valid nodes
 * - Decision nodes must have exactly 2 outgoing edges
 * - All nodes must be connected (reachable from start)
 */
export class WorkflowValidator {
  /**
   * Validate workflow definition
   */
  static validate(workflow: WorkflowDefinition): WorkflowValidationResult {
    const errors: WorkflowValidationError[] = [];
    const warnings: WorkflowValidationError[] = [];

    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    // 1. Check for nodes
    if (nodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have at least one node',
      });
      return { valid: false, errors, warnings };
    }

    // 2. Check for start node
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have exactly one start node',
      });
    } else if (startNodes.length > 1) {
      errors.push({
        type: 'error',
        message: `Workflow must have exactly one start node, found ${startNodes.length}`,
      });
    }

    // 3. Check for end node
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have at least one end node',
      });
    }

    // 4. Validate node IDs are unique
    const nodeIds = nodes.map(n => n.id);
    const uniqueNodeIds = new Set(nodeIds);
    if (nodeIds.length !== uniqueNodeIds.size) {
      const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
      errors.push({
        type: 'error',
        message: `Duplicate node IDs found: ${duplicates.join(', ')}`,
      });
    }

    // 5. Validate edges reference valid nodes
    const nodeIdSet = new Set(nodeIds);
    for (const edge of edges) {
      if (edge.source && !nodeIdSet.has(edge.source)) {
        errors.push({
          type: 'error',
          message: `Edge references invalid source node: ${edge.source}`,
          edgeId: edge.id,
        });
      }
      if (edge.target && !nodeIdSet.has(edge.target)) {
        errors.push({
          type: 'error',
          message: `Edge references invalid target node: ${edge.target}`,
          edgeId: edge.id,
        });
      }
    }

    // 6. Validate decision nodes have exactly 2 outgoing edges
    for (const node of nodes) {
      if (node.type === 'decision') {
        const outgoingEdges = edges.filter(e => e.source === node.id);
        if (outgoingEdges.length !== 2) {
          errors.push({
            type: 'error',
            message: `Decision node "${node.id}" must have exactly 2 outgoing edges, found ${outgoingEdges.length}`,
            nodeId: node.id,
          });
        } else {
          // Check that decision edges have sourceHandle (true/false)
          const hasTrueHandle = outgoingEdges.some(e => e.sourceHandle === 'true');
          const hasFalseHandle = outgoingEdges.some(e => e.sourceHandle === 'false');
          if (!hasTrueHandle || !hasFalseHandle) {
            warnings.push({
              type: 'warning',
              message: `Decision node "${node.id}" edges should have sourceHandle set to 'true' and 'false'`,
              nodeId: node.id,
            });
          }
        }
      }
    }

    // 7. Validate start node has no incoming edges
    for (const startNode of startNodes) {
      const incomingEdges = edges.filter(e => e.target === startNode.id);
      if (incomingEdges.length > 0) {
        errors.push({
          type: 'error',
          message: `Start node "${startNode.id}" cannot have incoming edges`,
          nodeId: startNode.id,
        });
      }
      // Start node should have exactly one outgoing edge (warning, not error)
      const outgoingEdges = edges.filter(e => e.source === startNode.id);
      if (outgoingEdges.length === 0) {
        warnings.push({
          type: 'warning',
          message: `Start node "${startNode.id}" has no outgoing edges`,
          nodeId: startNode.id,
        });
      }
    }

    // 8. Validate end nodes have no outgoing edges
    for (const endNode of endNodes) {
      const outgoingEdges = edges.filter(e => e.source === endNode.id);
      if (outgoingEdges.length > 0) {
        errors.push({
          type: 'error',
          message: `End node "${endNode.id}" cannot have outgoing edges`,
          nodeId: endNode.id,
        });
      }
    }

    // 9. Check for unreachable nodes (nodes not reachable from start)
    if (startNodes.length === 1 && nodes.length > 1) {
      const reachableNodes = this._getReachableNodes(startNodes[0].id, nodes, edges);
      const unreachableNodes = nodes.filter(n => !reachableNodes.has(n.id));
      for (const node of unreachableNodes) {
        if (node.type !== 'start') {
          warnings.push({
            type: 'warning',
            message: `Node "${node.id}" is not reachable from start node`,
            nodeId: node.id,
          });
        }
      }
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  }

  /**
   * Get all nodes reachable from a starting node (BFS)
   */
  private static _getReachableNodes(
    startNodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Set<string> {
    const reachable = new Set<string>([startNodeId]);
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const outgoingEdges = edges.filter(e => e.source === currentNodeId);

      for (const edge of outgoingEdges) {
        if (edge.target && !reachable.has(edge.target)) {
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return reachable;
  }

  /**
   * Validate node configuration based on node type
   */
  static validateNodeConfig(node: WorkflowNode): WorkflowValidationError[] {
    const errors: WorkflowValidationError[] = [];

    // Validate node has required fields
    if (!node.id) {
      errors.push({
        type: 'error',
        message: 'Node must have an ID',
        nodeId: node.id,
      });
    }

    if (!node.type) {
      errors.push({
        type: 'error',
        message: 'Node must have a type',
        nodeId: node.id,
      });
    }

    if (!node.data || !node.data.label) {
      errors.push({
        type: 'error',
        message: 'Node must have a label',
        nodeId: node.id,
      });
    }

    // Type-specific validation
    if (node.type === 'task' && node.data.config) {
      const config = node.data.config;
      if (!config.assignee && !config.task_name) {
        errors.push({
          type: 'warning',
          message: 'Task node should have assignee or task_name configured',
          nodeId: node.id,
        });
      }
    }

    if (node.type === 'decision' && node.data.config) {
      const config = node.data.config;
      if (!config.condition) {
        errors.push({
          type: 'warning',
          message: 'Decision node should have a condition configured',
          nodeId: node.id,
        });
      }
    }

    return errors;
  }

  /**
   * Check if workflow has cycles (simple check - not exhaustive)
   */
  static hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const nodeIds = nodes.map(n => n.id);
    const edgeMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.source && edge.target) {
        if (!edgeMap.has(edge.source)) {
          edgeMap.set(edge.source, []);
        }
        edgeMap.get(edge.source)!.push(edge.target);
      }
    }

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = edgeMap.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }
}
