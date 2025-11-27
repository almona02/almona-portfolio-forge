/**
 * ExportService - Main orchestrator for all export formats
 * Phase 2: Professional Report Generation System
 * Week 3: Enterprise Automation & Customization
 * 
 * Handles format routing, progress tracking, and batch operations
 * Enhanced with queue management, priority processing, memory optimization,
 * resume capability, scheduling, and performance analytics
 */

import { 
  ExportFormat, 
  ExportOptions, 
  ExportResult, 
  ExportProgress, 
  ExportProgressCallback, 
  BatchExportConfig, 
  BatchExportResult,
  AdvancedBatchExportConfig,
  AdvancedBatchExportResult,
  ExportQueueItem,
  ExportPriority,
  BatchCheckpoint,
  ResourceAllocation,
  ExportTemplate
} from './types';
import { WindowUnit, OptimizationResult } from '@/types/fabricator';
import { PDFExportGenerator } from './PDFExportGenerator';
import { CSVExportGenerator } from './CSVExportGenerator';
import { DXFExportGenerator } from './DXFExportGenerator';
import { templateManager } from './TemplateManager';

/**
 * Main export service class
 * Orchestrates all export operations and provides unified interface
 * Week 3: Enhanced with enterprise batch processing capabilities
 */
export class ExportService {
  private progressCallbacks: Map<string, ExportProgressCallback> = new Map();
  private exportQueue: Map<string, ExportQueueItem> = new Map();
  private activeExports: Map<string, Promise<ExportResult>> = new Map();
  private batchCheckpoints: Map<string, BatchCheckpoint> = new Map();
  private performanceMetrics: Map<string, {
    startTime: number;
    endTime?: number;
    fileSize: number;
    memoryUsage?: number;
  }> = new Map();
  
  // Resource management
  private maxConcurrent: number = 3;
  private memoryLimit: number = 500; // MB
  private currentMemoryUsage: number = 0;
  
  // Priority weights for queue sorting
  private readonly priorityWeights: Record<ExportPriority, number> = {
    urgent: 100,
    standard: 50,
    low: 10,
    scheduled: 5
  };

