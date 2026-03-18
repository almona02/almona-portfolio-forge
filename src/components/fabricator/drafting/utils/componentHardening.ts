/**
 * Component Hardening Utilities
 * 
 * Gold-tier utilities for hardening UI components with error handling,
 * validation, defensive programming, and performance guards.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import React from 'react';
import { ValidationError } from './inputValidator';

/**
 * Error boundary error types
 */
export enum ComponentErrorType {
  RENDER_ERROR = 'RENDER_ERROR',
  PROPS_ERROR = 'PROPS_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  EVENT_ERROR = 'EVENT_ERROR',
  ASYNC_ERROR = 'ASYNC_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Component error with context
 */
export interface ComponentError {
  type: ComponentErrorType;
  message: string;
  component: string;
  props?: Record<string, any>;
  stack?: string;
  timestamp: Date;
}

/**
 * Safe component wrapper with error handling
 */
export function withErrorHandling<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  return function SafeComponent(props: T) {
    try {
      // Validate props before rendering
      validateComponentProps(props, componentName);
      
      return React.createElement(Component, props);
    } catch (err) {
      // Log error
      logComponentError({
        type: ComponentErrorType.PROPS_ERROR,
        message: err instanceof Error ? err.message : 'Unknown error',
        component: componentName,
        props: sanitizeProps(props),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date()
      });
      
      // Return fallback UI
      return React.createElement(
        'div',
        { className: 'p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm' },
        React.createElement('p', { className: 'font-semibold' }, `Error in ${componentName}`),
        React.createElement('p', { className: 'text-xs mt-1' }, err instanceof Error ? err.message : 'Unknown error')
      );
    }
  };
}

/**
 * Validate component props
 */
function validateComponentProps(props: Record<string, any>, componentName: string): void {
  // Basic validation - can be extended per component
  if (!props || typeof props !== 'object') {
    throw new ValidationError(`Invalid props for ${componentName}: props must be an object`, 'INVALID_PROPS');
  }
  
  // Check for common invalid values
  for (const [key, value] of Object.entries(props)) {
    // Skip functions and valid primitives
    if (typeof value === 'function' || value === null || value === undefined) {
      continue;
    }
    
    // Check for NaN
    if (typeof value === 'number' && isNaN(value)) {
      throw new ValidationError(`Invalid prop ${key} for ${componentName}: NaN is not allowed`, 'INVALID_PROP_NAN', key);
    }
    
    // Check for Infinity
    if (typeof value === 'number' && !isFinite(value)) {
      throw new ValidationError(`Invalid prop ${key} for ${componentName}: Infinity is not allowed`, 'INVALID_PROP_INFINITY', key);
    }
  }
}

/**
 * Sanitize props for logging (remove sensitive data)
 */
function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey'];
  
  for (const [key, value] of Object.entries(props)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Log component error
 */
function logComponentError(error: ComponentError): void {
  console.error(`[Component Error] ${error.component}:`, {
    type: error.type,
    message: error.message,
    timestamp: error.timestamp.toISOString(),
    props: error.props
  });
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service (e.g., Sentry)
  }
}

/**
 * Safe event handler wrapper
 */
export function safeEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  componentName: string,
  eventName: string
): (...args: Parameters<T>) => void {
  return function safeHandler(...args: Parameters<T>) {
    try {
      return handler(...args);
    } catch (err) {
      logComponentError({
        type: ComponentErrorType.EVENT_ERROR,
        message: err instanceof Error ? err.message : 'Unknown error',
        component: componentName,
        props: { eventName, args: args.map(arg => typeof arg) },
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date()
      });
      
      // Don't re-throw - prevent error propagation
      return undefined;
    }
  };
}

/**
 * Safe async handler wrapper
 */
export async function safeAsyncHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  componentName: string,
  operationName: string
): Promise<ReturnType<T> | null> {
  try {
    return await handler();
  } catch (err) {
    logComponentError({
      type: ComponentErrorType.ASYNC_ERROR,
      message: err instanceof Error ? err.message : 'Unknown error',
      component: componentName,
      props: { operationName },
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date()
    });

    return null;
  }
}

/**
 * Debounce with max wait time
 */
export function debounceWithMaxWait<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  maxWait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let maxTimeout: NodeJS.Timeout | null = null;
  let lastCallTime = Date.now();
  
  return function debounced(...args: Parameters<T>) {
    const now = Date.now();
    
    // Clear existing timeouts
    if (timeout) clearTimeout(timeout);
    
    // Set new timeout
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, delay);
    
    // Set max wait timeout if not already set
    if (!maxTimeout) {
      maxTimeout = setTimeout(() => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        func(...args);
        maxTimeout = null;
        lastCallTime = Date.now();
      }, maxWait);
    }
    
    // Reset max wait if enough time has passed
    if (now - lastCallTime >= maxWait) {
      if (maxTimeout) {
        clearTimeout(maxTimeout);
        maxTimeout = null;
      }
      lastCallTime = now;
    }
  };
}

/**
 * Throttle with leading and trailing options
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;
  let lastArgs: Parameters<T> | null = null;
  
  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      if (options.leading !== false) {
        lastResult = func(...args);
      } else {
        lastArgs = args;
      }
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (options.trailing !== false && lastArgs) {
          lastResult = func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
    return lastResult;
  };
}

/**
 * Memoize with size limit
 */
export function memoizeWithLimit<T extends (...args: any[]) => any>(
  func: T,
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    
    // Evict oldest if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Validate and clamp numeric prop
 */
export function validateNumericProp(
  value: number | undefined,
  min: number,
  max: number,
  defaultValue: number,
  propName: string,
  componentName: string
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    console.warn(`Invalid ${propName} for ${componentName}: ${value}, using default ${defaultValue}`);
    return defaultValue;
  }
  
  if (value < min || value > max) {
    const clamped = Math.max(min, Math.min(max, value));
    console.warn(`Clamped ${propName} for ${componentName}: ${value} -> ${clamped}`);
    return clamped;
  }
  
  return value;
}

/**
 * Validate string prop with max length
 */
export function validateStringProp(
  value: string | undefined,
  maxLength: number,
  defaultValue: string,
  propName: string,
  componentName: string
): string {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value !== 'string') {
    console.warn(`Invalid ${propName} for ${componentName}: ${value}, using default ${defaultValue}`);
    return defaultValue;
  }
  
  if (value.length > maxLength) {
    const truncated = value.substring(0, maxLength);
    console.warn(`Truncated ${propName} for ${componentName}: length ${value.length} -> ${truncated.length}`);
    return truncated;
  }
  
  return value;
}

