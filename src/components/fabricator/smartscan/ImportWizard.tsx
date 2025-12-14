import { ScanResultData } from "@/services/smartScanApi";
import { Alert, AlertDescription } from "@/shared/ui/ui/alert";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { useProfileTuningStore } from "@/stores/profileTuningStore";
import type { Profile } from "@/types/fabricator";
import { AlertTriangle, Save } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

interface ImportWizardProps {
  scanData: ScanResultData;
  filename: string;
  onImport: (profileData: Partial<Profile>) => Promise<string> | string;
  onImportSuccess?: (profileId: string) => void;
  onCancel: () => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  scanData,
  filename,
  onImport,
  onImportSuccess,
  onCancel,
}) => {
  const tuningStore = useProfileTuningStore();
  const baseName = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase();
  const defaultName =
    scanData.technical_data?.profile_name ||
    ((scanData.suggestions?.egyptian_standard_match as any)?.name) ||
    `${baseName} PROFILE`;
  const defaultMaterial =
    (scanData.technical_data?.material_hints?.[0] as any) ||
    ((scanData.suggestions?.egyptian_standard_match as any)?.material) ||
    "aluminum";
  const defaultRole =
    (scanData.suggestions?.likely_role as any) ||
    ("frame" as "frame" | "sash" | "mullion" | "transom");

  const [profileName, setProfileName] = useState(defaultName);
  const [profileRole, setProfileRole] = useState<"frame" | "sash" | "mullion" | "transom">(
    defaultRole,
  );
  const [material, setMaterial] = useState<"aluminum" | "upvc" | "wood">(defaultMaterial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useManualScale, setUseManualScale] = useState(false);
  const [manualWidth, setManualWidth] = useState(
    scanData.dimensions.width_mm ? scanData.dimensions.width_mm.toFixed(1) : "",
  );
  const [manualHeight, setManualHeight] = useState(
    scanData.dimensions.height_mm ? scanData.dimensions.height_mm.toFixed(1) : "",
  );

  const parseViewBoxPx = (viewBox: string) => {
    const parts = viewBox.split(/\s+/).map((p) => parseFloat(p));
    if (parts.length === 4 && parts.every((v) => Number.isFinite(v))) {
      const [, , w, h] = parts;
      return { width_px: w, height_px: h };
    }
    return { width_px: undefined, height_px: undefined };
  };

  const effectiveDimensions = useMemo(() => {
    if (!useManualScale) return scanData.dimensions;

    const widthVal = parseFloat(manualWidth);
    const heightVal = parseFloat(manualHeight);
    const { width_px, height_px } = parseViewBoxPx(scanData.view_box);

    let scale = scanData.dimensions.scale_mm_per_px;
    if (Number.isFinite(widthVal) && widthVal > 0 && Number.isFinite(width_px) && width_px! > 0) {
      scale = widthVal / (width_px as number);
    } else if (
      Number.isFinite(heightVal) &&
      heightVal > 0 &&
      Number.isFinite(height_px) &&
      height_px! > 0
    ) {
      scale = heightVal / (height_px as number);
    }

    const resolvedWidth =
      Number.isFinite(widthVal) && widthVal > 0 ? widthVal : scanData.dimensions.width_mm;
    const resolvedHeight =
      Number.isFinite(heightVal) && heightVal > 0 ? heightVal : scanData.dimensions.height_mm;

    return {
      ...scanData.dimensions,
      width_mm: resolvedWidth,
      height_mm: resolvedHeight,
      scale_mm_per_px: scale,
      scale_source: "manual_verification",
      enhanced_scale: {
        method: "manual_verification",
        scale_mm_per_px: scale,
        confidence: 1.0,
      },
      scale_confidence: 1.0,
    };
  }, [useManualScale, manualWidth, manualHeight, scanData.dimensions, scanData.view_box]);

  const generateProfileData = (): Partial<Profile> => {
    const standardMatch = scanData.suggestions?.egyptian_standard_match;
    const ocrMaterial = scanData.technical_data?.material_hints?.[0] as any;
    const finalName =
      profileName ||
      scanData.technical_data?.profile_name ||
      ((standardMatch as any)?.name) ||
      `${baseName} PROFILE`;
    const finalMaterial = (material || ocrMaterial || ((standardMatch as any)?.material) || "aluminum") as any;
    const finalRole = (profileRole || scanData.suggestions?.likely_role || "frame") as any;

    return {
      name: finalName,
      profileRole: finalRole,
      material: finalMaterial,
      width: effectiveDimensions.width_mm,
      height: effectiveDimensions.height_mm,
      specifications: {
        geometry_config: {
          archetype: "scanned_custom",
          width_mm: effectiveDimensions.width_mm,
          height_mm: effectiveDimensions.height_mm,
          svg_path: scanData.svg_path,
          view_box: scanData.view_box,
          scale_mm_per_px: effectiveDimensions.scale_mm_per_px,
          confidence_score: scanData.quality.confidence_score,
          ocr_data: scanData.technical_data,
          standard_match: standardMatch,
        },
        technical_data: {
          source: "smartscan",
          scan_timestamp: new Date().toISOString(),
          ocr_confidence: scanData.technical_data?.confidence,
          validation_notes: scanData.quality.validation_errors,
          detected_brands: scanData.technical_data?.detected_brands,
        },
        width_mm: effectiveDimensions.width_mm,
        height_mm: effectiveDimensions.height_mm,
      },
    };
  };

  const handleImport = async () => {
    setIsSubmitting(true);
    try {
      const data = generateProfileData();
      const profileId = await onImport(data);
      await tuningStore.loadProfile(profileId);
      tuningStore.setActiveTab("geometry");
      onImportSuccess?.(profileId);
      toast.success("Profile loaded in tuning studio. Geometry tab selected.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Import Profile from Scan</h3>
        <Badge variant={scanData.quality.requires_verification ? "default" : "secondary"} className={scanData.quality.requires_verification ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" : "bg-green-500/20 text-green-400 border-green-500/50"}>
          {(scanData.quality.confidence_score * 100).toFixed(0)}% Confidence
        </Badge>
      </div>

      {scanData.quality.requires_verification && (
        <Alert className="bg-yellow-900/20 border-yellow-500">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            Manual verification recommended. Please confirm dimensions before importing.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-zinc-400">Vector Preview</Label>
            <div className="mt-2 bg-white rounded p-3 border border-zinc-700">
              <svg viewBox={scanData.view_box} className="w-full h-40">
                <path d={scanData.svg_path} fill="#333333" stroke="none" />
              </svg>
            </div>
          </div>

          {scanData.technical_data && (
            <div className="space-y-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-400">AI</span>
                </div>
                <span className="text-sm font-medium text-blue-400">OCR Suggestions</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {scanData.technical_data.profile_name && (
                  <div>
                    <span className="text-xs text-zinc-500">Detected name:</span>
                    <p className="text-sm font-medium text-white truncate">
                      {scanData.technical_data.profile_name}
                    </p>
                  </div>
                )}

                {scanData.technical_data.material_hints?.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-500">Material hints:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {scanData.technical_data.material_hints.map((mat, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {scanData.suggestions?.egyptian_standard_match && (
                  <div className="col-span-2">
                    <span className="text-xs text-zinc-500">Egyptian standard:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      >
                        {((scanData.suggestions.egyptian_standard_match as any)?.name) || 'Egyptian Standard'}
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        {(((scanData.suggestions.egyptian_standard_match as any)?.match_score || 0) * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Width:</span>
              <span className="font-mono text-white">
                {effectiveDimensions.width_mm.toFixed(1)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Height:</span>
              <span className="font-mono text-white">
                {effectiveDimensions.height_mm.toFixed(1)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Scale Source:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {effectiveDimensions.scale_source.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Scale verification</p>
                <p className="text-xs text-zinc-500">
                  Enter the true dimensions to override heuristic scale.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-400">Override scale</Label>
                <Button
                  type="button"
                  variant={useManualScale ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseManualScale((v) => !v)}
                  className="text-xs"
                >
                  {useManualScale ? "On" : "Off"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">True Width (mm)</Label>
                <Input
                  value={manualWidth}
                  onChange={(e) => setManualWidth(e.target.value)}
                  placeholder={scanData.dimensions.width_mm?.toFixed(1) || "e.g. 61"}
                  type="number"
                  min="0"
                  step="0.1"
                  className="mt-1 bg-zinc-900 border-zinc-700"
                  disabled={!useManualScale}
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">True Height (mm)</Label>
                <Input
                  value={manualHeight}
                  onChange={(e) => setManualHeight(e.target.value)}
                  placeholder={scanData.dimensions.height_mm?.toFixed(1) || "e.g. 81"}
                  type="number"
                  min="0"
                  step="0.1"
                  className="mt-1 bg-zinc-900 border-zinc-700"
                  disabled={!useManualScale}
                />
              </div>
            </div>
            <p className="text-[11px] text-amber-200/90">
              Tip: Use the real measured width/height. Scale is recomputed from the SVG viewBox.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="profileName" className="text-zinc-400">
              Profile Name *
            </Label>
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., JUMBO 100 ALUMINUM FRAME"
              className="mt-1 bg-zinc-900 border-zinc-700"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Auto-suggested: {defaultName}
            </p>
          </div>

          <div>
            <Label className="text-zinc-400">Profile Role</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["frame", "sash", "mullion", "transom"].map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant={profileRole === role ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProfileRole(role as any)}
                  className="capitalize"
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-zinc-400">Material</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["aluminum", "upvc", "wood"].map((mat) => (
                <Button
                  key={mat}
                  type="button"
                  variant={material === mat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMaterial(mat as any)}
                  className="capitalize"
                >
                  {mat}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-3 text-sm text-zinc-400">
            <p>This will:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create a new profile in your library</li>
              <li>Save the scanned vector as geometry configuration</li>
              <li>Generate a thumbnail from the scan</li>
              <li>Make it available for window design</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-gray-300 border-gray-600 hover:bg-gray-700"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleImport}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-500"
        >
          {isSubmitting ? "Processing..." : <><Save className="w-4 h-4 mr-2" /> Import to Profile Library</>}
        </Button>
      </div>
    </div>
  );
};

