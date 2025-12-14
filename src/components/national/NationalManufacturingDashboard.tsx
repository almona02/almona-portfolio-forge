import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Recycle, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const weeklyData = [
  { name: 'Week 1', jobs: 2, waste: 100, workshops: 3 },
  { name: 'Week 2', jobs: 5, waste: 250, workshops: 5 },
  { name: 'Week 3', jobs: 8, waste: 400, workshops: 8 },
  { name: 'Week 4', jobs: 12, waste: 650, workshops: 11 },
  { name: 'Week 5', jobs: 18, waste: 920, workshops: 13 },
  { name: 'Week 6', jobs: 24, waste: 1200, workshops: 15 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const NationalManufacturingDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <Factory className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Manufacturing Intelligence</h3>
          <p className="text-sm text-slate-500">Real-time national production metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Creation Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-400" />
              Digital Fabricator Employment
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="jobs" 
                  name="Jobs Created"
                  stroke="#f97316" 
                  strokeWidth={2}
                  fill="url(#jobsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Waste Reduction Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Recycle className="h-4 w-4 text-emerald-400" />
              Material Waste Diverted (kg)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="waste" 
                  name="Waste Diverted"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#wasteGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Jobs Created', value: '47', change: '+8 this week', icon: Users, color: 'orange' },
          { label: 'Waste Diverted', value: '1.2T', change: '280kg this week', icon: Recycle, color: 'emerald' },
          { label: 'Active Workshops', value: '15', change: '+2 this month', icon: Factory, color: 'amber' },
        ].map((stat, index) => (
          <div 
            key={index}
            className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`p-3 bg-${stat.color}-500/10 rounded-lg`}>
              <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
              <div className={`text-xs text-${stat.color}-400 mt-1`}>{stat.change}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
