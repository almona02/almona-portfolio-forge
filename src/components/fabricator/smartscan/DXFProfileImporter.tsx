import React, { useMemo, useState } from 'react';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { FileText, UploadCloud, Save } from 'lucide-react';
import { parseProfileFromDXF } from '@/lib/imports/ProfileDXFImporter';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ImportedProfile {
  id: string;
  fileName: string;
  name?: string;
  widthMm?: number;
  heightMm?: number;
  areaMm2?: number;
  perimeterMm?: number;
  weightKgPerM?: number;
  isThermalBreak?: boolean;
  warnings?: string[];
  previewUrl?: string;
  svgPreview?: string;
  metadata?: {
    source?: string;
    units?: string;
    hasSvgPreview?: boolean;
  };
}

interface DXFProfileImporterProps {
  onImported: (profiles: ImportedProfile[]) => void;
  selectedProfileId?: string | null;
  onSelectProfile?: (id: string) => void;
  userId?: string;
  onProfileSaved?: (profileId: string) => void;
}

// Get API base URL - use env var if set, otherwise use relative path for same-origin
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) {
    // Remove trailing slash if present
    return envUrl.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8003";
  }
  // Production fallback - but this should not happen if VITE_API_URL is set
  console.error(
    "⚠️ VITE_API_URL not set in production! DXF import will fail. " +
    "Please set VITE_API_URL in your deployment environment variables."
  );
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const API_BASE = getApiBase();

async function ingestProfileViaApi(file: File): Promise<ImportedProfile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_type', 'dxf');
  formData.append('material_type', 'aluminium');

  const res = await fetch(`${API_BASE}/api/v2/profile-import/ingest`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  const json = await res.json();
  const metrics = json?.profile_metrics || {};
  
  // Prefer actual profile dimensions over full bounding box
  // (bounding box includes text labels, etc.)
  let width: number | undefined;
  let height: number | undefined;
  
  // Try profile_width_mm/profile_height_mm first (from largest polygon)
  if (metrics.profile_width_mm != null && Number.isFinite(metrics.profile_width_mm)) {
    width = Number(metrics.profile_width_mm);
  }
  if (metrics.profile_height_mm != null && Number.isFinite(metrics.profile_height_mm)) {
    height = Number(metrics.profile_height_mm);
  }
  
  // Fallback to bounding box if profile dimensions not available
  if (width == null || height == null) {
    const bbox = metrics.bounding_box;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      // bounding_box format: [min_x, min_y, max_x, max_y]
      const bboxWidth = bbox[2] - bbox[0];
      const bboxHeight = bbox[3] - bbox[1];
      if (width == null && Number.isFinite(bboxWidth)) width = bboxWidth;
      if (height == null && Number.isFinite(bboxHeight)) height = bboxHeight;
    }
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('DXF Import Response:', {
      profile_width_mm: metrics.profile_width_mm,
      profile_height_mm: metrics.profile_height_mm,
      bounding_box: metrics.bounding_box,
      extracted_width: width,
      extracted_height: height,
      has_svg: Boolean(json?.svg_preview),
    });
  }

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fileName: file.name,
    name: file.name.replace(/\.(dxf|dwg)$/i, ''),
    widthMm: width,
    heightMm: height,
    areaMm2: json?.profile_metrics?.area_mm2,
    perimeterMm: json?.profile_metrics?.perimeter_mm,
    weightKgPerM: json?.profile_metrics?.weight_kg_per_m,
    isThermalBreak: json?.profile_metrics?.is_thermal_break,
    warnings: json?.validation_warnings,
    svgPreview: json?.svg_preview,
    metadata: {
      source: 'backend',
      units: 'mm',
      hasSvgPreview: Boolean(json?.svg_preview),
    },
  };
}

