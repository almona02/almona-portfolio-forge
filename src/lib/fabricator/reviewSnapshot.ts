import type { CompleteBOM } from './PresetAwareBOMGenerator';
import type { WindowUnit, OptimizationResult } from '@/types/fabricator';
import type { WorkflowIdentity } from '@/store/workflowStore';
import { workflowIdentityMatches } from '@/store/workflowStore';
import { approvedBOMContext } from './bom/approvedBOMContext';
import { assessBOMQualification } from './bom/bomQualification';
import { bomMatchesPhysicalDesign } from './validation/WorkflowValidator';
import { resolveEstimatePattern } from './bom/resolveEstimatePattern';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from './systemPackSupabase';
const key = (identity: WorkflowIdentity) => 'fabricator-review:' + identity.ownerUserId + ':' + identity.projectId + ':' + identity.positionId + ':' + identity.revision;
export function saveReviewSnapshot(identity: WorkflowIdentity, bom: CompleteBOM | null): void {
    if (!bom || !workflowIdentityMatches(bom.qualification?.identity ?? null, identity))
        return;
    localStorage.setItem(key(identity), JSON.stringify({ identity, bom }));
}
export async function loadReviewSnapshot(identity: WorkflowIdentity, position: WindowUnit): Promise<CompleteBOM | null> {
    try {
        const raw = localStorage.getItem(key(identity));
        if (!raw)
            return null;
        const snapshot = JSON.parse(raw);
        if (!workflowIdentityMatches(snapshot.identity, identity) || !snapshot.bom?.profiles?.length)
            return null;
        const custom = await loadCustomSystemsFromSupabase(identity.ownerUserId);
        const pack = custom.find(p => p.meta.id === position.systemPackId) ?? SYSTEM_PACKS.find(p => p.meta.id === position.systemPackId);
        if (!pack || !bomMatchesPhysicalDesign(snapshot.bom, position, pack))
            return null;
        let context;
        try {
            context = await approvedBOMContext(position, identity, pack);
        }
        catch {
            context = { identity };
        }
        const qualification = assessBOMQualification(position, resolveEstimatePattern(position), snapshot.bom.profiles, context);
        return { ...snapshot.bom, qualification };
    }
    catch {
        return null;
    }
}
export interface VerifiedReview {
    bom?: CompleteBOM | null;
    optimizationResult?: OptimizationResult | null;
}
