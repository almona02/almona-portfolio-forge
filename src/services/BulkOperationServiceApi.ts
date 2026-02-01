/**
 * Bulk Operation Service Implementation
 * 
 * Phase 3 Enterprise Features - Backend API Integration
 * Service implementation using the bulk operations API.
 */

import type {
  IBulkOperationService,
  BulkOperation,
  BulkJob,
  BulkJobStatus,
} from './BulkOperationServiceTypes';
import {
  startBulkOperation as apiStartBulkOperation,
  getBulkOperationStatus as apiGetBulkOperationStatus,
  cancelBulkOperation as apiCancelBulkOperation,
  retryBulkOperation as apiRetryBulkOperation,
  listBulkOperations as apiListBulkOperations,
  convertToBulkJob,
} from './bulkOperationsApi';

/**
 * Bulk Operation Service API Implementation
 */
export class BulkOperationServiceApi implements IBulkOperationService {
  /**
   * Start a bulk operation
   */
  async start(itemIds: string[], operation: BulkOperation): Promise<BulkJob> {
    const response = await apiStartBulkOperation(itemIds, operation);
    return convertToBulkJob(response);
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<BulkJob> {
    const response = await apiGetBulkOperationStatus(jobId);
    return convertToBulkJob(response);
  }

  /**
   * Cancel a running job
   */
  async cancel(jobId: string): Promise<BulkJob> {
    const response = await apiCancelBulkOperation(jobId);
    return convertToBulkJob(response);
  }

  /**
   * Retry failed items from a job
   */
  async retry(jobId: string, itemIds?: string[]): Promise<BulkJob> {
    const response = await apiRetryBulkOperation(jobId, itemIds ? { itemIds } : undefined);
    return convertToBulkJob(response);
  }

  /**
   * Get job history for user
   */
  async listJobs(options?: { status?: BulkJobStatus; limit?: number }): Promise<BulkJob[]> {
    const response = await apiListBulkOperations(options);
    return response.jobs.map(convertToBulkJob);
  }
}

/**
 * Default service instance
 */
export const defaultBulkOperationService = new BulkOperationServiceApi();
