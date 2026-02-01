import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Link } from 'react-router-dom';
import { Activity, Factory, ListChecks } from 'lucide-react';
import { JobBoardView } from './JobBoardView';
import MaterialAlertsPanel from './MaterialAlertsPanel';

interface KPICardProps {
  title: string;
  value: string;
  trend?: string;
  status?: 'default' | 'warning' | 'alert';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, status = 'default' }) => {
  const color =
    status === 'alert'
      ? 'text-red-400'
      : status === 'warning'
      ? 'text-yellow-400'
      : 'text-emerald-400';

  return (
    <Card className="bg-gray-900/70 border-gray-700 card-dark">
      <CardContent className="py-4 px-5 space-y-1">
        <div className="text-xs uppercase tracking-wide text-gray-400">{title}</div>
        <div className={`text-xl font-semibold ${color}`}>{value}</div>
        {trend && <div className="text-xs text-gray-500">{trend}</div>}
      </CardContent>
    </Card>
  );
};

const MachineStatusPanel: React.FC = () => (
  <Card className="bg-gray-900/70 border-gray-700 card-dark">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <Factory className="h-4 w-4 text-blue-400" />
        Machine Status
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-xs text-gray-400">
      <div className="flex items-center justify-between">
        <span>Connected Machines</span>
        <span className="text-blue-300 font-semibold">0</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Active Jobs</span>
        <span className="text-green-300 font-semibold">0</span>
      </div>
      <p className="mt-2">
        Integrate your production line to monitor machine utilization and job progress in real time.
      </p>
    </CardContent>
  </Card>
);

const QuickActionsPanel: React.FC = () => (
  <Card className="bg-gray-900/70 border-gray-700 card-dark">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <ListChecks className="h-4 w-4 status-valid" />
        Quick Actions
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <Link to="/fabricator-workflow">
        <Button className="btn-primary">
          Start New Fabrication Job
        </Button>
      </Link>
      <Link to="/fabrication-services">
        <Button variant="outline" className="w-full text-xs border-gray-700">
          View Fabrication Services
        </Button>
      </Link>
      <Link to="/support/tickets/new">
        <Button variant="outline" className="w-full text-xs border-gray-700">
          Create Support Ticket
        </Button>
      </Link>
    </CardContent>
  </Card>
);

export const TodayDashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4">
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard title="Today's Jobs" value="0" trend="Connect data to see jobs" />
        <KPICard title="Late Jobs" value="0" status="warning" />
        <KPICard title="Efficiency" value="—" trend="Optimization pending" />
        <KPICard title="Material Alerts" value="0" status="alert" />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Job Board (2/3 width) */}
        <div className="xl:col-span-2">
          <JobBoardView />
        </div>

        {/* Operations Sidebar (1/3 width) */}
        <div className="space-y-6">
          <MaterialAlertsPanel />
          <MachineStatusPanel />
          <QuickActionsPanel />
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-8 text-xs text-gray-500 flex items-center gap-2">
        <Activity className="h-3 w-3" />
        <span>
          Fabricator Pro Dashboard – next step: connect this view to your Supabase-backed job and
          inventory data.
        </span>
      </div>
    </div>
  );
};

export default TodayDashboard;


