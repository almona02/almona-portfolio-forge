import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Badge } from "@/shared/ui/ui/badge";
import { Calendar, Clock, CheckCircle2, TrendingUp, FileText, Package, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Progress } from "@/shared/ui/ui/progress";
import { Separator } from "@/shared/ui/ui/separator";

interface PreventiveMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MaintenanceFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  machineCount: number;
  serviceType: "basic" | "standard" | "premium";
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  startDate: string;
  notes: string;
  machines: MachineDetails[];
}

interface MachineDetails {
  model: string;
  serialNumber: string;
  installationDate: string;
  lastServiceDate?: string;
  nextServiceDue: string;
  warrantyExpiry: string;
}

interface ServiceContract {
  id: string;
  type: string;
  price: number;
  features: string[];
  machines: number;
  frequency: string;
}

const serviceContracts: ServiceContract[] = [
  {
    id: "basic",
    type: "Basic Plan",
    price: 5000,
    machines: 1,
    frequency: "Semi-Annual",
    features: [
      "Basic inspection",
      "Oil change",
      "Filter replacement",
      "Basic diagnostics"
    ]
  },
  {
    id: "standard",
    type: "Standard Plan",
    price: 8500,
    machines: 1,
    frequency: "Quarterly",
    features: [
      "Comprehensive inspection",
      "All basic services",
      "Parts replacement",
      "Performance optimization",
      "Warranty compliance check"
    ]
  },
  {
    id: "premium",
    type: "Premium Plan",
    price: 15000,
    machines: 1,
    frequency: "Monthly",
    features: [
      "Full service package",
      "Predictive maintenance",
      "24/7 monitoring",
      "Priority support",
      "Training sessions",
      "Parts discount 15%"
    ]
  }
];

export const PreventiveMaintenanceDialog = ({ open, onOpenChange }: PreventiveMaintenanceDialogProps) => {
  const [step, setStep] = useState<"select" | "details" | "confirm">("select");
  const [selectedContract, setSelectedContract] = useState<ServiceContract | null>(null);
  const [machineCount, setMachineCount] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<MaintenanceFormData>();

  const serviceType = watch("serviceType");
  const frequency = watch("frequency");
  const machines = watch("machines");

  useEffect(() => {
    if (selectedContract) {
      setTotalPrice(selectedContract.price * machineCount);
    }
  }, [selectedContract, machineCount]);

  const onSubmit = async (data: MaintenanceFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate contract ID
      const contractId = `PM-${Date.now().toString().slice(-8)}`;
      
      setStep("confirm");
      
      // Reset after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        reset();
        setStep("select");
        setSelectedContract(null);
        setMachineCount(1);
      }, 3000);
    } catch (error) {
      console.error("Maintenance submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      reset();
      setStep("select");
      setSelectedContract(null);
      setMachineCount(1);
    }, 300);
  };

  const generateMaintenanceSchedule = (contract: ServiceContract, count: number) => {
    const schedules = [];
    const startDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const schedule = {
        machineId: `M-${i + 1}`,
        nextService: new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from now
        contractType: contract.type,
        price: contract.price,
        features: contract.features
      };
      schedules.push(schedule);
    }
    
    return schedules;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-orange-500" />
                  Preventive Maintenance Service
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  AI-powered maintenance scheduling with flexible service contracts
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Service Contract Selection */}
                <div>
                  <Label className="text-lg font-semibold mb-4 block">Select Service Plan</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {serviceContracts.map((contract) => (
                      <motion.div
                        key={contract.id}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                          selectedContract?.id === contract.id
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-almona-light/20 hover:border-almona-light/40"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedContract(contract)}
                      >
                        <div className="text-center">
                          <h3 className="font-bold text-lg">{contract.type}</h3>
                          <p className="text-2xl font-bold text-orange-500 mt-2">
                            {contract.price.toLocaleString()} EGP
                          </p>
                          <p className="text-sm text-gray-400">{contract.frequency}</p>
                          <ul className="text-sm text-gray-400 mt-3 space-y-1">
                            {contract.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {selectedContract?.id === contract.id && (
                          <motion.div
                            className="absolute inset-0 rounded-lg border-2 border-orange-500"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Machine Count */}
                <div>
                  <Label htmlFor="machineCount">Number of Machines</Label>
                  <Input
                    id="machineCount"
                    type="number"
                    min="1"
                    max="50"
                    value={machineCount}
                    onChange={(e) => setMachineCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-almona-darker/50 border-almona-light/20"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Total: {totalPrice.toLocaleString()} EGP for {machineCount} machine{machineCount > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep("details")}
                    disabled={!selectedContract}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "details" && selectedContract && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Service Details</DialogTitle>
                <DialogDescription>
                  Complete your maintenance service registration
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      {...register("companyName", { required: "Company name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      {...register("contactName", { required: "Contact name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                    {errors.contactName && (
                      <p className="text-red-500 text-sm">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone", { required: "Phone is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Input
                      id="serviceType"
                      value={selectedContract.type}
                      readOnly
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      value={selectedContract.frequency}
                      readOnly
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startDate">Preferred Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate", { required: "Start date is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                    {errors.startDate && (
                      <p className="text-red-500 text-sm">{errors.startDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="machineCount">Machine Count</Label>
                    <Input
                      id="machineCount"
                      type="number"
                      value={machineCount}
                      readOnly
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Special Requirements</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Any specific requirements or notes..."
                    {...register("notes")}
                    className="bg-almona-darker/50 border-almona-light/20"
                  />
                </div>

                {/* Service Summary */}
                <Card className="bg-almona-dark/50 border-almona-light/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Service Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Service Plan:</span>
                        <span className="font-bold">{selectedContract.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Machine Count:</span>
                        <span className="font-bold">{machineCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frequency:</span>
                        <span className="font-bold">{selectedContract.frequency}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span>Total Price:</span>
                        <span className="font-bold text-orange-500">{totalPrice.toLocaleString()} EGP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("select")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    {isSubmitting ? "Processing..." : "Schedule Service"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">Maintenance Scheduled!</h3>
              <p className="text-gray-400 mb-4">
                Your preventive maintenance service has been scheduled successfully.
              </p>
              <Badge className="bg-green-500/20 text-green-300">
                Contract ID: PM-{Date.now().toString().slice(-8)}
              </Badge>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <p>✓ Service contract created</p>
                <p>✓ AI scheduling activated</p>
                <p>✓ Customer portal access granted</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