  /**
   * Export a single project to specified format
   */
  async exportProject(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.reportProgress(exportId, {
        stage: 'initializing',
        percentage: 0,
        message: `Initializing ${format.toUpperCase()} export...`,
        format,
      });

      let result: ExportResult;

      switch (format) {
        case 'pdf':
          this.reportProgress(exportId, {
            stage: 'processing',
            percentage: 20,
            message: 'Generating PDF report...',
            format,
          });
          result = await this.exportToPDF(project, optimization, options);
          break;

        case 'csv':
          this.reportProgress(exportId, {
            stage: 'processing',
            percentage: 20,
            message: 'Generating CSV file...',
            format,
          });
          result = await this.exportToCSV(project, optimization, options);
          break;

        case 'dxf':
          this.reportProgress(exportId, {
            stage: 'processing',
            percentage: 20,
            message: 'Generating DXF file...',
            format,
          });
          result = await this.exportToDXF(project, optimization, options);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.reportProgress(exportId, {
        stage: 'completed',
        percentage: 100,
        message: 'Export completed successfully',
        format,
      });

      return result;
    } catch (error) {
      this.reportProgress(exportId, {
        stage: 'error',
        percentage: 0,
        message: error instanceof Error ? error.message : 'Export failed',
      });

      return {
        success: false,
        format,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    } finally {
      // Clean up progress callback
      this.progressCallbacks.delete(exportId);
    }
  }

  /**
   * Export multiple projects in batch (basic version)
   */
  async exportBatch(config: BatchExportConfig): Promise<BatchExportResult> {
    return this.exportBatchAdvanced({
      ...config,
      priority: 'standard',
      maxConcurrent: 1
    });
  }

  /**
   * Advanced batch export with enterprise features
   * Week 3: Queue management, priority processing, memory optimization, resume capability
   */
  async exportBatchAdvanced(config: AdvancedBatchExportConfig): Promise<AdvancedBatchExportResult> {
    const startTime = performance.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const {
      projects,
      format,
      options,
      onProgress,
      priority = 'standard',
      groupBy = 'none',
      maxConcurrent = this.maxConcurrent,
      memoryLimit = this.memoryLimit,
      resumeFromCheckpoint = false,
      scheduledAt,
      templateId,
      qualityCheck = false,
      validation = false
    } = config;

    // Check for scheduled execution
    if (scheduledAt && scheduledAt > new Date()) {
      // Add to scheduled queue
      this.scheduleBatchExport(batchId, config, scheduledAt);
      throw new Error(`Batch export scheduled for ${scheduledAt.toISOString()}`);
    }

    // Check for resume from checkpoint
    let checkpoint: BatchCheckpoint | undefined;
    if (resumeFromCheckpoint) {
      checkpoint = this.batchCheckpoints.get(batchId);
      if (!checkpoint) {
        throw new Error(`No checkpoint found for batch ${batchId}`);
      }
    }

    // Group projects if needed
    const groupedProjects = this.groupProjects(projects, groupBy);

    // Apply template if provided
    const finalOptions = templateId 
      ? await this.applyTemplate(templateId, options)
      : options;

    // Initialize results from checkpoint or empty
    const results: ExportResult[] = checkpoint?.results || [];
    const errors: string[] = [];
    let successCount = checkpoint?.completedItems || 0;
    let failedCount = checkpoint?.failedItems || 0;
    const processedCount = results.length;
    const totalCount = projects.length;

    // Calculate starting index for resume
    const startIndex = processedCount;

    // Process projects with concurrency control
    const processingPromises: Promise<void>[] = [];
    let currentIndex = startIndex;
    let activeCount = 0;

    // Memory monitoring
    const memoryMonitor = this.startMemoryMonitoring();

    while (currentIndex < totalCount || activeCount > 0) {
      // Start new exports up to maxConcurrent
      while (activeCount < maxConcurrent && currentIndex < totalCount) {
        const project = projects[currentIndex];
        const index = currentIndex;
        currentIndex++;

        const exportPromise = this.processExportWithMemoryManagement(
          project,
          project.optimization,
          format,
          finalOptions,
          index,
          totalCount,
          batchId,
          memoryLimit,
          qualityCheck,
          validation
        ).then((result) => {
          results.push(result);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            if (result.error) {
              errors.push(`Project ${project.orderNumber}: ${result.error}`);
            }
          }
          activeCount--;

          // Update progress
          if (onProgress) {
            onProgress({
              stage: 'processing',
              percentage: Math.round((results.length / totalCount) * 100),
              message: `Exporting project ${results.length} of ${totalCount}...`,
              currentItem: results.length,
              totalItems: totalCount,
            });
          }

          // Create checkpoint periodically
          if (results.length % 10 === 0) {
            this.createCheckpoint(batchId, {
              batchId,
              completedItems: successCount,
              failedItems: failedCount,
              results: [...results],
              timestamp: new Date(),
              metadata: {
                format,
                groupBy,
                priority
              }
            });
          }
        }).catch((error) => {
          failedCount++;
          activeCount--;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Project ${project.orderNumber}: ${errorMessage}`);
          results.push({
            success: false,
            format,
            error: errorMessage,
          });
        });

        processingPromises.push(exportPromise);
        activeCount++;
      }

      // Wait for at least one to complete before starting more
      if (activeCount >= maxConcurrent) {
        await Promise.race(processingPromises);
        processingPromises.splice(
          processingPromises.findIndex(p => p === Promise.race(processingPromises)),
          1
        );
      }
    }

    // Wait for all remaining exports
    await Promise.all(processingPromises);

    // Stop memory monitoring
    if (memoryMonitor) {
      clearInterval(memoryMonitor);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Calculate performance metrics
    const totalFileSize = results
      .filter(r => r.success && r.metadata?.fileSize)
      .reduce((sum, r) => sum + (r.metadata?.fileSize || 0), 0);
    const averageFileSize = results.length > 0 ? totalFileSize / results.length : 0;
    const filesPerMinute = (results.length / duration) * 60000;
    const mbPerSecond = (totalFileSize / 1024 / 1024) / (duration / 1000);

    if (onProgress) {
      onProgress({
        stage: 'completed',
        percentage: 100,
        message: `Batch export completed: ${successCount} succeeded, ${failedCount} failed`,
        currentItem: totalCount,
        totalItems: totalCount,
      });
    }

    // Final checkpoint
    const finalCheckpoint: BatchCheckpoint = {
      batchId,
      completedItems: successCount,
      failedItems: failedCount,
      results,
      timestamp: new Date(),
      metadata: {
        format,
        groupBy,
        priority,
        duration,
        performance: {
          filesPerMinute,
          mbPerSecond
        }
      }
    };
    this.batchCheckpoints.set(batchId, finalCheckpoint);

    return {
      success: failedCount === 0,
      results,
      totalCount,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration,
      averageFileSize,
      totalFileSize,
      performanceMetrics: {
        filesPerMinute,
        mbPerSecond,
        peakMemoryUsage: this.currentMemoryUsage,
        averageProcessingTime: duration / results.length
      },
      checkpoint: finalCheckpoint
    };
  }

  /**
   * Register progress callback for an export operation
   */
  onProgress(exportId: string, callback: ExportProgressCallback): void {
    this.progressCallbacks.set(exportId, callback);
  }

  /**
   * Report progress for an export operation
   */
  private reportProgress(exportId: string, progress: ExportProgress): void {
    const callback = this.progressCallbacks.get(exportId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    options: ExportOptions
  ): Promise<ExportResult> {
    const generator = new PDFExportGenerator();
    const blob = await generator.generate(project, optimization, options);

    const filename = this.generateFilename(project, 'pdf');
    
    return {
      success: true,
      format: 'pdf',
      blob,
      filename,
      metadata: {
        generatedAt: new Date(),
        projectId: project.id,
        orderNumber: project.orderNumber,
        format: 'pdf',
        fileSize: blob.size,
      },
    };
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    options: ExportOptions
  ): Promise<ExportResult> {
    const generator = new CSVExportGenerator();
    const blob = await generator.generate(project, optimization, options);

    const filename = this.generateFilename(project, 'csv');
    
    return {
      success: true,
      format: 'csv',
      blob,
      filename,
      metadata: {
        generatedAt: new Date(),
        projectId: project.id,
        orderNumber: project.orderNumber,
        format: 'csv',
        fileSize: blob.size,
      },
    };
  }

  /**
   * Export to DXF format
   */
  private async exportToDXF(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    options: ExportOptions
  ): Promise<ExportResult> {
    const generator = new DXFExportGenerator();
    const blob = await generator.generate(project, optimization, options);

    const filename = this.generateFilename(project, 'dxf');
    
    return {
      success: true,
      format: 'dxf',
      blob,
      filename,
      metadata: {
        generatedAt: new Date(),
        projectId: project.id,
        orderNumber: project.orderNumber,
        format: 'dxf',
        fileSize: blob.size,
      },
    };
  }

  /**
   * Generate filename for export
   */
  private generateFilename(project: WindowUnit, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const orderNumber = project.orderNumber || 'project';
    return `${orderNumber}_${timestamp}.${format}`;
  }

  /**
   * Download export result
   */
  download(result: ExportResult): void {
    if (!result.success || !result.blob || !result.filename) {
      throw new Error('Cannot download: export was not successful or missing data');
    }

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Queue management methods
   */
  
  /**
   * Add export to queue
   */
  queueExport(item: Omit<ExportQueueItem, 'id' | 'createdAt' | 'status'>): string {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: ExportQueueItem = {
      id,
      ...item,
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0
    };
    
    this.exportQueue.set(id, queueItem);
    this.processQueue();
    
    return id;
  }

  /**
   * Process export queue with priority
   */
  private async processQueue(): Promise<void> {
    const pendingItems = Array.from(this.exportQueue.values())
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        // Sort by priority
        const priorityDiff = this.priorityWeights[b.priority] - this.priorityWeights[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by creation time
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    // Process up to maxConcurrent items
    const activeItems = Array.from(this.activeExports.keys());
    const availableSlots = this.maxConcurrent - activeItems.length;

    for (let i = 0; i < Math.min(availableSlots, pendingItems.length); i++) {
      const item = pendingItems[i];
      this.processQueueItem(item);
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: ExportQueueItem): Promise<void> {
    item.status = 'processing';
    
    const exportPromise = this.exportProject(
      item.project,
      item.optimization,
      item.format,
      item.options
    ).then((result) => {
      item.result = result;
      item.status = result.success ? 'completed' : 'failed';
      item.error = result.error;
      this.activeExports.delete(item.id);
      this.processQueue(); // Process next in queue
    }).catch((error) => {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      item.retryCount = (item.retryCount || 0) + 1;
      this.activeExports.delete(item.id);
      this.processQueue();
    });

    this.activeExports.set(item.id, exportPromise);
  }

  /**
   * Pause export
   */
  pauseExport(exportId: string): boolean {
    const item = this.exportQueue.get(exportId);
    if (item && item.status === 'processing') {
      item.status = 'paused';
      this.activeExports.delete(exportId);
      return true;
    }
    return false;
  }

  /**
   * Resume export
   */
  resumeExport(exportId: string): boolean {
    const item = this.exportQueue.get(exportId);
    if (item && item.status === 'paused') {
      item.status = 'pending';
      this.processQueue();
      return true;
    }
    return false;
  }

  /**
   * Cancel export
   */
  cancelExport(exportId: string): boolean {
    const item = this.exportQueue.get(exportId);
    if (item) {
      item.status = 'failed';
      item.error = 'Cancelled by user';
      this.activeExports.delete(exportId);
      return true;
    }
    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    paused: number;
    completed: number;
    failed: number;
  } {
    const items = Array.from(this.exportQueue.values());
    return {
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      paused: items.filter(i => i.status === 'paused').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length
    };
  }

  /**
   * Get export by ID
   */
  getExport(exportId: string): ExportQueueItem | undefined {
    return this.exportQueue.get(exportId);
  }

  /**
   * Group projects by criteria
   */
  private groupProjects(projects: WindowUnit[], groupBy: 'client' | 'jobSite' | 'type' | 'none'): WindowUnit[][] {
    if (groupBy === 'none') {
      return [projects];
    }

    const groups = new Map<string, WindowUnit[]>();
    
    projects.forEach(project => {
      let key: string;
      switch (groupBy) {
        case 'client':
          key = project.clientId || 'unknown';
          break;
        case 'jobSite':
          key = project.jobSite || 'unknown';
          break;
        case 'type':
          key = project.type || 'unknown';
          break;
        default:
          key = 'default';
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(project);
    });

    return Array.from(groups.values());
  }

  /**
   * Process export with memory management
   */
  private async processExportWithMemoryManagement(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    format: ExportFormat,
    options: ExportOptions,
    index: number,
    total: number,
    batchId: string,
    memoryLimit: number,
    qualityCheck: boolean,
    validation: boolean
  ): Promise<ExportResult> {
    // Check memory before processing
    await this.waitForMemoryAvailability(memoryLimit);

    const startTime = performance.now();
    const result = await this.exportProject(project, optimization, format, options);
    const endTime = performance.now();

    // Track performance
    this.performanceMetrics.set(`${batchId}_${index}`, {
      startTime,
      endTime,
      fileSize: result.metadata?.fileSize || 0
    });

    // Quality check
    if (qualityCheck && result.success) {
      const qualityResult = this.performQualityCheck(result);
      if (!qualityResult.passed) {
        result.success = false;
        result.error = `Quality check failed: ${qualityResult.reason}`;
      }
    }

    // Validation
    if (validation && result.success) {
      const validationResult = this.validateExport(result, project);
      if (!validationResult.valid) {
        result.success = false;
        result.error = `Validation failed: ${validationResult.reason}`;
      }
    }

    // Update memory usage
    if (result.metadata?.fileSize) {
      this.currentMemoryUsage += result.metadata.fileSize / 1024 / 1024; // Convert to MB
    }

    return result;
  }

  /**
   * Wait for memory availability
   */
  private async waitForMemoryAvailability(limit: number): Promise<void> {
    while (this.currentMemoryUsage >= limit) {
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 100));
      // Clean up old metrics to free memory tracking
      this.cleanupOldMetrics();
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): NodeJS.Timeout | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    return setInterval(() => {
      // Monitor memory if available (Chrome only)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        this.currentMemoryUsage = Math.max(this.currentMemoryUsage, usedMB);
      }
    }, 1000);
  }

  /**
   * Clean up old performance metrics
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, metric] of this.performanceMetrics.entries()) {
      if (metric.endTime && (now - metric.endTime) > maxAge) {
        this.performanceMetrics.delete(key);
        if (metric.fileSize) {
          this.currentMemoryUsage = Math.max(0, this.currentMemoryUsage - (metric.fileSize / 1024 / 1024));
        }
      }
    }
  }

  /**
   * Create checkpoint for batch export
   */
  private createCheckpoint(batchId: string, checkpoint: BatchCheckpoint): void {
    this.batchCheckpoints.set(batchId, checkpoint);
    // Store in localStorage for persistence
    try {
      localStorage.setItem(`export_checkpoint_${batchId}`, JSON.stringify(checkpoint));
    } catch (error) {
      console.warn('Failed to save checkpoint to localStorage:', error);
    }
  }

  /**
   * Load checkpoint from storage
   */
  loadCheckpoint(batchId: string): BatchCheckpoint | undefined {
    // Try memory first
    const memoryCheckpoint = this.batchCheckpoints.get(batchId);
    if (memoryCheckpoint) return memoryCheckpoint;

    // Try localStorage
    try {
      const stored = localStorage.getItem(`export_checkpoint_${batchId}`);
      if (stored) {
        const checkpoint = JSON.parse(stored) as BatchCheckpoint;
        this.batchCheckpoints.set(batchId, checkpoint);
        return checkpoint;
      }
    } catch (error) {
      console.warn('Failed to load checkpoint from localStorage:', error);
    }

    return undefined;
  }

  /**
   * Schedule batch export
   */
  private scheduleBatchExport(
    batchId: string,
    config: AdvancedBatchExportConfig,
    scheduledAt: Date
  ): void {
    // Store scheduled export
    try {
      const scheduled = {
        batchId,
        config,
        scheduledAt: scheduledAt.toISOString()
      };
      localStorage.setItem(`scheduled_export_${batchId}`, JSON.stringify(scheduled));
      
      // Set timeout to execute (simplified - in production, use a proper scheduler)
      const delay = scheduledAt.getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Max 24 hours
        setTimeout(() => {
          this.exportBatchAdvanced(config);
        }, delay);
      }
    } catch (error) {
      console.warn('Failed to schedule export:', error);
    }
  }

  /**
   * Apply template to export options
   */
  private async applyTemplate(templateId: string, baseOptions: ExportOptions): Promise<ExportOptions> {
    const result = templateManager.applyTemplate(templateId, baseOptions);
    if (result.success) {
      return result.appliedOptions;
    }
    // Fallback to base options if template application fails
    return baseOptions;
  }

  /**
   * Perform quality check on export
   */
  private performQualityCheck(result: ExportResult): { passed: boolean; reason?: string } {
    if (!result.success) {
      return { passed: false, reason: 'Export failed' };
    }

    if (!result.blob || result.blob.size === 0) {
      return { passed: false, reason: 'Empty file' };
    }

    if (result.metadata?.fileSize && result.metadata.fileSize < 100) {
      return { passed: false, reason: 'File too small' };
    }

    return { passed: true };
  }

  /**
   * Validate export against project data
   */
  private validateExport(result: ExportResult, project: WindowUnit): { valid: boolean; reason?: string } {
    if (!result.success) {
      return { valid: false, reason: 'Export failed' };
    }

    if (result.metadata?.projectId !== project.id) {
      return { valid: false, reason: 'Project ID mismatch' };
    }

    if (result.metadata?.orderNumber !== project.orderNumber) {
      return { valid: false, reason: 'Order number mismatch' };
    }

    return { valid: true };
  }

  /**
   * Set resource allocation
   */
  setResourceAllocation(allocation: ResourceAllocation): void {
    this.maxConcurrent = allocation.maxConcurrent;
    this.memoryLimit = allocation.memoryLimit;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    activeExports: number;
    queueLength: number;
    memoryUsage: number;
    memoryLimit: number;
  } {
    return {
      activeExports: this.activeExports.size,
      queueLength: Array.from(this.exportQueue.values()).filter(i => i.status === 'pending').length,
      memoryUsage: this.currentMemoryUsage,
      memoryLimit: this.memoryLimit
    };
  }
}

// Export singleton instance
export const exportService = new ExportService();

