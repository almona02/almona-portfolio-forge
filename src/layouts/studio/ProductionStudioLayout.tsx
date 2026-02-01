import React from 'react';
import { Outlet } from 'react-router-dom';

const ProductionStudioLayout: React.FC = () => {
  return (
    <div className="p-4 h-full w-full bg-[#080808]"> 
      {/* Darker background for high contrast on shop floor */}
      <div className="flex items-center justify-between mb-4 bg-amber-900/10 p-3 border border-amber-600/20 rounded-lg">
        <div>
           <h2 className="text-xl font-bold text-amber-400 uppercase tracking-wider">Production Floor</h2>
           <p className="text-amber-600/60 text-[10px] font-mono">BATCHING // CUTTING // ASSEMBLY</p>
        </div>
        <div className="flex gap-2">
           {/* Quick Machine Status Indicators */}
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="CNC Online" />
           <div className="h-2 w-2 rounded-full bg-emerald-500" title="Saw Online" />
        </div>
      </div>
      <Outlet />
    </div>
  );
};
export default ProductionStudioLayout;
