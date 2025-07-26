import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/ui/button";
import { MachineHealthCheck } from "./MachineHealthCheck";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/shared/ui/ui/card";
import { Progress } from "@/shared/ui/ui/progress";
import { Badge } from "@/shared/ui/ui/badge";
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, HardHat } from "lucide-react";
import { Separator } from "@/shared/ui/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";

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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Maintenance Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Last updated:</span>
          <span className="text-sm font-medium">
            {new Date(healthData.lastCheck).toLocaleString()}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Health Monitoring</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Machine Health Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MachineHealthCheck />
                  <Separator />

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Overall Health Score</span>
                      <span className="font-medium">{healthData.overallScore}/100</span>
                    </div>
                    <Progress value={healthData.overallScore} />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Hydraulics</span>
                        <span className="font-medium">{healthData.components.hydraulics}/100</span>
                      </div>
                      <Progress value={healthData.components.hydraulics} />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Electronics</span>
                        <span className="font-medium">{healthData.components.electronics}/100</span>
                      </div>
                      <Progress value={healthData.components.electronics} />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Mechanics</span>
                        <span className="font-medium">{healthData.components.mechanics}/100</span>
                      </div>
                      <Progress value={healthData.components.mechanics} />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Software</span>
                        <span className="font-medium">{healthData.components.software}/100</span>
                      </div>
                      <Progress value={healthData.components.software} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Predictive Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthData.predictedFailure ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="font-medium">Potential Failure Detected</span>
                      </div>
                      <p className="text-sm">
                        Our AI predicts a {healthData.predictedFailure.probability}% chance of {healthData.predictedFailure.component} failure by {healthData.predictedFailure.estimatedTime}.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium">Recommended Actions</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <HardHat className="h-4 w-4 mt-0.5 text-orange-500" />
                          <span>Schedule preventive maintenance for hydraulics system</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <HardHat className="h-4 w-4 mt-0.5 text-orange-500" />
                          <span>Order replacement seals and hoses (Part #HYD-4582)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <HardHat className="h-4 w-4 mt-0.5 text-orange-500" />
                          <span>Perform diagnostic test before next production run</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-500/10 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>No immediate maintenance concerns detected</span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Schedule Preventive Maintenance
                </Button>
              </CardFooter>
            </Card>
          </div>
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
                        <Badge variant="outline" className={getStatusColor(event.status)}>
                          {event.type}
                        </Badge>
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
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <span className="font-medium">Operator Manual</span>
                  <span className="text-sm text-gray-500">PDF • 2.4MB</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <span className="font-medium">Maintenance Guide</span>
                  <span className="text-sm text-gray-500">PDF • 3.1MB</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <span className="font-medium">Safety Procedures</span>
                  <span className="text-sm text-gray-500">PDF • 1.7MB</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <span className="font-medium">Wiring Diagrams</span>
                  <span className="text-sm text-gray-500">PDF • 4.2MB</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <span className="font-medium">Software Manual</span>
                  <span className="text-sm text-gray-500">PDF • 5.3MB</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
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
