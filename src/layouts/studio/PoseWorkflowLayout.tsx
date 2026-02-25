import { WorkflowStepNavigator } from '@/components/fabricator/workflow/WorkflowStepNavigator';
import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * PoseWorkflowLayout — Wraps all pose-centric workflow routes
 * (design, bom, optimization, commercial, production) with a persistent
 * step navigator bar at the top. Provides consistent UX across the
 * fabrication pipeline, inspired by Logikal's phase navigation.
 */
const PoseWorkflowLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WorkflowStepNavigator />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default PoseWorkflowLayout;
