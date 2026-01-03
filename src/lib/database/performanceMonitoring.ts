// Database performance monitoring and optimization utilities

import { supabase } from '../supabase';

interface QueryPerformanceMetric {
  query: string;
  executionTime: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

interface DatabaseStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  errorRate: number;
  cacheHitRate: number;
}

class DatabasePerformanceMonitor {
  private metrics: QueryPerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep only last 1000 metrics

  // Record query performance
  recordQuery(metric: QueryPerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metric.executionTime > 1000) { // > 1 second
      console.warn(`Slow query detected: ${metric.query} took ${metric.executionTime}ms`);
    }

    // Log errors
    if (!metric.success) {
      console.error(`Query failed: ${metric.query}`, metric.error);
    }
  }

  // Get performance statistics
  getStats(): DatabaseStats {
    const totalQueries = this.metrics.length;
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        errorRate: 0,
        cacheHitRate: 0
      };
    }

    const successfulQueries = this.metrics.filter(m => m.success);
    const failedQueries = this.metrics.filter(m => !m.success);
    const slowQueries = this.metrics.filter(m => m.executionTime > 1000);

    const averageExecutionTime = successfulQueries.reduce(
      (sum, m) => sum + m.executionTime, 0
    ) / successfulQueries.length;

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime),
      slowQueries: slowQueries.length,
      errorRate: (failedQueries.length / totalQueries) * 100,
      cacheHitRate: 0 // Would need cache implementation to calculate
    };
  }

  // Get slow queries for optimization
  getSlowQueries(threshold: number = 1000): QueryPerformanceMetric[] {
    return this.metrics
      .filter(m => m.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();

// Query wrapper with performance monitoring
export function withPerformanceMonitoring<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return queryFn()
    .then(result => {
      const executionTime = performance.now() - startTime;
      
      dbPerformanceMonitor.recordQuery({
        query: queryName,
        executionTime,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      return result;
    })
    .catch(error => {
      const executionTime = performance.now() - startTime;
      
      dbPerformanceMonitor.recordQuery({
        query: queryName,
        executionTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      throw error;
    });
}

// Database connection health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const { data: _data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const responseTime = performance.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Query optimization suggestions
export function getOptimizationSuggestions(stats: DatabaseStats): string[] {
  const suggestions: string[] = [];
  
  if (stats.averageExecutionTime > 500) {
    suggestions.push('Consider adding database indexes for frequently queried columns');
  }
  
  if (stats.slowQueries > 10) {
    suggestions.push('Review and optimize slow queries - consider query restructuring');
  }
  
  if (stats.errorRate > 5) {
    suggestions.push('High error rate detected - check database connection and query syntax');
  }
  
  if (stats.totalQueries > 100 && stats.cacheHitRate < 80) {
    suggestions.push('Consider implementing query result caching');
  }
  
  return suggestions;
}

// Database index recommendations
export const indexRecommendations = {
  machines: [
    'CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category);',
    'CREATE INDEX IF NOT EXISTS idx_machines_featured ON machines(featured);',
    'CREATE INDEX IF NOT EXISTS idx_machines_created_at ON machines(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_machines_search ON machines USING gin(to_tsvector(\'english\', name || \' \' || description));'
  ],
  
  quotes: [
    'CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);',
    'CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);'
  ],
  
  profiles: [
    'CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);',
    'CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name);',
    'CREATE INDEX IF NOT EXISTS idx_profiles_sector ON profiles(sector);'
  ],
  
  orders: [
    'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
    'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);'
  ]
};

// Apply recommended indexes
// NOTE: This requires a server-side RPC function 'exec_sql' to be created in Supabase
// For security reasons, raw SQL execution is not available directly from the client
export async function applyRecommendedIndexes(): Promise<{
  success: boolean;
  applied: string[];
  errors: string[];
}> {
  const applied: string[] = [];
  const errors: string[] = [];
  
  // This function requires a custom RPC function on the Supabase server
  // Example RPC function in Supabase SQL:
  // CREATE OR REPLACE FUNCTION exec_sql(sql text)
  // RETURNS void
  // LANGUAGE plpgsql
  // SECURITY DEFINER
  // AS $$
  // BEGIN
  //   EXECUTE sql;
  // END;
  // $$;
  
  for (const [table, indexes] of Object.entries(indexRecommendations)) {
    for (const indexSQL of indexes) {
      try {
        // Attempt to call RPC function if it exists
        // If the function doesn't exist, this will fail gracefully
        const { error } = await (supabase.rpc as any)('exec_sql', { sql: indexSQL });
        
        if (error) {
          errors.push(`${table}: ${error.message}`);
        } else {
          applied.push(`${table}: ${indexSQL}`);
        }
      } catch (error) {
        errors.push(`${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  return {
    success: errors.length === 0,
    applied,
    errors
  };
}

// Performance monitoring dashboard data
export function getPerformanceDashboardData() {
  const stats = dbPerformanceMonitor.getStats();
  const slowQueries = dbPerformanceMonitor.getSlowQueries();
  const suggestions = getOptimizationSuggestions(stats);
  
  return {
    stats,
    slowQueries: slowQueries.slice(0, 10), // Top 10 slow queries
    suggestions,
    timestamp: new Date().toISOString()
  };
}
