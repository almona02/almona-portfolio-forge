import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import { Slider } from '@/shared/ui/ui/slider';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { AlertCircle, LayoutGrid, Ruler } from 'lucide-react';
import type { WindowUnit, Profile, WindowComponent } from '@/types/fabricator';
import type { ValidationError } from '@/lib/fabricatorValidation';
import {
  calculateEqualSpacing,
  deriveConstraintsFromProfiles,
  generateMullionComponentsFromLayout,
  validateProjectLayoutWithConstraints,
  type SmartDrawLayout,
} from '@/algorithms/smartDraw';
import { SYSTEM_PACKS } from '@/data/systemPacks';

interface SmartDrawExportPayload {
  layout: SmartDrawLayout;
  components: WindowComponent[];
  isValid: boolean;
  errors: ValidationError[];
}

interface SmartDrawToolProps {
  /**
   * The active project / window unit to design a façade layout for.
   */
  project: WindowUnit | null;

  /**
   * Inventory profiles – used to derive system constraints and (optionally)
   * pick a default mullion profile for export.
   */
  profiles: Profile[];

  /**
   * Optional explicit mullion profile ID. If not provided, the first profile
   * in the list will be used when exporting components.
   */
  defaultMullionProfileId?: string;

  /**
   * Callback fired when the user applies the current layout. This provides
   * a WindowUnit-compatible component list plus validation metadata, so
   * callers can plug directly into the existing design → optimization flow.
   */
  onApplyLayout?: (payload: SmartDrawExportPayload) => void;
}

type DragTarget = 'first' | 'last' | null;

/**
 * SmartDrawTool
 * ---------------------------------------------------------------------------
 * Canvas-based façade designer:
 * - Drag the first and last mullions to define the active span
 * - Auto-populate intermediate mullions with equal spacing
 * - Live validation against system constraints (width / panel widths / area)
 * - Optional export of mullion components compatible with WindowUnit
 */
