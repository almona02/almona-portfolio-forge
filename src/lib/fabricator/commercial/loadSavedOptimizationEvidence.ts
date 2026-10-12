import { supabase } from '@/lib/supabase';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import type { WorkflowIdentity } from '@/store/workflowStore';
import { resolveManufacturingAuthority } from '../manufacturing/ManufacturingAuthorityResolver';
import { approvedRuleContentFingerprint, validateOptimizationEvidencePayload, type OptimizationEvidencePayload } from './validateOptimizationEvidencePayload';
export async function loadSavedOptimizationEvidence(identity: WorkflowIdentity, position: WindowUnit): Promise<OptimizationResult | null> {
    try {
        const { data, error } = await (supabase as any).from('fabricator_optimization_evidence').select('*')
            .eq('position_id', identity.positionId).eq('project_id', identity.projectId).eq('owner_user_id', identity.ownerUserId)
            .eq('position_revision', identity.revision).is('invalidated_at', null).maybeSingle();
        if (error || !data || data.system_pack_id !== position.systemPackId || Number(data.quantity) !== (position.quantity ?? 1))
            return null;
        const authority = await resolveManufacturingAuthority(identity.positionId, identity.revision);
        if (authority.authorityApprovalId !== data.authority_approval_id || authority.systemPack.revision !== data.system_pack_revision || await approvedRuleContentFingerprint(authority.cuttingRules) !== data.rule_version)
            return null;
        const payload = data.evidence_payload as OptimizationEvidencePayload & {
            displayResult?: Pick<OptimizationResult, 'costBreakdown' | 'estimatedProductionTime'>;
        };
        if (!payload?.displayResult?.costBreakdown || !validateOptimizationEvidencePayload(payload, data.cut_count).ok)
            return null;
        const result = { materialUsage: payload.materialUsage, wastePercentage: payload.wastePercentage, nestingEfficiency: payload.nestingEfficiency, cuttingPlan: payload.cuttingPlan, ...payload.displayResult };
        return result as OptimizationResult;
    }
    catch {
        return null;
    }
}
