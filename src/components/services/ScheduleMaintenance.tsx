import { supabase } from "@/lib/supabase";
import { createTicket } from "@/lib/ticketApi";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Separator } from "@/shared/ui/ui/separator";
import { Switch } from "@/shared/ui/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Textarea } from "@/shared/ui/ui/textarea";
import { useToast } from "@/shared/ui/ui/use-toast";
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import { AlertCircle, CheckCircle2, Cpu, Settings, Shield, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface ScheduleMaintenanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId?: string;
  machineModel?: string;
  machineType?: "cnc" | "cutting" | "welding" | "bending" | "punching";
}

interface ScheduleFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  machineId: string;
  machineModel: string;
  machineType: string;
  serviceType: "preventive" | "corrective" | "calibration" | "emergency" | "seasonal";
  priority: "low" | "medium" | "high" | "emergency";
  preferredDate: string;
  preferredTime: string;
  duration: string;
  governorate: string;
  industrialZone: string;
  technicianPreference: string;
  notes: string;
  spareParts: string[];
  includeOperatorTraining: boolean;
  includeSafetyInspection: boolean;
  includeSoftwareUpdate: boolean;
  paymentMethod: "cash" | "bank_transfer" | "installments";
  turkishTechnician: boolean;
  translationRequired: boolean;
}

interface AvailableSlot {
  date: string;
  time: string;
  technician: string;
  specialty: string;
  languages: string[];
  duration: number;
  rating: number;
}

interface ServicePackage {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  duration: string;
  price: number;
  features: string[];
  featuresAr: string[];
  recommendedFor: string[];
  turkishExpert: boolean;
  seasonalDiscount: boolean;
}

// Egyptian governorates for location selection
const EGYPTIAN_GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayoum",
  "Gharbiya", "Ismailia", "Menofia", "Minya", "Qaliubiya", "New Valley",
  "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", "Sharkia",
  "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai",
  "Sohag"
];

// Industrial zones in major cities
const INDUSTRIAL_ZONES = {
  Cairo: ["10th of Ramadan", "Obour City", "Badr City", "El Shorouk"],
  Giza: ["6th of October", "Sheikh Zayed", "El Hawamdeya"],
  Alexandria: ["Borg El Arab", "Ameriya", "El Max"],
  Ismailia: ["Ismailia Industrial Zone", "Qantara"],
  Suez: ["Suez Industrial Zone", "Attaka"],
  Port_Said: ["Port Said Industrial Zone", "Port Fouad"]
};

const ALUMINUM_MACHINE_TYPES = [
  "CNC Machining Center",
  "Cutting & Sawing Machine",
  "Welding Machine",
  "Bending & Forming Machine",
  "Punching & Drilling Machine",
  "Anodizing Line",
  "Powder Coating Line",
  "Thermal Break Machine"
];

