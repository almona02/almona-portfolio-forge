import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Data Studio outlet shell.
 * Master-data links live in UniversalNavSidebar (Data Studio sub-items) —
 * a second left rail here duplicated navigation on every /data/* route.
 */
export const MasterDataWorkspace: React.FC = () => {
  return (
    <div className="h-full min-h-0 overflow-auto" data-testid="master-data-workspace">
      <Outlet />
    </div>
  );
};
