import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Badge } from "@/shared/ui/ui/badge";
import { Calendar, CheckCircle2, MapPin, Shield, Wrench, Zap } from "lucide-react";
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
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
  market: "egypt" | "turkey";
  governorate: string;
  city: string;
  machineType: "cutting" | "welding" | "cnc" | "bending" | "other";
  machineBrand: string;
  machineModel: string;
  machineCount: number;
  serviceType: "basic" | "standard" | "premium" | "platinum";
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  startDate: string;
  preferredLanguage: "ar" | "tr" | "en";
  notes: string;
}

interface ServiceContract {
  id: string;
  type: string;
  priceEGP: number;
  priceTRY: number;
  features: string[];
  machines: number;
  frequency: string;
  responseTime: string;
  warrantyExtension: boolean;
  localTechnicians: boolean;
}

const egyptGovernorates = [
  "Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayoum", 
  "Gharbiya", "Ismailia", "Menofia", "Minya", "Qaliubiya", "New Valley", 
  "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", "Sharkia",
  "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai", "Sohag"
];

const turkishCities = [
  "Istanbul", "Ankara", "Izmir", "Bursa", "Adana", "Gaziantep", "Konya",
  "Antalya", "Kayseri", "Mersin", "EskiÅŸehir", "DiyarbakÄ±r", "Samsun",
  "Denizli", "ÅžanlÄ±urfa", "Malatya", "KahramanmaraÅŸ", "Erzurum", "Van",
  "Batman", "ElazÄ±ÄŸ", "Ä°zmit", "Manisa", "Sivas", "Gebze", "BalÄ±kesir"
];

const aluminumMachineTypes = [
  { id: "cutting", label: "Cutting Machine", icon: "âœ‚ï¸" },
  { id: "welding", label: "Welding Machine", icon: "ðŸ”§" },
  { id: "cnc", label: "CNC Machine", icon: "âš™ï¸" },
  { id: "bending", label: "Bending Machine", icon: "ðŸ”„" },
  { id: "other", label: "Other Aluminum Machinery", icon: "ðŸ­" }
];

const popularBrands = {
  turkey: ["Yilmaz", "BMS", "Alumax", "Tekno", "Maktek", "Other Turkish Brand"],
  egypt: ["Local Egyptian", "Yilmaz", "European Import", "Chinese Import", "Other Brand"]
};

