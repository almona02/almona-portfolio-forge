import React, { useMemo, useState } from 'react';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { FileText, UploadCloud } from 'lucide-react';
import { parseProfileFromDXF } from '@/lib/imports/ProfileDXFImporter';

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
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

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
  const bbox = json?.profile_metrics?.bounding_box || [0, 0, 0, 0];
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fileName: file.name,
    name: file.name.replace(/\.(dxf|dwg)$/i, ''),
    widthMm: Number.isFinite(width) ? width : undefined,
    heightMm: Number.isFinite(height) ? height : undefined,
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
}) => {
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ImportedProfile[]>([]);
  const [isParsing, setIsParsing] = useState(false);

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
        <div
          className="mt-2 border bg-white rounded p-2 overflow-auto max-h-64"
          dangerouslySetInnerHTML={{ __html: p.svgPreview }}
        />
      );
    }
    return (
      <div className="mt-2 text-[11px] text-gray-400">
        No preview available. Dimensions: {p.widthMm || '?'} × {p.heightMm || '?'} mm
      </div>
    );
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
        <div className="mt-3 rounded border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-200 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-orange-400" />
            Selected: {selected.name} ({selected.widthMm} × {selected.heightMm} mm)
          </div>
          {renderPreview(selected)}
          <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
            {selected.areaMm2 && <span>Area: {selected.areaMm2.toFixed(1)} mm²</span>}
            {selected.perimeterMm && <span>Perimeter: {selected.perimeterMm.toFixed(1)} mm</span>}
            {selected.weightKgPerM && <span>Weight: {selected.weightKgPerM.toFixed(4)} kg/m</span>}
            {selected.isThermalBreak !== undefined && (
              <span>{selected.isThermalBreak ? 'Thermal Break' : 'Solid'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

