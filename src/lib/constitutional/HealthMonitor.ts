
/**
 * Health Monitor
 * 
 * Aggregates health status from various subsystems.
 * @constitutional_compliance AICS-001 §9.3 (System Integrity)
 */
export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  subsystems: {
    storage: { degradedMode: boolean; persistenceErrors: number };
    circuitBreaker: { state: string; failures: number };
    dlq: { size: number; capacity: number };
    rateLimit: { activeEntities: number };
  };
}

export class HealthMonitor {
  checkHealth(data: {
    isDegradedMode: boolean;
    circuitBreakerState: any; // Using simplified type for now
    dlqMetrics: { size: number; capacity: number };
    activeRateLimitEntities: number;
  }): SystemHealth {
    let status: SystemHealth['status'] = 'HEALTHY';
    
    // Determine overall status
    if (data.isDegradedMode || data.circuitBreakerState.state === 'OPEN') {
        status = 'DEGRADED';
    }
    
    if (data.dlqMetrics.size >= data.dlqMetrics.capacity * 0.9) {
        status = 'UNHEALTHY'; // Approaching critical failure
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      subsystems: {
        storage: {
            degradedMode: data.isDegradedMode,
            persistenceErrors: 0 // Placeholder, could be tracked
        },
        circuitBreaker: {
            state: data.circuitBreakerState.state,
            failures: data.circuitBreakerState.failureCount
        },
        dlq: data.dlqMetrics,
        rateLimit: {
            activeEntities: data.activeRateLimitEntities
        }
      }
    };
  }
}
