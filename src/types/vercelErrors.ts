/**
 * Vercel Error Types and Mappings
 * Maps Vercel error codes to user-friendly messages and handling strategies
 */

export type VercelErrorCode = 
  // Deployment errors
  | 'DEPLOYMENT_BLOCKED'
  | 'DEPLOYMENT_NOT_FOUND'
  | 'DEPLOYMENT_DISABLED'
  | 'DEPLOYMENT_PAUSED'
  | 'DEPLOYMENT_NOT_READY_REDIRECTING'
  // Function errors
  | 'FUNCTION_INVOCATION_FAILED'
  | 'FUNCTION_INVOCATION_TIMEOUT'
  | 'FUNCTION_PAYLOAD_TOO_LARGE'
  | 'FUNCTION_THROTTLED'
  // DNS errors
  | 'DNS_HOSTNAME_NOT_FOUND'
  | 'DNS_HOSTNAME_RESOLVE_FAILED'
  | 'DNS_HOSTNAME_SERVER_ERROR'
  // Platform errors
  | 'NOT_FOUND'
  | 'INTERNAL_UNEXPECTED_ERROR'
  | 'FUNCTION_SERVICE_UNAVAILABLE'
  // Application errors
  | 'BODY_NOT_A_STRING_FROM_FUNCTION'
  | 'INFINITE_LOOP_DETECTED'
  | 'INVALID_REQUEST_METHOD';

export interface VercelErrorInfo {
  code: VercelErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  category: 'deployment' | 'function' | 'dns' | 'platform' | 'application';
  httpStatus: number;
}

export const VERCEL_ERROR_MAP: Record<VercelErrorCode, VercelErrorInfo> = {
  // Deployment errors
  DEPLOYMENT_BLOCKED: {
    code: 'DEPLOYMENT_BLOCKED',
    message: 'Deployment blocked by platform',
    userMessage: 'This deployment has been blocked. Please contact support if you believe this is an error.',
    retryable: false,
    category: 'deployment',
    httpStatus: 403
  },
  DEPLOYMENT_NOT_FOUND: {
    code: 'DEPLOYMENT_NOT_FOUND',
    message: 'Deployment not found',
    userMessage: 'The requested deployment could not be found. Please check the URL and try again.',
    retryable: false,
    category: 'deployment',
    httpStatus: 404
  },
  DEPLOYMENT_DISABLED: {
    code: 'DEPLOYMENT_DISABLED',
    message: 'Deployment is disabled',
    userMessage: 'This deployment has been disabled. Please contact support for assistance.',
    retryable: false,
    category: 'deployment',
    httpStatus: 402
  },
  DEPLOYMENT_PAUSED: {
    code: 'DEPLOYMENT_PAUSED',
    message: 'Deployment is paused',
    userMessage: 'This deployment is currently paused. Please check back later or contact support.',
    retryable: true,
    category: 'deployment',
    httpStatus: 503
  },
  DEPLOYMENT_NOT_READY_REDIRECTING: {
    code: 'DEPLOYMENT_NOT_READY_REDIRECTING',
    message: 'Deployment not ready, redirecting',
    userMessage: 'The deployment is still being prepared. Please wait a moment and try again.',
    retryable: true,
    category: 'deployment',
    httpStatus: 303
  },
  
  // Function errors
  FUNCTION_INVOCATION_FAILED: {
    code: 'FUNCTION_INVOCATION_FAILED',
    message: 'Function invocation failed',
    userMessage: 'Something went wrong while processing your request. Please try again.',
    retryable: true,
    category: 'function',
    httpStatus: 500
  },
  FUNCTION_INVOCATION_TIMEOUT: {
    code: 'FUNCTION_INVOCATION_TIMEOUT',
    message: 'Function invocation timeout',
    userMessage: 'The request took too long to process. Please try again or contact support.',
    retryable: true,
    category: 'function',
    httpStatus: 504
  },
  FUNCTION_PAYLOAD_TOO_LARGE: {
    code: 'FUNCTION_PAYLOAD_TOO_LARGE',
    message: 'Request payload too large',
    userMessage: 'The request is too large. Please reduce the size and try again.',
    retryable: false,
    category: 'function',
    httpStatus: 413
  },
  FUNCTION_THROTTLED: {
    code: 'FUNCTION_THROTTLED',
    message: 'Function throttled',
    userMessage: 'Too many requests. Please wait a moment and try again.',
    retryable: true,
    category: 'function',
    httpStatus: 503
  },
  
  // DNS errors
  DNS_HOSTNAME_NOT_FOUND: {
    code: 'DNS_HOSTNAME_NOT_FOUND',
    message: 'Hostname not found',
    userMessage: 'The requested domain could not be found. Please check the URL and try again.',
    retryable: false,
    category: 'dns',
    httpStatus: 502
  },
  DNS_HOSTNAME_RESOLVE_FAILED: {
    code: 'DNS_HOSTNAME_RESOLVE_FAILED',
    message: 'Hostname resolution failed',
    userMessage: 'Unable to resolve the domain. Please check your internet connection and try again.',
    retryable: true,
    category: 'dns',
    httpStatus: 502
  },
  DNS_HOSTNAME_SERVER_ERROR: {
    code: 'DNS_HOSTNAME_SERVER_ERROR',
    message: 'DNS server error',
    userMessage: 'There was an issue with the DNS server. Please try again or contact support.',
    retryable: true,
    category: 'dns',
    httpStatus: 502
  },
  
  // Platform errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    userMessage: 'The requested resource could not be found. Please check the URL and try again.',
    retryable: false,
    category: 'platform',
    httpStatus: 404
  },
  INTERNAL_UNEXPECTED_ERROR: {
    code: 'INTERNAL_UNEXPECTED_ERROR',
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again or contact support.',
    retryable: true,
    category: 'platform',
    httpStatus: 500
  },
  FUNCTION_SERVICE_UNAVAILABLE: {
    code: 'FUNCTION_SERVICE_UNAVAILABLE',
    message: 'Function service unavailable',
    userMessage: 'The service is temporarily unavailable. Please try again in a few minutes.',
    retryable: true,
    category: 'platform',
    httpStatus: 503
  },
  
  // Application errors
  BODY_NOT_A_STRING_FROM_FUNCTION: {
    code: 'BODY_NOT_A_STRING_FROM_FUNCTION',
    message: 'Function returned invalid response',
    userMessage: 'There was an issue processing your request. Please try again.',
    retryable: true,
    category: 'application',
    httpStatus: 502
  },
  INFINITE_LOOP_DETECTED: {
    code: 'INFINITE_LOOP_DETECTED',
    message: 'Infinite loop detected',
    userMessage: 'The request took too long to process. Please try again or contact support.',
    retryable: false,
    category: 'application',
    httpStatus: 508
  },
  INVALID_REQUEST_METHOD: {
    code: 'INVALID_REQUEST_METHOD',
    message: 'Invalid request method',
    userMessage: 'This request method is not supported. Please check and try again.',
    retryable: false,
    category: 'application',
    httpStatus: 405
  }
};

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: VercelErrorInfo) => void;
  onRetry?: (error: VercelErrorInfo, attempt: number) => void;
}

