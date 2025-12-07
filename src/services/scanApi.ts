import { ProfileScanResult, ScaleDetectionResult, StorageUrls } from "@/types/scan";

export interface ScanProfileOptions {
  authToken?: string;
  autoDetectScale?: boolean;
  includeDebugOverlay?: boolean;
  scaleFactor?: number;
  baseUrl?: string;
}

const defaultBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "";
const defaultAuthToken =
  (import.meta.env.VITE_API_TOKEN as string | undefined) || "";

const buildUrl = (baseUrl?: string) => {
  const trimmed = (baseUrl ?? defaultBaseUrl).replace(/\/+$/, "");
  return trimmed ? `${trimmed}/api/v2/scan/profile` : "/api/v2/scan/profile";
};

const normalizeStorage = (storage?: StorageUrls | null): StorageUrls => ({
  original_url: storage?.original_url ?? storage?.photo_url ?? null,
  svg_url: storage?.svg_url ?? null,
  debug_overlay_url: storage?.debug_overlay_url ?? null,
  photo_url: storage?.photo_url ?? null,
  ...storage,
});

const normalizeScaleDetection = (
  det?: ScaleDetectionResult | null
): ScaleDetectionResult | undefined => {
  if (!det) return undefined;
  return {
    detected: det.detected,
    scale_mm_per_px: det.scale_mm_per_px ?? det.scale_mm_per_px,
    confidence: det.confidence ?? det.confidence,
    reference_line: det.reference_line,
    detected_label: det.detected_label,
    suggestion_text: det.suggestion_text,
    debug_info: det.debug_info,
  };
};

const normalizeDimensions = (data: any): ProfileScanResult["dimensions"] => {
  const d = data || {};
  const mm = d.mm || {
    width_mm: d.width_mm ?? null,
    height_mm: d.height_mm ?? null,
  };
  const pixels = d.pixels || {
    width_px: d.width_px,
    height_px: d.height_px,
    aspect_ratio: d.aspect_ratio,
  };
  const scaleUsed =
    d.scale_used ??
    d.scale_mm_per_px ??
    d.scale ??
    d.mm_per_px ??
    null;
  return {
    ...d,
    pixels,
    mm,
    scale_used: scaleUsed,
    width_px: pixels?.width_px,
    height_px: pixels?.height_px,
    aspect_ratio: pixels?.aspect_ratio,
    width_mm: mm?.width_mm ?? mm?.width,
    height_mm: mm?.height_mm ?? mm?.height,
  };
};

const normalizeResult = (data: any): ProfileScanResult => {
  const storage = normalizeStorage(data.storageUrls || data.storage);
  const scaleDetection = normalizeScaleDetection(data.scaleDetection);
  return {
    ...data,
    dimensions: normalizeDimensions(data.dimensions),
    qualityFlags: data.qualityFlags || data.quality,
    storageUrls: storage,
    storage,
    scaleDetection,
  };
};

export async function scanProfileImage(
  file: File,
  opts: string | ScanProfileOptions = {},
): Promise<ProfileScanResult> {
  const options: ScanProfileOptions =
    typeof opts === "string" ? { authToken: opts } : opts;

  const formData = new FormData();
  formData.append("file", file);

  if (options.autoDetectScale ?? true) {
    formData.append("auto_detect_scale", "true");
  }
  if (options.includeDebugOverlay) {
    formData.append("include_debug_overlay", "true");
  }
  if (typeof options.scaleFactor === "number") {
    formData.append("scale_factor", String(options.scaleFactor));
  }

  const headers: Record<string, string> = {};
  const token = options.authToken || defaultAuthToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(options.baseUrl), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.detail || errorData.message || `Scan failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return normalizeResult(json);
}

export type { ProfileScanResult } from "@/types/scan";

