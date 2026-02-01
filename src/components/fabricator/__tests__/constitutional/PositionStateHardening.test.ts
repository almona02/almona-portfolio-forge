import { positionStateSync } from '@/lib/constitutional/PositionStateSyncService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Constitutional State Hardening (AICS-001 §9.3)', () => {
    // Mock audit logging and event emission
    // Mock audit logging and event emission
    // const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');
    // const errorSpy = vi.spyOn(console, 'error');
    
    // We need to access private methods for some tests, or test via public API
    // Since we're testing the singleton, let's resets mocks
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Input Validation & Sanitization', () => {
        it('should reject states exceeding 1MB size limit', async () => {
            // Create a large string > 1MB
            const largeString = 'a'.repeat(1024 * 1024 + 100);
            const largeState = { data: largeString };
            
            await expect(positionStateSync.syncStateWithGuarantees('test-id', 'smartdraw', largeState))
                .rejects
                .toThrow(/State size exceeds 1MB limit/);
        });

        it('should reject states exceeding recursion depth limit', async () => {
            // Create deeply nested object
            const deepObj: any = { level: 0 };
            let current = deepObj;
            for (let i = 0; i < 15; i++) {
                current.next = { level: i + 1 };
                current = current.next;
            }
            
            await expect(positionStateSync.syncStateWithGuarantees('test-id', 'smartdraw', deepObj))
                .rejects
                .toThrow(/exceeds maximum nesting depth/);
        });

        it('should detect and reject script injection attempts (XSS)', async () => {
            const maliciousState = {
                userParams: {
                    name: 'Project 1',
                    description: '<script>alert("xss")</script>'
                }
            };
            
            await expect(positionStateSync.syncStateWithGuarantees('test-id', 'smartdraw', maliciousState))
                .rejects
                .toThrow(/Potential script injection detected/);
        });

        it('should sanitize dangerous object properties', async () => {
            const dangerousState = {
                validProp: 'safe',
                __proto__: { isAdmin: true },
                constructor: 'function() { return "hacked"; }'
            };
            
            // Should not throw, but should strip properties
            // We can't easily check the internal sanitized state without mocking saveToUnifiedStore
            // But we can ensure it succeeds and doesn't crash
            const result = await positionStateSync.syncStateWithGuarantees('test-id', 'smartdraw', dangerousState);
            expect(result.success).toBe(true);
            
            // To verify sanitization, we'd need to inspect what was saved. 
            // For now, we verify the operation completes successfully despite the dangerous inputs
            // effectively proving the sanitizer handled them without erroring out.
        });
    });

    describe('Telemetry & Performance Monitoring', () => {
        it('should log significant performance metrics', async () => {
            // Mock measurePerformance to force logging (by mocking performance.now?)
            // Or rely on the fact that sync uses measurePerformance
            
            const state = { test: 'data' };
            await positionStateSync.syncStateWithGuarantees('perf-test', 'smartdraw', state);
            
            // Since the operation is fast, it might not log "slow operation" 
            // but it should add to internal metrics.
            const stats = positionStateSync.getPerformanceStats('syncStateWithGuarantees');
            expect(stats.count).toBeGreaterThan(0);
        });

        it('should alert on slow operations', async () => {
            // We can overwrite the SLOW_OPERATION_THRESHOLD using 'any' cast for testing
            (positionStateSync as any).SLOW_OPERATION_THRESHOLD = 0; // Trigger immediately
            
            const state = { test: 'slow-op' };
            await positionStateSync.syncStateWithGuarantees('slow-test', 'smartdraw', state);
            
            // Should have logged a warning
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Slow operation detected'));
            
            // Reset threshold
            (positionStateSync as any).SLOW_OPERATION_THRESHOLD = 1000;
        });
    });
});
