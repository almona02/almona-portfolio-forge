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
import { Calendar, Clock, CheckCircle2, TrendingUp, FileText, Package, AlertCircle, MapPin, Users, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Progress } from "@/shared/ui/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Separator } from "@/shared/ui/ui/separator";

interface ScheduleMaintenanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId?: string;
  machineModel?: string;
}

interface ScheduleFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  machineId: string;
  machineModel: string;
  serviceType: "preventive" | "corrective" | "inspection" | "calibration";
  priority: "low" | "medium" | "high" | "emergency";
  preferredDate: string;
  preferredTime: string;
  duration: string;
  location: string;
  technicianPreference: string;
  notes: string;
  spareParts: string[];
}

interface AvailableSlot {
  date: string;
  time: string;
  technician: string;
  duration: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  features: string[];
  recommendedFor: string[];
}

const servicePackages: ServicePackage[] = [
  {
    id: "basic-maintenance",
    name: "Basic Maintenance",
    description: "Essential maintenance for optimal performance",
    duration: "2-3 hours",
    price: 2500,
    features: [
      "Visual inspection",
      "Basic lubrication",
      "Safety checks",
      "Performance report"
    ],
    recommendedFor: ["New machines", "Regular maintenance"]
  },
  {
    id: "comprehensive-service",
    name: "Comprehensive Service",
    description: "Complete service package with detailed inspection",
    duration: "4-6 hours",
    price: 5500,
    features: [
      "Full diagnostic scan",
      "Component inspection",
      "Calibration check",
      "Parts replacement",
      "Performance optimization"
    ],
    recommendedFor: ["Heavy usage", "Annual service"]
  },
  {
    id: "precision-calibration",
    name: "Precision Calibration",
    description: "Advanced calibration for precision requirements",
    duration: "3-4 hours",
    price: 4200,
    features: [
      "Precision measurement",
      "Calibration verification",
      "Accuracy testing",
      "Certification provided"
    ],
    recommendedFor: ["CNC machines", "Precision equipment"]
  }
];

const availableSlots: AvailableSlot[] = [
  { date: "2024-01-15", time: "09:00", technician: "Ahmed Hassan", duration: 3 },
  { date: "2024-01-15", time: "14:00", technician: "Mohamed Ali", duration: 2 },
  { date: "2024-01-16", time: "10:00", technician: "Khaled Ibrahim", duration: 4 },
  { date: "2024-01-16", time: "15:00", technician: "Ahmed Hassan", duration: 3 },
  { date: "2024-01-17", time: "08:30", technician: "Mohamed Ali", duration: 2 },
];

const technicians = [
  { id: "ahmed-hassan", name: "Ahmed Hassan", specialty: "CNC Machines", rating: 4.9 },
  { id: "mohamed-ali", name: "Mohamed Ali", specialty: "Cutting Systems", rating: 4.8 },
  { id: "khaled-ibrahim", name: "Khaled Ibrahim", specialty: "Welding Equipment", rating: 4.7 },
];