export const SmartDrawTool: React.FC<SmartDrawToolProps> = ({
  project,
  profiles,
  defaultMullionProfileId,
  onApplyLayout,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  // Total number of mullions inside the opening (including first/last).
  const [totalMullions, setTotalMullions] = useState<number>(3);

  // First / last mullion positions in mm from the left edge.
  const [firstMullionMm, setFirstMullionMm] = useState<number | null>(null);
  const [lastMullionMm, setLastMullionMm] = useState<number | null>(null);

  const constraints = useMemo(
    () => deriveConstraintsFromProfiles(profiles),
    [profiles],
  );

  const activePackPreset = useMemo(() => {
    const systemId = project?.systemPackId;
    if (!systemId) return null;
    const pack = SYSTEM_PACKS.find((p) => p.meta.id === systemId);
    return pack?.smartDrawPreset ?? null;
  }, [project?.systemPackId]);

  const overallWidth = project?.overallWidth ?? 0;

  // Initialise / clamp mullion positions when project changes
  useEffect(() => {
    if (!overallWidth) {
      setFirstMullionMm(null);
      setLastMullionMm(null);
      return;
    }

    const defaultFirst = overallWidth * 0.25;
    const defaultLast = overallWidth * 0.75;
    const minEdge = constraints?.minWidthMm ?? 80;
    const maxEdge = overallWidth - (constraints?.minWidthMm ?? 80);

    setFirstMullionMm((prev) => {
      if (prev == null || prev <= 0 || prev >= overallWidth) return defaultFirst;
      return Math.min(Math.max(prev, minEdge), maxEdge);
    });

    setLastMullionMm((prev) => {
      if (prev == null || prev <= 0 || prev >= overallWidth) return defaultLast;
      const minGap = constraints?.minWidthMm ?? 80;
      const clamped = Math.min(Math.max(prev, minEdge + minGap), maxEdge);
      return clamped;
    });
  }, [overallWidth, constraints?.minWidthMm]);

  const spanAndSpacing = useMemo(() => {
    if (
      !overallWidth ||
      firstMullionMm == null ||
      lastMullionMm == null ||
      totalMullions < 2
    ) {
      return {
        spanMm: 0,
        spacingMm: 0,
        errors: [] as ValidationError[],
      };
    }

    const left = Math.min(firstMullionMm, lastMullionMm);
    const right = Math.max(firstMullionMm, lastMullionMm);
    const spanMm = right - left;
    const segmentCount = totalMullions - 1;

    const equal = calculateEqualSpacing(spanMm, segmentCount, {
      minSpacingMm: constraints?.minWidthMm,
      maxSpacingMm: constraints?.maxWidthMm,
    });

    return {
      spanMm,
      spacingMm: equal.spacingMm,
      errors: equal.errors,
    };
  }, [overallWidth, firstMullionMm, lastMullionMm, totalMullions, constraints]);

  // Absolute mullion positions (mm) across the opening.
  const mullionsMm: number[] = useMemo(() => {
    if (
      !overallWidth ||
      firstMullionMm == null ||
      lastMullionMm == null ||
      totalMullions < 2
    ) {
      return [];
    }

    const left = Math.min(firstMullionMm, lastMullionMm);
    const right = Math.max(firstMullionMm, lastMullionMm);
    const spanMm = right - left;
    const segments = totalMullions - 1;
    const spacing = segments > 0 ? spanMm / segments : 0;

    const positions: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      positions.push(left + spacing * i);
    }

    return positions;
  }, [overallWidth, firstMullionMm, lastMullionMm, totalMullions]);

  const validation = useMemo(() => {
    if (!project) {
      return {
        isValid: false,
        errors: [
          {
            field: 'project',
            message: 'No active project – please complete measurements first.',
          },
        ] as ValidationError[],
        layout: {
          mullionsMm: [],
          panelWidthsMm: [],
        } as SmartDrawLayout,
      };
    }

    return validateProjectLayoutWithConstraints(project, constraints, mullionsMm);
  }, [project, constraints, mullionsMm]);

  // -------------------------------------------------------------------------
  // Canvas Drawing
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 800;
    const displayHeight = canvas.clientHeight || 200;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // No project → show placeholder
    if (!overallWidth || !project) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'No project loaded. Complete Smart Measuring first.',
        displayWidth / 2,
        displayHeight / 2,
      );
      return;
    }

    const padding = 24;
    const frameWidth = displayWidth - padding * 2;
    const frameHeight = displayHeight - padding * 2;
    const scaleX = frameWidth / overallWidth;

    // Outer frame
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, frameWidth, frameHeight);

    // Panel shading between mullions and edges
    const allPositions = [0, ...mullionsMm, overallWidth];
    ctx.save();
    for (let i = 0; i < allPositions.length - 1; i += 1) {
      const leftMm = allPositions[i];
      const rightMm = allPositions[i + 1];
      const x = padding + leftMm * scaleX;
      const w = (rightMm - leftMm) * scaleX;

      ctx.fillStyle = i % 2 === 0 ? '#0f172a' : '#020617';
      ctx.fillRect(x, padding, w, frameHeight);
    }
    ctx.restore();

    // Draw mullions
    mullionsMm.forEach((posMm, index) => {
      const x = padding + posMm * scaleX;
      const isFirst = index === 0;
      const isLast = index === mullionsMm.length - 1;

      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + frameHeight);
      ctx.lineWidth = isFirst || isLast ? 3 : 2;
      ctx.strokeStyle = isFirst || isLast ? '#f97316' : '#4b5563';
      ctx.stroke();

      // Draggable handle indicator
      if (isFirst || isLast) {
        ctx.beginPath();
        ctx.arc(x, padding + frameHeight / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
      }
    });

    // Dimension label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${overallWidth.toFixed(0)} mm`,
      padding + frameWidth / 2,
      padding + frameHeight + 6,
    );
  }, [project, overallWidth, mullionsMm]);

  // -------------------------------------------------------------------------
  // Pointer Interaction
  // -------------------------------------------------------------------------

  const pickDragTarget = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): DragTarget => {
      if (!canvasRef.current || !overallWidth || mullionsMm.length === 0) return null;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const padding = 24;
      const frameWidth = rect.width - padding * 2;
      const scaleX = frameWidth / overallWidth;

      const thresholdPx = 16;
      let closest: { target: DragTarget; distance: number } | null = null;

      mullionsMm.forEach((posMm, index) => {
        const cx = padding + posMm * scaleX;
        const dist = Math.abs(x - cx);
        const isFirst = index === 0;
        const isLast = index === mullionsMm.length - 1;

        if ((isFirst || isLast) && dist <= thresholdPx) {
          const target: DragTarget = isFirst ? 'first' : 'last';
          if (!closest || dist < closest.distance) {
            closest = { target, distance: dist };
          }
        }
      });

      return closest?.target ?? null;
    },
    [overallWidth, mullionsMm],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const target = pickDragTarget(event);
    if (target) {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      setDragTarget(target);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragTarget || !canvasRef.current || !overallWidth) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const padding = 24;
    const frameWidth = rect.width - padding * 2;
    const scaleX = frameWidth / overallWidth;

    const minEdge = constraints?.minWidthMm ?? 80;
    const maxEdge = overallWidth - (constraints?.minWidthMm ?? 80);
    const minGap = constraints?.minWidthMm ?? 80;

    let mm = (x - padding) / scaleX;
    mm = Math.max(minEdge, Math.min(maxEdge, mm));

    if (dragTarget === 'first') {
      const other = lastMullionMm ?? maxEdge;
      if (mm > other - minGap) {
        mm = other - minGap;
      }
      setFirstMullionMm(mm);
    } else if (dragTarget === 'last') {
      const other = firstMullionMm ?? minEdge;
      if (mm < other + minGap) {
        mm = other + minGap;
      }
      setLastMullionMm(mm);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragTarget) {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    }
    setDragTarget(null);
  };

  // -------------------------------------------------------------------------
  // Export Handler
  // -------------------------------------------------------------------------

  const handleApplyLayout = () => {
    if (!project || !onApplyLayout || mullionsMm.length === 0) return;

    const mullionProfile =
      profiles.find((p) => p.id === defaultMullionProfileId) ?? profiles[0] ?? null;

    const { layout, components } = generateMullionComponentsFromLayout(
      project,
      mullionsMm,
      mullionProfile,
    );

    const allErrors = [...spanAndSpacing.errors, ...validation.errors];

    onApplyLayout({
      layout,
      components,
      isValid: allErrors.length === 0,
      errors: allErrors,
    });
  };

  const spacingPerPanel =
    mullionsMm.length >= 2 ? (mullionsMm[mullionsMm.length - 1] - mullionsMm[0]) / (mullionsMm.length - 1) : 0;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-orange-400" />
          <CardTitle className="text-sm font-semibold">
            Smart Draw – Facade Layout
          </CardTitle>
        </div>
        {project && (
          <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-300">
            <Ruler className="h-3 w-3 mr-1" />
            {project.overallWidth.toFixed(0)} × {project.overallHeight.toFixed(0)} mm
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-gray-300">Total Mullions between First &amp; Last</Label>
            <Slider
              min={2}
              max={8}
              step={1}
              value={[totalMullions]}
              onValueChange={([value]) => setTotalMullions(value)}
              className="mt-2"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {totalMullions} vertical bar{totalMullions > 1 ? 's' : ''} in the active span.
            </p>
          </div>
          <div>
              <Label className="text-xs text-gray-300">Equal Spacing within Active Span</Label>
            <p className="text-sm text-gray-100 mt-2">
              {spanAndSpacing.spacingMm > 0
                ? `${spanAndSpacing.spacingMm.toFixed(0)} mm between mullions`
                : 'Adjust mullions to compute spacing'}
            </p>
              {activePackPreset ? (
                <p className="text-[11px] text-gray-500">
                  {`Preset (${project?.systemPackId?.toUpperCase()}): panels ${activePackPreset.minPanelWidthMm.toFixed(
                    0,
                  )}–${activePackPreset.maxPanelWidthMm.toFixed(0)} mm, typical ${activePackPreset.typicalPanelWidthsMm
                    .map((v) => v.toFixed(0))
                    .join(', ')} mm`}
                </p>
              ) : (
                constraints?.minWidthMm && (
                  <p className="text-[11px] text-gray-500">
                    System min panel width: {constraints.minWidthMm.toFixed(0)} mm
                  </p>
                )
              )}
          </div>
          <div>
            <Label className="text-xs text-gray-300">Current Span &amp; Panels</Label>
            <p className="text-sm text-gray-100 mt-2">
              {spanAndSpacing.spanMm > 0
                ? `${spanAndSpacing.spanMm.toFixed(0)} mm span, ${
                    mullionsMm.length + 1
                  } panel${mullionsMm.length + 1 > 1 ? 's' : ''}`
                : 'Drag first / last mullions to define span'}
            </p>
            {spacingPerPanel > 0 && (
              <p className="text-[11px] text-gray-500">
                Approx. panel width between first / last: {spacingPerPanel.toFixed(0)} mm
              </p>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-lg border border-gray-700 bg-gray-950/80 p-3">
          <canvas
            ref={canvasRef}
            className="w-full h-40 cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <p className="text-[11px] text-gray-500 mt-2">
            Drag the <span className="text-orange-400 font-semibold">orange</span> mullions (first / last)
            to define the active span. Intermediate mullions are auto-spaced.
          </p>
        </div>

        {/* Validation Feedback */}
        {(spanAndSpacing.errors.length > 0 || !validation.isValid) && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                {spanAndSpacing.errors.map((err, idx) => (
                  <div key={`spacing-${idx}`}>{err.message}</div>
                ))}
                {validation.errors.map((err, idx) => (
                  <div key={`layout-${idx}`}>{err.message}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {spanAndSpacing.errors.length === 0 && validation.isValid && mullionsMm.length > 0 && (
          <Alert className="bg-emerald-900/20 border-emerald-500">
            <AlertDescription className="text-sm text-emerald-100">
              Layout satisfies current system constraints. Ready for export to optimization.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600 text-xs"
            disabled={!project || mullionsMm.length === 0 || !onApplyLayout}
            onClick={handleApplyLayout}
          >
            Apply Layout to Project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartDrawTool;


