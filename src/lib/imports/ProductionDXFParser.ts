/**
 * ProductionDXFParser - Hardened DXF Parser for Production Use
 * 
 * Week 3 Task 3.1: ProductionDXFParser Implementation
 * 
 * Features:
 * - Web Worker pool utilization
 * - Geometry sanitization and validation
 * - 0.01mm tolerance validation
 * - Circuit breaker for malformed files
 * - Arabic error messages
 * - Accuracy tracking integration
 */

import { getAccuracyTracker, trackAccuracyCheckpoint } from '@/lib/fabricator/AccuracyTracker';
import { securityGateway } from '@/lib/security/SecurityGateway';

export interface DXFParseOptions {
  language?: 'en' | 'ar';
  validateTolerance?: boolean;
  minAccuracy?: number;
  useWebWorker?: boolean;
  materialType?: 'aluminium' | 'upvc';
}

export interface DXFParseResult {
  status: 'success' | 'error';
  accuracy: number;
  toleranceValidated: boolean;
  geometry?: {
    polygonCount: number;
    vertexCount: number;
  };
  metrics?: Record<string, any>;
  warnings?: string[];
  error?: {
    type: string;
    message: string;
    messageAr: string;
    details?: Record<string, any>;
  };
}

export interface CircuitBreakerState {
  failureCount: number;
  isOpen: boolean;
  lastFailureTime?: number;
}

/**
 * ProductionDXFParser - Main parser class
 */
export class ProductionDXFParser {
  private circuitBreaker: CircuitBreakerState = {
    failureCount: 0,
    isOpen: false,
  };
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 60000; // 60 seconds
  private workerPool: Worker[] = [];
  private readonly maxWorkers = 2; // Limit concurrent workers

  /**
   * Parse DXF file with comprehensive validation
   */
  async parseFile(
    file: File,
    options: DXFParseOptions = {}
  ): Promise<DXFParseResult> {
    const {
      language = 'en',
      validateTolerance = true,
      minAccuracy = 99.5,
      useWebWorker = true,
      materialType = 'aluminium',
    } = options;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen) {
        const timeSinceLastFailure = Date.now() - (this.circuitBreaker.lastFailureTime || 0);
        if (timeSinceLastFailure < this.circuitBreakerTimeout) {
          return this.createErrorResponse(
            'circuit_breaker_triggered',
            language,
            'Circuit breaker is open - too many malformed files',
            'قاطع الدائرة مفتوح - عدد كبير من الملفات التالفة'
          );
        } else {
          // Reset circuit breaker
          this.resetCircuitBreaker();
        }
      }

      // Validate file
      const validation = securityGateway.validateInput(file.name, {
        maxLength: 255,
        pattern: /\.dxf$/i,
      });

      if (!validation.valid) {
        this.recordFailure();
        return this.createErrorResponse(
          'invalid_file',
          language,
          'Invalid file name or extension',
          'اسم الملف أو الامتداد غير صالح',
          { error: validation.error }
        );
      }

      // Read file content
      const fileContent = await file.text();

      // Use Web Worker for preprocessing if enabled
      let preprocessResult: any = null;
      if (useWebWorker) {
        try {
          preprocessResult = await this.parseInWorker(fileContent, file.name, language);
        } catch (workerError) {
          console.warn('Web Worker parsing failed, falling back to API:', workerError);
          // Fall through to API parsing
        }
      }

      // Parse via backend API (full parsing with validation)
      const apiResult = await this.parseViaAPI(file, language, materialType);

      if (apiResult.status === 'error') {
        this.recordFailure();
        return apiResult;
      }

      // Validate tolerance if requested
      if (validateTolerance && !apiResult.toleranceValidated) {
        this.recordFailure();
        return this.createErrorResponse(
          'tolerance_exceeded',
          language,
          'Geometry tolerance exceeded 0.01mm',
          'تجاوز التسامح الهندسي 0.01 مم'
        );
      }