const servicePackages: ServicePackage[] = [
  {
    id: "basic-aluminum",
    name: "Basic Aluminum Maintenance",
    nameAr: "الصيانة الأساسية للألومنيوم",
    description: "Essential maintenance for aluminum machinery performance",
    descriptionAr: "الصيانة الأساسية لآلات الألومنيوم",
    duration: "3-4 hours",
    price: 3500,
    features: [
      "Visual inspection of cutting blades",
      "Lubrication of moving parts",
      "Alignment check",
      "Basic electrical testing",
      "Performance report (Arabic/English)"
    ],
    featuresAr: [
      "فحص بصري لشفرات القطع",
      "تزييت الأجزاء المتحركة",
      "فحص المحاذاة",
      "اختبار كهربائي أساسي",
      "تقرير الأداء (عربي/إنجليزي)"
    ],
    recommendedFor: ["Regular maintenance", "New installations"],
    turkishExpert: false,
    seasonalDiscount: true
  },
  {
    id: "comprehensive-aluminum",
    name: "Comprehensive Aluminum Service",
    nameAr: "خدمة الألومنيوم الشاملة",
    description: "Complete service package for aluminum production lines",
    descriptionAr: "حزمة خدمة كاملة لخطوط إنتاج الألومنيوم",
    duration: "6-8 hours",
    price: 8500,
    features: [
      "Full diagnostic analysis",
      "Precision calibration",
      "Component replacement",
      "Software optimization",
      "Operator training session",
      "3-month warranty on parts"
    ],
    featuresAr: [
      "تحليل تشخيصي كامل",
      "معايرة دقيقة",
      "استبدال المكونات",
      "تحسين البرمجيات",
      "جلسة تدريب للمشغل",
      "ضمان 3 أشهر على قطع الغيار"
    ],
    recommendedFor: ["Heavy usage", "Annual service", "Production optimization"],
    turkishExpert: true,
    seasonalDiscount: true
  },
  {
    id: "precision-calibration",
    name: "Precision Calibration Package",
    nameAr: "حزمة المعايرة الدقيقة",
    description: "Advanced calibration for precision aluminum machining",
    descriptionAr: "معايرة متقدمة لآلات الألومنيوم الدقيقة",
    duration: "4-5 hours",
    price: 6000,
    features: [
      "Laser alignment verification",
      "Spindle accuracy testing",
      "CNC program optimization",
      "Tooling calibration",
      "Quality certification",
      "Turkish expert consultation"
    ],
    featuresAr: [
      "التحقق من المحاذاة بالليزر",
      "اختبار دقة المغزل",
      "تحسين برنامج CNC",
      "معايرة الأدوات",
      "شهادة الجودة",
      "استشارة خبير تركي"
    ],
    recommendedFor: ["CNC machines", "High-precision work", "Quality issues"],
    turkishExpert: true,
    seasonalDiscount: false
  },
  {
    id: "emergency-response",
    name: "Emergency Response Service",
    nameAr: "خدمة الاستجابة للطوارئ",
    description: "24/7 emergency service for production downtime",
    descriptionAr: "خدمة طوارئ 24/7 لتوقف الإنتاج",
    duration: "2-4 hours",
    price: 12000,
    features: [
      "2-hour response time guarantee",
      "Priority parts availability",
      "Turkish technical expert",
      "Production restart assistance",
      "Follow-up inspection",
      "Multi-lingual support"
    ],
    featuresAr: [
      "ضمان وقت استجابة ساعتين",
      "أولوية توفر قطع الغيار",
      "خبير فني تركي",
      "مساعدة في إعادة تشغيل الإنتاج",
      "فحص متابعة",
      "دعم متعدد اللغات"
    ],
    recommendedFor: ["Production downtime", "Critical failures", "Urgent repairs"],
    turkishExpert: true,
    seasonalDiscount: false
  }
];

const technicians = [
  {
    id: "ahmed-hassan",
    name: "Ahmed Hassan",
    nameAr: "أحمد حسن",
    specialty: "CNC Aluminum Machines",
    specialtyAr: "ماكينات الألومنيوم CNC",
    rating: 4.9,
    experience: "8 years",
    languages: ["Arabic", "English"],
    turkishTrained: true
  },
  {
    id: "mohamed-ali",
    name: "Mohamed Ali",
    nameAr: "محمد علي",
    specialty: "Cutting & Welding Systems",
    specialtyAr: "أنظمة القطع واللحام",
    rating: 4.8,
    experience: "6 years",
    languages: ["Arabic", "English"],
    turkishTrained: false
  },
  {
    id: "mehmet-yilmaz",
    name: "Mehmet Yılmaz",
    nameAr: "محمد يلماز",
    specialty: "Turkish Machinery Expert",
    specialtyAr: "خبير الماكينات التركية",
    rating: 4.95,
    experience: "12 years",
    languages: ["Turkish", "Arabic", "English"],
    turkishTrained: true
  },
  {
    id: "khaled-ibrahim",
    name: "Khaled Ibrahim",
    nameAr: "خالد إبراهيم",
    specialty: "Bending & Forming",
    specialtyAr: "الثني والتشكيل",
    rating: 4.7,
    experience: "5 years",
    languages: ["Arabic"],
    turkishTrained: true
  }
];

