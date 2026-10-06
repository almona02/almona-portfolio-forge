import type { WindowUnit } from '@/types/fabricator';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { BOMQualificationContext } from './bomQualification';
import { resolveManufacturingAuthority } from '../manufacturing/ManufacturingAuthorityResolver';

export async function approvedBOMContext(project: WindowUnit, identity: WorkflowIdentity | null): Promise<BOMQualificationContext> {
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
  return {
    identity,
    catalogueVersion: `${authority.authorityApprovalId}:${authority.systemPack.revision}`,
    ruleVersion: authority.cuttingRules.map(rule => `${rule.approvalId}:${rule.ruleId}:${rule.revision}`).join('|'),
  };
}
