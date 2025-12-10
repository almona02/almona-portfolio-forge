import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { WindowUnit, Profile, WindowComponent } from '@/types/fabricator';
import { EngineeringBay } from './EngineeringBay';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  onHardwareUpdate?: (hardware: any[]) => void;
  onBackToMeasuring?: () => void;
  onAddNewPose?: () => void;
}

/**
 * DesignInterface
 * ----------------------------------------------------------------------------
 * Unified design workspace that combines:
 * - EngineeringBay (v2.0) - The new visual cockpit
 * 
 * EngineeringBay replaces the legacy TechnicalCalculator and integrates SmartDrawCanvas
 * for a unified visual design experience.
 */
export const DesignInterface: React.FC<DesignInterfaceProps> = ({
  project,
  profiles,
  onDesignComplete,
  relatedPositions,
  onSelectPosition,
  // onSmartDrawApply, // Unused in EngineeringBay flow as it handles completion internally
  onHardwareUpdate,
  onBackToMeasuring,
  onAddNewPose,
}) => {
  const { t } = useTranslation('fabricator');
  const hasInventory = profiles && profiles.length > 0;

  const defaultProjectLabel = useMemo(() => {
    if (!project) return t('design_interface.no_project', 'No active project – complete Smart Measuring first.');
    const areaM2 =
      project.overallWidth && project.overallHeight
        ? (project.overallWidth * project.overallHeight) / 1_000_000
        : 0;
    return `${project.orderNumber} · ${project.overallWidth.toFixed(0)} × ${project.overallHeight.toFixed(
      0,
    )} mm${areaM2 > 0 ? ` · ${areaM2.toFixed(2)} m²` : ''}`;
  }, [project, t]);

  return (
    <div className="space-y-4">
      {/* Compact banner explaining the dual‑path design flow */}
      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader className="py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-orange-400" />
              {t('design_interface.title', 'Design Workspace – Engineering Bay')}
            </CardTitle>
            <div className="flex flex-col md:items-end gap-1">
              <p className="text-[11px] text-gray-400 truncate max-w-xs">
                {defaultProjectLabel}
              </p>
              {project && relatedPositions && relatedPositions.length > 1 && onSelectPosition && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">{t('design_interface.pose_in_order', 'Pose in order')}</span>
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
            {t('design_interface.inventory_not_loaded', 'Inventory profiles are not loaded yet. Smart Draw and the engineering bay work best once profile data is available from the Inventory tab.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full">
          <EngineeringBay
            project={project}
            onDesignComplete={onDesignComplete}
            onHardwareUpdate={onHardwareUpdate}
            profiles={profiles}
            relatedPositions={relatedPositions}
            onSelectPosition={onSelectPosition}
            onBackToMeasuring={onBackToMeasuring}
            onAddNewPose={onAddNewPose}
          />
      </div>
    </div>
  );
};

export default DesignInterface;