const serviceContracts: ServiceContract[] = [
  {
    id: "basic",
    type: "Temel BakÄ±m PlanÄ± (Basic)",
    priceEGP: 4500,
    priceTRY: 15000,
    machines: 1,
    frequency: "Semi-Annual",
    responseTime: "48 hours",
    warrantyExtension: false,
    localTechnicians: true,
    features: [
      "Temel makine kontrolÃ¼ (Basic machine inspection)",
      "YaÄŸ deÄŸiÅŸimi ve filtre temizliÄŸi (Oil change & filter cleaning)",
      "Temel elektrik kontrolleri (Basic electrical checks)",
      "Yerel teknisyen desteÄŸi (Local technician support)",
      "Acil servis hattÄ± (Emergency service line)"
    ]
  },
  {
    id: "standard",
    type: "Standart BakÄ±m Paketi (Standard)",
    priceEGP: 8000,
    priceTRY: 25000,
    machines: 1,
    frequency: "Quarterly",
    responseTime: "24 hours",
    warrantyExtension: true,
    localTechnicians: true,
    features: [
      "KapsamlÄ± makine analizi (Comprehensive machine analysis)",
      "AlÃ¼minyum Ã¶zel bakÄ±m prosedÃ¼rleri (Aluminum-specific procedures)",
      "Yedek parÃ§a deÄŸiÅŸimi (Spare parts replacement)",
      "1 yÄ±l garanti uzatmasÄ± (1-year warranty extension)",
      "Performans optimizasyonu (Performance optimization)",
      "TÃ¼rkÃ§e/ArapÃ§a teknik rapor (Turkish/Arabic technical report)"
    ]
  },
  {
    id: "premium",
    type: "Premium Hizmet Paketi (Premium)",
    priceEGP: 12000,
    priceTRY: 40000,
    machines: 1,
    frequency: "Monthly",
    responseTime: "12 hours",
    warrantyExtension: true,
    localTechnicians: true,
    features: [
      "7/24 uzaktan izleme (24/7 remote monitoring)",
      "Ã–nleyici bakÄ±m tahminleri (Predictive maintenance)",
      "Ã–ncelikli acil servis (Priority emergency service)",
      "2 yÄ±l garanti uzatmasÄ± (2-year warranty extension)",
      "OperatÃ¶r eÄŸitim desteÄŸi (Operator training support)",
      "Yedek parÃ§a %20 indirim (20% spare parts discount)",
      "AylÄ±k performans raporu (Monthly performance report)"
    ]
  },
  {
    id: "platinum",
    type: "PlatinÃ¼m Fabrika Paketi (Platinum)",
    priceEGP: 20000,
    priceTRY: 65000,
    machines: 3,
    frequency: "Monthly",
    responseTime: "4 hours",
    warrantyExtension: true,
    localTechnicians: true,
    features: [
      "Ã–zel fabrika teknisyenleri (Dedicated factory technicians)",
      "automation destekli bakÄ±m tahmini (software-assisted maintenance prediction)",
      "7/24 TÃ¼rkÃ§e/ArapÃ§a destek (24/7 Turkish/Arabic support)",
      "3 yÄ±l garanti uzatmasÄ± (3-year warranty extension)",
      "Ãœcretsiz yedek parÃ§a stoÄŸu (Free spare parts inventory)",
      "Ã–zel operatÃ¶r eÄŸitim programÄ± (Custom operator training)",
      "AylÄ±k verimlilik raporlarÄ± (Monthly efficiency reports)",
      "Acil mÃ¼dahale ekibi (Emergency response team)"
    ]
  }
];

