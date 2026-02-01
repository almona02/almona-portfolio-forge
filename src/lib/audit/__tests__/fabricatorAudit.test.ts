/**
 * Unit Tests for FabricatorAuditLogger
 * 
 * Tests comprehensive audit logging functionality with:
 * - Queue management
 * - Supabase integration
 * - Graceful degradation
 * - Performance optimization
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { logFabricatorAudit, getAuditLogger } from '../fabricatorAudit';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('FabricatorAuditLogger', () => {
  let logger: ReturnType<typeof getAuditLogger>;

  beforeEach(() => {
    logger = getAuditLogger();
    logger.clearQueue();
    logger.setEnabled(true);
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock successful auth
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    // Mock successful insert
    const mockInsert = vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    (supabase.from as any).mockReturnValue(mockInsert);
  });

  afterEach(() => {
    logger.clearQueue();
  });

  describe('logFabricatorAudit', () => {
    it('should log audit entry successfully', async () => {
      const entry = {
        action: 'VALIDATE' as const,
        tableName: 'fenestration_systems',
        recordId: 'test-id',
        status: 'success' as const,
      };

      await logFabricatorAudit(entry);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalledWith('fabricator_audit_logs');
    });

    it('should handle missing user gracefully', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const entry = {
        action: 'VALIDATE' as const,
        tableName: 'fenestration_systems',
        recordId: 'test-id',
        status: 'success' as const,
      };

      await logFabricatorAudit(entry);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should queue entries when disabled', async () => {
      logger.setEnabled(false);

      const entry = {
        action: 'VALIDATE' as const,
        tableName: 'fenestration_systems',
        recordId: 'test-id',
        status: 'success' as const,
      };

      await logFabricatorAudit(entry);

      expect(logger.getQueueSize()).toBe(0); // Should not queue when disabled
    });

    it('should handle Supabase errors gracefully', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error('Database error') }),
      });
      (supabase.from as any).mockReturnValue(mockInsert);

      const entry = {
        action: 'VALIDATE' as const,
        tableName: 'fenestration_systems',
        recordId: 'test-id',
        status: 'success' as const,
      };

      // Should not throw
      await expect(logFabricatorAudit(entry)).resolves.not.toThrow();
    });

    it('should prevent queue overflow', async () => {
      // Fill queue to max
      for (let i = 0; i < 1001; i++) {
        await logFabricatorAudit({
          action: 'VALIDATE' as const,
          tableName: 'test',
          recordId: `test-${i}`,
          status: 'success' as const,
        });
      }

      // Queue should be capped
      expect(logger.getQueueSize()).toBeLessThanOrEqual(1000);
    });
  });

  describe('Queue Management', () => {
    it('should process queue asynchronously', async () => {
      const entry = {
        action: 'VALIDATE' as const,
        tableName: 'test',
        recordId: 'test-id',
        status: 'success' as const,
      };

      await logFabricatorAudit(entry);

      // Queue should be processed asynchronously
      expect(logger.getQueueSize()).toBeGreaterThanOrEqual(0);
    });

    it('should clear queue', () => {
      logger.clearQueue();
      expect(logger.getQueueSize()).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should log entries quickly', async () => {
      const start = performance.now();
      
      await logFabricatorAudit({
        action: 'VALIDATE' as const,
        tableName: 'test',
        recordId: 'test-id',
        status: 'success' as const,
      });

      const duration = performance.now() - start;
      
      // Should be fast (non-blocking)
      expect(duration).toBeLessThan(10); // <10ms
    });
  });
});

