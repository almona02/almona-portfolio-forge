/**
 * Condition Evaluator
 * 
 * Priority 3: Workflow Builder - Automation Engine
 * Evaluates conditional logic for workflow decision nodes and automation triggers.
 * 
 * Gold Tier Implementation:
 * - Market-leading evaluation patterns
 * - Type-safe condition evaluation
 * - Performance optimized
 * - Comprehensive error handling
 */

/**
 * Condition operator types
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_null'
  | 'is_not_null';

/**
 * Condition definition
 */
export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

/**
 * Logical operator for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Condition group (supports nested conditions)
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Condition evaluation context
 */
export interface EvaluationContext {
  [key: string]: any;
}

/**
 * Condition evaluation result
 */
export interface ConditionEvaluationResult {
  result: boolean;
  evaluatedConditions: Array<{
    condition: Condition | ConditionGroup;
    result: boolean;
  }>;
  error?: string;
}

/**
 * Condition Evaluator Class
 * 
 * Evaluates conditions against a context using various operators.
 */
export class ConditionEvaluator {
  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: Condition,
    context: EvaluationContext
  ): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);
    const { operator, value } = condition;

    try {
      switch (operator) {
        case 'equals':
          return fieldValue === value;

        case 'not_equals':
          return fieldValue !== value;

        case 'greater_than':
          return this.compareNumbers(fieldValue, value) > 0;

        case 'less_than':
          return this.compareNumbers(fieldValue, value) < 0;

        case 'greater_than_or_equal':
          return this.compareNumbers(fieldValue, value) >= 0;

        case 'less_than_or_equal':
          return this.compareNumbers(fieldValue, value) <= 0;

        case 'contains':
          return this.stringContains(fieldValue, value);

        case 'not_contains':
          return !this.stringContains(fieldValue, value);

        case 'starts_with':
          return this.stringStartsWith(fieldValue, value);

        case 'ends_with':
          return this.stringEndsWith(fieldValue, value);

        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);

        case 'not_in':
          return Array.isArray(value) && !value.includes(fieldValue);

        case 'is_empty':
          return this.isEmpty(fieldValue);

        case 'is_not_empty':
          return !this.isEmpty(fieldValue);

        case 'is_null':
          return fieldValue === null || fieldValue === undefined;

        case 'is_not_null':
          return fieldValue !== null && fieldValue !== undefined;

        default:
          console.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Evaluate a condition group
   */
  private evaluateConditionGroup(
    group: ConditionGroup,
    context: EvaluationContext
  ): ConditionEvaluationResult {
    const evaluatedConditions: ConditionEvaluationResult['evaluatedConditions'] = [];
    const results: boolean[] = [];

    for (const condition of group.conditions) {
      let result: boolean;

      if ('operator' in condition && 'conditions' in condition) {
        // Nested group
        const nestedResult = this.evaluateConditionGroup(
          condition as ConditionGroup,
          context
        );
        result = nestedResult.result;
        evaluatedConditions.push({
          condition,
          result,
        });
      } else {
        // Single condition
        result = this.evaluateCondition(condition as Condition, context);
        evaluatedConditions.push({
          condition,
          result,
        });
      }

      results.push(result);
    }

    // Apply logical operator
    let finalResult: boolean;
    if (group.operator === 'AND') {
      finalResult = results.every((r) => r === true);
    } else {
      // OR
      finalResult = results.some((r) => r === true);
    }

    return {
      result: finalResult,
      evaluatedConditions,
    };
  }

  /**
   * Evaluate conditions (supports single condition or condition group)
   */
  evaluate(
    conditionOrGroup: Condition | ConditionGroup,
    context: EvaluationContext
  ): ConditionEvaluationResult {
    try {
      if ('operator' in conditionOrGroup && 'conditions' in conditionOrGroup) {
        // Condition group
        return this.evaluateConditionGroup(
          conditionOrGroup as ConditionGroup,
          context
        );
      } else {
        // Single condition
        const condition = conditionOrGroup as Condition;
        const result = this.evaluateCondition(condition, context);
        return {
          result,
          evaluatedConditions: [
            {
              condition,
              result,
            },
          ],
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        result: false,
        evaluatedConditions: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get nested value from context using dot notation (e.g., "user.name")
   */
  private getNestedValue(context: EvaluationContext, path: string): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Compare numbers (handles string to number conversion)
   */
  private compareNumbers(a: any, b: any): number {
    const numA = typeof a === 'string' ? parseFloat(a) : Number(a);
    const numB = typeof b === 'string' ? parseFloat(b) : Number(b);

    if (isNaN(numA) || isNaN(numB)) {
      return 0; // Treat NaN as equal
    }

    return numA - numB;
  }

  /**
   * Check if string contains value (case-insensitive)
   */
  private stringContains(fieldValue: any, value: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    const str = String(fieldValue).toLowerCase();
    const searchStr = String(value).toLowerCase();
    return str.includes(searchStr);
  }

  /**
   * Check if string starts with value (case-insensitive)
   */
  private stringStartsWith(fieldValue: any, value: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    const str = String(fieldValue).toLowerCase();
    const searchStr = String(value).toLowerCase();
    return str.startsWith(searchStr);
  }

  /**
   * Check if string ends with value (case-insensitive)
   */
  private stringEndsWith(fieldValue: any, value: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    const str = String(fieldValue).toLowerCase();
    const searchStr = String(value).toLowerCase();
    return str.endsWith(searchStr);
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return false;
  }
}

/**
 * Singleton instance
 */
export const conditionEvaluator = new ConditionEvaluator();
