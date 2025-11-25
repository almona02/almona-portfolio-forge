import React, { useEffect } from 'react';
import { Ruler, Settings, Scissors, Factory, Zap, CheckCircle2 } from 'lucide-react';
import { useJobsStore } from '@/store/jobsStore';
import { JobColumn } from './JobColumn';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        Loading jobs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">Job Board</h2>
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


