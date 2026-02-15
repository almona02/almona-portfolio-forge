import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { 
  Brain,
  Activity,
  Gauge,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Cpu,
  LineChart,
  CheckCircle2,
  Calculator,
  Zap,
} from "lucide-react";
import {
  generatePredictiveAlerts,
  generateMockCuttingMachines,
  generateMockMillingMachines,
  maintenanceRules,
  calculateROI,
} from "@/lib/predictive/data";
import type { PredictiveAlert, CuttingMachine, MillingMachine } from "@/lib/predictive/types";

export const PredictiveMaintenanceEngine = () => {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [cuttingMachines, setCuttingMachines] = useState<CuttingMachine[]>([]);
  const [millingMachines, setMillingMachines] = useState<MillingMachine[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [liveData, setLiveData] = useState(true);

  useEffect(() => {
    setAlerts(generatePredictiveAlerts());
    setCuttingMachines(generateMockCuttingMachines());
    setMillingMachines(generateMockMillingMachines());

    if (!liveData) return;
    const interval = setInterval(() => {
      setAlerts(generatePredictiveAlerts());
      setCuttingMachines(generateMockCuttingMachines());
      setMillingMachines(generateMockMillingMachines());
    }, 10000);
    return () => clearInterval(interval);
  }, [liveData]);

  const roiData = calculateROI(1000);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="btn-primary">
                <Brain className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-amber-400">AI Predictive Maintenance Engine</CardTitle>
                <CardDescription>Machine learning-driven failure prediction and maintenance optimization</CardDescription>
              </div>
            </div>
            <Badge variant={liveData ? "default" : "secondary"} className={liveData ? "bg-green-500" : ""}>
              <Activity className="h-3 w-3 mr-1" />
              {liveData ? "LIVE" : "PAUSED"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 bg-gray-800">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="algorithms" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            AI Algorithms
          </TabsTrigger>
          <TabsTrigger value="machinery" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Machinery Insights
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            ROI Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Active Predictive Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === "critical"
                        ? "border-red-500/30 bg-red-500/10"
                        : alert.severity === "high"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-yellow-500/30 bg-yellow-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{alert.machineName}</span>
                          <Badge
                            variant={
                              alert.severity === "critical"
                                ? "outline"
                                : alert.severity === "high"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="ml-auto">
                            {alert.confidence}% Confidence
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">
                          <strong>{alert.component}:</strong> {alert.issue}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Predicted: {alert.predictedFailureDate}</span>
                          <div className="flex items-center gap-1">
                            Sensors: {alert.sensorsInvolved.map((sensor) => (
                              <Badge key={sensor} variant="outline" className="text-xs">
                                {sensor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={alert.confidence} className="h-2 mb-2" />
                          <div className="text-sm">
                            <strong>Recommended Actions:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {alert.recommendedActions.map((action, index) => (
                                <li key={index} className="text-gray-300">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  Cutting Machines Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cuttingMachines.map((machine) => (
                  <div key={machine.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{machine.name}</span>
                      <Badge
                        variant={
                          machine.status === "optimal"
                            ? "default"
                            : machine.status === "degraded"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {machine.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Health Score:</span>
                        <span>{machine.healthScore}%</span>
                      </div>
                      <Progress value={machine.healthScore} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>RUL:</span>
                        <span>
                          {Math.ceil(
                            (machine.rulPrediction.predictedFailure.getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )} days
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                  Milling Machines Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {millingMachines.map((machine) => (
                  <div key={machine.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{machine.name}</span>
                      <Badge
                        variant={
                          machine.status === "optimal"
                            ? "default"
                            : machine.status === "degraded"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {machine.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Health Score:</span>
                        <span>{machine.healthScore}%</span>
                      </div>
                      <Progress value={machine.healthScore} className="h-2" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span>Spindle Health:</span>
                          <Progress value={machine.spindleHealth} className="h-2 mt-1" />
                        </div>
                        <div>
                          <span>Tool Wear:</span>
                          <Progress value={machine.toolWear} className="h-2 mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="algorithms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-amber-400" />
                Machine Learning Algorithms
              </CardTitle>
              <CardDescription>Advanced AI algorithms powering predictive maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="typography-h4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400" />
                    Vibration Analysis (FFT)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>RMS (Root Mean Square):</span>
                      <Badge variant="outline">Overall Energy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Amplitude:</span>
                      <Badge variant="outline">Impact Detection</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Kurtosis:</span>
                      <Badge variant="outline">Bearing Defects</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Envelope Analysis:</span>
                      <Badge variant="outline">Early Failure Signs</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="typography-h4 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-400" />
                    AI Models
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Isolation Forest:</span>
                      <Badge variant="outline">Anomaly Detection</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>LSTM Networks:</span>
                      <Badge variant="outline">RUL Prediction</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Random Forest:</span>
                      <Badge variant="outline">Failure Classification</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence Score:</span>
                      <Badge variant="outline">{alerts[0]?.confidence || 87}% Accuracy</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="typography-h4 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Sensor Channels & Live Cadence
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: "Vibration", rate: "1000 Hz", status: "Active" },
                    { name: "Temperature", rate: "1 Hz", status: "Active" },
                    { name: "Acoustic", rate: "20 kHz", status: "Active" },
                    { name: "Current", rate: "50 Hz", status: "Active" },
                  ].map((sensor, index) => (
                    <Card key={index} className="bg-gray-800/50">
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium">{sensor.name}</div>
                        <div className="text-xs text-gray-400">{sensor.rate}</div>
                        <Badge variant="default" className="mt-2 bg-green-500/20 text-green-400">
                          {sensor.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machinery" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  Aluminum Cutting Machines
                </CardTitle>
                <CardDescription>Single/Double Head Cutting Failure Patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="typography-h4 text-amber-400">Common Failure Modes</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span>Blade wear & vibration increase</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span>Bearing degradation in spindles</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>Hydraulic system pressure drops</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span>Alignment drift affecting cut quality</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="typography-h4 text-green-400">Maintenance Rules</h4>
                  <div className="space-y-2 text-sm">
                    {maintenanceRules.slice(0, 2).map((rule, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                        <span>{rule.parameter}</span>
                        <Badge variant="outline">{rule.warning}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                  Milling & Processing Machines
                </CardTitle>
                <CardDescription>Vertical Routers & End Mills Failure Patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="typography-h4 text-amber-400">Common Failure Modes</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span>Spindle bearing wear & runout</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span>Tool wear affecting surface finish</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>Ball screw backlash in positioning</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span>Coolant system contamination</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="typography-h4 text-green-400">Maintenance Rules</h4>
                  <div className="space-y-2 text-sm">
                    {maintenanceRules.slice(2, 4).map((rule, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                        <span>{rule.parameter}</span>
                        <Badge variant="outline">{rule.warning}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" />
                Remaining Useful Life (RUL) Concept
              </CardTitle>
              <CardDescription>AI-powered prediction of machinery lifespan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-3 bg-blue-500/20 rounded-lg inline-block mb-2">
                    <Brain className="h-6 w-6 text-blue-400" />
                  </div>
                  <h4 className="typography-h4 mb-2">LSTM Neural Networks</h4>
                  <p className="text-sm text-gray-400">Time-series prediction of degradation patterns</p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-green-500/20 rounded-lg inline-block mb-2">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                  <h4 className="typography-h4 mb-2">Confidence Scoring</h4>
                  <p className="text-sm text-gray-400">{alerts[0]?.confidence || 87}% prediction accuracy</p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-amber-500/20 rounded-lg inline-block mb-2">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <h4 className="typography-h4 mb-2">Failure Mode Detection</h4>
                  <p className="text-sm text-gray-400">Early identification of specific component failures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-400" />
                Return on Investment Analysis
              </CardTitle>
              <CardDescription>Financial impact of predictive maintenance implementation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="typography-h4">Financial Metrics</h4>
                  <div className="space-y-4">
                    {[
                      { label: "Annual Downtime Reduction", value: `${roiData.traditionalDowntime - roiData.predictiveDowntime} hours` },
                      { label: "Cost Savings", value: `$${roiData.annualSavings.toLocaleString()}/year` },
                      { label: "ROI Percentage", value: `${roiData.roiPercentage.toFixed(1)}%` },
                      { label: "Payback Period", value: `${roiData.paybackPeriod.toFixed(1)} years` },
                    ].map((metric, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">{metric.label}</span>
                        <Badge variant="default" className="btn-primary">
                          {metric.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="typography-h4">Key Benefits</h4>
                  <div className="space-y-3">
                    {[
                      "37% reduction in unplanned downtime",
                      "45% extension in machinery lifespan",
                      "60% reduction in emergency repairs",
                      "28% improvement in production quality",
                      "52% faster maintenance response times",
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-amber-500/10 to-amber-500/10 rounded-lg border border-amber-500/20">
                <h4 className="typography-h4 mb-3 text-amber-400">Implementation Cost Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { item: "IoT Sensors", cost: "$15,000" },
                    { item: "AI Software", cost: "$20,000" },
                    { item: "Installation", cost: "$10,000" },
                    { item: "Training", cost: "$5,000" },
                  ].map((cost, index) => (
                    <div key={index} className="text-center">
                      <div className="text-gray-400">{cost.item}</div>
                      <div className="font-semibold text-white">{cost.cost}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button onClick={() => setLiveData(!liveData)} variant={liveData ? "default" : "outline"} className={liveData ? "bg-green-500 hover:bg-green-600" : ""}>
          <Activity className="h-4 w-4 mr-2" />
          {liveData ? "Live Data Enabled" : "Enable Live Data"}
        </Button>
      </div>
    </div>
  );
};

export default PredictiveMaintenanceEngine;


