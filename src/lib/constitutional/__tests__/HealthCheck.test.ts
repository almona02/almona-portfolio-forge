
import { describe, expect, it } from 'vitest';
import { HealthMonitor } from '../HealthMonitor';

// Disable mocks for this test to test integration with internal components?
// Or mock everything. PositionStateSyncService has many dependencies.
// Best to test HealthMonitor in isolation and Service's getHealth delegation.

describe('HealthMonitor', () => {
  it('should report HEALTHY when all systems are good', () => {
    const monitor = new HealthMonitor();
    const status = monitor.checkHealth({
        isDegradedMode: false,
        circuitBreakerState: { state: 'CLOSED', failureCount: 0 },
        dlqMetrics: { size: 0, capacity: 1000 },
        activeRateLimitEntities: 0
    });
    
    expect(status.status).toBe('HEALTHY');
    expect(status.subsystems.storage.degradedMode).toBe(false);
  });

  it('should report DEGRADED if degraded mode is active', () => {
    const monitor = new HealthMonitor();
    const status = monitor.checkHealth({
        isDegradedMode: true,
        circuitBreakerState: { state: 'CLOSED', failureCount: 0 },
        dlqMetrics: { size: 0, capacity: 1000 },
        activeRateLimitEntities: 0
    });
    
    expect(status.status).toBe('DEGRADED');
  });

  it('should report DEGRADED if circuit breaker is OPEN', () => {
    const monitor = new HealthMonitor();
    const status = monitor.checkHealth({
        isDegradedMode: false,
        circuitBreakerState: { state: 'OPEN', failureCount: 5 },
        dlqMetrics: { size: 0, capacity: 1000 },
        activeRateLimitEntities: 0
    });
    
    expect(status.status).toBe('DEGRADED');
  });

  it('should report UNHEALTHY if DLQ is full', () => {
    const monitor = new HealthMonitor();
    const status = monitor.checkHealth({
        isDegradedMode: false,
        circuitBreakerState: { state: 'CLOSED', failureCount: 0 },
        dlqMetrics: { size: 950, capacity: 1000 }, // > 90%
        activeRateLimitEntities: 0
    });
    
    expect(status.status).toBe('UNHEALTHY');
  });
});
