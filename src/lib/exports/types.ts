/**
 * Export Types - Shared types and interfaces for all export formats
 * Phase 2: Professional Report Generation System
 */

import { WindowUnit, OptimizationResult, CuttingPlan, Profile } from '@/types/fabricator';

/**
 * Export format types
 */
export type ExportFormat = 'pdf' | 'csv' | 'dxf' | 'mdb';

/**
 * Company branding configuration
 */
export interface CompanyBranding {
  logo?: string; // Base64 or URL
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Base export options
 */
export interface BaseExportOptions {
  branding?: CompanyBranding;
  language?: 'en' | 'tr' | 'ar';
  includeQRCode?: boolean;
  includeDiagrams?: boolean;
  includeMetadata?: boolean;
  /**
   * Optional machine export profile identifier.
   * When provided, generators can tailor column layouts / layers
   * to a specific saw or machining center format.
   */
  machineProfileId?: string;
}

/**
 * PDF-specific export options
 */
export interface PDFExportOptions extends BaseExportOptions {
  include3DPreview?: boolean;
  includeCuttingList?: boolean;
  includeAccessories?: boolean;
  includeGlazing?: boolean;
  includeAssemblyGuide?: boolean;
  pageSize?: 'A4' | 'Letter' | 'A3';
  orientation?: 'portrait' | 'landscape';
}

/**
 * CSV-specific export options
 */
export interface CSVExportOptions extends BaseExportOptions {
  delimiter?: ',' | ';' | '\t';
  includeHeaders?: boolean;
  excelCompatible?: boolean;
  decimalSeparator?: '.' | ',';
}

/**
 * DXF-specific export options
 */
export interface DXFExportOptions extends BaseExportOptions {
  layerName?: string;
  units?: 'mm' | 'inches';
  scale?: number;
  includeDimensions?: boolean;
  includeAnnotations?: boolean;
}

/**
 * Machine export profile definition – describes how cutting / machining
 * data should be formatted for a specific target (e.g. generic saw CSV).
 */
export interface MachineExportProfile {
  id: string;
  label: string;
  description?: string;
  target: 'saw' | 'machining_center' | 'cnc_router';
  format: ExportFormat;
  /**
   * Manufacturer name (e.g., 'Elumatec', 'FOMM', 'Emmegi')
   */
  manufacturer?: string;
  /**
   * Machine capabilities
   */
  capabilities?: string[];
  /**
   * Machine-specific configuration
   */
  configuration?: Record<string, any>;
  /**
   * For CSV exports, defines the column order and labels expected
   * by the machine software.
   */
  csvLayout?: {
    headers: string[];
  };
  /**
   * For DXF exports, defines layer naming conventions or other hints.
   */
  dxfLayout?: {
    cuttingLayer?: string;
    annotationLayer?: string;
    qrLayer?: string;
    barcodeLayer?: string;
    drillingLayer?: string;
    millingLayer?: string;
    tappingLayer?: string;
    templateLayer?: string;
  };
  /**
   * For MDB exports, defines table structure and column mappings.
   */
  mdbLayout?: {
    tableName: string;
    columns: string[];
    defaultValues?: Record<string, any>;
  };
}

/**
 * Union type for all export options
 */
export type ExportOptions = PDFExportOptions | CSVExportOptions | DXFExportOptions;

/**
 * Export progress callback
 */
export type ExportProgressCallback = (progress: ExportProgress) => void;

/**
 * Export progress information
 */
export interface ExportProgress {
  stage: ExportStage;
  percentage: number;
  message: string;
  format?: ExportFormat;
  currentItem?: number;
  totalItems?: number;
}

/**
 * Export stages
 */
export type ExportStage =
  | 'initializing'
  | 'processing'
  | 'generating'
  | 'finalizing'
  | 'completed'
  | 'error';

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  blob?: Blob;
  filename?: string;
  error?: string;
  metadata?: ExportMetadata;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  generatedAt: Date;
  projectId: string;
  orderNumber: string;
  format: ExportFormat;
  fileSize?: number;
  pageCount?: number;
  recordCount?: number;
}

/**
 * Batch export configuration
 */
export interface BatchExportConfig {
  projects: WindowUnit[];
  format: ExportFormat;
  options: ExportOptions;
  onProgress?: ExportProgressCallback;
}

/**
 * Batch export result
 */
