// Hardener Code System - Gold-Tier Error Handling & Validation
// Inspired by market leaders (Google, Microsoft, Adobe) defensive programming practices

import React from 'react';
import { z } from 'zod';

// Hardener configuration
export interface HardenerConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  throwOnValidationError: boolean;
  fallbackValues: Record<string, any>;
  errorBoundaries: boolean;
}

// Validation schema for hardener config
const hardenerConfigSchema = z.object({
  enableLogging: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  throwOnValidationError: z.boolean().default(false),
  fallbackValues: z.record(z.any()).default({}),
  errorBoundaries: z.boolean().default(true),
});

// Hardener metrics interface
export interface HardenerMetrics {
  validationsPerformed: number;
  errorsCaught: number;
  fallbacksUsed: number;
  performanceImpact: number;
}

// Error types for hardener
export class HardenerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'HardenerError';
  }
}

export class ValidationError extends HardenerError {
  constructor(field: string, expected: string, received: any) {
    super(
      `Validation failed for field '${field}': expected ${expected}, received ${typeof received}`,
      'VALIDATION_ERROR',
      { field, expected, received }
    );
    this.name = 'ValidationError';
  }
}

export class FallbackError extends HardenerError {
  constructor(operation: string, reason: string) {
    super(
      `Fallback triggered for operation '${operation}': ${reason}`,
      'FALLBACK_ERROR',
      { operation, reason }
    );
    this.name = 'FallbackError';
  }
}

// Main Hardener class with gold-tier error handling
export class Hardener {
  private config: HardenerConfig;
  private metrics: HardenerMetrics;
  private logger: Console;

  constructor(config: Partial<HardenerConfig> = {}) {
    // Parse config with defaults
    const parsedConfig = hardenerConfigSchema.parse(config);
    this.config = {
      enableLogging: parsedConfig.enableLogging,
      enableMetrics: parsedConfig.enableMetrics,
      throwOnValidationError: parsedConfig.throwOnValidationError,
      fallbackValues: parsedConfig.fallbackValues,
      errorBoundaries: parsedConfig.errorBoundaries,
    };
    this.metrics = {
      validationsPerformed: 0,
      errorsCaught: 0,
      fallbacksUsed: 0,
      performanceImpact: 0,
    };
    this.logger = console;
  }

  // Core guard function - defensive programming cornerstone
  static guard<T>(
    value: T | null | undefined,
    fallback: T,
    context: string = 'unknown'
  ): T {
    if (value == null) {
      console.warn(`Hardener: Guard triggered for ${context} - using fallback`, {
        fallback,
        context,
        timestamp: new Date().toISOString(),
      });
      return fallback;
    }
    return value;
  }

  // Type-safe guard with validation
  guard<T>(
    value: T | null | undefined,
    fallback: T,
    context: string = 'unknown',
    validator?: (value: T) => boolean
  ): T {
    const startTime = performance.now();

    try {
      this.metrics.validationsPerformed++;

      if (value == null) {
        this.metrics.fallbacksUsed++;
        this.log('warn', `Guard triggered for ${context}`, {
          fallback,
          context,
          reason: 'null/undefined value',
        });
        return fallback;
      }

      // Additional validation if provided
      if (validator && !validator(value)) {
        this.metrics.errorsCaught++;
        this.log('error', `Validation failed for ${context}`, {
          value,
          fallback,
          context,
        });

        if (this.config.throwOnValidationError) {
          throw new ValidationError(context, 'valid value', value);
        }

        return fallback;
      }

      const endTime = performance.now();
      this.metrics.performanceImpact += endTime - startTime;

      return value;
    } catch (error) {
      this.metrics.errorsCaught++;
      this.log('error', `Guard error in ${context}`, {
        error: error instanceof Error ? error.message : String(error),
        context,
        fallback,
      });

      return fallback;
    }
  }

