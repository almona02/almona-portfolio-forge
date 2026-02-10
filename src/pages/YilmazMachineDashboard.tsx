/**
 * @tier Tier 2 (Advisory Presentation)
 * @constitutional_compliance AICS-001 §7 (Presentation layer)
 * @region Egypt-specific YILMAZ machine dashboard
 *
 * GOVERNANCE:
 * - Displays simulated telemetry from YilmazTelemetrySimulator (Tier 1)
 * - Highlights active environmental alerts (Khamsin, Summer Heat) based on EGYPT_ENV_CONSTANTS
 * - Provides entry point to Technician Validation Workflow (TechChecklist)
 * Migrated from Ant Design to Shadcn (Phase 3.2)
 */

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Separator } from '@/shared/ui/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/shared/ui/ui/sheet';
import {
    AlertTriangle,
    Flame,
    LayoutDashboard,
    LineChart,
    RefreshCw,
    Wrench,
    Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TechChecklist from '../components/ticketing/yilmaz/mobile/TechChecklist';
import {
    YilmazSimulatedTelemetry,
    yilmazTelemetrySimulator,
} from '../services/ticketing/yilmaz/core/YilmazTelemetrySimulator';
import { EGYPT_ENV_CONSTANTS } from '../services/ticketing/yilmaz/rules/YilmazEgyptRules';

export const YilmazMachineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<YilmazSimulatedTelemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<YilmazSimulatedTelemetry | null>(null);

  const currentMonth = new Date().getMonth();
  const isKhamsin =
    currentMonth >= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_START &&
    currentMonth <= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_END;
  const isSummer = currentMonth >= 5 && currentMonth <= 8;

  useEffect(() => {
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshTelemetry = () => {
    setLoading(true);
    setTimeout(() => {
      const data = yilmazTelemetrySimulator.generateAllMachines();
      setMachines(data);
      setLastUpdated(new Date());
      setLoading(false);
    }, 500);
  };

  const handleMachineCheck = (machine: YilmazSimulatedTelemetry) => {
    setSelectedMachine(machine);
    setDrawerVisible(true);
  };

  const getStatusColor = (symptoms: string[]) => {
    if (symptoms.length === 0) return 'bg-green-500';
    if (
      symptoms.some(
        (s) =>
          s.toLowerCase().includes('shutdown') || s.toLowerCase().includes('surge')
      )
    )
      return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getVoltageColor = (voltage: number) =>
    voltage < 200 || voltage > 240 ? 'text-destructive' : 'text-green-600';

  return (
    <div className="p-6 bg-muted/30 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2 m-0">
            <LayoutDashboard className="w-6 h-6" />
            YILMAZ Predictive Monitor
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Egypt Region • Real-time Telemetry Simulation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/yilmaz-analytics')}>
            <LineChart className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Badge variant="secondary">{lastUpdated.toLocaleTimeString()}</Badge>
          <Button onClick={refreshTelemetry} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* CLIMATE ALERTS */}
      {isKhamsin && (
        <Alert
          variant="destructive"
          className="mb-6 border-amber-500 bg-amber-500/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Khamsin Season Active</AlertTitle>
          <AlertDescription>
            High dust levels detected. Inspect cabinet air filters and spindle
            fans daily.
          </AlertDescription>
        </Alert>
      )}
      {isSummer && (
        <Alert variant="destructive" className="mb-6">
          <Flame className="h-4 w-4" />
          <AlertTitle>Summer Heat Alert</AlertTitle>
          <AlertDescription>
            Ambient temperatures &gt; 40°C. Monitor spindle cooling systems and
            servo drive thermal status.
          </AlertDescription>
        </Alert>
      )}

      {/* MACHINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <Card
            key={machine.machineSerial}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${getStatusColor(machine.symptoms)}`}
                />
                {machine.machineModel}
              </CardTitle>
              <Badge variant="outline">{machine.location.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Zap className={`w-4 h-4 ${getVoltageColor(machine.inputVoltage)}`} />
                  <span className={`text-2xl font-semibold ${getVoltageColor(machine.inputVoltage)}`}>
                    {machine.inputVoltage} V
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Input Voltage</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{machine.hydraulicPressureBar} bar</p>
                  <p className="text-xs text-muted-foreground">Hydraulic</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{machine.spindleTempCelsius} °C</p>
                  <p className="text-xs text-muted-foreground">Spindle</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Dust Level:</span>
                  <Badge variant={machine.dustLevel > 3 ? 'destructive' : 'secondary'}>
                    {machine.dustLevel}/5
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Operating Hours:</span>
                  <span>{machine.operatingHours.toLocaleString()} h</span>
                </div>
              </div>

              {machine.symptoms.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {machine.symptoms.length} Issues Detected
                  </p>
                  <div className="max-h-14 overflow-y-auto mt-2 space-y-1">
                    {machine.symptoms.slice(0, 2).map((s, i) => (
                      <Badge key={i} variant="destructive" className="block w-fit">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleMachineCheck(machine)}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Technician Check
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* TECHNICIAN CHECKLIST DRAWER */}
      <Sheet open={drawerVisible} onOpenChange={setDrawerVisible}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[600px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              Technician Check: {selectedMachine?.machineModel}
            </SheetTitle>
          </SheetHeader>
          {selectedMachine && (
            <div className="mt-6">
              <TechChecklist
                machineSerial={selectedMachine.machineSerial}
                machineModel={selectedMachine.machineModel}
                language="en"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default YilmazMachineDashboard;