export interface BatchExportResult {
  success: boolean;
  results: ExportResult[];
  totalCount: number;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Report data structure for cutting list generation
 */
export interface CuttingListReportData {
  project: WindowUnit;
  optimization: OptimizationResult;
  cuttingPlans: ProcessedCuttingPlan[];
  summary: CuttingListSummary;
  metadata: ReportMetadata;
}

/**
 * Processed cutting plan (ready for report generation)
 */
export interface ProcessedCuttingPlan {
  plan: CuttingPlan;
  profile: Profile;
  stockLength: number;
  cuts: ProcessedCut[];
  waste: number;
  utilization: number;
  sequence: number;
  diagram?: CuttingDiagram;
}

/**
 * Processed cut information
 */
export interface ProcessedCut {
  length: number;
  angle: number;
  componentId: string;
  componentType?: string;
  waste: number;
  position: number; // Position on stock piece
  sequence: number; // Cutting sequence order
}

/**
 * Cutting diagram data
 */
export interface CuttingDiagram {
  width: number;
  height: number;
  cuts: DiagramCut[];
  waste: DiagramWaste[];
  scale: number;
}

/**
 * Diagram cut representation
 */
export interface DiagramCut {
  x: number;
  y: number;
  width: number;
  height: number;
  length: number;
  angle: number;
  label: string;
  color?: string;
}

/**
 * Diagram waste representation
 */
export interface DiagramWaste {
  x: number;
  y: number;
  width: number;
  height: number;
  percentage: number;
}

/**
 * Cutting list summary
 */
export interface CuttingListSummary {
  totalStockPieces: number;
  totalMaterialUsed: number;
  totalWaste: number;
  averageUtilization: number;
  totalCost: number;
  profilesUsed: Profile[];
  estimatedProductionTime: number;
}

/**
 * Report metadata
 */
export interface ReportMetadata {
  generatedAt: Date;
  projectId: string;
  orderNumber: string;
  posNumber?: string;
  version: string;
  generator: string;
}

/**
 * QR code data for reports
 */
export interface QRCodeData {
  projectId: string;
  orderNumber: string;
  generatedAt: Date;
  reportType: string;
  url?: string;
  batchId?: string;
  version?: string;
}

/**
 * Barcode data for component tracking
 */
export interface BarcodeData {
  sku: string;
  componentId: string;
  partNumber?: string;
  material?: string;
  dimensions?: string;
}

/**
 * Export priority levels
 */
export type ExportPriority = 'urgent' | 'standard' | 'low' | 'scheduled';

/**
 * Export queue item
 */
export interface ExportQueueItem {
  id: string;
  project: WindowUnit;
  optimization: OptimizationResult | null;
  format: ExportFormat;
  options: ExportOptions;
  priority: ExportPriority;
  scheduledAt?: Date;
  groupId?: string; // For grouping by client or job site
  createdAt: Date;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
  progress?: ExportProgress;
  result?: ExportResult;
  error?: string;
  retryCount?: number;
}

/**
 * Batch export configuration with advanced options
 */
export interface AdvancedBatchExportConfig extends BatchExportConfig {
  priority?: ExportPriority;
  groupBy?: 'client' | 'jobSite' | 'type' | 'none';
  maxConcurrent?: number; // Max parallel exports
  memoryLimit?: number; // Memory limit in MB
  resumeFromCheckpoint?: boolean;
  scheduledAt?: Date;
  templateId?: string;
  qualityCheck?: boolean;
  validation?: boolean;
}

/**
 * Batch export result with analytics
 */
export interface AdvancedBatchExportResult extends BatchExportResult {
  duration: number; // Processing time in ms
  averageFileSize: number;
  totalFileSize: number;
  performanceMetrics: {
    filesPerMinute: number;
    mbPerSecond: number;
    peakMemoryUsage: number;
    averageProcessingTime: number;
  };
  checkpoint?: BatchCheckpoint;
}

/**
 * Batch checkpoint for resume capability
 */
export interface BatchCheckpoint {
  batchId: string;
  completedItems: number;
  failedItems: number;
  results: ExportResult[];
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Resource allocation settings
 */
export interface ResourceAllocation {
  maxConcurrent: number;
  memoryLimit: number; // MB
  cpuThrottle?: boolean;
  priority: ExportPriority;
}

/**
 * Export template
 */
export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'premium' | 'minimal' | 'client-facing' | 'workshop' | 'multi-language';
  format: ExportFormat;
  options: ExportOptions;
  branding?: CompanyBranding;
  preview?: string; // Preview image/data URL
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDefault?: boolean;
  isPublic?: boolean;
  rating?: number;
  usageCount?: number;
  tags?: string[];
}

/**
 * Template application result
 */
export interface TemplateApplicationResult {
  success: boolean;
  templateId: string;
  appliedOptions: ExportOptions;
  error?: string;
}