export class VercelErrorHandler {
  private options: Required<ErrorHandlerOptions>;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      onError: options.onError ?? (() => {}),
      onRetry: options.onRetry ?? (() => {})
    };
  }

  /**
   * Get error information for a given error code
   */
  getErrorInfo(code: VercelErrorCode): VercelErrorInfo {
    return VERCEL_ERROR_MAP[code] || {
      code: 'INTERNAL_UNEXPECTED_ERROR',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: false,
      category: 'platform',
      httpStatus: 500
    };
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(code: VercelErrorCode): boolean {
    return VERCEL_ERROR_MAP[code]?.retryable ?? false;
  }

  /**
   * Get user-friendly message for an error
   */
  getUserMessage(code: VercelErrorCode): string {
    return VERCEL_ERROR_MAP[code]?.userMessage ?? 'An unexpected error occurred.';
  }

  /**
   * Handle API errors with retry logic
   */
  async handleApiError<T>(
    operation: () => Promise<T>,
    options: Partial<ErrorHandlerOptions> = {}
  ): Promise<T> {
    const mergedOptions = { ...this.options, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= mergedOptions.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        const errorCode = this.extractErrorCode(error);
        const errorInfo = this.getErrorInfo(errorCode);
        
        mergedOptions.onError(errorInfo);
        
        if (attempt < mergedOptions.maxRetries && errorInfo.retryable) {
          mergedOptions.onRetry(errorInfo, attempt + 1);
          await this.delay(mergedOptions.retryDelay * Math.pow(2, attempt));
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Extract error code from error object or message
   */
  private extractErrorCode(error: unknown): VercelErrorCode {
    if (typeof error === 'string') {
      const match = Object.keys(VERCEL_ERROR_MAP).find(code => 
        error.includes(code)
      );
      return (match as VercelErrorCode) || 'INTERNAL_UNEXPECTED_ERROR';
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      if (VERCEL_ERROR_MAP[code as VercelErrorCode]) {
        return code as VercelErrorCode;
      }
    }
    
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: { error?: unknown } } }).response;
      if (response?.data?.error) {
        const errorData = response.data.error;
        const match = Object.keys(VERCEL_ERROR_MAP).find(code => 
          JSON.stringify(errorData).includes(code)
        );
        return (match as VercelErrorCode) || 'INTERNAL_UNEXPECTED_ERROR';
      }
    }
    
    return 'INTERNAL_UNEXPECTED_ERROR';
  }

  /**
   * Delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const vercelErrorHandler = new VercelErrorHandler();
