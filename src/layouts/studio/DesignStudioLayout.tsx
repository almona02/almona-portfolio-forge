import React from 'react';
import { Outlet } from 'react-router-dom';

const DesignStudioLayout: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col">
       {/* Design Studio controls the entire viewport for Canvas */}
       {/* Minimal chrome, max pixel real estate for engineering */}
       <Outlet />
    </div>
  );
};
export default DesignStudioLayout;
