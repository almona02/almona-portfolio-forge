import { ValidationGate } from '@/components/fabricator/workflow/ValidationGate';
import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * PoseWorkflowLayout — pose-centric content + validation gate.
 * Workflow bar lives on StudioLayout (FP-025A) so it is not duplicated.
 */
const PoseWorkflowLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ValidationGate />
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
};

export default PoseWorkflowLayout;
