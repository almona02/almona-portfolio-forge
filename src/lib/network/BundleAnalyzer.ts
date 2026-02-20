/**
 * Bundle Analyzer
 * 
 * Analyzes bundle sizes and provides optimization recommendations.
 * Works with Vite build output to identify large chunks and optimization opportunities.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Bundle chunk information
 */
export interface BundleChunk {
  name: string;
  size: number; // bytes
  gzipSize?: number; // bytes (if available)
  format: string; // 'es' | 'cjs' | 'umd'
  isEntry: boolean;
  isDynamicImport: boolean;
  modules?: string[]; // Module paths
}

/**
 * Bundle analysis result
 */
export interface BundleAnalysisResult {
  totalSize: number;
  totalGzipSize?: number;
  chunks: BundleChunk[];
  recommendations: string[];
  treeShakingOpportunities: string[];
  codeSplittingOpportunities: string[];
}

/**
 * Bundle Analyzer
 * 
 * Analyzes Vite build output for optimization opportunities.
 */
export class BundleAnalyzer {
  /**
   * Analyze bundle sizes from build manifest
   * 
   * Note: This is a client-side utility. For full analysis, use build-time tools.
   */
  static analyzeFromManifest(manifest: Record<string, any>): BundleAnalysisResult {
    const chunks: BundleChunk[] = [];
    let totalSize = 0;
    let totalGzipSize = 0;
    const recommendations: string[] = [];
    const treeShakingOpportunities: string[] = [];
    const codeSplittingOpportunities: string[] = [];

    // Analyze each chunk in manifest
    Object.entries(manifest).forEach(([fileName, chunkData]: [string, any]) => {
      if (fileName.endsWith('.js')) {
        const size = chunkData.size || 0;
        const gzipSize = chunkData.gzipSize || 0;
        totalSize += size;
        totalGzipSize += gzipSize;

        const chunk: BundleChunk = {
          name: fileName,
          size,
          gzipSize,
          format: 'es',
          isEntry: chunkData.isEntry || false,
          isDynamicImport: chunkData.isDynamicEntry || false,
          modules: chunkData.modules ? Object.keys(chunkData.modules) : undefined,
        };

        chunks.push(chunk);

        // Identify large chunks (>500KB)
        if (size > 500 * 1024) {
          recommendations.push(
            `Large chunk detected: ${fileName} (${(size / 1024).toFixed(2)}KB). ` +
            `Consider code splitting or lazy loading.`
          );
        }

        // Identify entry chunks that could be split
        if (chunk.isEntry && size > 200 * 1024) {
          codeSplittingOpportunities.push(
            `Entry chunk ${fileName} is ${(size / 1024).toFixed(2)}KB. ` +
            `Consider splitting into smaller chunks.`
          );
        }
      }
    });

    // Sort chunks by size (largest first)
    chunks.sort((a, b) => b.size - a.size);

    // Check total bundle size
    const totalMB = totalSize / 1024 / 1024;
    if (totalMB > 5) {
      recommendations.push(
        `Total bundle size is ${totalMB.toFixed(2)}MB. ` +
        `Target: <3MB for 3G/4G networks. Consider aggressive code splitting.`
      );
    }

    return {
      totalSize,
      totalGzipSize,
      chunks,
      recommendations,
      treeShakingOpportunities,
      codeSplittingOpportunities,
    };
  }

  /**
   * Get current bundle size estimate (runtime)
   * 
   * Estimates bundle size by checking script tags in DOM.
   */
  static analyzeCurrentBundle(): BundleAnalysisResult {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const chunks: BundleChunk[] = [];
    const totalSize = 0;

    scripts.forEach((script, index) => {
      const src = script.src;
      const name = src.split('/').pop() || `script-${index}`;
      
      // Estimate size from file name (if hash is present, we can't get exact size)
      // In production, use build manifest instead
      chunks.push({
        name,
        size: 0, // Cannot determine without fetch
        format: 'es',
        isEntry: script.defer === false && script.async === false,
        isDynamicImport: script.type === 'module',
      });
    });

    return {
      totalSize,
      chunks,
      recommendations: [
        'Use build-time bundle analysis for accurate sizes.',
        'Run `npm run build:analyze` to generate detailed report.',
      ],
      treeShakingOpportunities: [],
      codeSplittingOpportunities: [],
    };
  }

  /**
   * Generate optimization recommendations
   */
  static generateRecommendations(result: BundleAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Check for large vendor chunks
    const vendorChunks = result.chunks.filter(c => 
      c.name.includes('vendor') || c.name.includes('node_modules')
    );
    const largeVendorChunks = vendorChunks.filter(c => c.size > 300 * 1024);
    
    if (largeVendorChunks.length > 0) {
      recommendations.push(
        `Large vendor chunks detected. Consider splitting: ` +
        largeVendorChunks.map(c => c.name).join(', ')
      );
    }

    // Check for duplicate dependencies
    const moduleCounts: Record<string, number> = {};
    result.chunks.forEach(chunk => {
      chunk.modules?.forEach(module => {
        moduleCounts[module] = (moduleCounts[module] || 0) + 1;
      });
    });

    const duplicates = Object.entries(moduleCounts)
      .filter(([_, count]) => count > 1)
      .map(([module]) => module);

    if (duplicates.length > 0) {
      recommendations.push(
        `Duplicate modules detected in multiple chunks. Consider deduplication: ` +
        duplicates.slice(0, 5).join(', ')
      );
    }

    return [...result.recommendations, ...recommendations];
  }
}
