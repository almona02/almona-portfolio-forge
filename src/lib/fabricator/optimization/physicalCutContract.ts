import { calibrationManager } from '@/lib/calibration/CalibrationManager';
import type { Cut, Profile, WindowUnit } from '@/types/fabricator';

/** One physical occurrence, shared by the solver and its acceptance gate. */
export function physicalCutForOccurrence(
  component: WindowUnit['components'][number],
  index: number,
  profile: Profile,
  systemPackId?: string,
): Cut {
  const specs = profile.specifications || {};
  const pack = systemPackId || (specs.systemPackId as string | undefined) || '';
  const calibration = pack ? calibrationManager.getActiveCalibration(profile, pack) : null;
  const border = (profile.type === 'frame' || specs.egyptFrameType === 'sliding' || specs.egyptFrameType === 'casement')
    && specs.egyptBorderIncluded === 'with';
  const allowance = (profile.cuttingAllowance ?? 0) + (border ? (specs.borderExtraAllowanceMm as number | undefined) ?? 5 : 0);
  return {
    length: calibrationManager.applyCalibration(component.cuttingLengths[index] + allowance, calibration),
    angle: specs.cuttingType === 'miter_45' || specs.optimizedFor45Degree === true ? 45 : component.angles?.[index] || 90,
    componentId: component.id,
    cutId: `${component.id}:${index}`,
    occurrenceIndex: index,
    componentType: (specs.profileRole as string | undefined) || component.type,
    waste: allowance,
  };
}
