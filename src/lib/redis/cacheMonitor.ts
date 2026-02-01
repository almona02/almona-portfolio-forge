import 'dotenv/config'; // Load .env file
import redis from './client';

/**
 * Cache Monitoring and Metrics
 * 
 * Tracks cache performance metrics:
 * - Hit rate
 * - Miss rate
 * - Average response time
 * - Cache size
 */
export class CacheMonitor {
  private static metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalResponseTime: 0,
    requestCount: 0,
  };

  /**
   * Record a cache hit
   */
  static recordHit(responseTime: number) {
    this.metrics.hits++;
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;
  }

  /**
   * Record a cache miss
   */
  static recordMiss(responseTime: number) {
    this.metrics.misses++;
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;
  }

  /**
   * Record an error
   */
  static recordError() {
    this.metrics.errors++;
  }

  /**
   * Get current metrics
   */
  static getMetrics() {
    const hitRate = this.metrics.requestCount > 0
      ? (this.metrics.hits / this.metrics.requestCount) * 100
      : 0;

    const missRate = this.metrics.requestCount > 0
      ? (this.metrics.misses / this.metrics.requestCount) * 100
      : 0;

    const avgResponseTime = this.metrics.requestCount > 0
      ? this.metrics.totalResponseTime / this.metrics.requestCount
      : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      requestCount: this.metrics.requestCount,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  }

  /**
   * Get Redis server info
   */
  static async getRedisInfo() {
    try {
      const info = await redis.info('stats');
      const lines = info.split('\r\n');
      const stats: Record<string, string> = {};

      lines.forEach((line) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key] = value;
          }
        }
      });

      return {
        totalConnectionsReceived: stats.total_connections_received || '0',
        totalCommandsProcessed: stats.total_commands_processed || '0',
        instantaneousOpsPerSec: stats.instantaneous_ops_per_sec || '0',
        totalNetInputBytes: stats.total_net_input_bytes || '0',
        totalNetOutputBytes: stats.total_net_output_bytes || '0',
        rejectedConnections: stats.rejected_connections || '0',
        expiredKeys: stats.expired_keys || '0',
        evictedKeys: stats.evicted_keys || '0',
        keyspaceHits: stats.keyspace_hits || '0',
        keyspaceMisses: stats.keyspace_misses || '0',
      };
    } catch (error) {
      console.error('[CacheMonitor] Failed to get Redis info:', error);
      return null;
    }
  }

  /**
   * Get cache size by namespace
   */
  static async getCacheSizeByNamespace() {
    try {
      const namespaces = ['aftersales', 'fabricator', 'realityos', 'shared'];
      const sizes: Record<string, number> = {};

      for (const namespace of namespaces) {
        const keys = await redis.keys(`${namespace}:*`);
        sizes[namespace] = keys.length;
      }

      return sizes;
    } catch (error) {
      console.error('[CacheMonitor] Failed to get cache sizes:', error);
      return null;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  static async getDashboardData() {
    const metrics = this.getMetrics();
    const redisInfo = await this.getRedisInfo();
    const cacheSizes = await this.getCacheSizeByNamespace();

    return {
      applicationMetrics: metrics,
      redisServerStats: redisInfo,
      cacheSizesByNamespace: cacheSizes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalResponseTime: 0,
      requestCount: 0,
    };
  }

  /**
   * Log metrics to console
   */
  static logMetrics() {
    const metrics = this.getMetrics();
    console.log('📊 Cache Metrics:');
    console.log(`  Requests: ${metrics.requestCount}`);
    console.log(`  Hits: ${metrics.hits} (${metrics.hitRate}%)`);
    console.log(`  Misses: ${metrics.misses} (${metrics.missRate}%)`);
    console.log(`  Errors: ${metrics.errors}`);
    console.log(`  Avg Response Time: ${metrics.avgResponseTime}ms`);
  }
}

// Export a helper to wrap cache operations with monitoring
export function withMonitoring<T>(
  operation: () => Promise<T>,
  isCacheHit: boolean
): Promise<T> {
  const startTime = performance.now();

  return operation()
    .then((result) => {
      const responseTime = performance.now() - startTime;
      if (isCacheHit) {
        CacheMonitor.recordHit(responseTime);
      } else {
        CacheMonitor.recordMiss(responseTime);
      }
      return result;
    })
    .catch((error) => {
      CacheMonitor.recordError();
      throw error;
    });
}
