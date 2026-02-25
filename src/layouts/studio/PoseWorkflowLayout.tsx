import { ValidationGate } from '@/components/fabricator/workflow/ValidationGate';
import { WorkflowStepNavigator } from '@/components/fabricator/workflow/WorkflowStepNavigator';
import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * PoseWorkflowLayout — Wraps all pose-centric workflow routes with:
 * 1. Persistent step navigator bar (Design → BOM → Optimize → Quote → Production)
 * 2. Validation gate showing errors/warnings for the current step's prerequisites
 * 3. Content area (Outlet) for the active step's component
 */
const PoseWorkflowLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WorkflowStepNavigator />
      <ValidationGate />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default PoseWorkflowLayout;
