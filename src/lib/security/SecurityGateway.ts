/**
 * SecurityGateway - Frontend Security Gateway
 * 
 * Provides input validation, sanitization, and Arabic error message translation
 * with graceful degradation for invalid inputs.
 * 
 * Week 2 Task 2.1: Security Implementation
 */

export interface ValidationResult {
  valid: boolean;
  sanitized?: any;
  error?: SecurityError;
}

export interface SecurityError {
  code: string;
  message: string;
  messageAr: string; // Arabic translation
  severity: 'info' | 'warning' | 'error' | 'critical';
  field?: string;
  details?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'validation_failure' | 'sanitization' | 'suspicious_input' | 'rate_limit';
  timestamp: number;
  input?: any;
  error: SecurityError;
  userAgent?: string;
  url?: string;
}

/**
 * SecurityGateway - Main security validation and sanitization gateway
 */
export class SecurityGateway {
  private static instance: SecurityGateway;
  private eventLog: SecurityEvent[] = [];
  private readonly maxEventLogSize = 100;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SecurityGateway {
    if (!SecurityGateway.instance) {
      SecurityGateway.instance = new SecurityGateway();
    }
    return SecurityGateway.instance;
  }

  /**
   * Validate and sanitize user input
   */
  validateInput<T>(input: T, rules?: ValidationRules): ValidationResult {
    try {
      // Basic type validation
      if (input === null || input === undefined) {
        return this.createErrorResult('INVALID_INPUT', 'Input is required', 'المدخل مطلوب');
      }

      // String validation
      if (typeof input === 'string') {
        return this.validateString(input, rules);
      }

      // Number validation
      if (typeof input === 'number') {
        return this.validateNumber(input, rules);
      }

      // Object validation
      if (typeof input === 'object' && !Array.isArray(input)) {
        return this.validateObject(input as Record<string, any>, rules);
      }

      // Array validation
      if (Array.isArray(input)) {
        return this.validateArray(input, rules);
      }

      return { valid: true, sanitized: input };
    } catch (error) {
      return this.createErrorResult(
        'VALIDATION_ERROR',
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `فشل التحقق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      );
    }
  }

  /**
   * Validate string input
   */
  private validateString(input: string, rules?: ValidationRules): ValidationResult {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /eval\(/i,
      /expression\(/i,
      /data:text\/html/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('suspicious_input', {
          code: 'XSS_ATTEMPT',
          message: 'Input contains potentially dangerous content',
          messageAr: 'المدخل يحتوي على محتوى خطير محتمل',
          severity: 'error',
        }, input);
        return this.createErrorResult(
          'XSS_ATTEMPT',
          'Input contains potentially dangerous content',
          'المدخل يحتوي على محتوى خطير محتمل'
        );
      }
    }

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(--)|(#))/,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('suspicious_input', {
          code: 'SQL_INJECTION_ATTEMPT',
          message: 'Input contains potentially dangerous SQL patterns',
          messageAr: 'المدخل يحتوي على أنماط SQL خطيرة محتملة',
          severity: 'error',
        }, input);
        return this.createErrorResult(
          'SQL_INJECTION_ATTEMPT',
          'Input contains potentially dangerous SQL patterns',
          'المدخل يحتوي على أنماط SQL خطيرة محتملة'
        );
      }
    }

    // Apply rules
    if (rules) {
      if (rules.minLength && input.length < rules.minLength) {
        return this.createErrorResult(
          'MIN_LENGTH',
          `Input must be at least ${rules.minLength} characters`,
          `يجب أن يكون المدخل ${rules.minLength} أحرف على الأقل`
        );
      }

      if (rules.maxLength && input.length > rules.maxLength) {
        return this.createErrorResult(
          'MAX_LENGTH',
          `Input must be no more than ${rules.maxLength} characters`,
          `يجب ألا يتجاوز المدخل ${rules.maxLength} حرف`
        );
      }

      if (rules.pattern && !rules.pattern.test(input)) {
        return this.createErrorResult(
          'PATTERN_MISMATCH',
          'Input does not match required pattern',
          'المدخل لا يطابق النمط المطلوب'
        );
      }
    }

    // Sanitize
    const sanitized = this.sanitizeString(input);
    
    if (sanitized !== input) {
      this.logSecurityEvent('sanitization', {
        code: 'INPUT_SANITIZED',
        message: 'Input was sanitized',
        messageAr: 'تم تنظيف المدخل',
        severity: 'info',
      }, input);
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate number input
   */
  private validateNumber(input: number, rules?: ValidationRules): ValidationResult {
    if (isNaN(input) || !isFinite(input)) {
      return this.createErrorResult(
        'INVALID_NUMBER',
        'Input must be a valid number',
        'يجب أن يكون المدخل رقماً صحيحاً'
      );
    }

    if (rules) {
      if (rules.min !== undefined && input < rules.min) {
        return this.createErrorResult(
          'MIN_VALUE',
          `Input must be at least ${rules.min}`,
          `يجب أن يكون المدخل ${rules.min} على الأقل`
        );
      }

      if (rules.max !== undefined && input > rules.max) {
        return this.createErrorResult(
          'MAX_VALUE',
          `Input must be no more than ${rules.max}`,
          `يجب ألا يتجاوز المدخل ${rules.max}`
        );
      }
    }

    return { valid: true, sanitized: input };
  }

  /**
   * Validate object input
   */
  private validateObject(input: Record<string, any>, rules?: ValidationRules): ValidationResult {
    const sanitized: Record<string, any> = {};
    const errors: SecurityError[] = [];

    for (const [key, value] of Object.entries(input)) {
      const result = this.validateInput(value, rules);
      if (result.valid) {
        sanitized[key] = result.sanitized;
      } else if (result.error) {
        errors.push({ ...result.error, field: key });
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: {
          code: 'OBJECT_VALIDATION_FAILED',
          message: 'Object validation failed',
          messageAr: 'فشل التحقق من الكائن',
          severity: 'error',
          details: { errors },
        },
      };
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate array input
   */
  private validateArray(input: any[], rules?: ValidationRules): ValidationResult {
    const sanitized: any[] = [];
    const errors: SecurityError[] = [];

    for (let i = 0; i < input.length; i++) {
      const result = this.validateInput(input[i], rules);
      if (result.valid) {
        sanitized.push(result.sanitized);
      } else if (result.error) {
        errors.push({ ...result.error, field: `[${i}]` });
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: {
          code: 'ARRAY_VALIDATION_FAILED',
          message: 'Array validation failed',
          messageAr: 'فشل التحقق من المصفوفة',
          severity: 'error',
          details: { errors },
        },
      };
    }

    return { valid: true, sanitized };
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: string): string {
    // Remove dangerous characters
    let sanitized = input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    // HTML entity encoding for display
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    code: string,
    message: string,
    messageAr: string,
    severity: SecurityError['severity'] = 'error'
  ): ValidationResult {
    return {
      valid: false,
      error: {
        code,
        message,
        messageAr,
        severity,
      },
    };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    type: SecurityEvent['type'],
    error: SecurityError,
    input?: any
  ): void {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      input: this.sanitizeForLogging(input),
      error,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.eventLog.push(event);

    // Keep log size manageable
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog.shift();
    }

    // Send to backend if available
    this.sendSecurityEventToBackend(event).catch(() => {
      // Silently fail if backend is unavailable
    });
  }

  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private sanitizeForLogging(input: any): any {
    if (typeof input === 'string') {
      // Truncate long strings
      if (input.length > 100) {
        return input.substring(0, 100) + '...';
      }
      return input;
    }
    return input;
  }

  /**
   * Send security event to backend
   */
  private async sendSecurityEventToBackend(event: SecurityEvent): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiBase}/api/v2/security/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Silently fail - don't break user experience
      console.warn('Failed to send security event to backend:', error);
    }
  }

  /**
   * Get security event log (for debugging)
   */
  getEventLog(): SecurityEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get localized error message
   */
  getLocalizedError(
    errorCode: string,
    _lang: 'en' | 'ar' = 'en',
    details?: Record<string, any>
  ): SecurityError {
    const errorMessages: Record<string, { en: string; ar: string }> = {
      LOW_MEMORY_FALLBACK: {
        en: 'Low memory detected. Switching to 2D view for better performance.',
        ar: 'تم اكتشاف ذاكرة منخفضة. التبديل إلى عرض ثنائي الأبعاد لأداء أفضل.',
      },
      RENDERER_INITIALIZATION_FAILED: {
        en: 'Failed to initialize 3D renderer.',
        ar: 'فشل في تهيئة عارض ثلاثي الأبعاد.',
      },
      GEOMETRY_LOAD_FAILED: {
        en: 'Failed to load 3D geometry.',
        ar: 'فشل في تحميل الهندسة ثلاثية الأبعاد.',
      },
      WORKFLOW_STAGE_ERROR: {
        en: 'Workflow stage "{stage}" failed: {error}',
        ar: 'فشلت مرحلة "{stage}" من سير العمل: {error}',
      },
      WORKFLOW_ERROR: {
        en: 'Workflow error: {error}',
        ar: 'خطأ في سير العمل: {error}',
      },
      CNC_EXPORT_VALIDATION_FAILED: {
        en: 'CNC export validation failed: {errors}',
        ar: 'فشل التحقق من تصدير CNC: {errors}',
      },
      INTERNAL_ERROR: {
        en: 'An internal error occurred.',
        ar: 'حدث خطأ داخلي.',
      },
    };

    const messages = errorMessages[errorCode] || {
      en: `Error: ${errorCode}`,
      ar: `خطأ: ${errorCode}`,
    };

    return {
      code: errorCode,
      message: messages.en,
      messageAr: messages.ar,
      severity: 'warning',
      details,
    };
  }

  /**
   * Get localized message
   */
  getLocalizedMessage(
    messageKey: string,
    lang: 'en' | 'ar' = 'en',
    params?: Record<string, any>
  ): string {
    const messages: Record<string, { en: string; ar: string }> = {
      RENDERER_LOADING: {
        en: 'Loading 3D model...',
        ar: 'جارٍ تحميل النموذج ثلاثي الأبعاد...',
      },
      RENDERER_READY: {
        en: '3D model ready',
        ar: 'النموذج ثلاثي الأبعاد جاهز',
      },
      MEMORY_WARNING: {
        en: 'High memory usage detected',
        ar: 'تم اكتشاف استخدام ذاكرة مرتفع',
      },
    };

    const message = messages[messageKey] || {
      en: messageKey,
      ar: messageKey,
    };

    let text = lang === 'ar' ? message.ar : message.en;
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, String(value));
      });
    }

    return text;
  }

  /**
   * Log security event (public method for external use)
   */
  logSecurityEventPublic(
    type: SecurityEvent['type'],
    severity: SecurityError['severity'],
    details?: Record<string, any>
  ): void {
    const error: SecurityError = {
      code: type.toUpperCase(),
      message: `Security event: ${type}`,
      messageAr: `حدث أمني: ${type}`,
      severity,
      details,
    };

    this.logSecurityEvent(type, error);
  }
}

/**
 * Validation rules interface
 */
export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  required?: boolean;
}

/**
 * Export singleton instance
 */
export const securityGateway = SecurityGateway.getInstance();

/**
 * Convenience functions
 */
export function validateInput<T>(input: T, rules?: ValidationRules): ValidationResult {
  return securityGateway.validateInput(input, rules);
}

export function sanitizeString(input: string): string {
  const result = securityGateway.validateInput(input);
  return result.valid && typeof result.sanitized === 'string' 
    ? result.sanitized 
    : '';
}

