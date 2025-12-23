/**
 * Dual-Output Performance Benchmarking Suite
 * 
 * Comprehensive performance testing for the dual-output engine.
 * Tests simple windows, complex patterns, multiple windows, cache performance, and memory usage.
 * 
 * Usage: npx ts-node scripts/benchmark-dual-output.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 2 - Day 8)
 */

import * as fs from 'fs';
import * as path from 'path';
import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '../src/data/egyptian-window-patterns';
import { DualOutputGenerator } from '../src/lib/fabricator/DualOutputGenerator';
import { PerformanceOptimizer } from '../src/lib/fabricator/performanceOptimizer';
import type { WindowUnit } from '../src/types/fabricator';

interface BenchmarkResult {
  testName: string;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: number;
  successRate: number;
  status: 'pass' | 'fail' | 'warning';
}

export class DualOutputBenchmark {
  private generator: DualOutputGenerator;
  private testPatterns: EgyptianPattern[];
  
  constructor() {
    this.generator = new DualOutputGenerator();
    this.testPatterns = this.selectTestPatterns();
  }
  
  async runAllBenchmarks(): Promise<void> {
    console.log('=== DUAL-OUTPUT BENCHMARK SUITE ===\n');
    
    const results: BenchmarkResult[] = [];
    
    // 1. Simple window benchmark
    results.push(await this.benchmarkSimpleWindow());
    
    // 2. Complex pattern benchmark
    results.push(await this.benchmarkComplexPattern());
    
    // 3. Multiple windows benchmark
    results.push(await this.benchmarkMultipleWindows());
    
    // 4. Cache performance benchmark
    results.push(await this.benchmarkCachePerformance());
    
    // 5. Memory usage benchmark
    results.push(await this.benchmarkMemoryUsage());
    
    // Generate report
    this.generateReport(results);
  }
  
  private async benchmarkSimpleWindow(): Promise<BenchmarkResult> {
    const iterations = 10;
    const times: number[] = [];
    let successes = 0;
    
    const windowUnit = {
      id: 'benchmark-simple',
      overallWidth: 1200,
      overallHeight: 1500,
      systemPackId: 'rock60',
      presetId: this.testPatterns[0]?.id,
      presetData: this.testPatterns[0],
      glazing: { thickness: 4 }
    } as WindowUnit;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.generator.generateForWindowUnit(windowUnit);
        const endTime = performance.now();
        times.push(endTime - startTime);
        successes++;
      } catch (error) {
        console.warn(`Iteration ${i + 1} failed:`, error);
      }
      
