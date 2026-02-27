import { ProjectStudio } from '@/components/fabricator/project/ProjectStudio';
import { PageLoadingWrapper } from '@/components/ui/PageLoadingWrapper';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { Profile } from '@/types/fabricator';
import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * Wrapper for ProjectStudio to be used in routing.
 * Handles fetching project data (or mocking it for now) and providing system profiles.
 */
export const ProjectStudioWrapper: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Mock Data Loading Simulation
    // In a real app, useQuery(projectId) here.

    // All available profiles from all system packs for the profile selector
    const allProfiles = React.useMemo(() => {
        return SYSTEM_PACKS.flatMap(pack => pack.profiles || []);
    }, []);

    const [isLoading, setIsLoading] = React.useState(true);
    const [projectData, setProjectData] = React.useState<any>(null);

    React.useEffect(() => {
        // Simulate API fetch
        const timer = setTimeout(() => {
            setProjectData({
                id: projectId || 'proj-demo',
                clientName: 'Demo Client',
                reference: 'REF-2026-X',
                units: [] // Start with empty or load existing
            });
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [projectId]);

    if (isLoading) {
        return <PageLoadingWrapper message="Loading Project Studio..." variant="fullscreen"><div /></PageLoadingWrapper>;
    }

    return (
        <ProjectStudio
            projectId={projectId}
            initialProject={projectData}
            profiles={allProfiles}
        />
    );
};

export default ProjectStudioWrapper; // Default export for lazy loading
