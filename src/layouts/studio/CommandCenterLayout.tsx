import React from 'react';
import { Outlet } from 'react-router-dom';

const CommandCenterLayout: React.FC = () => {
  return (
    <div className="p-8 max-w-[1920px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-light text-foreground">Command Center</h2>
        <p className="text-foreground/80 mt-1 font-mono text-sm">OPERATIONAL OVERVIEW // SYSTEM STATUS: NOMINAL</p>
      </div>
      <Outlet />
    </div>
  );
};
export default CommandCenterLayout;
