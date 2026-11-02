import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { WindowUnit } from '@/types/fabricator';
import { JobCard } from './JobCard';

interface JobColumnProps {
  stage: string;
  title: string;
  jobs: WindowUnit[];
  icon: LucideIcon;
}

export const JobColumn: React.FC<JobColumnProps> = ({ stage, title, jobs, icon: Icon }) => {
  return (
    <div className="bg-background/80 border border-border rounded-xl p-3 flex flex-col min-h-[160px]">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-amber-400" />
          <h3 className="typography-h3 text-xs text-foreground">
            {title}
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-card text-muted-foreground">
          {jobs.length}
        </span>
      </div>

      <div className="space-y-2 flex-1">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}

        {jobs.length === 0 && (
          <div className="text-center text-muted-foreground text-[11px] py-4">
            No jobs in {title}
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        Stage: <span className="uppercase">{stage}</span>
      </div>
    </div>
  );
};

export default JobColumn;


