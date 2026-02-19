/**
 * BulkOperationServiceApi Integration Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests BulkOperationServiceApi integration with bulkOperationsApi (with mocked API).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkOperationServiceApi } from '../BulkOperationServiceApi';
import type {
    BulkEditOperation,
    BulkJob,
} from '../BulkOperationServiceTypes';
import type { BulkJobResponse } from '../bulkOperationsApi';

// Mock bulkOperationsApi
vi.mock('../bulkOperationsApi', async () => {
  const actual = await vi.importActual<typeof import('../bulkOperationsApi')>('../bulkOperationsApi');
  return {
    ...actual,
    startBulkOperation: vi.fn(),
    getBulkOperationStatus: vi.fn(),
    cancelBulkOperation: vi.fn(),
    retryBulkOperation: vi.fn(),
    listBulkOperations: vi.fn(),
    convertToBulkJob: vi.fn((job: BulkJobResponse): BulkJob => ({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress.percentage,
      totalItems: job.itemCount,
      processedItems: job.progress.completed,
      successfulItems: (job.result as { succeeded?: number })?.succeeded ?? 0,
      failedItems: (job.result as { failed?: number })?.failed ?? 0,
      createdAt: job.createdAt,
      updatedAt: job.completedAt ?? job.startedAt ?? job.createdAt,
    })),
  };
});

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('BulkOperationServiceApi - API Integration', () => {
  let service: BulkOperationServiceApi;
  let mockStart: ReturnType<typeof vi.fn>;
  let mockGetStatus: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;
  let mockRetry: ReturnType<typeof vi.fn>;
  let mockList: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    service = new BulkOperationServiceApi();
    vi.clearAllMocks();

    // Get mocked functions
    const bulkOperationsApi = await import('../bulkOperationsApi');
    mockStart = vi.mocked(bulkOperationsApi.startBulkOperation);
    mockGetStatus = vi.mocked(bulkOperationsApi.getBulkOperationStatus);
    mockCancel = vi.mocked(bulkOperationsApi.cancelBulkOperation);
    mockRetry = vi.mocked(bulkOperationsApi.retryBulkOperation);
    mockList = vi.mocked(bulkOperationsApi.listBulkOperations);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should start a bulk operation successfully', async () => {
      const operation: BulkEditOperation = {
        op: 'edit',
        fields: { status: 'active' },
      };

      const mockJobResponse = {
        jobId: 'job-1',
        status: 'queued',
        operation: { type: 'edit', params: {} },
        itemCount: 3,
        progress: { completed: 0, total: 3, percentage: 0 },
        createdAt: '2026-01-15T10:00:00Z',
      };

      const mockConvertedJob: BulkJob = {
        jobId: 'job-1',
        status: 'queued',
        progress: 0,
        totalItems: 3,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      mockStart.mockResolvedValue(mockJobResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJob);

      const result = await service.start(['item-1', 'item-2', 'item-3'], operation);

      expect(mockStart).toHaveBeenCalledWith(
        ['item-1', 'item-2', 'item-3'],
        operation
      );
      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('queued');
    });
  });

  describe('getStatus', () => {
    it('should get job status successfully', async () => {
      const mockJobResponse = {
        jobId: 'job-1',
        status: 'running',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 2, total: 5, percentage: 40 },
        createdAt: '2026-01-15T10:00:00Z',
        startedAt: '2026-01-15T10:00:01Z',
      };

      const mockConvertedJob: BulkJob = {
        jobId: 'job-1',
        status: 'running',
        progress: 40,
        totalItems: 5,
        processedItems: 2,
        successfulItems: 0,
        failedItems: 0,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:01Z',
      };

      mockGetStatus.mockResolvedValue(mockJobResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJob);

      const result = await service.getStatus('job-1');

      expect(mockGetStatus).toHaveBeenCalledWith('job-1');
      expect(result.status).toBe('running');
      expect(result.progress).toBe(40);
    });
  });

  describe('cancel', () => {
    it('should cancel a job successfully', async () => {
      const mockJobResponse = {
        jobId: 'job-1',
        status: 'canceled',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 2, total: 5, percentage: 40 },
        createdAt: '2026-01-15T10:00:00Z',
        canceledAt: '2026-01-15T10:05:00Z',
      };

      const mockConvertedJob: BulkJob = {
        jobId: 'job-1',
        status: 'canceled',
        progress: 40,
        totalItems: 5,
        processedItems: 2,
        successfulItems: 0,
        failedItems: 0,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:05:00Z',
      };

      mockCancel.mockResolvedValue(mockJobResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJob);

      const result = await service.cancel('job-1');

      expect(mockCancel).toHaveBeenCalledWith('job-1');
      expect(result.status).toBe('canceled');
    });
  });

  describe('retry', () => {
    it('should retry failed items successfully', async () => {
      const mockJobResponse = {
        jobId: 'job-retry-1',
        status: 'queued',
        operation: { type: 'edit', params: {} },
        itemCount: 2,
        progress: { completed: 0, total: 2, percentage: 0 },
        createdAt: '2026-01-15T11:00:00Z',
        originalJobId: 'job-1',
      };

      const mockConvertedJob: BulkJob = {
        jobId: 'job-retry-1',
        status: 'queued',
        progress: 0,
        totalItems: 2,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        createdAt: '2026-01-15T11:00:00Z',
        updatedAt: '2026-01-15T11:00:00Z',
      };

      mockRetry.mockResolvedValue(mockJobResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJob);

      const result = await service.retry('job-1', ['item-1', 'item-2']);

      expect(mockRetry).toHaveBeenCalledWith('job-1', { itemIds: ['item-1', 'item-2'] });
      expect(result.jobId).toBe('job-retry-1');
    });

    it('should retry all failed items when itemIds not provided', async () => {
      const mockJobResponse = {
        jobId: 'job-retry-2',
        status: 'queued',
        operation: { type: 'edit', params: {} },
        itemCount: 3,
        progress: { completed: 0, total: 3, percentage: 0 },
        createdAt: '2026-01-15T11:00:00Z',
        originalJobId: 'job-1',
      };

      const mockConvertedJob: BulkJob = {
        jobId: 'job-retry-2',
        status: 'queued',
        progress: 0,
        totalItems: 3,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        createdAt: '2026-01-15T11:00:00Z',
        updatedAt: '2026-01-15T11:00:00Z',
      };

      mockRetry.mockResolvedValue(mockJobResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJob);

      const result = await service.retry('job-1');

      expect(mockRetry).toHaveBeenCalledWith('job-1', undefined);
      expect(result.jobId).toBe('job-retry-2');
    });
  });

  describe('listJobs', () => {
    it('should list jobs successfully', async () => {
      const mockResponse = {
        jobs: [
          {
            jobId: 'job-1',
            status: 'completed',
            operation: { type: 'edit', params: {} },
            itemCount: 5,
            progress: { completed: 5, total: 5, percentage: 100 },
            result: { succeeded: 5, failed: 0, errors: [] },
            createdAt: '2026-01-15T10:00:00Z',
            completedAt: '2026-01-15T10:02:00Z',
          },
        ],
        total: 1,
        limit: 50,
      };

      const mockConvertedJobs: BulkJob[] = [
        {
          jobId: 'job-1',
          status: 'completed',
          progress: 100,
          totalItems: 5,
          processedItems: 5,
          successfulItems: 5,
          failedItems: 0,
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:02:00Z',
        },
      ];

      mockList.mockResolvedValue(mockResponse);
      const bulkOperationsApiModule = await import('../bulkOperationsApi');
      vi.mocked(bulkOperationsApiModule.convertToBulkJob).mockReturnValue(mockConvertedJobs[0]);

      const result = await service.listJobs();

      expect(mockList).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('job-1');
    });

    it('should filter by status when provided', async () => {
      const mockResponse = { jobs: [], total: 0, limit: 50 };
      mockList.mockResolvedValue(mockResponse);

      await service.listJobs({ status: 'running' });

      expect(mockList).toHaveBeenCalledWith({ status: 'running' });
    });
  });
});
