import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MachineHealthCheck } from "./MachineHealthCheck";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, HardHat } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MaintenanceEvent {
  id: string;
  date: string;
  type: "scheduled" | "emergency" | "inspection";
  status: "pending" | "completed" | "overdue";
  technician: string;
  description: string;
  duration: number;
}

interface MachineHealth {
  overallScore: number;
  components: {
    hydraulics: number;
    electronics: number;
    mechanics: number;
    software: number;
  };
  lastCheck: string;
  predictedFailure?: {
    component: string;
    probability: number;
    estimatedTime: string;
  };
}

export const MaintenanceDashboard = () => {
  const [healthData, setHealthData] = useState<MachineHealth>({
    overallScore: 82,
    components: {
      hydraulics: 75,
      electronics: 88,
      mechanics: 92,
      software: 65,
    },
    lastCheck: new Date().toISOString(),
    predictedFailure: {
      component: "hydraulics",
      probability: 68,
      estimatedTime: "2023-12-15",
    },
  });

  const [events, setEvents] = useState<MaintenanceEvent[]>([
    {
      id: "1",
      date: "2023-11-15",
      type: "scheduled",
      status: "completed",
      technician: "John Smith",
      description: "Routine maintenance check",
      duration: 2,
    },
    {
      id: "2",
      date: "2023-12-01",
      type: "inspection",
      status: "pending",
      technician: "Sarah Johnson",
      description: "Annual safety inspection",
      duration: 4,
    },
    {
      id: "3",
      date: "2023-11-20",
      type: "emergency",
      status: "completed",
      technician: "Mike Brown",
      description: "Hydraulic leak repair",
      duration: 6,
    },
    {
      id: "4",
      date: "2023-12-10",
      type: "scheduled",
      status: "pending",
      technician: "John Smith",
      description: "Software update",
      duration: 1,
    },
  ]);

  const [activeTab, setActiveTab] = useState("health");

  // Simulate health data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthData(prev => ({
        ...prev,
        overallScore: Math.min(100, prev.overallScore + (Math.random() > 0.5 ? 1 : -1)),
        components: {
          hydraulics: Math.min(100, prev.components.hydraulics + (Math.random() > 0.5 ? 1 : -2)),
          electronics: Math.min(100, prev.components.electronics + (Math.random() > 0.5 ? 1 : -1)),
          mechanics: Math.min(100, prev.components.mechanics + (Math.random() > 0.5 ? 1 : -1)),
          software: Math.min(100, prev.components.software + (Math.random() > 0.5 ? 1 : -1)),
        },
        lastCheck: new Date().toISOString(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "overdue":
        return "bg-red-500/10 text-red-500";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* ... existing code ... */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* ... existing code ... */}

        <TabsContent value="health">
          {/* ... existing code ... */}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Service History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="border border-gray-300">{event.type}</Badge>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusIcon(event.status)}
                          {event.status}
                        </Badge>
                      </div>
                      <h3 className="font-medium">{event.description}</h3>
                      <p className="text-sm text-gray-400">
                        {new Date(event.date).toLocaleDateString()} • {event.duration} hours
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Technician:</span>
                      <span className="font-medium">{event.technician}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documentation Repository</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Operator Manual</span>
                  <span className="text-sm text-gray-500">PDF • 2.4MB</span>
                </Button>
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Maintenance Guide</span>
                  <span className="text-sm text-gray-500">PDF • 3.1MB</span>
                </Button>
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Safety Procedures</span>
                  <span className="text-sm text-gray-500">PDF • 1.7MB</span>
                </Button>
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Wiring Diagrams</span>
                  <span className="text-sm text-gray-500">PDF • 4.2MB</span>
                </Button>
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Software Manual</span>
                  <span className="text-sm text-gray-500">PDF • 5.3MB</span>
                </Button>
                <Button className="h-24 flex-col gap-2 border border-gray-300">
                  <span className="font-medium">Troubleshooting</span>
                  <span className="text-sm text-gray-500">PDF • 2.1MB</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