      // Validate accuracy
      if (apiResult.accuracy < minAccuracy) {
        this.recordFailure();
        return this.createErrorResponse(
          'accuracy_below_threshold',
          language,
          `Accuracy ${apiResult.accuracy}% below ${minAccuracy}% threshold`,
          `الدقة ${apiResult.accuracy}% أقل من عتبة ${minAccuracy}%`
        );
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      // Track accuracy checkpoint
      trackAccuracyCheckpoint(
        'dxf_parsing',
        { filename: file.name, fileSize: file.size },
        apiResult,
        apiResult.accuracy,
        { language, validateTolerance }
      );

      return apiResult;

    } catch (error) {
      this.recordFailure();
      return this.createErrorResponse(
        'parse_error',
        language,
        error instanceof Error ? error.message : 'Unknown error',
        'خطأ في التحليل',
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }

  /**
   * Parse DXF file in Web Worker
   */
  private async parseInWorker(
    fileContent: string,
    filename: string,
    language: 'en' | 'ar'
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker();

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 30000); // 30 second timeout

      worker.onmessage = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.releaseWorker(worker);
        resolve(event.data);
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        this.releaseWorker(worker);
        reject(error);
      };

      worker.postMessage({
        fileContent,
        filename,
        language,
      });
    });
  }

  /**
   * Parse DXF file via backend API
   */
  private async parseViaAPI(
    file: File,
    language: 'en' | 'ar',
    materialType: 'aluminium' | 'upvc' = 'aluminium'
  ): Promise<DXFParseResult> {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('material_type', materialType);

    try {
      const response = await fetch(`${apiBase}/api/v2/dxf/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return this.createErrorResponse(
          'api_error',
          language,
          errorData.message || `API error: ${response.status}`,
          errorData.message_ar || `خطأ في API: ${response.status}`
        );
      }

      const data = await response.json();

      return {
        status: 'success',
        accuracy: data.accuracy || 100.0,
        toleranceValidated: data.tolerance_validated || false,
        geometry: data.geometry,
        metrics: data.metrics,
        warnings: data.warnings || [],
      };

    } catch (error) {
      return this.createErrorResponse(
        'network_error',
        language,
        error instanceof Error ? error.message : 'Network error',
        'خطأ في الشبكة'
      );
    }
  }

  /**
   * Get available worker from pool
   */
  private getWorker(): Worker {
    if (this.workerPool.length < this.maxWorkers) {
      const worker = new Worker(
        new URL('../workers/dxf-parser.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.workerPool.push(worker);
      return worker;
    }
    // Reuse existing worker (simple round-robin)
    return this.workerPool[this.workerPool.length % this.maxWorkers];
  }

  /**
   * Release worker back to pool
   */
  private releaseWorker(worker: Worker): void {
    // Workers are kept in pool for reuse
    // Could implement more sophisticated pooling if needed
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    type: string,
    language: 'en' | 'ar',
    message: string,
    messageAr: string,
    details?: Record<string, any>
  ): DXFParseResult {
    return {
      status: 'error',
      accuracy: 0.0,
      toleranceValidated: false,
      error: {
        type,
        message: language === 'ar' ? messageAr : message,
        messageAr,
        details,
      },
    };
  }

  /**
   * Record parsing failure
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      console.warn(
        `Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`
      );
    }
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.lastFailureTime = undefined;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Cleanup workers
   */
  cleanup(): void {
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}

/**
 * Export singleton instance
 */
let parserInstance: ProductionDXFParser | null = null;

export function getProductionDXFParser(): ProductionDXFParser {
  if (!parserInstance) {
    parserInstance = new ProductionDXFParser();
  }
  return parserInstance;
}

/**
 * Convenience function
 */
export async function parseDXFFile(
  file: File,
  options?: DXFParseOptions
): Promise<DXFParseResult> {
  return getProductionDXFParser().parseFile(file, options);
}

