import React from 'react';
import { Outlet } from 'react-router-dom';

const DataStudioLayout: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 border-l-4 border-amber-500 pl-4 py-1">
        <h2 className="text-2xl font-semibold text-amber-100">Data Studio</h2>
        <p className="text-amber-500/70 font-mono text-xs">MASTER DATA MANAGEMENT // SYSTEM CONFIGURATION</p>
      </div>
      <div className="bg-[#111] border border-amber-900/30 rounded-xl overflow-hidden min-h-[600px] shadow-2xl">
        <Outlet />
      </div>
    </div>
  );
};
export default DataStudioLayout;
