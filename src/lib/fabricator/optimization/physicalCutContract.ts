import { calibrationManager } from '@/lib/calibration/CalibrationManager';
import type { Cut, Profile, WindowUnit } from '@/types/fabricator';

/**
 * Pose quantity multiplies the physical cut multiset (same `componentId:index`
 * identity repeated N times), matching `derive_required_cuts_from_position` and
 * `requiredCutsFromBom(..., poseQuantity)`. AICS-001: apply quantity exactly once
 * on the demand side — never invent copy-suffixed cutIds; never derive required
 * identities from solver placements.
 */
export function poseQuantityOf(unit: Pick<WindowUnit, 'quantity'> | null | undefined): number {
  const quantity = unit?.quantity ?? 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Pose quantity must be a positive integer.');
  }
  return quantity;
}

/** One physical occurrence, shared by the solver and its acceptance gate. */
export function physicalCutForOccurrence(
  component: WindowUnit['components'][number],
  index: number,
  profile: Profile,
  systemPackId?: string,
): Cut {
  const specs = profile.specifications || {};
  const pack = systemPackId || specs.systemPackId || '';
  const calibration = pack ? calibrationManager.getActiveCalibration(profile, pack) : null;
  const border = (profile.type === 'frame' || specs.egyptFrameType === 'sliding' || specs.egyptFrameType === 'casement')
    && specs.egyptBorderIncluded === 'with';
  const allowance = (profile.cuttingAllowance ?? 0) + (border ? specs.borderExtraAllowanceMm ?? 5 : 0);
  return {
    length: calibrationManager.applyCalibration(component.cuttingLengths[index] + allowance, calibration),
    angle: specs.cuttingType === 'miter_45' || specs.optimizedFor45Degree === true ? 45 : component.angles?.[index] || 90,
    componentId: component.id,
    cutId: `${component.id}:${index}`,
    occurrenceIndex: index,
    componentType: specs.profileRole || component.type,
    waste: allowance,
  };
}

/**
 * Expand the saved design ledger by pose quantity. Copies share cut identity
 * (`componentId:index`) so evidence reconciliation stays a multiset match.
 */
export function expandPhysicalCutsForPoseQuantity(
  components: readonly WindowUnit['components'][number][],
  poseQuantity: number,
  systemPackId?: string,
): Cut[] {
  const quantity = poseQuantityOf({ quantity: poseQuantity });
  const cuts: Cut[] = [];
  for (const component of components) {
    if (!component.profile?.id || !component.cuttingLengths?.length) continue;
    for (let copy = 0; copy < quantity; copy += 1) {
      component.cuttingLengths.forEach((_, index) => {
        cuts.push(physicalCutForOccurrence(component, index, component.profile, systemPackId));
      });
    }
  }
  return cuts;
}
