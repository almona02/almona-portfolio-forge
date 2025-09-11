// Shared API response type definitions

export interface PartDetection {
  bbox: [number, number, number, number];
  confidence: number;
  class_id: number;
  class_name: string;
  center: [number, number];
}

export interface PartIdentificationResult {
  success: boolean;
  data: {
    detections: PartDetection[];
    image_info: {
      width: number;
      height: number;
      channels: number;
    };
    model_info: {
      framework: string;
      confidence_threshold: number;
    };
  };
  message: string;
}

export interface PreprocessImageResult {
  success: boolean;
  data: {
    operation: string;
    original_dimensions: { width: number; height: number };
    processed_url?: string;
    preview_base64?: string;
    stats?: Record<string, unknown>;
  };
  message: string;
}

export type APIError = { message: string; status?: number };
