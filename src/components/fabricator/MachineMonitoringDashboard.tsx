/**
 * Machine Monitoring Dashboard
 * Real-time monitoring for Yilmaz CNC machines
 * Displays machine status, production progress, and health metrics
 */

import { MachineStatus } from '@/integrations/cnc/CNCController';
import { YilmazCNC } from '@/integrations/yilmaz/YilmazCNC';
import { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import { YilmazNetworkConfig } from '@/machine-connectors/YilmazNetworkProtocol';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    Factory,
    Gauge,
    Pause,
    Play,
    RefreshCw,
    Square,
    Thermometer,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface MachineInfo {
  id: string;
  name: string;
  model: YilmazMachineModel;
  networkConfig: YilmazNetworkConfig;
  status?: MachineStatus;
  connected: boolean;
}

interface MachineMonitoringDashboardProps {
  machines: MachineInfo[];
  onMachineAction?: (machineId: string, action: 'start' | 'pause' | 'resume' | 'stop') => void;
}

export const MachineMonitoringDashboard: React.FC<MachineMonitoringDashboardProps> = ({
  machines,
  onMachineAction
}) => {
  const [machineControllers, setMachineControllers] = useState<Map<string, YilmazCNC>>(new Map());
  const [machineStatuses, setMachineStatuses] = useState<Map<string, MachineStatus>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initialize machine controllers
    const controllers = new Map<string, YilmazCNC>();
    
    machines.forEach((machine) => {
      const cnc = new YilmazCNC(
        machine.id,
        machine.name,
        machine.model,
        machine.networkConfig
      );

      // Subscribe to status updates
      cnc.subscribeToStatusUpdates((status) => {
        setMachineStatuses((prev) => {
          const updated = new Map(prev);
          updated.set(machine.id, status);
          return updated;
        });
      });

      controllers.set(machine.id, cnc);
    });

    setMachineControllers(controllers);

    // Connect to machines
    machines.forEach((machine) => {
      const cnc = controllers.get(machine.id);
      if (cnc) {
        cnc.connect().catch((error) => {
          console.error(`Failed to connect to ${machine.name}:`, error);
        });
      }
    });

    // Cleanup on unmount
    return () => {
      controllers.forEach((cnc) => {
        cnc.disconnect();
      });
    };
  }, [machines]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    const promises = Array.from(machineControllers.values()).map((cnc) =>
      cnc.getStatus().catch((error) => {
        console.error('Status refresh error:', error);
        return null;
      })
    );

    await Promise.all(promises);
    setIsRefreshing(false);
  };

  const handleMachineAction = async (
    machineId: string,
    action: 'start' | 'pause' | 'resume' | 'stop'
  ) => {
    const cnc = machineControllers.get(machineId);
    if (!cnc) return;

    try {
      switch (action) {
        case 'start':
          await cnc.startOperation(`op_${Date.now()}`);
          break;
        case 'pause':
          await cnc.pauseOperation();
          break;
        case 'resume':
          await cnc.resumeOperation();
          break;
        case 'stop':
          await cnc.stopOperation();
          break;
      }

      if (onMachineAction) {
        onMachineAction(machineId, action);
      }
    } catch (error) {
      console.error(`Failed to ${action} machine ${machineId}:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case 'idle':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'paused':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      case 'error':
        return 'text-red-400 bg-red-500/20 border-red-500';
      case 'maintenance':
        return 'text-orange-400 bg-orange-500/20 border-orange-500';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4" />;
      case 'idle':
        return <Clock className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'maintenance':
        return <Factory className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Machine Monitoring Dashboard</h2>
          <p className="text-gray-400">Real-time status of all Yilmaz CNC machines</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => {
          const status = machineStatuses.get(machine.id) || {
            status: 'idle' as const,
            progress: 0,
            lastUpdate: new Date()
          };
          const cnc = machineControllers.get(machine.id);
          const connected = cnc?.isConnected() || false;

          return (
            <Card key={machine.id} className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-orange-400" />
                    {machine.name}
                  </CardTitle>
                  <Badge className={getStatusColor(status.status)}>
                    {getStatusIcon(status.status)}
                    <span className="ml-1 capitalize">{status.status}</span>
                  </Badge>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {machine.model} • {connected ? 'Connected' : 'Disconnected'}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Info */}
                {status.currentOperation && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Current Operation</div>
                    <div className="text-sm font-medium">{status.currentOperation}</div>
                  </div>
                )}

                {/* Progress */}
                {status.status === 'running' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{status.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={status.progress} className="h-2" />
                  </div>
                )}

                {/* Machine Metrics */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {status.spindleSpeed !== undefined && (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-gray-400">Spindle:</span>
                      <span className="font-medium">{status.spindleSpeed} rpm</span>
                    </div>
                  )}
                  {status.feedRate !== undefined && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-400">Feed:</span>
                      <span className="font-medium">{status.feedRate} mm/min</span>
                    </div>
                  )}
                  {status.temperature !== undefined && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-red-400" />
                      <span className="text-gray-400">Temp:</span>
                      <span className="font-medium">{status.temperature}°C</span>
                    </div>
                  )}
                  {status.toolNumber !== undefined && (
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4 text-green-400" />
                      <span className="text-gray-400">Tool:</span>
                      <span className="font-medium">T{status.toolNumber}</span>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {status.status === 'error' && status.errorMessage && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="text-xs">
                      {status.errorCode}: {status.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Control Buttons */}
                <div className="flex gap-2 pt-2">
                  {status.status === 'idle' && (
                    <Button
                      onClick={() => handleMachineAction(machine.id, 'start')}
                      size="sm"
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {status.status === 'running' && (
                    <>
                      <Button
                        onClick={() => handleMachineAction(machine.id, 'pause')}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        onClick={() => handleMachineAction(machine.id, 'stop')}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  )}
                  {status.status === 'paused' && (
                    <>
                      <Button
                        onClick={() => handleMachineAction(machine.id, 'resume')}
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button
                        onClick={() => handleMachineAction(machine.id, 'stop')}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>

                {/* Last Update */}
                <div className="text-xs text-gray-500 text-center">
                  Last update: {status.lastUpdate.toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {Array.from(machineStatuses.values()).filter(s => s.status === 'running').length}
            </div>
            <div className="text-sm text-gray-400">Running</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">
              {Array.from(machineStatuses.values()).filter(s => s.status === 'idle').length}
            </div>
            <div className="text-sm text-gray-400">Idle</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-400">
              {Array.from(machineStatuses.values()).filter(s => s.status === 'error').length}
            </div>
            <div className="text-sm text-gray-400">Errors</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {machines.filter(m => machineControllers.get(m.id)?.isConnected()).length}
            </div>
            <div className="text-sm text-gray-400">Connected</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

