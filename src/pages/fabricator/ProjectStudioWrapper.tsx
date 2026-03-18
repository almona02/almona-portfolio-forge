import { ProjectStudio } from '@/components/fabricator/project/ProjectStudio';
import { PageLoadingWrapper } from '@/components/ui/PageLoadingWrapper';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useProject, useProjectPositions } from '@/hooks/useFabricatorQueries';
<<<<<<< HEAD
import React from 'react';
=======
import { FeatureFlags } from '@/lib/featureFlags';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { BarChart3, Layout } from 'lucide-react';
import React, { useMemo, useState } from 'react';
>>>>>>> origin/main
import { useParams } from 'react-router-dom';

export const ProjectStudioWrapper: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const useV2 = FeatureFlags.FABRICATOR_READ_V2 && !!projectId;
    const [view, setView] = useState<'summary' | 'studio'>('summary');

    const { data: projectMeta, isLoading: loadingProject } = useProject(useV2 ? projectId : undefined);
    const positions = useProjectPositions(useV2 ? projectId : undefined);

    const allProfiles = useMemo(() => {
        return SYSTEM_PACKS.flatMap(pack => pack.profiles || []);
    }, []);

    if (useV2 && loadingProject) {
        return <PageLoadingWrapper message="Loading Project..." variant="fullscreen"><div /></PageLoadingWrapper>;
    }

    return (
<<<<<<< HEAD
        <ProjectStudio
            projectId={projectId}
            initialProject={projectData}
            profiles={allProfiles}
        />
=======
        <div className="flex flex-col h-full overflow-hidden">
            {/* View toggle */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-amber-600/20 bg-[#0c0c0c]">
                <div>
                    <h2 className="text-lg font-bold text-amber-200">
                        {projectMeta?.project_name || projectMeta?.project_code || projectId || 'Project'}
                    </h2>
                    <p className="text-xs text-amber-600/60 font-mono">
                        {projectMeta?.client_name || 'Client'} &mdash; {positions.length} position{positions.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as 'summary' | 'studio')}>
                    <TabsList className="bg-slate-900/60 border-amber-600/20">
                        <TabsTrigger value="summary" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
                            <BarChart3 size={14} className="mr-1" /> Summary
                        </TabsTrigger>
                        <TabsTrigger value="studio" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
                            <Layout size={14} className="mr-1" /> Studio
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {view === 'summary' ? (
                    <ProjectSummaryDashboard
                        projectId={projectId}
                        projectMeta={projectMeta}
                        positions={positions}
                        onOpenStudio={() => setView('studio')}
                    />
                ) : (
                    <ProjectStudio
                        projectId={projectId}
                        profiles={allProfiles as any}
                    />
                )}
            </div>
        </div>
>>>>>>> origin/main
    );
};

export default ProjectStudioWrapper;