export const ScheduleMaintenance = ({
  open,
  onOpenChange,
  machineId,
  machineModel,
  machineType = "cnc"
}: ScheduleMaintenanceProps) => {
  const [step, setStep] = useState<"select" | "details" | "schedule" | "confirm">("select");
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "custom">("packages");
  const [_selectedGovernorate, _setSelectedGovernorate] = useState("Cairo");
  const [industrialZones, setIndustrialZones] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ScheduleFormData>({
    defaultValues: {
      machineId: machineId || "",
      machineModel: machineModel || "",
      machineType: machineType,
      serviceType: "preventive",
      priority: "medium",
      governorate: "Cairo",
      includeOperatorTraining: true,
      includeSafetyInspection: true,
      includeSoftwareUpdate: false,
      paymentMethod: "cash",
      turkishTechnician: false,
      translationRequired: false
    }
  });

  const serviceType = watch("serviceType");
  const priority = watch("priority");
  const governorate = watch("governorate");
  const includeOperatorTraining = watch("includeOperatorTraining");
  const turkishTechnician = watch("turkishTechnician");

  useEffect(() => {
    if (machineId) setValue("machineId", machineId);
    if (machineModel) setValue("machineModel", machineModel);

    // Set industrial zones based on selected governorate
    const zonesKey = governorate.replace(/\s+/g, '_');
    setIndustrialZones(INDUSTRIAL_ZONES[zonesKey as keyof typeof INDUSTRIAL_ZONES] || []);
  }, [machineId, machineModel, governorate, setValue]);

  const availableSlots: AvailableSlot[] = [
    { date: "2024-01-15", time: "09:00", technician: "Mehmet Yılmaz", specialty: "Turkish Expert", languages: ["Turkish", "Arabic", "English"], duration: 4, rating: 4.95 },
    { date: "2024-01-15", time: "14:00", technician: "Ahmed Hassan", specialty: "CNC Specialist", languages: ["Arabic", "English"], duration: 3, rating: 4.9 },
    { date: "2024-01-16", time: "10:00", technician: "Khaled Ibrahim", specialty: "Bending Expert", languages: ["Arabic"], duration: 5, rating: 4.7 },
    { date: "2024-01-16", time: "15:00", technician: "Mehmet Yılmaz", specialty: "Turkish Expert", languages: ["Turkish", "Arabic", "English"], duration: 4, rating: 4.95 },
    { date: "2024-01-17", time: "08:30", technician: "Mohamed Ali", specialty: "Cutting Systems", languages: ["Arabic", "English"], duration: 3, rating: 4.8 },
  ];

  const filteredSlots = availableSlots.filter(slot =>
    !turkishTechnician || slot.technician === "Mehmet Yılmaz"
  );

  const calculateTotalPrice = () => {
    let total = selectedPackage?.price || 0;

    // Add additional service costs
    if (includeOperatorTraining) total += 1000;
    if (watch("includeSafetyInspection")) total += 500;
    if (watch("includeSoftwareUpdate")) total += 1500;
    if (watch("translationRequired")) total += 500;

    // Apply seasonal discount
    if (selectedPackage?.seasonalDiscount) {
      total *= 0.9; // 10% discount
    }

    return total;
  };

  const { toast } = useToast();

  const onSubmit = async (data: ScheduleFormData) => {
    setIsSubmitting(true);

    try {
      // Map form data to CreateTicketData
      const description = `
**Maintenance Request**
**Service Type:** ${data.serviceType}
**Machine:** ${data.machineModel} (ID: ${data.machineId})
**Preferred Slot:** ${data.preferredDate} at ${data.preferredTime}
**Duration:** ${data.duration}
**Technician Pref:** ${data.technicianPreference}
**Location:** ${data.governorate}, ${data.industrialZone}
**Company:** ${data.companyName}
**Contact:** ${data.contactName}
**Payment:** ${data.paymentMethod}

**Options:**
- Operator Training: ${data.includeOperatorTraining ? 'Yes' : 'No'}
- Safety Inspection: ${data.includeSafetyInspection ? 'Yes' : 'No'}
- Software Update: ${data.includeSoftwareUpdate ? 'Yes' : 'No'}
- Turkish Tech: ${data.turkishTechnician ? 'Yes' : 'No'}
- Translation: ${data.translationRequired ? 'Yes' : 'No'}

**Notes:**
${data.notes}
      `.trim();

      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id || 'guest';

      await createTicket({
        title: `Maintenance: ${data.serviceType} - ${data.companyName}`,
        description: description,
        type: 'maintenance',
        priority: data.priority === 'emergency' ? 'urgent' : data.priority,
        contact_phone: data.phone,
        contact_email: data.email,
        preferred_contact_method: 'phone',
        site_location: `${data.governorate}, ${data.industrialZone}`,
        machine_serial_number: data.machineId, // Assuming machineId is serial
        machine_model: data.machineModel,
        maintenance_type: data.serviceType as any
      }, userId);

      toast({
        title: "Request Submitted",
        description: "Your maintenance request has been successfully scheduled. Ticket created.",
        variant: "default"
      });

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
      toast({
        title: "Submission Failed",
        description: "Could not create maintenance ticket. Please try again.",
        variant: "destructive"
      });
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


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
        <LazyAnimatePresence mode="wait">
          {step === "select" && (
            <LazyMotionDiv
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Settings className="h-6 w-6 text-amber-500" />
                  <span>جدولة صيانة ماكينات الألومنيوم</span>
                  <span className="text-gray-400">| Aluminum Machinery Maintenance Scheduling</span>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  خدمة متخصصة لصيانة ماكينات الألومنيوم التركية والمحلية - Specialized service for Turkish and local aluminum machinery
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "packages" | "custom")} className="mt-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                  <TabsTrigger value="packages">باقات الخدمة | Service Packages</TabsTrigger>
                  <TabsTrigger value="custom">جدولة مخصصة | Custom Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="packages" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {servicePackages.map((pkg) => (
                      <LazyMotionDiv
                        key={pkg.id}
                        className={`relative p-6 rounded-lg border-2 transition-all duration-300 ${selectedPackage?.id === pkg.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-almona-light/20 hover:border-almona-light/40"
                          }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        <div className="text-center">
                          <h3 className="typography-h3 text-lg mb-1">{pkg.nameAr}</h3>
                          <h4 className="typography-h4 text-gray-400 mb-2">{pkg.name}</h4>

                          <p className="text-sm text-gray-400 mb-1">{pkg.descriptionAr}</p>
                          <p className="text-xs text-gray-500 mb-3">{pkg.description}</p>

                          <p className="text-2xl font-bold text-amber-500 mb-2">
                            {pkg.price.toLocaleString()} ج.م
                          </p>
                          <p className="text-sm text-gray-400 mb-4">{pkg.duration}</p>

                          <div className="space-y-2 text-left">
                            {pkg.featuresAr.map((feature, index) => (
                              <div key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3  mr-1 mt-0.5 flex-shrink-0 status-valid" />
                                <span className="text-xs text-gray-400">
                                  {feature} {pkg.features[index] && `| ${pkg.features[index]}`}
                                </span>
                              </div>
                            ))}
                          </div>

                          {pkg.turkishExpert && (
                            <Badge className="mt-3 bg-blue-500/20 text-blue-300">
                              <Shield className="h-3 w-3 mr-1" />
                              خبير تركي | Turkish Expert
                            </Badge>
                          )}

                          {pkg.seasonalDiscount && (
                            <Badge className="mt-2 bg-green-500/20 text-green-300">
                              <Zap className="h-3 w-3 mr-1" />
                              خصم موسمي 10% | 10% Seasonal Discount
                            </Badge>
                          )}
                        </div>

                        {selectedPackage?.id === pkg.id && (
                          <LazyMotionDiv
                            className="absolute inset-0 rounded-lg card-premium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                      </LazyMotionDiv>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="mt-6">
                  <Card className="bg-almona-darker/50 border-almona-light/20">
                    <CardHeader>
                      <CardTitle>تخصيص الخدمة | Custom Service Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>نوع الخدمة | Service Type</Label>
                          <Select value={serviceType} onValueChange={(value) => setValue("serviceType", value as "preventive" | "corrective" | "calibration" | "emergency" | "seasonal")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preventive">صيانة وقائية | Preventive</SelectItem>
                              <SelectItem value="corrective">صيانة تصحيحية | Corrective</SelectItem>
                              <SelectItem value="calibration">معايرة | Calibration</SelectItem>
                              <SelectItem value="emergency">طوارئ | Emergency</SelectItem>
                              <SelectItem value="seasonal">صيانة موسمية | Seasonal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>أولوية الخدمة | Priority Level</Label>
                          <Select value={priority} onValueChange={(value) => setValue("priority", value as "low" | "medium" | "high" | "emergency")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">منخفضة | Low</SelectItem>
                              <SelectItem value="medium">متوسطة | Medium</SelectItem>
                              <SelectItem value="high">عالية | High</SelectItem>
                              <SelectItem value="emergency">طوارئ | Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>نوع الماكينة | Machine Type</Label>
                        <Select {...register("machineType")}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الماكينة" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALUMINUM_MACHINE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="turkishTechnician" className="typography-label flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-400" />
                            خبير تركي | Turkish Expert
                          </Label>
                          <Switch
                            id="turkishTechnician"
                            checked={turkishTechnician}
                            onCheckedChange={(checked) => setValue("turkishTechnician", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeOperatorTraining" className="typography-label flex items-center">
                            <Users className="h-4 w-4 mr-2 text-green-400" />
                            تدريب مشغل | Operator Training
                          </Label>
                          <Switch
                            id="includeOperatorTraining"
                            checked={includeOperatorTraining}
                            onCheckedChange={(checked) => setValue("includeOperatorTraining", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeSafetyInspection" className="typography-label flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-yellow-400" />
                            فحص سلامة | Safety Inspection
                          </Label>
                          <Switch
                            id="includeSafetyInspection"
                            checked={watch("includeSafetyInspection")}
                            onCheckedChange={(checked) => setValue("includeSafetyInspection", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeSoftwareUpdate" className="typography-label flex items-center">
                            <Cpu className="h-4 w-4 mr-2 text-purple-400" />
                            تحديث برمجي | Software Update
                          </Label>
                          <Switch
                            id="includeSoftwareUpdate"
                            checked={watch("includeSoftwareUpdate")}
                            onCheckedChange={(checked) => setValue("includeSoftwareUpdate", checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleClose}>
                  إلغاء | Cancel
                </Button>
                <Button
                  onClick={() => setStep("details")}
                  disabled={activeTab === "packages" ? !selectedPackage : false}
                  className="bg-gradient-to-r from-amber-500 to-red-500"
                >
                  التالي | Continue
                </Button>
              </div>
            </LazyMotionDiv>
          )}

          {step === "details" && (
            <LazyMotionDiv
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  تفاصيل الخدمة | Service Details
                </DialogTitle>
                <DialogDescription>
                  يرجى تقديم معلومات الاتصال ومتطلبات الخدمة | Please provide your contact information and service requirements
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName" className="typography-label">اسم الشركة * | Company Name *</Label>
                    <Input
                      id="companyName"
                      {...register("companyName", { required: "Company name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder="اسم الشركة"
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactName" className="typography-label">اسم المسؤول * | Contact Name *</Label>
                    <Input
                      id="contactName"
                      {...register("contactName", { required: "Contact name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder="اسم المسؤول"
                    />
                    {errors.contactName && (
                      <p className="text-red-500 text-sm">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="typography-label">البريد الإلكتروني * | Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder="example@company.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="typography-label">رقم الهاتف * | Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone", {
                        required: "Phone is required",
                        pattern: {
                          value: /^01[0-2,5]{1}[0-9]{8}$/,
                          message: "Please enter a valid Egyptian phone number"
                        }
                      })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="machineId" className="typography-label">رقم الماكينة | Machine ID</Label>
                    <Input
                      id="machineId"
                      {...register("machineId")}
                      readOnly={!!machineId}
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="machineModel" className="typography-label">موديل الماكينة | Machine Model</Label>
                    <Input
                      id="machineModel"
                      {...register("machineModel")}
                      readOnly={!!machineModel}
                      className="bg-almona-darker/30 border-almona-light/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="governorate" className="typography-label">المحافظة | Governorate</Label>
                    <Select value={governorate} onValueChange={(value) => setValue("governorate", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EGYPTIAN_GOVERNORATES.map((gov) => (
                          <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="industrialZone" className="typography-label">المنطقة الصناعية | Industrial Zone</Label>
                    <Select {...register("industrialZone")}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنطقة الصناعية" />
                      </SelectTrigger>
                      <SelectContent>
                        {industrialZones.map((zone) => (
                          <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technicianPreference" className="typography-label">تفضيل الفني | Technician Preference</Label>
                    <Select {...register("technicianPreference")}>
                      <SelectTrigger>
                        <SelectValue placeholder="أي فني متاح" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.nameAr} - {tech.specialtyAr} ({tech.rating}★)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod" className="typography-label">طريقة الدفع | Payment Method</Label>
                    <RadioGroup
                      defaultValue="cash"
                      onValueChange={(value) => setValue("paymentMethod", value as "cash" | "bank_transfer" | "installments")}
                      className="flex space-x-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="typography-label cursor-pointer">نقدي | Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                        <Label htmlFor="bank_transfer" className="typography-label cursor-pointer">تحويل بنكي | Bank Transfer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="installments" id="installments" />
                        <Label htmlFor="installments" className="typography-label cursor-pointer">تقسيط | Installments</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="typography-label">ملاحظات خاصة | Special Requirements</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="أي متطلبات خاصة، مشاكل، أو ملاحظات..."
                    {...register("notes")}
                    className="bg-almona-darker/50 border-almona-light/20"
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("select")}
                  >
                    رجوع | Back
                  </Button>
                  <Button
                    onClick={() => setStep("schedule")}
                    className="bg-gradient-to-r from-amber-500 to-red-500"
                  >
                    التالي: اختيار الوقت | Next: Select Time
                  </Button>
                </div>
              </form>
            </LazyMotionDiv>
          )}

          {step === "schedule" && (
            <LazyMotionDiv
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">اختيار وقت الخدمة | Select Service Time</DialogTitle>
                <DialogDescription>
                  اختر التاريخ والوقت المناسبين للخدمة | Choose your preferred date and time slot
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="typography-h3 mb-4">المواعيد المتاحة | Available Time Slots</h3>
                    <div className="space-y-3">
                      {filteredSlots.map((slot, index) => (
                        <LazyMotionDiv
                          key={index}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedSlot === slot
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-almona-light/20 hover:border-almona-light/40"
                            }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{slot.date}</p>
                              <p className="text-sm text-gray-400">{slot.time}</p>
                              <p className="text-xs text-amber-400 mt-1">{slot.technician}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">{slot.specialty}</p>
                              <p className="text-xs text-gray-400">{slot.duration}h</p>
                              <div className="flex items-center justify-end mt-1">
                                <span className="text-xs text-yellow-400 mr-1">★</span>
                                <span className="text-xs">{slot.rating}</span>
                              </div>
                              <div className="flex flex-wrap justify-end gap-1 mt-1">
                                {slot.languages.map((lang, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </LazyMotionDiv>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="typography-h3 mb-4">ملخص الخدمة | Service Summary</h3>
                    <Card className="bg-almona-darker/50 border-almona-light/20">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>الخدمة | Service:</span>
                            <span className="font-bold text-right">
                              {selectedPackage?.nameAr || "خدمة مخصصة"}
                              <br />
                              <span className="text-sm text-gray-400">{selectedPackage?.name || "Custom Service"}</span>
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>الماكينة | Machine:</span>
                            <span className="font-bold">{machineModel || "غير محدد"}</span>
                          </div>

                          {selectedSlot && (
                            <>
                              <div className="flex justify-between">
                                <span>التاريخ | Date:</span>
                                <span className="font-bold">{selectedSlot.date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>الوقت | Time:</span>
                                <span className="font-bold">{selectedSlot.time}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>الفني | Technician:</span>
                                <span className="font-bold text-right">
                                  {selectedSlot.technician}
                                  <br />
                                  <span className="text-sm text-gray-400">{selectedSlot.specialty}</span>
                                </span>
                              </div>
                            </>
                          )}

                          <Separator />

                          {/* Additional services */}
                          {includeOperatorTraining && (
                            <div className="flex justify-between text-sm">
                              <span>تدريب مشغل | Operator Training:</span>
                              <span className="text-green-400">+1,000 ج.م</span>
                            </div>
                          )}

                          {watch("includeSafetyInspection") && (
                            <div className="flex justify-between text-sm">
                              <span>فحص سلامة | Safety Inspection:</span>
                              <span className="text-green-400">+500 ج.م</span>
                            </div>
                          )}

                          {watch("includeSoftwareUpdate") && (
                            <div className="flex justify-between text-sm">
                              <span>تحديث برمجي | Software Update:</span>
                              <span className="text-green-400">+1,500 ج.م</span>
                            </div>
                          )}

                          {selectedPackage?.seasonalDiscount && (
                            <div className="flex justify-between text-sm text-green-400">
                              <span>خصم موسمي | Seasonal Discount:</span>
                              <span>-10%</span>
                            </div>
                          )}

                          <Separator />

                          <div className="flex justify-between text-lg">
                            <span>الإجمالي | Total:</span>
                            <span className="font-bold text-amber-500">
                              {calculateTotalPrice().toLocaleString()} ج.م
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-4 p-4 bg-blue-500/10 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">نظام الجدولة الذكي | AI Scheduling Active</p>
                          <p className="text-xs text-gray-400">
                            سيقوم نظامنا بتحسين الجدول بناءً على توفر الفنيين وتفضيلاتك
                            <br />
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
                    رجوع | Back
                  </Button>
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={!selectedSlot || isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    {isSubmitting ? "جاري الجدولة..." : "تأكيد الجدولة | Confirm Schedule"}
                  </Button>
                </div>
              </div>
            </LazyMotionDiv>
          )}

          {step === "confirm" && (
            <LazyMotionDiv
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <LazyMotionDiv
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
              </LazyMotionDiv>
              <h3 className="typography-h3 mb-2">تم جدولة الخدمة! | Service Scheduled!</h3>
              <p className="text-gray-400 mb-4">
                تم جدولة خدمة الصيانة بنجاح. ستتلقى تأكيدًا عبر البريد الإلكتروني والرسائل القصيرة.
                <br />
                Your maintenance service has been successfully scheduled. You will receive confirmation via email and SMS.
              </p>
              <Badge className="bg-green-500/20 text-green-300">
                رقم الخدمة: ALM-{Date.now().toString().slice(-8)}
              </Badge>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <p>✓ تم الجدولة | Service scheduled</p>
                <p>✓ تم تعيين الفني | Technician assigned</p>
                <p>✓ تم تحديث البوابة | Customer portal updated</p>
                <p>✓ تم إرسال الرسائل | SMS confirmation sent</p>
                {selectedPackage?.turkishExpert && (
                  <p>✓ خبير تركي متاح | Turkish expert available</p>
                )}
              </div>
            </LazyMotionDiv>
          )}
        </LazyAnimatePresence>
      </DialogContent>
    </Dialog>
  );
};