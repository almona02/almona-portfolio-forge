import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ServiceCard } from "@/components/services/ServiceCard";
import { EmergencyServiceDialog } from "@/components/services/EmergencyServiceDialog";
import { MachineRegistrationEnhanced } from "@/components/services/MachineRegistration";
import { MaintenanceDashboard } from "@/components/services/MaintenanceDashboard";
import { CustomerPortal } from "@/components/services/CustomerPortal";
import { ScheduleMaintenance } from "@/components/services/ScheduleMaintenance";
import { OperatorTrainingIncentiveDialog } from "@/components/services/OperatorTrainingIncentiveDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/ui/tabs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Services = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [machineView, setMachineView] = useState<"list" | "map">("list");
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [scheduleMaintenanceOpen, setScheduleMaintenanceOpen] = useState(false);
  const [operatorTrainingOpen, setOperatorTrainingOpen] = useState(false);

  useEffect(() => {
    document.title = "Industrial Services - ALMONA";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="container mx-auto px-4 py-12"
        >
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient-orange">Industrial Services Hub</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              AI-powered maintenance, machine lifecycle management, and premium support for your equipment.
            </p>
          </div>

          {/* Emergency Service Dialog */}
          <EmergencyServiceDialog 
            open={emergencyDialogOpen} 
            onOpenChange={setEmergencyDialogOpen} 
          />

          {/* Schedule Maintenance Dialog */}
          <ScheduleMaintenance
            open={scheduleMaintenanceOpen}
            onOpenChange={setScheduleMaintenanceOpen}
          />

          {/* Main Services Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto mb-12 bg-almona-darker/60 backdrop-blur-sm border border-almona-light/20 p-2 rounded-lg">
              <TabsTrigger value="overview">Services Overview</TabsTrigger>
              <TabsTrigger value="register">Register Machine</TabsTrigger>
              <TabsTrigger value="dashboard">Maintenance Dashboard</TabsTrigger>
              <TabsTrigger value="portal">Customer Portal</TabsTrigger>
            </TabsList>

            {/* Services Overview */}
            <TabsContent value="overview">
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
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
                    onActionClick={() => setScheduleMaintenanceOpen(true)}
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
                    onActionClick={() => setEmergencyDialogOpen(true)}
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
                    onActionClick={() => setOperatorTrainingOpen(true)}
                  />
                </div>
                <div className="bg-almona-darker/50 p-8 rounded-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">
                      {machineView === "list" ? "Registered Equipment" : "Facility Map View"}
                    </h3>
                    <Button 
                      className="border border-white text-white hover:bg-white hover:text-black transition rounded px-4 py-2"
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
              </motion.div>
            </TabsContent>

            {/* Machine Registration */}
            <TabsContent value="register">
              <motion.div
                key="register"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <MachineRegistrationEnhanced />
              </motion.div>
            </TabsContent>

            {/* Maintenance Dashboard */}
            <TabsContent value="dashboard">
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <MaintenanceDashboard />
              </motion.div>
            </TabsContent>

            {/* Customer Portal */}
            <TabsContent value="portal">
              <motion.div
                key="portal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <CustomerPortal />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
      <OperatorTrainingIncentiveDialog
        open={operatorTrainingOpen}
        onOpenChange={setOperatorTrainingOpen}
      />
    </div>
  );
};

export default Services;