export const DXFProfileImporter: React.FC<DXFProfileImporterProps> = ({
  onImported,
  selectedProfileId,
  onSelectProfile,
  userId,
  onProfileSaved,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ImportedProfile[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsParsing(true);
    const imported: ImportedProfile[] = [];

    for (const file of Array.from(files)) {
      try {
        if (API_BASE) {
          const prof = await ingestProfileViaApi(file);
          imported.push(prof);
        } else {
          throw new Error('API base not configured');
        }
      } catch (e) {
        // Fallback to lightweight parser
        console.warn('DXF API ingest failed, falling back to local parser:', e);
        const parsed = await parseProfileFromDXF(file);
        imported.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: file.name,
          name: parsed.name,
          widthMm: parsed.width,
          heightMm: parsed.height,
          areaMm2: parsed.specifications?.area_mm2,
          perimeterMm: parsed.specifications?.perimeter_mm,
          warnings: parsed.specifications ? [parsed.specifications.dxfPreviewSnippet ? 'Preview available' : ''] : [],
        });
      }
    }

    setProfiles(imported);
    onImported(imported);
    setIsParsing(false);
  };

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId],
  );

  const renderPreview = (p: ImportedProfile) => {
    if (p.svgPreview) {
      return (
        <div className="mt-2 border bg-white rounded p-2 overflow-auto max-h-96 flex items-center justify-center">
          <div
            className="w-full"
            style={{ maxHeight: '384px' }}
            dangerouslySetInnerHTML={{ __html: p.svgPreview }}
          />
        </div>
      );
    }
    return (
      <div className="mt-2 text-[11px] text-gray-400">
        No preview available. Dimensions: {p.widthMm || '?'} × {p.heightMm || '?'} mm
      </div>
    );
  };

  const handleSaveProfile = async (profile: ImportedProfile) => {
    if (!userId) {
      setError('User ID required to save profile');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const profileData = {
        user_id: userId,
        name: profile.name || profile.fileName.replace(/\.(dxf|dwg)$/i, ''),
        material: 'aluminum' as const,
        width: profile.widthMm || 50,
        height: profile.heightMm || 50,
        thickness: 1.5, // Default, can be tuned later
        color: '#C0C0C0',
        cost_per_meter: 0,
        cutting_allowance: 3,
        stock_quantity: 0,
        min_stock_level: 0,
        max_stock_level: 1000,
        supplier: 'Imported from DXF',
        system_brand: 'Custom',
        specifications: {
          importSource: 'dxf',
          dxfFileName: profile.fileName,
          areaMm2: profile.areaMm2,
          perimeterMm: profile.perimeterMm,
          weightKgPerM: profile.weightKgPerM,
          isThermalBreak: profile.isThermalBreak,
          svgPreview: profile.svgPreview, // Save SVG preview in specifications
          profileWidthMm: profile.widthMm,
          profileHeightMm: profile.heightMm,
          importDate: new Date().toISOString(),
          ...(profile.metadata || {}),
        },
      };

      const { supabase } = await import('@/lib/supabase');
      const { data, error: saveError } = await supabase
        .from('fabricator_profiles')
        .insert(profileData)
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      if (data && onProfileSaved) {
        onProfileSaved(data.id);
      }

      // Show success message
      toast.success(`Profile "${profile.name}" saved to library`);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="file"
          accept=".dxf,.dwg"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="bg-gray-800 border-gray-700"
        />
        <Button
          variant="outline"
          className="border-gray-700 text-xs"
          onClick={() => setProfiles([])}
        >
          Clear
        </Button>
      </div>

      {isParsing && (
        <Alert className="bg-gray-900/60 border-gray-800 text-xs">
          <AlertDescription>Parsing DXF…</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-600">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {profiles.map((p) => {
          const active = selectedProfileId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectProfile && onSelectProfile(p.id)}
              className={`w-full text-left rounded border px-3 py-2 bg-gray-900/40 transition ${
                active ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]' : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-white font-semibold">{p.name}</div>
                  <div className="text-[11px] text-gray-400">{p.fileName}</div>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="border-blue-500 text-blue-200">
                  {p.widthMm} × {p.heightMm} mm
                </Badge>
                {p.areaMm2 && (
                  <Badge variant="outline" className="border-teal-500 text-teal-200">
                    Area {p.areaMm2.toFixed(1)} mm²
                  </Badge>
                )}
                {p.metadata?.hasSvgPreview && (
                  <Badge variant="outline" className="border-green-500 text-green-200">
                    SVG Preview
                  </Badge>
                )}
              </div>
              {p.warnings && p.warnings.length > 0 && (
                <div className="mt-1 text-[11px] text-amber-300">
                  {p.warnings.join('; ')}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-orange-400" />
              <div>
                <div className="font-semibold text-white">{selected.name}</div>
                <div className="text-xs text-gray-400">
                  {selected.widthMm} × {selected.heightMm} mm
                </div>
              </div>
            </div>
            {userId && (
              <Button
                onClick={() => handleSaveProfile(selected)}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                {isSaving ? 'Saving...' : 'Save to Library'}
              </Button>
            )}
          </div>
          
          {/* Enhanced Preview Section */}
          <div className="border-t border-gray-700 pt-3">
            <div className="text-xs font-medium text-gray-300 mb-2">Profile Preview</div>
            {renderPreview(selected)}
          </div>

          {/* Profile Details */}
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 border-t border-gray-700 pt-3">
            {selected.areaMm2 && (
              <div>
                <span className="text-gray-500">Area:</span>{' '}
                <span className="text-gray-300">{selected.areaMm2.toFixed(1)} mm²</span>
              </div>
            )}
            {selected.perimeterMm && (
              <div>
                <span className="text-gray-500">Perimeter:</span>{' '}
                <span className="text-gray-300">{selected.perimeterMm.toFixed(1)} mm</span>
              </div>
            )}
            {selected.weightKgPerM && (
              <div>
                <span className="text-gray-500">Weight:</span>{' '}
                <span className="text-gray-300">{selected.weightKgPerM.toFixed(4)} kg/m</span>
              </div>
            )}
            {selected.isThermalBreak !== undefined && (
              <div>
                <span className="text-gray-500">Type:</span>{' '}
                <span className="text-gray-300">
                  {selected.isThermalBreak ? 'Thermal Break' : 'Solid'}
                </span>
              </div>
            )}
            {selected.metadata?.hasSvgPreview && (
              <div>
                <span className="text-green-400">✓ SVG Preview Available</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

