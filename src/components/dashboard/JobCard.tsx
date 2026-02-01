import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { WindowUnit } from '@/types/fabricator';
import { useJobsStore } from '@/store/jobsStore';

interface JobCardProps {
  job: WindowUnit;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const navigate = useNavigate();
  const { setSelectedJob } = useJobsStore();

  const handleClick = () => {
    setSelectedJob(job.id);
    navigate('/fabricator-workflow', { state: { jobId: job.id } });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="typography-h4 font-medium text-sm truncate">{job.orderNumber}</h4>
        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded capitalize">
          {job.type.replace('_', ' ')}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-1">
        {job.overallWidth} × {job.overallHeight} mm
      </p>
      {job.customer && (
        <p className="text-[11px] text-gray-300 mb-2 truncate">
          Customer: <span className="font-medium">{job.customer}</span>
        </p>
      )}

      <div className="flex justify-between items-center text-[11px] text-gray-500">
        <span>{job.color}</span>
        <span>
          {job.createdAt
            ? new Date(job.createdAt).toLocaleDateString()
            : ''}
        </span>
      </div>
    </button>
  );
};

export default JobCard;


