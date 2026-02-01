import React, { useEffect } from 'react';
import { Ruler, Settings, Scissors, Factory, Zap, CheckCircle2 } from 'lucide-react';
import { useJobsStore } from '@/store/jobsStore';
import { JobColumn } from './JobColumn';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/ui/button';

const workflowSteps = [
  { id: 'measuring', name: 'Measuring', icon: Ruler },
  { id: 'design', name: 'Design', icon: Settings },
  { id: 'optimized', name: 'Optimized', icon: Scissors },
  { id: 'production', name: 'Production', icon: Factory },
  { id: 'quality', name: 'Quality', icon: Zap },
  { id: 'delivered', name: 'Delivered', icon: CheckCircle2 },
];

export const JobBoardView: React.FC = () => {
  const { jobs, isLoading, loadJobs } = useJobsStore();

  useEffect(() => {
    if (!jobs.length) {
      loadJobs();
    }
  }, [jobs.length, loadJobs]);

  if (isLoading && !jobs.length) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        Loading jobs...
      </div>
    );
  }

  if (!isLoading && jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="typography-h2 text-lg font-semibold text-gray-100">Job Board</h2>
          <span className="text-xs text-gray-400">No projects yet</span>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 text-sm text-gray-300 max-w-md">
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
              First time setup
            </div>
            <div className="font-medium text-gray-100">
              You don&apos;t have any saved projects yet.
            </div>
            <div className="text-xs text-gray-400">
              Start by creating your first fabrication project, or register a customer that you can
              later pick from the New Project Wizard dropdown.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <Link to="/fabricator-workflow">
              <Button size="sm" className="btn-primary">
                Add first project
              </Button>
            </Link>
            <Link to="/fabricator/customers">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-gray-700 text-gray-200"
              >
                Add customer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="typography-h2 text-lg font-semibold text-gray-100">Job Board</h2>
        <span className="text-xs text-gray-400">{jobs.length} jobs</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto min-w-[640px] md:min-w-0">
        {workflowSteps.map((step) => (
          <JobColumn
            key={step.id}
            stage={step.id}
            title={step.name}
            jobs={jobs.filter((job) => job.status === step.id)}
            icon={step.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default JobBoardView;


