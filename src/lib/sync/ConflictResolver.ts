/**
 * Conflict Resolver
 * Operational transform for conflict-free concurrent edits
 */

export interface Operation {
  type: 'insert' | 'update' | 'delete';
  path: string; // JSON path (e.g., 'components[0].width')
  value?: any;
  timestamp: number;
  userId: string;
}

export interface Conflict {
  operation1: Operation;
  operation2: Operation;
  resolved: boolean;
  resolution?: Operation;
}

export class ConflictResolver {
  /**
   * Transform operation against another operation
   * Returns transformed operation that can be applied after the other
   */
  transform(op1: Operation, op2: Operation): Operation {
    // If operations are on different paths, no conflict
    if (op1.path !== op2.path) {
      return op1;
    }

    // If same user, no conflict
    if (op1.userId === op2.userId) {
      return op1;
    }

    // Same path conflict - apply transformation rules
    if (op1.type === 'delete' && op2.type === 'delete') {
      // Both delete - no-op
      return { ...op1, type: 'delete' as const };
    }

    if (op1.type === 'delete' && op2.type === 'update') {
      // Delete wins over update
      return op1;
    }

    if (op1.type === 'update' && op2.type === 'delete') {
      // Delete wins - transform update to no-op
      return { ...op1, type: 'delete' as const };
    }

    if (op1.type === 'update' && op2.type === 'update') {
      // Last write wins (or merge if values are compatible)
      if (op1.timestamp > op2.timestamp) {
        return op1;
      } else {
        // op2 wins, but we need to return transformed op1
        // For now, return op1 with op2's value (last write wins)
        return { ...op1, value: op2.value };
      }
    }

    if (op1.type === 'insert' && op2.type === 'insert') {
      // Both insert - keep both with different paths
      return { ...op1, path: `${op1.path}_conflict_${op1.timestamp}` };
    }

    // Default: return original operation
    return op1;
  }

  /**
   * Resolve conflict between two operations
   */
  resolveConflict(conflict: Conflict): Operation {
    if (conflict.resolved && conflict.resolution) {
      return conflict.resolution;
    }

    // Apply transformation
    const transformed = this.transform(conflict.operation1, conflict.operation2);

    return transformed;
  }

  /**
   * Apply operational transform to a list of operations
   */
  applyTransform(operations: Operation[]): Operation[] {
    if (operations.length <= 1) {
      return operations;
    }

    // Sort by timestamp
    const sorted = [...operations].sort((a, b) => a.timestamp - b.timestamp);
    const transformed: Operation[] = [];

    for (let i = 0; i < sorted.length; i++) {
      let op = sorted[i];

      // Transform against all previous operations
      for (let j = 0; j < i; j++) {
        op = this.transform(op, transformed[j]);
      }

      transformed.push(op);
    }

    return transformed;
  }

  /**
   * Merge two values (for update conflicts)
   */
  mergeValues(value1: any, value2: any, path: string): any {
    // Simple merge strategy
    // For objects, merge recursively
    if (typeof value1 === 'object' && typeof value2 === 'object' && !Array.isArray(value1) && !Array.isArray(value2)) {
      return { ...value1, ...value2 };
    }

    // For arrays, concatenate unique items
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return [...new Set([...value1, ...value2])];
    }

    // For primitives, last write wins
    return value2;
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();

