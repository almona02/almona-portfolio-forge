'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import {
  Activity,
  AlertTriangle,
  Thermometer,
  Gauge,
  Cpu,
  Clock,
  Wifi,
  WifiOff,
  Play,
  Pause,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Types
interface MachineStatus {
  id: string;
  name: string;
  brand: string;
  model: string;
  status: 'idle' | 'running' | 'maintenance' | 'error' | 'offline';
  lastHeartbeat: Date | null;
  currentProgram: string | null;
  errorMessage: string | null;
  telemetry: {
    spindleTemp: number | null;
    spindleLoad: number | null;
    feedRateActual: number | null;
    position: { x: number; y: number; z: number };
  };
}

interface MachineTwinDisplayProps {
  machineId: string;
  compact?: boolean;
}

// Telemetry Card Component
const TelemetryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  warning?: boolean;
}> = ({ icon, label, value, trend, warning }) => (
  <div className={`p-3 rounded-lg ${warning ? 'bg-yellow-500/10' : 'bg-gray-800'}`}>
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold ${warning ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </span>
      {trend && (
        <span className={`text-xs ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
        </span>
      )}
    </div>
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: MachineStatus['status'] }> = ({ status }) => {
  const config = {
    idle: { color: 'bg-gray-500', icon: Pause, label: 'Idle' },
    running: { color: 'bg-green-500', icon: Play, label: 'Running' },
    maintenance: { color: 'bg-yellow-500', icon: Settings, label: 'Maintenance' },
    error: { color: 'bg-red-500', icon: AlertCircle, label: 'Error' },
    offline: { color: 'bg-gray-700', icon: WifiOff, label: 'Offline' },
  };
  
  const { color, icon: Icon, label } = config[status];
  
  return (
    <Badge className={`${color} text-white flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export const MachineTwinDisplay: React.FC<MachineTwinDisplayProps> = ({
  machineId,
  compact = false,
}) => {
  const [machine, setMachine] = useState<MachineStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Fetch initial machine data and subscribe to updates
  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const { data, error } = await supabase
          .from('machine_profiles')
          .select('*')
          .eq('id', machineId)
          .single();

        if (error) throw error;

        const row: any = data;

        if (row) {
          setMachine({
            id: row.id,
            name: row.name,
            brand: row.brand,
            model: row.model,
            status: row.status || 'offline',
            lastHeartbeat: row.last_heartbeat ? new Date(row.last_heartbeat) : null,
            currentProgram: row.current_program,
            errorMessage: row.error_message,
            telemetry: row.telemetry || {
              spindleTemp: null,
              spindleLoad: null,
              feedRateActual: null,
              position: { x: 0, y: 0, z: 0 },
            },
          });
          setLastUpdate(new Date());
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error fetching machine:', error);
        setIsConnected(false);
      }
    };
    
    fetchMachine();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`machine:${machineId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machine_profiles',
          filter: `id=eq.${machineId}`,
        },
        (payload) => {
          const data = payload.new;
          setMachine(prev => prev ? {
            ...prev,
            status: data.status || prev.status,
            lastHeartbeat: data.last_heartbeat ? new Date(data.last_heartbeat) : prev.lastHeartbeat,
            currentProgram: data.current_program,
            errorMessage: data.error_message,
            telemetry: data.telemetry || prev.telemetry,
          } : null);
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [machineId]);
  
  // Calculate connection health
  const getConnectionHealth = () => {
    if (!machine?.lastHeartbeat) return 0;
    const secondsSinceHeartbeat = (Date.now() - machine.lastHeartbeat.getTime()) / 1000;
    if (secondsSinceHeartbeat < 10) return 100;
    if (secondsSinceHeartbeat < 30) return 75;
    if (secondsSinceHeartbeat < 60) return 50;
    return 0;
  };
  
  if (!machine) {
    return (
      <Card className="bg-gray-900/60 border-gray-700">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Cpu className="w-8 h-8 text-gray-500 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-400">Loading machine data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (compact) {
    return (
      <Card className="bg-gray-900/60 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                machine.status === 'running' ? 'bg-green-500 animate-pulse' :
                machine.status === 'error' ? 'bg-red-500' :
                machine.status === 'offline' ? 'bg-gray-500' : 'bg-yellow-500'
              }`} />
              <div>
                <div className="font-medium text-sm">{machine.name}</div>
                <div className="text-xs text-gray-400">{machine.brand} {machine.model}</div>
              </div>
            </div>
            <StatusBadge status={machine.status} />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-gray-900/60 border-gray-700 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="w-5 h-5 text-blue-400" />
            {machine.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <StatusBadge status={machine.status} />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {machine.brand} {machine.model}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Status Display */}
        <div className="relative p-6 bg-black/40 rounded-lg overflow-hidden">
          <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${
            machine.status === 'running' ? 'from-green-500/20' :
            machine.status === 'error' ? 'from-red-500/20' :
            machine.status === 'offline' ? 'from-gray-500/10' : 'from-yellow-500/10'
          } to-transparent ${machine.status === 'running' ? 'animate-pulse' : ''}`} />
          
          <div className="relative z-10 text-center">
            <div className="text-4xl font-mono font-bold tracking-tighter mb-2">
              {machine.status.toUpperCase()}
            </div>
            <div className="text-sm text-gray-400 font-mono">
              PROGRAM: {machine.currentProgram || 'NONE'}
            </div>
            {machine.status === 'error' && machine.errorMessage && (
              <div className="mt-2 text-xs text-red-400 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {machine.errorMessage}
              </div>
            )}
          </div>
        </div>
        
        {/* Position Display */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-gray-800 rounded text-center">
            <div className="text-xs text-gray-400">X</div>
            <div className="text-sm font-mono font-bold">
              {machine.telemetry.position.x.toFixed(2)}
            </div>
          </div>
          <div className="p-2 bg-gray-800 rounded text-center">
            <div className="text-xs text-gray-400">Y</div>
            <div className="text-sm font-mono font-bold">
              {machine.telemetry.position.y.toFixed(2)}
            </div>
          </div>
          <div className="p-2 bg-gray-800 rounded text-center">
            <div className="text-xs text-gray-400">Z</div>
            <div className="text-sm font-mono font-bold">
              {machine.telemetry.position.z.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Telemetry Cards */}
        <div className="grid grid-cols-2 gap-2">
          <TelemetryCard
            icon={<Thermometer className="w-4 h-4 text-orange-400" />}
            label="Spindle Temp"
            value={machine.telemetry.spindleTemp ? `${machine.telemetry.spindleTemp}°C` : '--'}
            warning={machine.telemetry.spindleTemp ? machine.telemetry.spindleTemp > 50 : false}
          />
          <TelemetryCard
            icon={<Gauge className="w-4 h-4 text-blue-400" />}
            label="Feed Rate"
            value={machine.telemetry.feedRateActual ? `${machine.telemetry.feedRateActual}%` : '--'}
          />
        </div>
        
        {/* Connection Health */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Connection Health</span>
            <span className="text-gray-400">{getConnectionHealth()}%</span>
          </div>
          <Progress value={getConnectionHealth()} className="h-1" />
        </div>
        
        {/* Last Update */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Heartbeat: {machine.lastHeartbeat ? 
              `${Math.round((Date.now() - machine.lastHeartbeat.getTime()) / 1000)}s ago` : 
              'No signal'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineTwinDisplay;

