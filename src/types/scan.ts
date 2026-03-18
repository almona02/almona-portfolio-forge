export interface ReferenceLine {
  start: [number, number];
  end: [number, number];
}

export interface ScaleDetectionResult {
  detected: boolean;
  scale_mm_per_px?: number | null;
  confidence?: number | null;
  reference_line?: ReferenceLine;
  detected_label?: string;
  suggestion_text?: string;
  debug_info?: Record<string, unknown>;
}

export interface ScanDimensions {
  pixels?: Record<string, number>;
  mm?: Record<string, number>;
  scale_used?: number | null;
  // Backward-compat fields
  width_px?: number;
  height_px?: number;
  aspect_ratio?: number;
  width_mm?: number | null;
  height_mm?: number | null;
}

export interface QualityFlags {
  is_high_contrast: boolean;
  has_clear_edges: boolean;
  is_properly_scaled: boolean;
  has_dimension_labels: boolean;
  auto_scale_detected: boolean;
  auto_scale_confidence?: number;
  [key: string]: unknown;
}

export interface StorageUrls {
  original_url?: string | null;
  svg_url?: string | null;
  debug_overlay_url?: string | null;
  photo_url?: string | null;
  [key: string]: unknown;
}

export interface ProfileScanResult {
  svgPath: string;
  dimensions: ScanDimensions;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  qualityFlags?: QualityFlags;
  quality?: Record<string, unknown>;
  vectorizer?: string;
  scaleDetection?: ScaleDetectionResult;
  storageUrls?: StorageUrls;
  storage?: StorageUrls;
  processing_time_ms?: number;
  timestamp?: string;
  [key: string]: unknown;
}


