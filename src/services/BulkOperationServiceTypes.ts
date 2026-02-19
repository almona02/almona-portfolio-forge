/**
 * Bulk Operation Service Types
 * 
 * Type definitions matching specs/services/BulkOperationService.md
 * These types are used by BulkOperationToolbar and should be implemented
 * by a service that matches the IBulkOperationService interface.
 */

/**
 * Bulk operation types
 */
export type BulkOperationType = 'edit' | 'export' | 'delete' | 'status';

/**
 * Bulk edit operation
 */
export interface BulkEditOperation {
  op: 'edit';
  fields: Record<string, unknown>;  // field → value mapping
}

/**
 * Bulk export operation
 */
export interface BulkExportOperation {
  op: 'export';
  format: 'pdf' | 'csv' | 'dxf';
  options?: {
    includeDetails?: boolean;
    templateId?: string;
    watermark?: boolean;
  };
}

/**
 * Bulk delete operation
 */
export interface BulkDeleteOperation {
  op: 'delete';
  softDelete?: boolean;  // default: true (recommended)
}

/**
 * Bulk status operation
 */
export interface BulkStatusOperation {
  op: 'status';
  status: string;  // target status value
}

/**
 * Bulk operation union type
 */
export type BulkOperation =
  | BulkEditOperation
  | BulkExportOperation
  | BulkDeleteOperation
  | BulkStatusOperation;

/**
 * Bulk job status
 */
export type BulkJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

/**
 * Bulk job error
 */
export interface BulkJobError {
  itemId: string;
  message: string;
  code?: string;  // error code for programmatic handling
}

/**
 * Bulk job result
 */
export interface BulkJobResult {
  // For export: download URL, file size, expiresAt
  // For edit/delete/status: summary of changes
  downloadUrl?: string;
  fileSize?: number;
  expiresAt?: string;
  summary?: Record<string, unknown>;
}

/**
 * Bulk job
 */
export interface BulkJob {
  jobId: string;
  status: BulkJobStatus;
  progress: number;  // 0..100
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors?: BulkJobError[];  // errors for failed items
  result?: BulkJobResult;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  estimatedCompletionAt?: string;  // ISO 8601
}

/**
 * Bulk operation service interface
 */
export interface IBulkOperationService {
  // Start a bulk operation
  start(itemIds: string[], operation: BulkOperation): Promise<BulkJob>;

  // Get job status (polling or WebSocket)
  getStatus(jobId: string): Promise<BulkJob>;

  // Cancel a running job
  cancel(jobId: string): Promise<BulkJob>;

  // Retry failed items from a job (if supported)
  retry(jobId: string, itemIds?: string[]): Promise<BulkJob>;

  // Get job history for user
  listJobs(options?: { status?: BulkJobStatus; limit?: number }): Promise<BulkJob[]>;
}
