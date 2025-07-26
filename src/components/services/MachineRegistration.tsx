import { useState } from "react";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Badge } from "@/shared/ui/ui/badge";
import { useToast } from "@/shared/ui/ui/use-toast";
import { QrCodeIcon, CheckCircle2, AlertCircle, ChevronRight, Camera, Upload, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { EnhancedOperatorTrainingDialog } from './EnhancedOperatorTrainingDialog';

interface MachineData {
  serialNumber: string;
  model: string;
  installationDate: string;
  warrantyValid: boolean;
  digitalTwinId?: string;
  photos?: string[];
}

interface WarrantyExtension {
  months: number;
  price: number;
  egyptOnly: boolean;
  features: string[];
}

export const MachineRegistrationEnhanced = () => {
  const { toast } = useToast();
  const [machine, setMachine] = useState<MachineData>({
    serialNumber: "",
    model: "",
    installationDate: "",
    warrantyValid: false,
    photos: [],
  });
  const [qrScanning, setQrScanning] = useState(false);
  const [step, setStep] = useState<"scan" | "details" | "confirm">("scan");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);

  const warrantyExtensions: WarrantyExtension[] = [
    { months: 12, price: 15000, egyptOnly: true, features: ["Basic coverage", "Parts replacement", "Technical support"] },
    { months: 24, price: 25000, egyptOnly: true, features: ["Extended coverage", "Priority support", "Annual inspection"] },
    { months: 36, price: 35000, egyptOnly: false, features: ["Full coverage", "24/7 support", "Predictive maintenance", "Training included"] }
  ];

  const handleScanQR = () => {
    setQrScanning(true);
    setTimeout(() => {
      setMachine({ ...machine, serialNumber: "YM-5K-238492", model: "YILMAZ PRO-5000" });
      setQrScanning(false);
      setStep("details");
      toast({ title: "Machine identified", description: "YILMAZ PRO-5000 (YM-5K-238492)", variant: "success" });
    }, 1500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setMachine({ ...machine, photos: [...(machine.photos || []), ...newPhotos] });
    }
  };

  const checkWarranty = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setMachine({ ...machine, warrantyValid: true });
      setIsProcessing(false);
      toast({ title: "Warranty verified", description: "This machine has active warranty coverage until 2025", variant: "success" });
    }, 1000);
  };

  const generateDigitalTwin = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setMachine({ ...machine, digitalTwinId: `DT-${Math.random().toString(36).substring(2, 10).toUpperCase()}` });
      setStep("confirm");
      setIsProcessing(false);
      toast({ title: "Digital Twin Created", description: "Your machine now has a virtual representation", variant: "success" });
    }, 2000);
  };

  const completeRegistration = () => {
    toast({ title: "Registration Complete", description: "Machine successfully registered in our system", variant: "success" });
    setStep("scan");
    setMachine({ serialNumber: "", model: "", installationDate: "", warrantyValid: false, photos: [] });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <Card className="bg-almona-darker/50 border-almona-light/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Register New Machine</CardTitle>
                <p className="text-gray-400">Scan the QR code or enter details manually</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div className="space-y-4" whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                    <div className="h-64 bg-gradient-to-br from-almona-dark to-almona-darker rounded-lg flex flex-col items-center justify-center border border-almona-light/20">
                      {qrScanning ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                          <QrCodeIcon className="w-16 h-16 text-orange-500" />
                        </motion.div>
                      ) : (
                        <Camera className="w-16 h-16 text-gray-400 mb-2" />
                      )}
                      <p className="text-gray-400 text-center">{qrScanning ? "Scanning QR code..." : "Point camera at machine QR code"}</p>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500" onClick={handleScanQR} disabled={qrScanning}>
                      {qrScanning ? "Scanning..." : "Scan QR Code"}
                    </Button>
                  </motion.div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input id="serialNumber" placeholder="Enter machine serial number" value={machine.serialNumber} onChange={(e) => setMachine({ ...machine, serialNumber: e.target.value })} className="bg-almona-darker/50 border-almona-light/20" />
                    </div>
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" placeholder="Enter machine model" value={machine.model} onChange={(e) => setMachine({ ...machine, model: e.target.value })} className="bg-almona-darker/50 border-almona-light/20" />
                    </div>
                    <div>
                      <Label htmlFor="photos">Upload Photos</Label>
                      <div className="flex items-center gap-2">
                        <Input id="photos" type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                        <Button variant="outline" onClick={() => document.getElementById('photos')?.click()} className="w-full">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photos
                        </Button>
                      </div>
                      {machine.photos && machine.photos.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">{machine.photos.length} photo(s) uploaded</div>
                      )}
                    </div>
                    <Button className="w-full" onClick={() => setStep("details")} disabled={!machine.serialNumber || !machine.model}>
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "details" && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Card className="bg-almona-darker/50 border-almona-light/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Machine Details</CardTitle>
                <p className="text-gray-400">Complete your machine registration</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" value={machine.serialNumber} readOnly className="bg-almona-darker/30 border-almona-light/20" />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={machine.model} readOnly className="bg-almona-darker/30 border-almona-light/20" />
                  </div>
                  <div>
                    <Label htmlFor="installationDate">Installation Date</Label>
                    <Input id="installationDate" type="date" value={machine.installationDate} onChange={(e) => setMachine({ ...machine, installationDate: e.target.value })} className="bg-almona-darker/50 border-almona-light/20" />
                  </div>
                  <div>
                    <Label>Warranty Status</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={checkWarranty} disabled={machine.warrantyValid || isProcessing} className="flex-1">
                        {isProcessing ? "Checking..." : "Check Warranty"}
                      </Button>
                      {machine.warrantyValid ? (
                        <Badge className="flex items-center gap-1 bg-green-500/20 text-green-300"><CheckCircle2 className="h-4 w-4" /> Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Not Verified</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h3 className="text-xl font-bold mb-4">Warranty Extension Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {warrantyExtensions.map((option, index) => (
                      <motion.div key={option.months} className="border border-almona-light/20 rounded-lg p-4 hover:border-orange-500/50 transition-colors" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02 }}>
                        <h4 className="font-bold text-lg">{option.months} Months</h4>
                        <p className="text-2xl font-bold text-orange-500">{option.price} EGP</p>
                        {option.egyptOnly && <Badge className="mb-2">Egypt Only</Badge>}
                        <ul className="text-sm text-gray-400 space-y-1 mt-2">
                          {option.features.map((feature, i) => (
                            <li key={i} className="flex items-start">
                              <CheckCircle2 className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full mt-3" variant="outline" size="sm">Add to Contract</Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep("scan")}>Back</Button>
                  <Button onClick={generateDigitalTwin} disabled={!machine.installationDate || isProcessing} className="bg-gradient-to-r from-orange-500 to-red-500">
                    {isProcessing ? "Processing..." : "Generate Digital Twin"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-6">
            <Card className="bg-almona-darker/50 border-almona-light/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Registration Complete</CardTitle>
                <p className="text-gray-400">Your machine is now registered in our system</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-almona-dark/50 border-almona-light/20">
                    <CardHeader><CardTitle className="text-lg">Machine Information</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div><p className="text-sm text-gray-400">Serial Number</p><p className="font-mono text-orange-500">{machine.serialNumber}</p></div>
                        <div><p className="text-sm text-gray-400">Model</p><p className="font-bold">{machine.model}</p></div>
                        <div><p className="text-sm text-gray-400">Installation Date</p><p>{new Date(machine.installationDate).toLocaleDateString()}</p></div>
                        <div><p className="text-sm text-gray-400">Digital Twin ID</p><p className="font-mono text-green-500">{machine.digitalTwinId}</p></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-almona-dark/50 border-almona-light/20">
                    <CardHeader><CardTitle className="text-lg">Next Steps</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        <motion.li className="flex items-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div><p className="font-medium">Machine Registered</p><p className="text-sm text-gray-400">Added to your fleet</p></div>
                        </motion.li>
                        <motion.li className="flex items-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div><p className="font-medium">Digital Twin Created</p><p className="text-sm text-gray-400">Virtual representation ready</p></div>
                        </motion.li>
                        <motion.li className="flex items-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div><p className="font-medium">Warranty Activated</p><p className="text-sm text-gray-400">Coverage starts immediately</p></div>
                        </motion.li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button className="flex-1" variant="outline" onClick={() => window.open('/shop?tab=reports', '_blank')}>
                    Generate Report
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-green-500 to-blue-500" onClick={completeRegistration}>
                    Complete Registration
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => setShowTrainingDialog(true)}>
                    Operator Training
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <EnhancedOperatorTrainingDialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog} />
    </div>
  );
};
