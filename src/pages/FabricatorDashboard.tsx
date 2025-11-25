import React from 'react';
import { TodayDashboard } from '@/components/dashboard/TodayDashboard';

const FabricatorDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white pt-20 pb-10">
      <TodayDashboard />
    </div>
  );
};

export default FabricatorDashboard;


