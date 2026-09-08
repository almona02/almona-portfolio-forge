import { EgyptianProjectWizard } from '@/components/fabricator/EgyptianProjectWizard';
import NewProjectWizard, { type ProjectHeaderMeta } from '@/components/fabricator/NewProjectWizard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { FeatureFlags } from '@/lib/featureFlags';
import { fabricatorClientV2, persistenceErrorMessage } from '@/lib/supabase/fabricatorClientV2';
import { useJobsStore } from '@/store/jobsStore';
import { WindowUnit } from '@/types/fabricator';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * ProjectCreationManager
 * 
 * Centralized manager for handling "New Project" flows.
 * It listens to URL query parameters (`?new=true`, `?wizard=egypt|standard`)
 * and orchestrates the appropriate wizard dialogs.
 */
export const ProjectCreationManager: React.FC = () => {
    const { t } = useTranslation(['fabricator', 'translation']);
    const location = useLocation();
    const navigate = useNavigate();
    const { addOrUpdateJob, setSelectedJob } = useJobsStore();
    const { dispatch: workspaceDispatch } = useFabricatorWorkspace();
    const { user } = useAuth();

    // Dialog State
    const [showProjectWizard, setShowProjectWizard] = useState(false);
    const [useEgyptWizard, setUseEgyptWizard] = useState(true);
    const [projectMeta, setProjectMeta] = useState<Partial<ProjectHeaderMeta> | null>(null);

    // Monitor URL for triggers
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const isNew = params.get('new') === 'true';
        const wizardType = params.get('wizard');

        if (isNew) {
            setShowProjectWizard(true);

            // Determine wizard type: default to Egypt unless specified
            if (wizardType === 'standard') {
                setUseEgyptWizard(false);
            } else {
                // Default (or explicit 'egypt')
                setUseEgyptWizard(true);
            }

            // Clean URL immediately to prevent re-triggering on refresh
            // We do this by replacing the current history entry
            const newUrl = location.pathname; // strip query params
            window.history.replaceState({}, '', newUrl);
        }
    }, [location.search, location.pathname]);

    const handleProjectCreate = async (meta: ProjectHeaderMeta & {
        governorate?: string;
        windZone?: string;
        exposure?: string;
        floorLevel?: number;
        usageType?: string;
        baseShape?: string;
        openingType?: string;
        recommendedSystemIds?: string[];
    }) => {
        try {
            // 1. Generate Identifiers
            const projectCode = `FP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
            // Generate Client Code: FC-{First3CharsOfClient}-{TimestampSuffix}
            const clientSlug = meta.clientName
                .replace(/\s+/g, '')
                .toUpperCase()
                .slice(0, 3);
            const customerCode = `FC-${clientSlug}-${Date.now().toString(36).toUpperCase().slice(-3)}`;

            const newProjectId = crypto.randomUUID();
            const poseId = crypto.randomUUID();

            // 2. Construct WindowUnit Object
            const newProject: WindowUnit = {
                id: poseId,
                orderNumber: projectCode,
                posNumber: '1', // Default first position
                type: 'window',
                components: [],
                overallWidth: 1200, // Reasonable default — operator sets exact size on Measuring
                overallHeight: 1400,
                color: '#FFFFFF',
                glazing: { type: 'clear', thickness: 24 },
                hardware: [],
                status: 'measuring',
                optimization: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                customer: meta.clientName,
                projectCode,
                customerCode,
                projectId: newProjectId,
                systemPackId: meta.systemPackId,
                quantity: 1,
                // Store Egyptian/Regional constraints in positionMeta
                positionMeta: {
                    siteName: meta.siteName,
                    projectName: meta.projectName || meta.siteName || projectCode,
                    elevation: meta.siteName,
                    governorate: meta.governorate,
                    windZone: meta.windZone,
                    exposure: meta.exposure,
                    floorLevel: (meta.floorLevel ?? 0).toString(),
                    usageType: meta.usageType,
                    baseShape: meta.baseShape,
                    openingType: meta.openingType,
                } as any,
            };

            let persistedProjectId = newProjectId;
            let persistedPoseId = poseId;

            if (FeatureFlags.FABRICATOR_READ_V2 && user?.id) {
                const saved = await fabricatorClientV2.savePose(newProject, user.id);
                persistedProjectId = saved.projectId;
                persistedPoseId = saved.poseId;
                newProject.id = persistedPoseId;
                newProject.projectId = persistedProjectId;
            }

            // 3. Persist Project locally (v2 server write already done above)
            addOrUpdateJob(newProject);

            // 4. Update Workspace Context
            workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
            setSelectedJob(newProject.id);

            // 5. Success Feedback & Navigation
            setShowProjectWizard(false);
            setProjectMeta(null); // Reset meta

            toast.success(
                t('fabricator:project.created', 'Project created. Enter the first window size on Measuring.')
            );

            // 6. Measuring first so each pose's W×H is captured before design
            navigate(fabricatorRoutes.poseMeasuring(persistedProjectId, persistedPoseId));

        } catch (error) {
            console.error('Failed to create project:', error);
            toast.error(t('fabricator:project.create_failed', 'Failed to create project. Please try again.'));
        }
    };

    return (
        <>
            {useEgyptWizard ? (
                <EgyptianProjectWizard
                    open={showProjectWizard}
                    onOpenChange={setShowProjectWizard}
                    initialMeta={projectMeta || undefined}
                    onFallback={() => {
                        // User requested to switch to standard wizard
                        setUseEgyptWizard(false);
                        // Keep the wizard open to switch views
                        setShowProjectWizard(true);
                    }}
                    onSubmit={handleProjectCreate}
                />
            ) : (
                <NewProjectWizard
                    open={showProjectWizard}
                    onOpenChange={setShowProjectWizard}
                    initialMeta={projectMeta || undefined}
                    onSubmit={(meta) => handleProjectCreate({ ...meta })} // Adapt to compatible type
                />
            )}
        </>
    );
};
