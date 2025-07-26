import { useState } from "react";
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
import { AlertTriangle, Phone, Clock, MapPin, Wrench, Zap, Settings, Activity, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { sendSms } from "@/lib/smsService";

interface EmergencyServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmergencyFormData {
  emergencyType: string;
  machineModel: string;
  serialNumber: string;
  contactName: string;
  phone: string;
  location: string;
  description: string;
  priority: "critical" | "high" | "medium";
}

const emergencyTypes = [
  {
    id: "hydraulic-failure",
    title: "Hydraulic System Failure",
    icon: Settings,
    description: "Complete hydraulic system breakdown",
    responseTime: "30-60 minutes",
    color: "from-red-500 to-orange-500"
  },
  {
    id: "electrical-fault",
    title: "Electrical Fault",
    icon: Zap,
    description: "Power issues, control failures, wiring problems",
    responseTime: "45-90 minutes",
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "mechanical-breakdown",
    title: "Mechanical Breakdown",
    icon: Wrench,
    description: "Critical mechanical component failure",
    responseTime: "60-120 minutes",
    color: "from-blue-500 to-purple-500"
  },
  {
    id: "software-crash",
    title: "Software/System Crash",
    icon: Activity,
    description: "Control system failure, software issues",
    responseTime: "30-45 minutes",
    color: "from-green-500 to-teal-500"
  }
];

export const EmergencyServiceDialog = ({ open, onOpenChange }: EmergencyServiceDialogProps) => {
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EmergencyFormData>();

  const onSubmit = async (data: EmergencyFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Send SMS notification
      const smsMessage = `🚨 EMERGENCY: ${data.emergencyType} at ${data.location}. Contact: ${data.contactName} - ${data.phone}`;
      await sendSms({ to: data.phone, message: smsMessage });
      
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        reset();
        setSelectedEmergency(null);
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Emergency submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      reset();
      setSelectedEmergency(null);
      setSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </motion.div>
                  Emergency Service Request
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  24/7 critical response team - Average response time: 30-120 minutes
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                {/* Emergency Type Selection */}
                <div>
                  <Label className="text-lg font-semibold mb-4 block">Select Emergency Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emergencyTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <motion.button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedEmergency(type.id)}
                          className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                            selectedEmergency === type.id
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-almona-light/20 hover:border-almona-light/40"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-start gap-3">
                            <motion.div
                              className={`p-2 rounded-lg bg-gradient-to-r ${type.color}`}
                              animate={selectedEmergency === type.id ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </motion.div>
                            <div className="text-left">
                              <h3 className="font-semibold">{type.title}</h3>
                              <p className="text-sm text-gray-400">{type.description}</p>
                              <Badge variant="secondary" className="mt-2">
                                <Clock className="h-3 w-3 mr-1" />
                                {type.responseTime}
                              </Badge>
                            </div>
                          </div>
                          {selectedEmergency === type.id && (
                            <motion.div
                              className="absolute inset-0 rounded-lg border-2 border-orange-500"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <AnimatePresence>
                  {selectedEmergency && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="machineModel">Machine Model *</Label>
                          <Input
                            id="machineModel"
                            placeholder="e.g., DK-502, KM-212"
                            {...register("machineModel", { required: "Machine model is required" })}
                            className="bg-almona-darker/50 border-almona-light/20"
                          />
                          {errors.machineModel && (
                            <p className="text-red-500 text-sm">{errors.machineModel.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="serialNumber">Serial Number *</Label>
                          <Input
                            id="serialNumber"
                            placeholder="Enter machine serial number"
                            {...register("serialNumber", { required: "Serial number is required" })}
                            className="bg-almona-darker/50 border-almona-light/20"
                          />
                          {errors.serialNumber && (
                            <p className="text-red-500 text-sm">{errors.serialNumber.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactName">Contact Name *</Label>
                          <Input
                            id="contactName"
                            placeholder="Your full name"
                            {...register("contactName", { required: "Contact name is required" })}
                            className="bg-almona-darker/50 border-almona-light/20"
                          />
                          {errors.contactName && (
                            <p className="text-red-500 text-sm">{errors.contactName.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+20 123 456 7890"
                            {...register("phone", { required: "Phone number is required" })}
                            className="bg-almona-darker/50 border-almona-light/20"
                          />
                          {errors.phone && (
                            <p className="text-red-500 text-sm">{errors.phone.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Facility Location *</Label>
                        <Input
                          id="location"
                          placeholder="Enter your facility address"
                          {...register("location", { required: "Location is required" })}
                          className="bg-almona-darker/50 border-almona-light/20"
                        />
                        {errors.location && (
                          <p className="text-red-500 text-sm">{errors.location.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Problem Description *</Label>
                        <Textarea
                          id="description"
                          rows={4}
                          placeholder="Describe the issue in detail..."
                          {...register("description", { required: "Description is required" })}
                          className="bg-almona-darker/50 border-almona-light/20"
                        />
                        {errors.description && (
                          <p className="text-red-500 text-sm">{errors.description.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority Level</Label>
                        <Select
                          onValueChange={(value) => register("priority").onChange({ target: { value } })}
                          defaultValue="critical"
                        >
                          <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">
                              <span className="text-red-500">🔴 Critical - Production Stopped</span>
                            </SelectItem>
                            <SelectItem value="high">
                              <span className="text-orange-500">🟠 High - Major Impact</span>
                            </SelectItem>
                            <SelectItem value="medium">
                              <span className="text-yellow-500">🟡 Medium - Minor Impact</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="border-almona-light/20"
                  >
                    Cancel
                  </Button>
                  <motion.button
                    type="submit"
                    disabled={!selectedEmergency || isSubmitting}
                    className="relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%" }}
                      animate={{ x: isSubmitting ? "100%" : "-100%" }}
                      transition={{ duration: 1, repeat: isSubmitting ? Infinity : 0 }}
                    />
                    {isSubmitting ? "Processing..." : "🚨 Request Emergency Service"}
                  </motion.button>
                </DialogFooter>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
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
              <h3 className="text-2xl font-bold mb-2">Emergency Request Submitted!</h3>
              <p className="text-gray-400">
                Our emergency response team has been notified and will contact you within 15 minutes.
              </p>
              <Badge className="mt-4 bg-green-500/20 text-green-300">
                Reference: EMG-{Date.now().toString().slice(-6)}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