  // Array guard with comprehensive validation
  guardArray<T>(
    value: T[] | null | undefined,
    fallback: T[] = [],
    context: string = 'unknown'
  ): T[] {
    const guarded = this.guard(value, fallback, context);

    if (!Array.isArray(guarded)) {
      this.log('warn', `Array guard: value is not an array in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    return guarded;
  }

  // Object guard with deep validation
  guardObject<T extends Record<string, any>>(
    value: T | null | undefined,
    requiredKeys: (keyof T)[],
    fallback: T,
    context: string = 'unknown'
  ): T {
    const guarded = this.guard(value, fallback, context);

    if (typeof guarded !== 'object' || guarded === null) {
      this.log('warn', `Object guard: value is not an object in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    // Check required keys
    const missingKeys = requiredKeys.filter(key => !(key in guarded));
    if (missingKeys.length > 0) {
      this.log('warn', `Object guard: missing required keys in ${context}`, {
        missingKeys,
        context,
        availableKeys: Object.keys(guarded),
      });
    }

    return guarded;
  }

  // Number guard with range validation
  guardNumber(
    value: number | null | undefined,
    fallback: number,
    min?: number,
    max?: number,
    context: string = 'unknown'
  ): number {
    const guarded = this.guard(value, fallback, context);

    if (typeof guarded !== 'number' || isNaN(guarded)) {
      this.log('warn', `Number guard: value is not a valid number in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    if (min !== undefined && guarded < min) {
      this.log('warn', `Number guard: value below minimum in ${context}`, {
        value: guarded,
        min,
        context,
      });
      return min;
    }

    if (max !== undefined && guarded > max) {
      this.log('warn', `Number guard: value above maximum in ${context}`, {
        value: guarded,
        max,
        context,
      });
      return max;
    }

    return guarded;
  }

  // String guard with sanitization
  guardString(
    value: string | null | undefined,
    fallback: string = '',
    maxLength?: number,
    context: string = 'unknown'
  ): string {
    const guarded = this.guard(value, fallback, context);

    if (typeof guarded !== 'string') {
      this.log('warn', `String guard: value is not a string in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    let sanitized = guarded.trim();

    if (maxLength && sanitized.length > maxLength) {
      this.log('warn', `String guard: value truncated in ${context}`, {
        originalLength: sanitized.length,
        maxLength,
        context,
      });
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  // Function guard for safe execution
  guardFunction<T extends (...args: any[]) => any>(
    fn: T | null | undefined,
    fallback: T,
    context: string = 'unknown'
  ): T {
    const guarded = this.guard(fn, fallback, context);

    if (typeof guarded !== 'function') {
      this.log('error', `Function guard: value is not a function in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    // Wrap function with error handling
    const wrapped = ((...args: Parameters<T>) => {
      try {
        return guarded(...args);
      } catch (error) {
        this.metrics.errorsCaught++;
        this.log('error', `Function execution failed in ${context}`, {
          error: error instanceof Error ? error.message : String(error),
          context,
          args: args.length,
        });

        // Return undefined for failed function calls
        return undefined;
      }
    }) as T;

    return wrapped;
  }

  // Async function guard
  async guardAsyncFunction<T>(
    fn: (() => Promise<T>) | null | undefined,
    fallback: T,
    timeout: number = 5000,
    context: string = 'unknown'
  ): Promise<T> {
    const guarded = this.guard(fn, (() => Promise.resolve(fallback)), context);

    if (typeof guarded !== 'function') {
      this.log('error', `Async function guard: value is not a function in ${context}`, {
        value: guarded,
        context,
      });
      return fallback;
    }

    try {
      const result = await Promise.race([
        guarded(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]);

      return result;
    } catch (error) {
      this.metrics.errorsCaught++;
      this.log('error', `Async function execution failed in ${context}`, {
        error: error instanceof Error ? error.message : String(error),
        context,
        timeout,
      });

      return fallback;
    }
  }

  // Schema validation with Zod
  validateWithSchema<T>(
    data: any,
    schema: z.ZodSchema<T>,
    context: string = 'unknown'
  ): T | null {
    try {
      this.metrics.validationsPerformed++;
      return schema.parse(data);
    } catch (error) {
      this.metrics.errorsCaught++;
      this.log('error', `Schema validation failed in ${context}`, {
        error: error instanceof Error ? error.message : String(error),
        context,
        data: typeof data,
      });

      if (this.config.throwOnValidationError) {
        throw error;
      }

      return null;
    }
  }

  // Batch validation for arrays
  validateBatch<T>(
    items: any[],
    validator: (item: any) => T | null,
    context: string = 'unknown'
  ): T[] {
    const results: T[] = [];
    let errors = 0;

    for (let i = 0; i < items.length; i++) {
      const result = validator(items[i]);
      if (result !== null) {
        results.push(result);
      } else {
        errors++;
      }
    }

    if (errors > 0) {
      this.log('warn', `Batch validation had ${errors} errors in ${context}`, {
        totalItems: items.length,
        validItems: results.length,
        errorCount: errors,
        context,
      });
    }

    return results;
  }

  // Error boundary wrapper for React components
  withErrorBoundary<P extends Record<string, any>>(
    Component: React.ComponentType<P>,
    fallbackComponent?: React.ComponentType<{ error: Error }>
  ): React.ComponentType<P> {
    if (!this.config.errorBoundaries) {
      return Component;
    }

    const FallbackComponent = fallbackComponent || DefaultErrorFallback;

    class HardenedComponent extends React.Component<P, { hasError: boolean; error?: Error }> {
      constructor(props: P) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Hardener: Component error caught', {
          error: error.message,
          component: Component.name,
          errorInfo,
          timestamp: new Date().toISOString(),
        });
      }

      render() {
        if (this.state.hasError && this.state.error) {
          return React.createElement(FallbackComponent, { error: this.state.error });
        }

        return React.createElement(Component, this.props);
      }
    }

    return HardenedComponent;
  }

  // Performance monitoring
  measurePerformance<T>(
    operation: () => T,
    operationName: string = 'unknown'
  ): T {
    const startTime = performance.now();

    try {
      const result = operation();
      const endTime = performance.now();

      this.log('info', `Performance: ${operationName}`, {
        duration: endTime - startTime,
        operation: operationName,
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      this.log('error', `Performance: ${operationName} failed`, {
        duration: endTime - startTime,
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Async performance monitoring
  async measurePerformanceAsync<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const endTime = performance.now();

      this.log('info', `Async performance: ${operationName}`, {
        duration: endTime - startTime,
        operation: operationName,
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      this.log('error', `Async performance: ${operationName} failed`, {
        duration: endTime - startTime,
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Get metrics for monitoring
  getMetrics(): HardenerMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      validationsPerformed: 0,
      errorsCaught: 0,
      fallbacksUsed: 0,
      performanceImpact: 0,
    };
  }

  // Private logging method
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableLogging) return;

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      hardener: true,
      ...data,
    };

    switch (level) {
      case 'info':
        this.logger.info('[Hardener]', message, logData);
        break;
      case 'warn':
        this.logger.warn('[Hardener]', message, logData);
        break;
      case 'error':
        this.logger.error('[Hardener]', message, logData);
        break;
    }
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return React.createElement('div', {
    className: 'p-4 border border-red-200 bg-red-50 rounded-md',
  }, [
    React.createElement('h3', {
      key: 'title',
      className: 'text-sm font-medium text-red-800',
    }, 'Something went wrong'),
    React.createElement('p', {
      key: 'message',
      className: 'text-sm text-red-700 mt-1',
    }, error.message),
  ]);
};

// Singleton instance for global use
export const globalHardener = new Hardener({
  enableLogging: true,
  enableMetrics: true,
  throwOnValidationError: false,
  errorBoundaries: true,
});

// Utility functions for common use cases
export const harden = {
  // Quick guards for common types
  string: (value: any, fallback = '', context = 'unknown') =>
    globalHardener.guardString(value, fallback, undefined, context),

  number: (value: any, fallback = 0, context = 'unknown') =>
    globalHardener.guardNumber(value, fallback, undefined, undefined, context),

  array: <T>(value: any, fallback: T[] = [], context = 'unknown') =>
    globalHardener.guardArray(value, fallback, context),

  object: <T extends Record<string, any>>(
    value: any,
    requiredKeys: (keyof T)[],
    fallback: T,
    context = 'unknown'
  ) => globalHardener.guardObject(value, requiredKeys, fallback, context),

  // Function execution with error handling
  execute: <T>(fn: () => T, fallback: T, context = 'unknown') =>
    globalHardener.guardFunction(fn, () => fallback, context)(),

  // Async function execution
  executeAsync: async <T>(
    fn: () => Promise<T>,
    fallback: T,
    context = 'unknown'
  ) => await globalHardener.guardAsyncFunction(
    fn,
    fallback,
    5000,
    context
  ),

  // Schema validation
  validate: <T>(data: any, schema: z.ZodSchema<T>, context = 'unknown') =>
    globalHardener.validateWithSchema(data, schema, context),
};
