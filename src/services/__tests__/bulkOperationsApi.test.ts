/**
 * Bulk Operations API Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests for bulk operations API service with mocked fetch and authentication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    BulkDeleteOperation,
    BulkEditOperation,
    BulkExportOperation,
    BulkStatusOperation,
} from '../BulkOperationServiceTypes';
import {
    cancelBulkOperation,
    convertToBulkJob,
    getBulkOperationStatus,
    listBulkOperations,
    retryBulkOperation,
    startBulkOperation,
    type BulkJobResponse,
} from '../bulkOperationsApi';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the global fetch
global.fetch = vi.fn();

const createFetchResponse = (data: any, ok: boolean = true) => ({
  ok,
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  json: async () => Promise.resolve(data),
  headers: new Headers(),
});

describe('bulkOperationsApi', () => {
  const mockToken = 'test-auth-token-123';
  const mockSession = {
    data: {
      session: {
        access_token: mockToken,
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('@/lib/supabase');
    const { supabase } = supabaseModule;
    (supabase.auth.getSession as any).mockResolvedValue(mockSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startBulkOperation', () => {
    it('should start an edit operation successfully', async () => {
      const operation: BulkEditOperation = {
        op: 'edit',
        fields: { status: 'active', color: 'white' },
      };

      const mockResponse: BulkJobResponse = {
        jobId: 'job-1',
        status: 'queued',
        operation: {
          type: 'edit',
          params: { fields: { status: 'active', color: 'white' } },
        },
        itemCount: 5,
        progress: { completed: 0, total: 5, percentage: 0 },
        createdAt: '2026-01-15T10:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await startBulkOperation(['item-1', 'item-2'], operation);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/bulk-operations'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
          body: expect.stringContaining('"type":"edit"'),
        })
      );

      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('queued');
    });

    it('should start an export operation successfully', async () => {
      const operation: BulkExportOperation = {
        op: 'export',
        format: 'pdf',
        options: { includeDetails: true },
      };

      const mockResponse: BulkJobResponse = {
        jobId: 'job-2',
        status: 'queued',
        operation: {
          type: 'export',
          params: { format: 'pdf', includeDetails: true },
        },
        itemCount: 3,
        progress: { completed: 0, total: 3, percentage: 0 },
        createdAt: '2026-01-15T10:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await startBulkOperation(['item-1'], operation);

      expect(result.jobId).toBe('job-2');
      expect(result.operation.type).toBe('export');
    });

    it('should start a delete operation successfully', async () => {
      const operation: BulkDeleteOperation = {
        op: 'delete',
        softDelete: true,
      };

      const mockResponse: BulkJobResponse = {
        jobId: 'job-3',
        status: 'queued',
        operation: {
          type: 'delete',
          params: { softDelete: true },
        },
        itemCount: 2,
        progress: { completed: 0, total: 2, percentage: 0 },
        createdAt: '2026-01-15T10:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await startBulkOperation(['item-1', 'item-2'], operation);

      expect(result.operation.type).toBe('delete');
    });

    it('should start a status change operation successfully', async () => {
      const operation: BulkStatusOperation = {
        op: 'status',
        status: 'archived',
      };

      const mockResponse: BulkJobResponse = {
        jobId: 'job-4',
        status: 'queued',
        operation: {
          type: 'status_change',
          params: { status: 'archived' },
        },
        itemCount: 4,
        progress: { completed: 0, total: 4, percentage: 0 },
        createdAt: '2026-01-15T10:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await startBulkOperation(['item-1'], operation);

      expect(result.operation.type).toBe('status_change');
    });

    it('should handle 429 rate limit errors', async () => {
      const operation: BulkEditOperation = {
        op: 'edit',
        fields: { status: 'active' },
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () =>
          Promise.resolve({ detail: 'Too many concurrent jobs' }),
      });

      await expect(
        startBulkOperation(['item-1'], operation)
      ).rejects.toThrow('Too many concurrent jobs');
    });
  });

  describe('getBulkOperationStatus', () => {
    it('should get job status successfully', async () => {
      const mockResponse: BulkJobResponse = {
        jobId: 'job-1',
        status: 'running',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 2, total: 5, percentage: 40 },
        createdAt: '2026-01-15T10:00:00Z',
        startedAt: '2026-01-15T10:00:01Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await getBulkOperationStatus('job-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/bulk-operations/job-1'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.status).toBe('running');
      expect(result.progress.percentage).toBe(40);
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Not found' }),
      });

      await expect(getBulkOperationStatus('nonexistent')).rejects.toThrow(
        'Bulk operation job nonexistent not found'
      );
    });
  });

  describe('cancelBulkOperation', () => {
    it('should cancel a job successfully', async () => {
      const mockResponse: BulkJobResponse = {
        jobId: 'job-1',
        status: 'canceled',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 2, total: 5, percentage: 40 },
        createdAt: '2026-01-15T10:00:00Z',
        canceledAt: '2026-01-15T10:05:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await cancelBulkOperation('job-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/bulk-operations/job-1/cancel'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.status).toBe('canceled');
    });
  });

  describe('retryBulkOperation', () => {
    it('should retry failed items successfully', async () => {
      const mockResponse: BulkJobResponse = {
        jobId: 'job-retry-1',
        status: 'queued',
        operation: { type: 'edit', params: {} },
        itemCount: 2,
        progress: { completed: 0, total: 2, percentage: 0 },
        createdAt: '2026-01-15T11:00:00Z',
        originalJobId: 'job-1',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await retryBulkOperation('job-1', {
        itemIds: ['item-1', 'item-2'],
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/bulk-operations/job-1/retry'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.jobId).toBe('job-retry-1');
    });
  });

  describe('listBulkOperations', () => {
    it('should list bulk operations successfully', async () => {
      const mockResponse = {
        jobs: [
          {
            jobId: 'job-1',
            status: 'completed',
            operation: { type: 'edit', params: {} },
            itemCount: 5,
            progress: { completed: 5, total: 5, percentage: 100 },
            createdAt: '2026-01-15T10:00:00Z',
            completedAt: '2026-01-15T10:02:00Z',
          },
        ],
        total: 1,
        limit: 50,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await listBulkOperations();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/bulk-operations'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const mockResponse = { jobs: [], total: 0, limit: 50 };
      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listBulkOperations({ status: 'running' });

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('status=running');
    });
  });

  describe('convertToBulkJob', () => {
    it('should convert backend response to frontend format', () => {
      const backendResponse: BulkJobResponse = {
        jobId: 'job-1',
        status: 'completed',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 5, total: 5, percentage: 100 },
        result: {
          succeeded: 5,
          failed: 0,
          errors: [],
        },
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:02:00Z',
      };

      const result = convertToBulkJob(backendResponse);

      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.totalItems).toBe(5);
      expect(result.successfulItems).toBe(5);
      expect(result.failedItems).toBe(0);
    });

    it('should handle export result with download URL', () => {
      const backendResponse: BulkJobResponse = {
        jobId: 'job-2',
        status: 'completed',
        operation: { type: 'export', params: { format: 'pdf' } },
        itemCount: 3,
        progress: { completed: 3, total: 3, percentage: 100 },
        result: {
          succeeded: 3,
          failed: 0,
          errors: [],
          downloadUrl: 'https://storage.example.com/export.pdf',
          downloadExpiresAt: '2026-01-16T10:00:00Z',
        },
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z',
      };

      const result = convertToBulkJob(backendResponse);

      expect(result.result?.downloadUrl).toBe(
        'https://storage.example.com/export.pdf'
      );
      expect(result.result?.expiresAt).toBe('2026-01-16T10:00:00Z');
    });

    it('should extract errors from result', () => {
      const backendResponse: BulkJobResponse = {
        jobId: 'job-3',
        status: 'failed',
        operation: { type: 'edit', params: {} },
        itemCount: 5,
        progress: { completed: 3, total: 5, percentage: 60 },
        result: {
          succeeded: 3,
          failed: 2,
          errors: [
            { itemId: 'item-1', message: 'Error 1' },
            { itemId: 'item-2', message: 'Error 2' },
          ],
        },
        createdAt: '2026-01-15T10:00:00Z',
      };

      const result = convertToBulkJob(backendResponse);

      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0].message).toBe('Error 1');
    });
  });
});
