import { workshopBOMRules } from './workshopBOMRules';
import { canonicalJsonbSerialize, sha256Hex } from '../commercial/validateOptimizationEvidencePayload';
import type { SystemPack } from '@/types/fabricator';
import { approvedRuleContentFingerprint } from '../commercial/validateOptimizationEvidencePayload';
import type { WindowUnit } from '@/types/fabricator';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { BOMQualificationContext } from './bomQualification';
import { resolveManufacturingAuthority } from '../manufacturing/ManufacturingAuthorityResolver';

export async function approvedBOMContext(project: WindowUnit, identity: WorkflowIdentity | null, pack?: SystemPack | null): Promise<BOMQualificationContext> {
  if (!identity) return {};
  const authority = await resolveManufacturingAuthority(identity.positionId, identity.revision);
  if (authority.projectId !== identity.projectId || authority.positionSource !== identity.source || authority.systemPack.id !== project.systemPackId) {
    throw new Error('Approved authority does not match this saved project, position or system.');
  }
  for (const component of project.components) {
    if (!authority.profiles.some(profile => profile.profileId === component.profile.id)) {
      throw new Error(`Profile ${component.profile.id} is not in the approved catalogue.`);
    }
  }
  if (pack) {
    const requirements = workshopBOMRules(pack);
    if (requirements.length) {
      const fingerprint = await sha256Hex(canonicalJsonbSerialize(requirements));
      if (!authority.cuttingRules.some(rule => rule.applicability?.workshopBomRulesFingerprint === fingerprint)) {
        throw new Error('Workshop BOM requirements need approval for this configuration.');
      }
    }
  }
  return {
    identity,
    catalogueVersion: `${authority.authorityApprovalId}:${authority.systemPack.revision}`,
    ruleVersion: await approvedRuleContentFingerprint(authority.cuttingRules),
  };
}