      // Clear cache between iterations for fair test
      PerformanceOptimizer.cacheClear();
    }
    
    return {
      testName: 'Simple Window (1200×1500)',
      iterations: successes,
      averageTime: this.calculateAverage(times),
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: this.measureMemoryUsage(),
      successRate: (successes / iterations) * 100,
      status: this.evaluatePerformance(times, 300) // Target: <300ms
    };
  }
  
  private async benchmarkComplexPattern(): Promise<BenchmarkResult> {
    const iterations = 5; // Fewer iterations for complex patterns
    const times: number[] = [];
    let successes = 0;
    
    // Find the most complex pattern
    const complexPattern = this.testPatterns.reduce((mostComplex, pattern) => {
      const complexity = pattern.gridSpec.rows * pattern.gridSpec.cols;
      const mostComplexity = mostComplex.gridSpec.rows * mostComplex.gridSpec.cols;
      return complexity > mostComplexity ? pattern : mostComplex;
    });
    
    const windowUnit = {
      id: 'benchmark-complex',
      overallWidth: 3000,
      overallHeight: 2500,
      systemPackId: 'rock60',
      presetId: complexPattern.id,
      presetData: complexPattern,
      glazing: { thickness: 24 } // IGU
    } as WindowUnit;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.generator.generateForWindowUnit(windowUnit);
        const endTime = performance.now();
        times.push(endTime - startTime);
        successes++;
      } catch (error) {
        console.warn(`Iteration ${i + 1} failed:`, error);
      }
      
      PerformanceOptimizer.cacheClear();
    }
    
    return {
      testName: `Complex Pattern (${complexPattern.name})`,
      iterations: successes,
      averageTime: this.calculateAverage(times),
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: this.measureMemoryUsage(),
      successRate: (successes / iterations) * 100,
      status: this.evaluatePerformance(times, 500) // Target: <500ms for complex
    };
  }
  
  private async benchmarkMultipleWindows(): Promise<BenchmarkResult> {
    const iterations = 3;
    const times: number[] = [];
    let successes = 0;
    
    // Create 5 different window units
    const windowUnits = this.testPatterns.slice(0, 5).map((pattern, index) => ({
      id: `benchmark-multi-${index}`,
      overallWidth: 1000 + (index * 500),
      overallHeight: 1500 + (index * 300),
      systemPackId: 'rock60',
      presetId: pattern.id,
      presetData: pattern,
      glazing: { thickness: 4 + (index * 2) }
    } as WindowUnit));
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        // Generate all windows sequentially
        for (const windowUnit of windowUnits) {
          await this.generator.generateForWindowUnit(windowUnit);
        }
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        successes++;
      } catch (error) {
        console.warn(`Iteration ${i + 1} failed:`, error);
      }
      
      PerformanceOptimizer.cacheClear();
    }
    
    return {
      testName: 'Multiple Windows (5 different patterns)',
      iterations: successes,
      averageTime: this.calculateAverage(times),
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: this.measureMemoryUsage(),
      successRate: (successes / iterations) * 100,
      status: this.evaluatePerformance(times, 2000) // Target: <2s for 5 windows
    };
  }
  
  private async benchmarkCachePerformance(): Promise<BenchmarkResult> {
    const iterations = 20;
    const timesWithoutCache: number[] = [];
    const timesWithCache: number[] = [];
    
    const windowUnit = {
      id: 'benchmark-cache',
      overallWidth: 1200,
      overallHeight: 1500,
      systemPackId: 'rock60',
      presetId: this.testPatterns[0]?.id,
      presetData: this.testPatterns[0],
      glazing: { thickness: 4 }
    } as WindowUnit;
    
    // Without cache (clear each time)
    for (let i = 0; i < iterations; i++) {
      PerformanceOptimizer.cacheClear();
      const startTime = performance.now();
      
      try {
        await this.generator.generateForWindowUnit(windowUnit);
        const endTime = performance.now();
        timesWithoutCache.push(endTime - startTime);
      } catch (error) {
        console.warn(`Without cache iteration ${i + 1} failed:`, error);
      }
    }
    
    // With cache (same parameters)
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.generator.generateForWindowUnit(windowUnit);
        const endTime = performance.now();
        timesWithCache.push(endTime - startTime);
      } catch (error) {
        console.warn(`With cache iteration ${i + 1} failed:`, error);
      }
    }
    
    const cacheImprovement = (
      (this.calculateAverage(timesWithoutCache) - this.calculateAverage(timesWithCache)) /
      this.calculateAverage(timesWithoutCache) * 100
    );
    
    return {
      testName: 'Cache Performance',
      iterations,
      averageTime: this.calculateAverage(timesWithCache),
      minTime: Math.min(...timesWithCache),
      maxTime: Math.max(...timesWithCache),
      memoryUsage: this.measureMemoryUsage(),
      successRate: 100,
      status: cacheImprovement > 50 ? 'pass' : 'warning'
    };
  }
  
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult> {
    const iterations = 50;
    const memoryReadings: number[] = [];
    
    const windowUnits = Array.from({ length: iterations }, (_, i) => ({
      id: `benchmark-memory-${i}`,
      overallWidth: 800 + (i * 50),
      overallHeight: 1200 + (i * 30),
      systemPackId: 'rock60',
      presetId: this.testPatterns[i % this.testPatterns.length]?.id,
      presetData: this.testPatterns[i % this.testPatterns.length],
      glazing: { thickness: 4 }
    } as WindowUnit));
    
    let successes = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Generate without clearing memory
        await this.generator.generateForWindowUnit(windowUnits[i]);
        
        // Measure memory after generation
        if (typeof global !== 'undefined' && (global as any).performance?.memory) {
          const memory = (global as any).performance.memory;
          memoryReadings.push(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
        }
        
        successes++;
      } catch (error) {
        console.warn(`Memory benchmark iteration ${i + 1} failed:`, error);
      }
    }
    
    return {
      testName: 'Memory Usage (50 sequential generations)',
      iterations: successes,
      averageTime: 0, // Not measuring time here
      minTime: 0,
      maxTime: 0,
      memoryUsage: this.calculateAverage(memoryReadings),
      successRate: (successes / iterations) * 100,
      status: this.evaluateMemoryUsage(memoryReadings)
    };
  }
  
  private evaluatePerformance(times: number[], targetMs: number): 'pass' | 'fail' | 'warning' {
    if (times.length === 0) return 'fail';
    
    const average = this.calculateAverage(times);
    
    if (average <= targetMs) {
      return 'pass';
    } else if (average <= targetMs * 1.5) {
      return 'warning';
    } else {
      return 'fail';
    }
  }
  
  private evaluateMemoryUsage(memoryReadings: number[]): 'pass' | 'fail' | 'warning' {
    if (memoryReadings.length === 0) return 'fail';
    
    const averageMB = this.calculateAverage(memoryReadings);
    const targetMB = 50; // 50MB target
    
    if (averageMB <= targetMB) {
      return 'pass';
    } else if (averageMB <= targetMB * 1.5) {
      return 'warning';
    } else {
      return 'fail';
    }
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
  
  private measureMemoryUsage(): number {
    if (typeof global !== 'undefined' && (global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }
  
  private selectTestPatterns(): EgyptianPattern[] {
    // Select a diverse set of patterns for testing
    return EGYPTIAN_PATTERNS.filter((_, index) => index % 3 === 0).slice(0, 10);
  }
  
  private generateReport(results: BenchmarkResult[]): void {
    console.log('=== BENCHMARK RESULTS ===\n');
    
    // Performance targets
    console.log('PERFORMANCE TARGETS:');
    console.log('  Simple window: <300ms');
    console.log('  Complex pattern: <500ms');
    console.log('  5 windows: <2000ms');
    console.log('  Memory: <50MB additional\n');
    
    // Results table
    console.log('RESULTS:');
    console.log('┌─────────────────────────────────┬──────────┬─────────┬─────────┬─────────┬────────────┬────────────┐');
    console.log('│ Test                            │ Iterations │ Avg (ms) │ Min (ms) │ Max (ms) │ Memory (MB) │ Status     │');
    console.log('├─────────────────────────────────┼──────────┼─────────┼─────────┼─────────┼────────────┼────────────┤');
    
    results.forEach(result => {
      const name = result.testName.padEnd(30);
      const iter = result.iterations.toString().padStart(9);
      const avg = result.averageTime.toFixed(0).padStart(7);
      const min = result.minTime.toFixed(0).padStart(7);
      const max = result.maxTime.toFixed(0).padStart(7);
      const mem = result.memoryUsage.toString().padStart(10);
      const status = result.status.padStart(10);
      
      console.log(`│ ${name} │ ${iter} │ ${avg} │ ${min} │ ${max} │ ${mem} │ ${status} │`);
    });
    
    console.log('└─────────────────────────────────┴──────────┴─────────┴─────────┴─────────┴────────────┴────────────┘\n');
    
    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    console.log('SUMMARY:');
    console.log(`  Passed: ${passed}/${results.length}`);
    console.log(`  Warnings: ${warnings}/${results.length}`);
    console.log(`  Failed: ${failed}/${results.length}`);
    
    if (failed === 0 && warnings === 0) {
      console.log('\n✅ ALL TESTS PASSED - READY FOR PRODUCTION');
    } else if (failed === 0) {
      console.log('\n⚠️  SOME WARNINGS - REVIEW RECOMMENDED');
    } else {
      console.log('\n❌ FAILURES DETECTED - FIX BEFORE PRODUCTION');
    }
    
    // Recommendations
    console.log('\nRECOMMENDATIONS:');
    results.forEach(result => {
      if (result.status !== 'pass') {
        console.log(`  • ${result.testName}: ${this.getRecommendation(result)}`);
      }
    });
    
    // Export results
    const report = {
      generatedAt: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      },
      results,
      summary: {
        total: results.length,
        passed,
        warnings,
        failed
      }
    };
    
    const reportPath = path.join(process.cwd(), 'dual-output-benchmark-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Detailed report saved to ${reportPath}`);
  }
  
  private getRecommendation(result: BenchmarkResult): string {
    if (result.testName.includes('Simple Window') && result.averageTime > 300) {
      return 'Optimize geometry generation or add caching';
    }
    
    if (result.testName.includes('Complex Pattern') && result.averageTime > 500) {
      return 'Consider Web Workers for heavy calculations';
    }
    
    if (result.testName.includes('Multiple Windows') && result.averageTime > 2000) {
      return 'Implement batch processing or parallel execution';
    }
    
    if (result.testName.includes('Memory') && result.memoryUsage > 50) {
      return 'Implement memory cleanup or reduce cache size';
    }
    
    if (result.testName.includes('Cache') && result.status !== 'pass') {
      return 'Improve cache key strategy or increase cache size';
    }
    
    return 'Review implementation details';
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  const benchmark = new DualOutputBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