export const ScheduleMaintenance = ({ open, onOpenChange, machineId, machineModel }: ScheduleMaintenanceProps) => {
  const [step, setStep] = useState<"select" | "details" | "schedule" | "confirm">("select");
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "custom">("packages");

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ScheduleFormData>({
    defaultValues: {
      machineId: machineId || "",
      machineModel: machineModel || "",
      serviceType: "preventive",
      priority: "medium",
      location: "Cairo, Egypt"
    }
  });

  const serviceType: "preventive" | "corrective" | "inspection" | "calibration" = watch("serviceType");
  const priority: "low" | "medium" | "high" | "emergency" = watch("priority");

  useEffect(() => {
    if (machineId) setValue("machineId", machineId);
    if (machineModel) setValue("machineModel", machineModel);
  }, [machineId, machineModel, setValue]);


  const onSubmit = async (data: ScheduleFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate service ID
      const serviceId = `SM-${Date.now().toString().slice(-8)}`;
      
      setStep("confirm");
      
      // Reset after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        reset();
        setStep("select");
        setSelectedPackage(null);
        setSelectedSlot(null);
      }, 3000);
    } catch (error) {
      console.error("Schedule maintenance error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      reset();
      setStep("select");
      setSelectedPackage(null);
      setSelectedSlot(null);
    }, 300);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
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
                  Schedule Maintenance Service
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Choose from pre-configured service packages or create a custom maintenance schedule
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "packages" | "custom")} className="mt-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                  <TabsTrigger value="packages">Service Packages</TabsTrigger>
                  <TabsTrigger value="custom">Custom Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="packages" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {servicePackages.map((pkg) => (
                      <motion.div
                        key={pkg.id}
                        className={`relative p-6 rounded-lg border-2 transition-all duration-300 ${
                          selectedPackage?.id === pkg.id
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-almona-light/20 hover:border-almona-light/40"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        <div className="text-center">
                          <h3 className="font-bold text-lg mb-2">{pkg.name}</h3>
                          <p className="text-sm text-gray-400 mb-3">{pkg.description}</p>
                          <p className="text-2xl font-bold text-orange-500 mb-2">
                            {pkg.price.toLocaleString()} EGP
                          </p>
                          <p className="text-sm text-gray-400 mb-4">{pkg.duration}</p>
                          
                          <ul className="text-sm text-gray-400 space-y-1 text-left">
                            {pkg.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          
                          <div className="mt-4 pt-4 border-t border-almona-light/20">
                            <p className="text-xs text-gray-500">Recommended for:</p>
                            <p className="text-xs">{pkg.recommendedFor.join(", ")}</p>
                          </div>
                        </div>
                        
                        {selectedPackage?.id === pkg.id && (
                          <motion.div
                            className="absolute inset-0 rounded-lg border-2 border-orange-500"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="mt-6">
                  <Card className="bg-almona-darker/50 border-almona-light/20">
                    <CardHeader>
                      <CardTitle>Custom Service Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Service Type</Label>
                          <Select value={serviceType} onValueChange={(value: "preventive" | "corrective" | "inspection" | "calibration") => setValue("serviceType", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preventive">Preventive Maintenance</SelectItem>
                              <SelectItem value="corrective">Corrective Maintenance</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="calibration">Calibration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Priority Level</Label>
                          <Select value={priority} onValueChange={(value: "low" | "medium" | "high" | "emergency") => setValue("priority", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Label>Estimated Duration</Label>
                        <Select {...register("duration")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-2">1-2 hours</SelectItem>
                            <SelectItem value="2-4">2-4 hours</SelectItem>
                            <SelectItem value="4-6">4-6 hours</SelectItem>
                            <SelectItem value="full-day">Full day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep("details")}
                  disabled={activeTab === "packages" ? !selectedPackage : false}
                  className="bg-gradient-to-r from-orange-500 to-red-500"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Service Details</DialogTitle>
                <DialogDescription>
                  Provide your contact information and service requirements
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
                    <Label htmlFor="machineId">Machine ID</Label>
                    <Input
                      id="machineId"
                      {...register("machineId")}
                      readOnly={!!machineId}
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="machineModel">Machine Model</Label>
                    <Input
                      id="machineModel"
                      {...register("machineModel")}
                      readOnly={!!machineModel}
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Service Location</Label>
                    <Input
                      id="location"
                      {...register("location")}
                      className="bg-almona-darker/50 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="technicianPreference">Preferred Technician</Label>
                    <Select {...register("technicianPreference")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any available technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name} - {tech.specialty} ({tech.rating}★)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Special Requirements</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Any specific requirements, issues, or notes..."
                    {...register("notes")}
                    className="bg-almona-darker/50 border-almona-light/20"
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("select")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep("schedule")}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    Next: Select Time
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Select Service Time</DialogTitle>
                <DialogDescription>
                  Choose your preferred date and time slot
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Available Time Slots</h3>
                    <div className="space-y-3">
                      {availableSlots.map((slot, index) => (
                        <motion.div
                          key={index}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedSlot === slot
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-almona-light/20 hover:border-almona-light/40"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{slot.date}</p>
                              <p className="text-sm text-gray-400">{slot.time}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">{slot.technician}</p>
                              <p className="text-xs text-gray-400">{slot.duration}h</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Service Summary</h3>
                    <Card className="bg-almona-darker/50 border-almona-light/20">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Service:</span>
                            <span className="font-bold">{selectedPackage?.name || "Custom Service"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine:</span>
                            <span className="font-bold">{machineModel || "Not specified"}</span>
                          </div>
                          {selectedSlot && (
                            <>
                              <div className="flex justify-between">
                                <span>Date:</span>
                                <span className="font-bold">{selectedSlot.date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Time:</span>
                                <span className="font-bold">{selectedSlot.time}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Technician:</span>
                                <span className="font-bold">{selectedSlot.technician}</span>
                              </div>
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg">
                            <span>Total:</span>
                            <span className="font-bold text-orange-500">
                              {selectedPackage?.price.toLocaleString() || "TBD"} EGP
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-4 p-4 bg-blue-500/10 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">AI Scheduling Active</p>
                          <p className="text-xs text-gray-400">
                            Our system will optimize the schedule based on technician availability and your preferences
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("details")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={!selectedSlot || isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    {isSubmitting ? "Scheduling..." : "Confirm Schedule"}
                  </Button>
                </div>
              </div>
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
              <h3 className="text-2xl font-bold mb-2">Service Scheduled!</h3>
              <p className="text-gray-400 mb-4">
                Your maintenance service has been successfully scheduled.
              </p>
              <Badge className="bg-green-500/20 text-green-300">
                Service ID: SM-{Date.now().toString().slice(-8)}
              </Badge>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <p>✓ Service scheduled</p>
                <p>✓ Technician assigned</p>
                <p>✓ Customer portal updated</p>
                <p>✓ SMS confirmation sent</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
