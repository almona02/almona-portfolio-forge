import { EgyptianProjectWizard } from '@/components/fabricator/EgyptianProjectWizard';
import NewProjectWizard, { type ProjectHeaderMeta } from '@/components/fabricator/NewProjectWizard';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { supabase } from '@/lib/supabase';
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

            const newProjectId = `project-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            // 2. Construct WindowUnit Object
            const newProject: WindowUnit = {
                id: newProjectId,
                orderNumber: projectCode,
                posNumber: '1', // Default first position
                type: 'window',
                components: [],
                overallWidth: 1200, // Reasonable default
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
                systemPackId: meta.systemPackId,
                quantity: 1,
                // Store Egyptian/Regional constraints in positionMeta
                positionMeta: {
                    siteName: meta.siteName,
                    elevation: meta.siteName, // Use site name as default elevation
                    governorate: meta.governorate,
                    windZone: meta.windZone,
                    exposure: meta.exposure,
                    floorLevel: (meta.floorLevel ?? 0).toString(),
                    usageType: meta.usageType,
                    baseShape: meta.baseShape,
                    openingType: meta.openingType,
                } as any,
                // Store advanced meta if needed by specific logic (optional)
                // meta: { ...meta } 
            };

            // 3. Persist Project locally first (for immediate UI responsiveness)
            addOrUpdateJob(newProject);

            // 4. Update Workspace Context
            workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
            setSelectedJob(newProject.id);

            // 5. Success Feedback & Navigation
            setShowProjectWizard(false);
            setProjectMeta(null);

            toast.success(
                t('fabricator:project.created', 'Project created successfully. Opening drafting center...')
            );

            // 6. Try to get Supabase UUIDs for stable routing.
            //    If Supabase returns UUIDs, navigate with those so the Studio V2
            //    path can resolve the project. Otherwise fall back to client IDs.
            let navProjectId = newProject.id;
            let navPoseId = newProject.id;

            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    // Wait briefly for the fire-and-forget sync to complete
                    await new Promise(resolve => setTimeout(resolve, 800));

                    const { data: dbProject } = await (supabase
                        .from('fabricator_projects') as any)
                        .select('id')
                        .eq('project_code', projectCode)
                        .eq('owner_user_id', authUser.id)
                        .maybeSingle();

                    if (dbProject?.id) {
                        navProjectId = dbProject.id;

                        const { data: dbPose } = await (supabase
                            .from('fabricator_positions') as any)
                            .select('id')
                            .eq('project_id', dbProject.id)
                            .eq('pos_number', '1')
                            .maybeSingle();

                        if (dbPose?.id) {
                            navPoseId = dbPose.id;
                        }
                    }
                }
            } catch {
                // Fallback to client-side IDs if Supabase lookup fails
            }

            navigate(`/fabricator/studio/projects/${navProjectId}/positions/${navPoseId}/design`);

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
