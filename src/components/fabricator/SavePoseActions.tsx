import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWorkflowStore } from '@/store/workflowStore';
import { fabricatorClientV2 } from '@/lib/supabase/fabricatorClientV2';
import { publishActiveProject } from '@/lib/fabricator/activeProjectBridge';
import { saveReviewSnapshot } from '@/lib/fabricator/reviewSnapshot';
import { Button } from '@/shared/ui/ui/button';
import { toast } from 'sonner';
export function SavePoseActions() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const save = async (close: boolean) => {
        if (saving)
            return;
        const state = useWorkflowStore.getState();
        const identity = state.workflowIdentity;
        const pose = state.currentProject;
        if (!user?.id || !identity || identity.ownerUserId !== user.id || !pose)
            return;
        setSaving(true);
        try {
            if (state.workflowDraftDirty) {
                await fabricatorClientV2.savePose(pose, user.id, { grid: pose.grid as unknown as Record<string, unknown> });
                const receipt = await fabricatorClientV2.getAuthoritativePosition(identity.projectId, identity.positionId, user.id);
                const active = useWorkflowStore.getState();
                if (active.currentProject?.id !== pose.id || active.workflowIdentity?.ownerUserId !== identity.ownerUserId || active.workflowIdentity?.projectId !== identity.projectId || active.workflowIdentity?.positionId !== identity.positionId)
                    return;
                useWorkflowStore.getState().hydrateAuthoritativePosition(receipt.identity, receipt.position, receipt.review);
            }
            const latest = useWorkflowStore.getState();
            if (!latest.workflowIdentity || latest.workflowIdentity.ownerUserId !== user.id || latest.currentProject?.id !== pose.id)
                return;
            saveReviewSnapshot(latest.workflowIdentity, latest.bom);
            toast.success('Saved for this position revision.');
            if (close) {
                publishActiveProject(null);
                void navigate('/fabricator/studio/projects');
            }
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save. The page remains open.');
        }
        finally {
            setSaving(false);
        }
    };
    return <div className="flex justify-end gap-2 px-3 py-2 border-b border-amber-800/30"><Button variant="outline" disabled={saving} onClick={() => void save(false)}>Save</Button><Button variant="outline" disabled={saving} onClick={() => void save(true)}>Save & close</Button></div>;
}
