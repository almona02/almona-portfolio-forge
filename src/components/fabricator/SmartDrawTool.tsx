import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import { Slider } from '@/shared/ui/ui/slider';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Input } from '@/shared/ui/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
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
import type { SystemConstraints } from '@/lib/fabricatorValidation';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('fabricator');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  // Total number of mullions inside the opening (including first/last).
  const [totalMullions, setTotalMullions] = useState<number>(3);

  // First / last mullion positions in mm from the left edge.
  const [firstMullionMm, setFirstMullionMm] = useState<number | null>(null);
  const [lastMullionMm, setLastMullionMm] = useState<number | null>(null);

  // Optional fixed horizontal mullion (transom)
  const [enableHorizontal, setEnableHorizontal] = useState(false);
  const [horizontalPositionMm, setHorizontalPositionMm] = useState<number | null>(null);
  const [horizontalLocation, setHorizontalLocation] = useState<'frame' | 'sash'>('frame');

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

  /**
   * Professional-grade effective constraints that prioritise system-pack
   * presets (Smart Draw preset) when available and fall back to inventory-
   * derived limits otherwise.
   */
  const effectiveConstraints: SystemConstraints | null = useMemo(() => {
    if (!constraints && !activePackPreset) return constraints ?? null;

    const base: SystemConstraints = {
      minWidthMm: constraints?.minWidthMm,
      maxWidthMm: constraints?.maxWidthMm,
      minHeightMm: constraints?.minHeightMm,
      maxHeightMm: constraints?.maxHeightMm,
      maxAreaM2: constraints?.maxAreaM2,
    };

    if (activePackPreset?.minPanelWidthMm !== undefined) {
      base.minWidthMm = activePackPreset.minPanelWidthMm;
    }
    if (activePackPreset?.maxPanelWidthMm !== undefined) {
      base.maxWidthMm = activePackPreset.maxPanelWidthMm;
    }

    return base;
  }, [constraints, activePackPreset]);

  const overallWidth = project?.overallWidth ?? 0;
  const overallHeight = project?.overallHeight ?? 0;

  // Initialise / clamp mullion positions when project changes
  useEffect(() => {
    if (!overallWidth) {
      setFirstMullionMm(null);
      setLastMullionMm(null);
      return;
    }

    const defaultFirst = overallWidth * 0.25;
    const defaultLast = overallWidth * 0.75;
    const minEdge = effectiveConstraints?.minWidthMm ?? 80;
    const maxEdge = overallWidth - (effectiveConstraints?.minWidthMm ?? 80);

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

  // Initialise / clamp horizontal mullion position when project changes
  useEffect(() => {
    if (!overallHeight) {
      setHorizontalPositionMm(null);
      return;
    }

    setHorizontalPositionMm((prev) => {
      if (prev == null || prev <= 0 || prev >= overallHeight) {
        return overallHeight / 2;
      }
      return Math.max(0, Math.min(prev, overallHeight));
    });
  }, [overallHeight]);

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
      minSpacingMm: effectiveConstraints?.minWidthMm,
      maxSpacingMm: effectiveConstraints?.maxWidthMm,
    });

    return {
      spanMm,
      spacingMm: equal.spacingMm,
      errors: equal.errors,
    };
  }, [overallWidth, firstMullionMm, lastMullionMm, totalMullions, effectiveConstraints]);

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

    return validateProjectLayoutWithConstraints(project, effectiveConstraints, mullionsMm);
  }, [project, effectiveConstraints, mullionsMm]);

  // Derive a simple tolerance status for spacing based on system-pack "typical" widths.
  const spacingToleranceStatus: 'ok' | 'warning' | 'error' | 'idle' = useMemo(() => {
    if (!project || !overallWidth || mullionsMm.length === 0 || spanAndSpacing.spacingMm <= 0) {
      return 'idle';
    }

    if (spanAndSpacing.errors.length > 0 || !validation.isValid) {
      return 'error';
    }

    if (!activePackPreset || !activePackPreset.typicalPanelWidthsMm?.length) {
      return 'ok';
    }

    const spacing = spanAndSpacing.spacingMm;
    const nearestTypical = activePackPreset.typicalPanelWidthsMm.reduce((best, v) => {
      const bestDiff = Math.abs(best - spacing);
      const diff = Math.abs(v - spacing);
      return diff < bestDiff ? v : best;
    }, activePackPreset.typicalPanelWidthsMm[0]);

    const toleranceMm = 10; // ±10mm comfort band around typical catalogue widths
    const diff = Math.abs(spacing - nearestTypical);

    if (diff <= toleranceMm) return 'ok';
    return 'warning';
  }, [project, overallWidth, mullionsMm, spanAndSpacing, validation, activePackPreset]);

  /**
   * One-click helper: choose a sensible span and mullion count based on the
   * active system pack preset (if available), so operators don't have to drag
   * handles from scratch.
   */
  const applySystemDefaultLayout = useCallback(() => {
    if (!project || !overallWidth) return;

    const edgeMargin = effectiveConstraints?.minWidthMm ?? 80;
    const maxInnerSpan = Math.max(overallWidth - edgeMargin * 2, 0);
    let desiredSpan = overallWidth * 0.8;
    if (desiredSpan > maxInnerSpan) desiredSpan = maxInnerSpan;

    let recommendedCount = totalMullions;

    if (activePackPreset && activePackPreset.recommendedMullionCounts.length > 0) {
      // Pick a recommended count that keeps panel widths inside min/max where possible.
      const candidates = activePackPreset.recommendedMullionCounts;
      const minPanel = effectiveConstraints?.minWidthMm ?? activePackPreset.minPanelWidthMm;
      const maxPanel = effectiveConstraints?.maxWidthMm ?? activePackPreset.maxPanelWidthMm;

      let best: number | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      candidates.forEach((c) => {
        if (c < 2) return;
        const segments = c - 1;
        if (segments <= 0) return;
        const panelWidth = desiredSpan / segments;
        if (panelWidth <= 0) return;

        const inside =
          (minPanel === undefined || panelWidth >= minPanel) &&
          (maxPanel === undefined || panelWidth <= maxPanel);

        // Prefer inside band, then closest to default spacing.
        const spacingDiff = activePackPreset.defaultMullionSpacingMm
          ? Math.abs(panelWidth - activePackPreset.defaultMullionSpacingMm)
          : 0;
        const score = inside ? spacingDiff : spacingDiff + 10_000;

        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      });

      if (best && best >= 2) {
        recommendedCount = best;
      }
    } else if (recommendedCount < 2) {
      recommendedCount = 3;
    }

    setTotalMullions(recommendedCount);

    // Place span symmetrically inside the opening
    const start = (overallWidth - desiredSpan) / 2;
    const end = start + desiredSpan;
    setFirstMullionMm(start);
    setLastMullionMm(end);
  }, [project, overallWidth, effectiveConstraints, activePackPreset, totalMullions]);

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
        t('smart_draw_tool.no_project', 'No project loaded. Complete Smart Measuring first.'),
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
    const panelWidthsMm: number[] = [];
    ctx.save();
    for (let i = 0; i < allPositions.length - 1; i += 1) {
      const leftMm = allPositions[i];
      const rightMm = allPositions[i + 1];
      const panelWidthMm = rightMm - leftMm;
      panelWidthsMm.push(panelWidthMm);

      const x = padding + leftMm * scaleX;
      const w = panelWidthMm * scaleX;

      ctx.fillStyle = i % 2 === 0 ? '#0f172a' : '#020617';
      ctx.fillRect(x, padding, w, frameHeight);
    }
    ctx.restore();

    // Panel width labels for professional feedback (kept subtle for readability)
    if (panelWidthsMm.length <= 8) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < panelWidthsMm.length; i += 1) {
        const leftMm = allPositions[i];
        const rightMm = allPositions[i + 1];
        const centerX = padding + ((leftMm + rightMm) / 2) * scaleX;
        ctx.fillText(
          `${panelWidthsMm[i].toFixed(0)} mm`,
          centerX,
          padding + frameHeight / 2,
        );
      }
    }

    // Draw vertical mullions
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

    // Optional horizontal mullion (transom)
    if (enableHorizontal && horizontalPositionMm != null && overallHeight > 0) {
      const clampedPos = Math.max(0, Math.min(horizontalPositionMm, overallHeight));
      // 0mm = sill (bottom), overallHeight = head (top)
      const yRatio = clampedPos / overallHeight;
      const y = padding + frameHeight * (1 - yRatio);

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + frameWidth, y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#22c55e'; // green transom
      ctx.stroke();
    }

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
  }, [project, overallWidth, overallHeight, mullionsMm, enableHorizontal, horizontalPositionMm]);

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

      const thresholdPx = 28; // make picking the orange handles easier / less "weak"
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

    const minEdge = effectiveConstraints?.minWidthMm ?? constraints?.minWidthMm ?? 80;
    const maxEdge = overallWidth - (effectiveConstraints?.minWidthMm ?? constraints?.minWidthMm ?? 80);
    const minGap = effectiveConstraints?.minWidthMm ?? constraints?.minWidthMm ?? 80;

    let mm = (x - padding) / scaleX;

    // Snap to sensible increments (5mm) for professional but controllable layouts
    const snapStepMm = 5;
    mm = Math.round(mm / snapStepMm) * snapStepMm;
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

    const allComponents = [...components];

    // Add a single fixed horizontal mullion (transom) if requested by the user
    if (enableHorizontal && horizontalPositionMm != null && overallHeight > 0) {
      const transomProfile = mullionProfile ?? profiles[0] ?? null;
      if (transomProfile) {
        const allowance = transomProfile.cuttingAllowance ?? 0;
        const cutLength = overallWidth + allowance * 2;
        const id = `transom_${project.id}_${Math.round(horizontalPositionMm)}`;

        allComponents.push({
          id,
          type: 'transom',
          profile: transomProfile,
          width: overallWidth,
          height: transomProfile.width,
          quantity: 1,
          cuttingLengths: [cutLength],
          angles: [90],
          machiningOperations: [
            {
              code: horizontalLocation === 'frame' ? 'TRANSOM_FRAME' : 'TRANSOM_SASH',
              description:
                horizontalLocation === 'frame'
                  ? `Transom in frame at ${horizontalPositionMm.toFixed(0)} mm from sill`
                  : `Transom inside sash at ${horizontalPositionMm.toFixed(
                      0,
                    )} mm from sill`,
            } as any,
          ],
          glazingType: String((project as any).glazing?.type ?? 'double'),
          hardware: [],
        });
      }
    }

    const allErrors = [...spanAndSpacing.errors, ...validation.errors];

    onApplyLayout({
      layout,
      components: allComponents,
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
            {t('smart_draw_tool.title', 'Smart Draw – Facade Layout')}
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
            <Label className="text-xs text-gray-300">{t('smart_draw_tool.total_mullions', 'Total Mullions between First & Last')}</Label>
            <Slider
              min={2}
              max={8}
              step={1}
              value={[totalMullions]}
              onValueChange={([value]) => setTotalMullions(value)}
              className="mt-2"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('smart_draw_tool.mullions_count', '{count} vertical bar{plural} in the active span.', {
                count: totalMullions,
                plural: totalMullions > 1 ? 's' : ''
              })}
            </p>
          </div>
          <div>
            <Label className="text-xs text-gray-300">{t('smart_draw_tool.equal_spacing', 'Equal Spacing within Active Span')}</Label>
            <p
              className={`text-sm mt-2 ${
                spacingToleranceStatus === 'error'
                  ? 'text-red-400'
                  : spacingToleranceStatus === 'warning'
                  ? 'text-yellow-300'
                  : 'text-gray-100'
              }`}
            >
              {spanAndSpacing.spacingMm > 0
                ? t('smart_draw_tool.spacing_between', '{spacing} mm between mullions', { spacing: spanAndSpacing.spacingMm.toFixed(0) })
                : t('smart_draw_tool.adjust_mullions', 'Adjust mullions to compute spacing')}
            </p>
              {activePackPreset ? (
                <p className="text-[11px] text-gray-500">
                  {t('smart_draw_tool.preset_info', 'Preset ({system}): panels {min}–{max} mm, typical {typical} mm (±10mm comfort band)', {
                    system: project?.systemPackId?.toUpperCase() || '',
                    min: activePackPreset.minPanelWidthMm.toFixed(0),
                    max: activePackPreset.maxPanelWidthMm.toFixed(0),
                    typical: activePackPreset.typicalPanelWidthsMm.map((v) => v.toFixed(0)).join(', ')
                  })}
                </p>
              ) : (
                constraints?.minWidthMm && (
                  <p className="text-[11px] text-gray-500">
                    {t('smart_draw_tool.system_min_panel', 'System min panel width: {width} mm', { width: constraints.minWidthMm.toFixed(0) })}
                  </p>
                )
              )}
          </div>
          <div>
            <Label className="text-xs text-gray-300">{t('smart_draw_tool.current_span', 'Current Span & Panels')}</Label>
            <p className="text-sm text-gray-100 mt-2">
              {spanAndSpacing.spanMm > 0
                ? t('smart_draw_tool.span_panels', '{span} mm span, {panels} panel{plural}', {
                    span: spanAndSpacing.spanMm.toFixed(0),
                    panels: mullionsMm.length + 1,
                    plural: mullionsMm.length + 1 > 1 ? 's' : ''
                  })
                : t('smart_draw_tool.drag_to_define', 'Drag first / last mullions to define span')}
            </p>
            {spacingPerPanel > 0 && (
              <p className="text-[11px] text-gray-500">
                {t('smart_draw_tool.approx_panel_width', 'Approx. panel width between first / last: {width} mm', { width: spacingPerPanel.toFixed(0) })}
              </p>
            )}
          </div>
        </div>

        {/* Horizontal mullion controls */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-horizontal"
              checked={enableHorizontal}
              onCheckedChange={(checked) => setEnableHorizontal(checked === true)}
            />
            <Label htmlFor="enable-horizontal" className="text-xs text-gray-300">
              {t('smart_draw_tool.add_horizontal', 'Add fixed horizontal mullion (transom)')}
            </Label>
          </div>
          {enableHorizontal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <Label className="text-[11px] text-gray-300">{t('smart_draw_tool.position_from_sill', 'Position from sill (mm)')}</Label>
                <Input
                  type="number"
                  value={horizontalPositionMm ?? ''}
                  onChange={(e) => {
                    const raw = Number(e.target.value) || 0;
                    if (!overallHeight) {
                      setHorizontalPositionMm(raw);
                      return;
                    }
                    const clamped = Math.max(0, Math.min(raw, overallHeight));
                    setHorizontalPositionMm(clamped);
                  }}
                  placeholder={overallHeight ? String(Math.round(overallHeight / 2)) : 'e.g. 900'}
                  className="h-8 bg-gray-900 border-gray-700 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-300">{t('smart_draw_tool.location', 'Location')}</Label>
                <Select
                  value={horizontalLocation}
                  onValueChange={(v) => setHorizontalLocation(v as 'frame' | 'sash')}
                >
                  <SelectTrigger className="h-8 bg-gray-900 border-gray-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                    <SelectItem value="frame">{t('smart_draw_tool.in_frame', 'In frame (before sash)')}</SelectItem>
                    <SelectItem value="sash">{t('smart_draw_tool.inside_sash', 'Inside sash (leaf)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>
            {t('smart_draw_tool.use_slider', 'Use the slider or drag the')}{' '}
            <span className="text-orange-400 font-semibold">{t('smart_draw_tool.orange_mullions', 'orange mullions')}</span>{' '}
            {t('smart_draw_tool.for_fine_tuning', 'for fine‑tuning.')}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] border-orange-500/60 text-orange-300"
            onClick={applySystemDefaultLayout}
            disabled={!project || !overallWidth}
          >
            {t('smart_draw_tool.auto_mullions', 'Auto mullions (system)')}
          </Button>
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
            {t('smart_draw_tool.drag_instructions_start', 'Drag the')}{' '}
            <span className="text-orange-400 font-semibold">{t('smart_draw_tool.orange', 'orange')}</span>{' '}
            {t('smart_draw_tool.drag_instructions_end', 'mullions (first / last) to define the active span. Intermediate mullions are auto-spaced.')}
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
              {t('smart_draw_tool.layout_ready', 'Layout satisfies current system constraints. Ready for export to optimization.')}
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
            {t('smart_draw_tool.apply_layout', 'Apply Layout to Project')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartDrawTool;


