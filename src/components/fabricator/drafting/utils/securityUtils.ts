// src/components/fabricator/drafting/utils/securityUtils.ts

/**
 * Security Utilities for Drafting Workbench
 * Hardens against common security vulnerabilities
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove potentially dangerous characters (but allow normal text)
  // This is conservative - only removes truly dangerous patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize user name
 */
export function sanitizeUserName(userName: string): string {
  if (typeof userName !== 'string') {
    return 'Anonymous';
  }
  
  const sanitized = sanitizeString(userName, 50);
  return sanitized || 'Anonymous';
}

/**
 * Validate room ID format (alphanumeric, dashes, underscores only)
 */
export function validateRoomId(roomId: string): boolean {
  if (typeof roomId !== 'string') {
    return false;
  }
  
  // Allow alphanumeric, dashes, underscores, length 1-100
  const roomIdPattern = /^[a-zA-Z0-9_-]{1,100}$/;
  return roomIdPattern.test(roomId);
}

/**
 * Validate user ID format
 */
export function validateUserId(userId: string): boolean {
  if (typeof userId !== 'string') {
    return false;
  }
  
  // Allow alphanumeric, dashes, underscores, length 1-100
  const userIdPattern = /^[a-zA-Z0-9_-]{1,100}$/;
  return userIdPattern.test(userId);
}

/**
 * Validate filename for export (prevent path traversal)
 */
export function sanitizeFilename(filename: string, defaultName: string = 'drafting'): string {
  if (typeof filename !== 'string') {
    return defaultName;
  }
  
  // Remove path separators and dangerous characters
  const sanitized = filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove Windows reserved characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255); // Max filename length
  
  // Ensure it's not empty
  if (!sanitized || sanitized.length === 0) {
    return defaultName;
  }
  
  return sanitized;
}

/**
 * Safe JSON parse with size limit and error handling
 */
export function safeJsonParse<T>(jsonString: string, maxSize: number = 10 * 1024 * 1024): T {
  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Check size limit (10MB default)
  if (jsonString.length > maxSize) {
    throw new Error(`JSON string exceeds maximum size (${maxSize} bytes)`);
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check for prototype pollution (only on plain objects, not arrays)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && '__proto__' in parsed) {
      // Only throw if __proto__ is a direct property (not inherited)
      if (Object.prototype.hasOwnProperty.call(parsed, '__proto__')) {
        throw new Error('Prototype pollution detected');
      }
    }
    
    return parsed as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Rate limiter for WebSocket messages
 */
export class MessageRateLimiter {
  private messageCounts: Map<string, number[]> = new Map();
  private maxMessages: number;
  private timeWindow: number; // milliseconds
  
  constructor(maxMessages: number = 100, timeWindow: number = 60000) {
    this.maxMessages = maxMessages;
    this.timeWindow = timeWindow;
  }
  
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const messages = this.messageCounts.get(identifier) || [];
    
    // Remove messages outside time window
    const recentMessages = messages.filter(timestamp => now - timestamp < this.timeWindow);
    
    if (recentMessages.length >= this.maxMessages) {
      return false; // Rate limit exceeded
    }
    
    // Add current message
    recentMessages.push(now);
    this.messageCounts.set(identifier, recentMessages);
    
    return true; // Within rate limit
  }
  
  reset(identifier: string): void {
    this.messageCounts.delete(identifier);
  }
}

/**
 * Collaborative message type
 */
export interface CollaborativeMessage {
  type: 'state_sync' | 'cursor_move' | 'selection_change' | 'geometry_add' | 'geometry_update' | 'geometry_delete' | 'user_join' | 'user_leave';
  userId: string;
  timestamp: number;
  data: any;
}

/**
 * Validate WebSocket message structure
 */
export function validateWebSocketMessage(message: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: CollaborativeMessage;
} {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Message must be an object' };
  }
  
  const msg = message as any;
  
  // Check required fields
  if (typeof msg.type !== 'string') {
    return { valid: false, error: 'Message type must be a string' };
  }
  
  if (typeof msg.userId !== 'string') {
    return { valid: false, error: 'Message userId must be a string' };
  }
  
  if (typeof msg.timestamp !== 'number' || !isFinite(msg.timestamp)) {
    return { valid: false, error: 'Message timestamp must be a finite number' };
  }
  
  // Validate message type
  const validTypes = [
    'state_sync',
    'cursor_move',
    'selection_change',
    'geometry_add',
    'geometry_update',
    'geometry_delete',
    'user_join',
    'user_leave'
  ];
  
  if (!validTypes.includes(msg.type)) {
    return { valid: false, error: `Invalid message type: ${msg.type}` };
  }
  
  // Validate userId format
  if (!validateUserId(msg.userId)) {
    return { valid: false, error: 'Invalid userId format' };
  }
  
  // Validate timestamp (not too old, not in future)
  const now = Date.now();
  const messageTime = msg.timestamp;
  const maxAge = 5 * 60 * 1000; // 5 minutes
  const maxFuture = 60 * 1000; // 1 minute
  
  if (messageTime < now - maxAge) {
    return { valid: false, error: 'Message timestamp too old' };
  }
  
  if (messageTime > now + maxFuture) {
    return { valid: false, error: 'Message timestamp in future' };
  }
  
  // Sanitize data field if present
  let sanitizedData = msg.data;
  if (msg.data && typeof msg.data === 'object') {
    // Deep clone to prevent prototype pollution
    sanitizedData = JSON.parse(JSON.stringify(msg.data));
  }
  
  return {
    valid: true,
    sanitized: {
      type: msg.type,
      userId: msg.userId,
      timestamp: msg.timestamp,
      data: sanitizedData
    }
  };
}

/**
 * Safe localStorage operations with quota handling
 */
export class SafeLocalStorage {
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly KEY_PREFIX = 'almona-draft-';
  
  static setItem(key: string, value: string): boolean {
    try {
      const fullKey = this.KEY_PREFIX + key;
      const size = new Blob([value]).size;
      
      // Check size limit
      if (size > this.MAX_SIZE) {
        console.warn(`localStorage value too large (${size} bytes), truncating`);
        return false;
      }
      
      localStorage.setItem(fullKey, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup');
        this.cleanup();
        
        // Retry once after cleanup
        try {
          localStorage.setItem(this.KEY_PREFIX + key, value);
          return true;
        } catch (retryError) {
          console.error('Failed to save after cleanup:', retryError);
          return false;
        }
      }
      console.error('localStorage error:', error);
      return false;
    }
  }
  
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(this.KEY_PREFIX + key);
    } catch (error) {
      console.error('localStorage getItem error:', error);
      return null;
    }
  }
  
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(this.KEY_PREFIX + key);
    } catch (error) {
      console.error('localStorage removeItem error:', error);
    }
  }
  
  static cleanup(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.KEY_PREFIX)) {
          keys.push(key);
        }
      }
      
      // Remove oldest 50% of items
      keys.sort();
      const toRemove = keys.slice(0, Math.floor(keys.length / 2));
      toRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('localStorage cleanup error:', error);
    }
  }
  
  static getSize(key: string): number {
    try {
      const value = localStorage.getItem(this.KEY_PREFIX + key);
      return value ? new Blob([value]).size : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Debounce function with maximum wait time
 */
export function debounceWithMaxWait<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  maxWait: number = wait * 10
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let maxTimeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // Set new timeout
    timeout = setTimeout(later, wait);
    
    // Set max wait timeout if not already set
    if (!maxTimeout) {
      maxTimeout = setTimeout(() => {
        maxTimeout = null;
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        func(...args);
      }, maxWait);
    }
  };
}

