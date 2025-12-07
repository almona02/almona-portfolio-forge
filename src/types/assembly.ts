export type SystemType =
  | "sliding"
  | "casement"
  | "fixed"
  | "tilt_turn"
  | "folding"
  | "lift_slide"
  | "curtain_wall"
  | "unknown";

export interface AssemblyComponent {
  id: string;
  profile_code?: string;
  detected_role: string;
  confidence: number;
  bounding_box: number[];
  crop_image_url?: string;
  suggestions: string[];
  user_confirmed_role?: string;
  dimensions_mm?: Record<string, number>;
  metadata: Record<string, any>;
}

export interface AssemblyConnection {
  from_component: string;
  to_component: string;
  connection_type: string;
  location_hint?: string;
}

export interface AssemblySystem {
  system_type: SystemType;
  confidence: number;
  validation_rules_applied: string[];
}

export interface AssemblyResponse {
  success: boolean;
  assembly_id: string;
  system: AssemblySystem;
  components: AssemblyComponent[];
  connections: AssemblyConnection[];
  validation_results: Record<string, any>;
  missing_components: string[];
  confidence: number;
  requires_user_review: boolean;
  processing_time_ms: number;
  timestamp: string;
}

export interface AssemblyMetrics {
  total_scans: number;
  successful_scans: number;
  success_rate: number;
  avg_confidence: number;
  user_corrections: number;
  avg_user_corrections: number;
}

export type AssemblyReviewState = "idle" | "scanning" | "review" | "confirmed" | "error";

