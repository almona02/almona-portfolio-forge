import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ServiceCard } from "../components/services/ServiceCard";
import { MachineRegistration } from "../components/services/MachineRegistration";
import { MaintenanceDashboard } from "../components/services/MaintenanceDashboard";
import { CustomerPortal } from "../components/services/CustomerPortal";
import AIFeatures from "./AIFeatures";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

const Services = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [machineView, setMachineView] = useState<"list" | "map">("list");

  useEffect(() => {
    document.title = "Industrial Services - ALMONA";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient-orange">Industrial Services Hub</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              AI-powered maintenance, machine lifecycle management, and premium support for your equipment.
            </p>
          </div>

          {/* Main Services Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto mb-12">
              <TabsTrigger value="overview">Services Overview</TabsTrigger>
              <TabsTrigger value="register">Register Machine</TabsTrigger>
              <TabsTrigger value="dashboard">Maintenance Dashboard</TabsTrigger>
              <TabsTrigger value="portal">Customer Portal</TabsTrigger>
              <TabsTrigger value="ai">AI Features</TabsTrigger>
            </TabsList>

            {/* Services Overview */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <ServiceCard
                  icon="wrench"
                  title="Preventive Maintenance"
                  description="Scheduled servicing to maximize equipment lifespan"
                  features={[
                    "Custom maintenance plans",
                    "AI-driven scheduling",
                    "Warranty compliance tracking"
                  ]}
                  actionText="Schedule Maintenance"
                />
                <ServiceCard
                  icon="bolt"
                  title="Emergency Repairs"
                  description="24/7 critical response team"
                  features={[
                    "2-hour response guarantee",
                    "Original spare parts",
                    "Mobile repair units"
                  ]}
                  actionText="Request Emergency Service"
                />
                <ServiceCard
                  icon="graduation-cap"
                  title="Operator Training"
                  description="Certification programs for your team"
                  features={[
                    "On-site or virtual training",
                    "Machine-specific certification",
                    "Performance analytics"
                  ]}
                  actionText="View Training Programs"
                />
              </div>

              <div className="bg-almona-darker/50 p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Connected Machine Network</h2>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">
                    {machineView === "list" ? "Registered Equipment" : "Facility Map View"}
                  </h3>
                  <Button 
                    variant="outline"
                    onClick={() => setMachineView(machineView === "list" ? "map" : "list")}
                  >
                    {machineView === "list" ? "Show Map View" : "Show List View"}
                  </Button>
                </div>
                
                {machineView === "list" ? (
                  <div className="grid gap-4">
                    {/* Sample machine - in reality would map through registered machines */}
                    <div className="p-4 border border-almona-light/20 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">YILMAZ PRO-5000</h4>
                        <p className="text-sm text-gray-400">Serial: YM-5K-238492 | Installed: 15/03/2022</p>
                      </div>
                      <Badge variant="secondary">Active Warranty</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="h-96 bg-almona-dark rounded-lg flex items-center justify-center">
                    <p>Interactive facility map with machine locations would appear here</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Machine Registration */}
            <TabsContent value="register">
              <MachineRegistration />
            </TabsContent>

            {/* Maintenance Dashboard */}
            <TabsContent value="dashboard">
              <MaintenanceDashboard />
            </TabsContent>

            {/* Customer Portal */}
            <TabsContent value="portal">
              <CustomerPortal />
            </TabsContent>

            {/* AI Features */}
            <TabsContent value="ai">
              <AIFeatures />
            </TabsContent>
          </Tabs>

          {/* Unique Technology Highlights */}
          <Separator className="my-12 bg-almona-light/20" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <Badge className="mb-4">Patent Pending</Badge>
              <h2 className="text-3xl font-bold mb-6">Machine DNA Technology</h2>
              <p className="text-gray-400 mb-6">
                Our proprietary registration system creates a complete digital fingerprint for each machine, 
                enabling predictive maintenance and personalized service recommendations.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Automatic warranty validation and tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Equipment health scoring system</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Spare parts consumption forecasting</span>
                </li>
              </ul>
            </div>
            <div className="bg-almona-darker rounded-lg p-8 border border-almona-light/20">
              <h3 className="text-xl font-semibold mb-4">Real-time Service Network</h3>
              <div className="aspect-video bg-almona-dark rounded flex items-center justify-center mb-4">
                <p>Live map of service technicians and parts inventory would display here</p>
              </div>
              <p className="text-gray-400">
                Our connected service ecosystem ensures the right technician with the right parts 
                arrives at your facility faster than ever before.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;