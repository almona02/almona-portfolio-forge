import React from 'react';
import { WindowUnitStatus } from '@/types/fabricator';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface WorkflowProgressProps {
  currentStatus: WindowUnitStatus;
}

const statusFlow: WindowUnitStatus[] = [
  'measuring',
  'design',
  'optimized',
  'production',
  'quality',
  'delivered',
];

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ currentStatus }) => {
  const currentIndex = statusFlow.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900/70 border border-gray-800 rounded-lg">
      {statusFlow.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full p-1.5 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-orange-500 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 capitalize ${
                  isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                }`}
              >
                {status}
              </span>
            </div>

            {index < statusFlow.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowProgress;


