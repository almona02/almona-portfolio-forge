import React from 'react';
import { Outlet } from 'react-router-dom';

const ProjectStudioLayout: React.FC = () => {
  return (
    <div className="flex h-full w-full">
      {/* Project Sidebar could go here */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6 flex items-end justify-between border-b border-amber-600/20 pb-4">
           <div>
             <h2 className="text-2xl font-light text-amber-100">Project Studio</h2>
             <p className="text-amber-600/80 font-mono text-xs">COMMERCIAL MANAGEMENT & CLIENT RELATIONS</p>
           </div>
           {/* Filters or Actions could go here */}
        </div>
        <Outlet />
      </div>
    </div>
  );
};
export default ProjectStudioLayout;