export const PreventiveMaintenanceDialog = ({ open, onOpenChange }: PreventiveMaintenanceDialogProps) => {
  const [step, setStep] = useState<"market" | "select" | "details" | "confirm">("market");
  const [selectedContract, setSelectedContract] = useState<ServiceContract | null>(null);
  const [machineCount, setMachineCount] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState<"egypt" | "turkey">("egypt");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<MaintenanceFormData>({
    defaultValues: {
      market: "egypt",
      preferredLanguage: "ar",
      machineType: "cutting"
    }
  });

  const market = watch("market");
  const _serviceType = watch("serviceType");
  const _frequency = watch("frequency");

  useEffect(() => {
    if (selectedContract && market) {
      const price = market === "egypt" ? selectedContract.priceEGP : selectedContract.priceTRY;
      setTotalPrice(price * machineCount);
    }
  }, [selectedContract, machineCount, market]);

  const onSubmit = async (_data: MaintenanceFormData) => {
    setIsSubmitting(true);

    try {
      // Simulate API call with market-specific processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate market-specific contract ID
      const contractPrefix = market === "egypt" ? "EG-PM" : "TR-PM";
      const _contractId = `${contractPrefix}-${Date.now().toString().slice(-8)}`;

      setStep("confirm");

      // Reset after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        reset();
        setStep("market");
        setSelectedContract(null);
        setMachineCount(1);
        setSelectedMarket("egypt");
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
      setStep("market");
      setSelectedContract(null);
      setMachineCount(1);
      setSelectedMarket("egypt");
    }, 300);
  };

  const handleMarketSelect = (market: "egypt" | "turkey") => {
    setSelectedMarket(market);
    setValue("market", market);
    setValue("preferredLanguage", market === "egypt" ? "ar" : "tr");
    setStep("select");
  };

  const getCurrencySymbol = () => {
    return selectedMarket === "egypt" ? "EGP" : "TRY";
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString(selectedMarket === "egypt" ? "ar-EG" : "tr-TR");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
            <LazyAnimatePresence mode="wait">
          {step === "market" && (
            <LazyMotionDiv
              key="market"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <MapPin className="h-6 w-6 text-amber-500" />
                  Select Your Market
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Choose your region for customized aluminum machinery maintenance services
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <LazyMotionDiv
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMarket === "egypt" 
                      ? "border-amber-500 bg-amber-500/10" 
                      : "border-almona-light/20 hover:border-almona-light/40"
                  }`}
                  onClick={() => handleMarketSelect("egypt")}
                >
                  <div className="text-4xl mb-4">ðŸ‡ªðŸ‡¬</div>
                  <h3 className="typography-h3 mb-2">Egypt Market</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Specialized maintenance for aluminum machinery in Egyptian industrial zones
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1  status-valid" />
                      Local Egyptian technicians
                    </div>
                    <div className="flex items-center">
                      <Wrench className="h-3 w-3 mr-1 text-blue-500" />
                      Arabic technical support
                    </div>
                    <div className="flex items-center">
                      <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                      EGP pricing
                    </div>
                  </div>
                </LazyMotionDiv>

                <LazyMotionDiv
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMarket === "turkey" 
                      ? "border-amber-500 bg-amber-500/10" 
                      : "border-almona-light/20 hover:border-almona-light/40"
                  }`}
                  onClick={() => handleMarketSelect("turkey")}
                >
                  <div className="text-4xl mb-4">ðŸ‡¹ðŸ‡·</div>
                  <h3 className="typography-h3 mb-2">Turkey Market</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Premium maintenance services for Turkish aluminum machinery industry
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1  status-valid" />
                      Turkish-speaking engineers
                    </div>
                    <div className="flex items-center">
                      <Wrench className="h-3 w-3 mr-1 text-blue-500" />
                      TRY pricing & local support
                    </div>
                    <div className="flex items-center">
                      <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                      Fast response times
                    </div>
                  </div>
                </LazyMotionDiv>
              </div>
            </LazyMotionDiv>
          )}

          {step === "select" && (
            <LazyMotionDiv
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-amber-500" />
                  {selectedMarket === "egypt" ? "Egypt" : "Turkey"} Maintenance Plans
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Specialized aluminum machinery maintenance for {selectedMarket === "egypt" ? "Egyptian" : "Turkish"} market
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Service Contract Selection */}
                <div>
                  <Label className="typography-label text-lg font-semibold mb-4 block">
                    Select Maintenance Plan for Aluminum Machinery
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceContracts.map((contract) => (
                      <LazyMotionDiv
                        key={contract.id}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                          selectedContract?.id === contract.id
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-almona-light/20 hover:border-almona-light/40"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedContract(contract)}
                      >
                        <div className="text-center">
                          <h3 className="typography-h3 text-lg">{contract.type}</h3>
                          <p className="text-2xl font-bold text-amber-500 mt-2">
                            {formatPrice(selectedMarket === "egypt" ? contract.priceEGP : contract.priceTRY)} {getCurrencySymbol()}
                          </p>
                          <p className="text-sm text-gray-400">{contract.frequency}</p>
                          <p className="text-xs text-blue-400 mt-1">
                            Response: {contract.responseTime}
                          </p>
                          <ul className="text-xs text-gray-400 mt-3 space-y-1 text-left">
                            {contract.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3  mr-1 mt-0.5 flex-shrink-0 status-valid" />
                                <span className="text-xs">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          {contract.warrantyExtension && (
                            <Badge className="mt-2 bg-green-500/20 text-green-300">
                              âœ“ Warranty Extension
                            </Badge>
                          )}
                        </div>
                        {selectedContract?.id === contract.id && (
                          <LazyMotionDiv
                            className="absolute inset-0 rounded-lg card-premium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                      </LazyMotionDiv>
                    ))}
                  </div>
                </div>

                {/* Machine Count */}
                <div>
                  <Label htmlFor="machineCount" className="typography-label">Number of Aluminum Machines</Label>
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
                    Total: {formatPrice(totalPrice)} {getCurrencySymbol()} for {machineCount} machine{machineCount > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button className="bg-transparent border hover:bg-slate-800" onClick={() => setStep("market")}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep("details")}
                    disabled={!selectedContract}
                    className="bg-gradient-to-r from-amber-500 to-red-500"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </LazyMotionDiv>
          )}

          {step === "details" && selectedContract && (
            <LazyMotionDiv
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  Machine & Contact Details - {selectedMarket === "egypt" ? "Egypt" : "Turkey"}
                </DialogTitle>
                <DialogDescription>
                  Complete your aluminum machinery maintenance registration
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName" className="typography-label">
                      {selectedMarket === "egypt" ? "Company Name (Ø§Ù„Ø´Ø±ÙƒØ©)" : "Company Name (Åžirket AdÄ±)"} *
                    </Label>
                    <Input
                      id="companyName"
                      {...register("companyName", { required: "Company name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©" : "Åžirket AdÄ±"}
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactName" className="typography-label">
                      {selectedMarket === "egypt" ? "Contact Name (Ø§Ø³Ù… Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„)" : "Contact Name (Yetkili AdÄ±)"} *
                    </Label>
                    <Input
                      id="contactName"
                      {...register("contactName", { required: "Contact name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "Ø§Ø³Ù… Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„" : "Yetkili AdÄ±"}
                    />
                    {errors.contactName && (
                      <p className="text-red-500 text-sm">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="typography-label">Email *</Label>
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
                    <Label htmlFor="phone" className="typography-label">
                      {selectedMarket === "egypt" ? "Phone (Ù‡Ø§ØªÙ)" : "Phone (Telefon)"} *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone", { required: "Phone is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "+20 XXX XXX XXXX" : "+90 XXX XXX XXXX"}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Location Fields */}
                  <div>
                    <Label htmlFor="governorate" className="typography-label">
                      {selectedMarket === "egypt" ? "Governorate (Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©)" : "City (Åžehir)"} *
                    </Label>
                    <Select
                      onValueChange={(value) => setValue("governorate", value)}
                      {...register("governorate", { required: "Location is required" })}
                    >
                      <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                        <SelectValue placeholder={selectedMarket === "egypt" ? "Select Governorate" : "Select City"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedMarket === "egypt" ? egyptGovernorates : turkishCities).map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.governorate && (
                      <p className="text-red-500 text-sm">{errors.governorate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city" className="typography-label">
                      {selectedMarket === "egypt" ? "City/Area (Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©/Ø§Ù„Ù…Ù†Ø·Ù‚Ø©)" : "District (Ä°lÃ§e)"} *
                    </Label>
                    <Input
                      id="city"
                      {...register("city", { required: "City/District is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© Ø£Ùˆ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©" : "Ä°lÃ§e"}
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm">{errors.city.message}</p>
                    )}
                  </div>

                  {/* Machine Details */}
                  <div>
                    <Label htmlFor="machineType" className="typography-label">Machine Type *</Label>
                    <Select
                      onValueChange={(value) => setValue("machineType", value as MaintenanceFormData["machineType"])}
                      {...register("machineType", { required: "Machine type is required" })}
                    >
                      <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                        <SelectValue placeholder="Select machine type" />
                      </SelectTrigger>
                      <SelectContent>
                        {aluminumMachineTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.machineType && (
                      <p className="text-red-500 text-sm">{errors.machineType.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="machineBrand" className="typography-label">Machine Brand *</Label>
                    <Select
                      onValueChange={(value) => setValue("machineBrand", value)}
                      {...register("machineBrand", { required: "Machine brand is required" })}
                    >
                      <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularBrands[selectedMarket].map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.machineBrand && (
                      <p className="text-red-500 text-sm">{errors.machineBrand.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="machineModel" className="typography-label">Machine Model *</Label>
                    <Input
                      id="machineModel"
                      {...register("machineModel", { required: "Machine model is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder="e.g., Yilmaz Pro-5000, BMS MasterCut"
                    />
                    {errors.machineModel && (
                      <p className="text-red-500 text-sm">{errors.machineModel.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="preferredLanguage" className="typography-label">Preferred Language</Label>
                    <Select
                      onValueChange={(value: "ar" | "tr" | "en") => setValue("preferredLanguage", value)}
                      defaultValue={selectedMarket === "egypt" ? "ar" : "tr"}
                    >
                      <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (Arabic)</SelectItem>
                        <SelectItem value="tr">TÃ¼rkÃ§e (Turkish)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate" className="typography-label">Preferred Start Date *</Label>
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
                    <Label htmlFor="machineCount" className="typography-label">Machine Count</Label>
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
                  <Label htmlFor="notes" className="typography-label">
                    {selectedMarket === "egypt" ? "Special Requirements (Ù…ØªØ·Ù„Ø¨Ø§Øª Ø®Ø§ØµØ©)" : "Special Requirements (Ã–zel Ä°stekler)"}
                  </Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder={
                      selectedMarket === "egypt" 
                        ? "Ø£ÙŠ Ù…ØªØ·Ù„Ø¨Ø§Øª Ø®Ø§ØµØ© Ø£Ùˆ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù„Ù„ØµÙŠØ§Ù†Ø©..." 
                        : "Ã–zel bakÄ±m istekleri veya notlar..."
                    }
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
                        <span>Market:</span>
                        <span className="font-bold">{selectedMarket === "egypt" ? "Egypt ðŸ‡ªðŸ‡¬" : "Turkey ðŸ‡¹ðŸ‡·"}</span>
                      </div>
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
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span className="font-bold text-green-400">{selectedContract.responseTime}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span>Total Price:</span>
                        <span className="font-bold text-amber-500">
                          {formatPrice(totalPrice)} {getCurrencySymbol()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    className="bg-transparent border hover:bg-slate-800"
                    onClick={() => setStep("select")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    {isSubmitting ? "Processing..." : "Schedule Maintenance"}
                  </Button>
                </div>
              </form>
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
              <h3 className="typography-h3 mb-2">
                {selectedMarket === "egypt" ? "Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©! (Maintenance Scheduled!)" : "BakÄ±m PlanlandÄ±! (Maintenance Scheduled!)"}
              </h3>
              <p className="text-gray-400 mb-4">
                {selectedMarket === "egypt" 
                  ? "ØªÙ… Ø¬Ø¯ÙˆÙ„Ø© Ø®Ø¯Ù…Ø© Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„ÙˆÙ‚Ø§Ø¦ÙŠØ© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ùƒ Ø¨Ù†Ø¬Ø§Ø­ Ù„Ø¢Ù„Ø§Øª Ø§Ù„Ø£Ù„ÙˆÙ…Ù†ÙŠÙˆÙ…."
                  : "AlÃ¼minyum makineleriniz iÃ§in Ã¶nleyici bakÄ±m hizmeti baÅŸarÄ±yla planlandÄ±."
                }
              </p>
              <Badge className="bg-green-500/20 text-green-300">
                Contract ID: {selectedMarket === "egypt" ? "EG" : "TR"}-PM-{Date.now().toString().slice(-8)}
              </Badge>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <p>âœ“ {selectedMarket === "egypt" ? "Ø¹Ù‚Ø¯ Ø§Ù„Ø®Ø¯Ù…Ø© ØªÙ… Ø¥Ù†Ø´Ø§Ø¤Ù‡" : "Servis sÃ¶zleÅŸmesi oluÅŸturuldu"}</p>
                <p>âœ“ {selectedMarket === "egypt" ? "Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠØ© automation Ù…ÙØ¹Ù„Ø©" : "automation zamanlamalarÄ± etkinleÅŸtirildi"}</p>
                <p>âœ“ {selectedMarket === "egypt" ? "ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ©" : "MÃ¼ÅŸteri portalÄ± eriÅŸimi verildi"}</p>
                <p>âœ“ {selectedMarket === "egypt" ? "Ø¯Ø¹Ù… Ù…Ø­Ù„ÙŠ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©/Ø§Ù„ØªØ±ÙƒÙŠØ©" : "Yerel TÃ¼rkÃ§e/ArapÃ§a destek"}</p>
              </div>
            </LazyMotionDiv>
          )}
            </LazyAnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
