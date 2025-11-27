import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { useJobsStore } from '@/store/jobsStore';
import { PositionsGrid } from '@/components/fabricator/PositionsGrid';

const ProjectsPage: React.FC = () => {
  const { jobs } = useJobsStore();

  const totalUnits = jobs.length;
  const totalPoses = jobs.reduce((sum, job) => sum + (job.quantity || 1), 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <Card className="bg-gray-900/80 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Projects & Positions</CardTitle>
          <CardDescription className="text-sm text-gray-400">
            Overview of all window units (poses) created in Fabricator Workflow – grouped by order
            and project metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-xs text-gray-300">
          <div>
            <span className="text-gray-400">Distinct units:</span>{' '}
            <span className="font-semibold text-gray-100">{totalUnits}</span>
          </div>
          <div>
            <span className="text-gray-400">Total poses:</span>{' '}
            <span className="font-semibold text-gray-100">{totalPoses}</span>
          </div>
        </CardContent>
      </Card>

      <PositionsGrid currentProject={null} />
    </div>
  );
};

export default ProjectsPage;


