import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { WindowUnit, Profile, WindowComponent } from '@/types/fabricator';
import { TechnicalCalculator } from './TechnicalCalculator';
import { SmartDrawTool } from './SmartDrawTool';
import { LayoutGrid, Sparkles } from 'lucide-react';

interface DesignInterfaceProps {
  project: WindowUnit | null;
  profiles: Profile[];
  onDesignComplete: (components: WindowComponent[]) => void;
  /**
   * Optional list of related positions/poses (e.g. all units for the same order)
   * to allow the designer to switch which pose is currently active.
   */
  relatedPositions?: WindowUnit[];
  onSelectPosition?: (unitId: string) => void;
  /**
   * Optional callback fired when SmartDraw applies a layout. If provided,
   * this is used instead of calling onDesignComplete directly so callers
   * can drive multi‑pose flows (e.g. "add another pose or optimise").
   */
  onSmartDrawApply?: (components: WindowComponent[]) => void;
}

/**
 * DesignInterface
 * ----------------------------------------------------------------------------
 * Unified design workspace that combines:
 * - TechnicalCalculator (component-level specification + ROCK60 templates)
 * - SmartDrawTool (facade / mullion layout with equal-spacing canvas)
 *
 * Any layout exported from SmartDrawTool is immediately forwarded into the
 * standard design → optimization pipeline via onDesignComplete, so the rest
 * of FabricatorWorkflowPro does not need to change.
 */
export const DesignInterface: React.FC<DesignInterfaceProps> = ({
  project,
  profiles,
  onDesignComplete,
  relatedPositions,
  onSelectPosition,
  onSmartDrawApply,
}) => {
  const hasInventory = profiles && profiles.length > 0;

  const defaultProjectLabel = useMemo(() => {
    if (!project) return 'No active project – complete Smart Measuring first.';
    const areaM2 =
      project.overallWidth && project.overallHeight
        ? (project.overallWidth * project.overallHeight) / 1_000_000
        : 0;
    return `${project.orderNumber} · ${project.overallWidth.toFixed(0)} × ${project.overallHeight.toFixed(
      0,
    )} mm${areaM2 > 0 ? ` · ${areaM2.toFixed(2)} m²` : ''}`;
  }, [project]);

  return (
    <div className="space-y-4">
      {/* Compact banner explaining the dual‑path design flow */}
      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader className="py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-orange-400" />
              Design Workspace – Calculator + Smart Draw
            </CardTitle>
            <div className="flex flex-col md:items-end gap-1">
              <p className="text-[11px] text-gray-400 truncate max-w-xs">
                {defaultProjectLabel}
              </p>
              {project && relatedPositions && relatedPositions.length > 1 && onSelectPosition && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Pose in order</span>
                  <select
                    className="h-7 rounded-md bg-gray-900 border border-gray-700 text-[11px] px-2 text-gray-100"
                    value={project.id}
                    onChange={(e) => onSelectPosition(e.target.value)}
                  >
                    {relatedPositions.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.posNumber} · {unit.overallWidth.toFixed(0)} ×{' '}
                        {unit.overallHeight.toFixed(0)} mm
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!hasInventory && (
        <Alert className="bg-yellow-900/20 border-yellow-500">
          <AlertDescription className="text-xs">
            Inventory profiles are not loaded yet. Smart Draw and the technical calculator
            work best once profile data is available from the Inventory tab.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Main technical calculator (2/3 width on large screens) */}
        <div className="xl:col-span-2">
          <TechnicalCalculator
            project={project}
            onDesignComplete={onDesignComplete}
            profiles={profiles}
          />
        </div>

        {/* Smart Draw side panel */}
        <div className="xl:col-span-1 space-y-3">
          <Card className="bg-gray-900/70 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid className="h-4 w-4 text-orange-400" />
                Smart Draw – Fast Facade Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-gray-400 mb-3">
                Use Smart Draw to define mullion positions visually. When you apply a layout,
                the generated mullion components are sent directly into the optimization
                engine, just like components created via the technical calculator.
              </p>
            </CardContent>
          </Card>

          <SmartDrawTool
            project={project}
            profiles={profiles}
            onApplyLayout={(payload) => {
              // Reuse the existing design → optimization flow.
              // SmartDraw already performs validation and exposes errors in its own UI.
              if (!payload.components || payload.components.length === 0) {
                return;
              }
              if (onSmartDrawApply) {
                onSmartDrawApply(payload.components);
              } else {
                onDesignComplete(payload.components);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DesignInterface;


