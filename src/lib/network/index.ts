/**
 * Network Module - Main Export
 * 
 * Network performance optimization utilities for ALMONA workshop environments.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

export {
  BundleAnalyzer,
  type BundleChunk,
  type BundleAnalysisResult,
} from './BundleAnalyzer';

export {
  APIOptimizer,
  getAPIOptimizer,
  requestDeduplicationCache,
  type BatchedRequest,
  type BatchConfig,
  type RetryConfig,
} from './APIOptimizer';

export {
  NetworkPerformanceMonitor,
  getNetworkPerformanceMonitor,
  type NetworkRequestMetric,
  type NetworkPerformanceSummary,
} from './NetworkPerformanceMonitor';
