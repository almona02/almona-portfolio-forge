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
import { motion, AnimatePresence } from "framer-motion";
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
  "Antalya", "Kayseri", "Mersin", "Eskişehir", "Diyarbakır", "Samsun",
  "Denizli", "Şanlıurfa", "Malatya", "Kahramanmaraş", "Erzurum", "Van",
  "Batman", "Elazığ", "İzmit", "Manisa", "Sivas", "Gebze", "Balıkesir"
];

const aluminumMachineTypes = [
  { id: "cutting", label: "Cutting Machine", icon: "✂️" },
  { id: "welding", label: "Welding Machine", icon: "🔧" },
  { id: "cnc", label: "CNC Machine", icon: "⚙️" },
  { id: "bending", label: "Bending Machine", icon: "🔄" },
  { id: "other", label: "Other Aluminum Machinery", icon: "🏭" }
];

const popularBrands = {
  turkey: ["Yilmaz", "BMS", "Alumax", "Tekno", "Maktek", "Other Turkish Brand"],
  egypt: ["Local Egyptian", "Yilmaz", "European Import", "Chinese Import", "Other Brand"]
};

const serviceContracts: ServiceContract[] = [
  {
    id: "basic",
    type: "Temel Bakım Planı (Basic)",
    priceEGP: 4500,
    priceTRY: 15000,
    machines: 1,
    frequency: "Semi-Annual",
    responseTime: "48 hours",
    warrantyExtension: false,
    localTechnicians: true,
    features: [
      "Temel makine kontrolü (Basic machine inspection)",
      "Yağ değişimi ve filtre temizliği (Oil change & filter cleaning)",
      "Temel elektrik kontrolleri (Basic electrical checks)",
      "Yerel teknisyen desteği (Local technician support)",
      "Acil servis hattı (Emergency service line)"
    ]
  },
  {
    id: "standard",
    type: "Standart Bakım Paketi (Standard)",
    priceEGP: 8000,
    priceTRY: 25000,
    machines: 1,
    frequency: "Quarterly",
    responseTime: "24 hours",
    warrantyExtension: true,
    localTechnicians: true,
    features: [
      "Kapsamlı makine analizi (Comprehensive machine analysis)",
      "Alüminyum özel bakım prosedürleri (Aluminum-specific procedures)",
      "Yedek parça değişimi (Spare parts replacement)",
      "1 yıl garanti uzatması (1-year warranty extension)",
      "Performans optimizasyonu (Performance optimization)",
      "Türkçe/Arapça teknik rapor (Turkish/Arabic technical report)"
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
      "Önleyici bakım tahminleri (Predictive maintenance)",
      "Öncelikli acil servis (Priority emergency service)",
      "2 yıl garanti uzatması (2-year warranty extension)",
      "Operatör eğitim desteği (Operator training support)",
      "Yedek parça %20 indirim (20% spare parts discount)",
      "Aylık performans raporu (Monthly performance report)"
    ]
  },
  {
    id: "platinum",
    type: "Platinüm Fabrika Paketi (Platinum)",
    priceEGP: 20000,
    priceTRY: 65000,
    machines: 3,
    frequency: "Monthly",
    responseTime: "4 hours",
    warrantyExtension: true,
    localTechnicians: true,
    features: [
      "Özel fabrika teknisyenleri (Dedicated factory technicians)",
      "AI destekli bakım tahmini (AI-powered maintenance prediction)",
      "7/24 Türkçe/Arapça destek (24/7 Turkish/Arabic support)",
      "3 yıl garanti uzatması (3-year warranty extension)",
      "Ücretsiz yedek parça stoğu (Free spare parts inventory)",
      "Özel operatör eğitim programı (Custom operator training)",
      "Aylık verimlilik raporları (Monthly efficiency reports)",
      "Acil müdahale ekibi (Emergency response team)"
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
        <AnimatePresence mode="wait">
          {step === "market" && (
            <motion.div
              key="market"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <MapPin className="h-6 w-6 text-orange-500" />
                  Select Your Market
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Choose your region for customized aluminum machinery maintenance services
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMarket === "egypt" 
                      ? "border-orange-500 bg-orange-500/10" 
                      : "border-almona-light/20 hover:border-almona-light/40"
                  }`}
                  onClick={() => handleMarketSelect("egypt")}
                >
                  <div className="text-4xl mb-4">🇪🇬</div>
                  <h3 className="text-xl font-bold mb-2">Egypt Market</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Specialized maintenance for aluminum machinery in Egyptian industrial zones
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1 text-green-500" />
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
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMarket === "turkey" 
                      ? "border-orange-500 bg-orange-500/10" 
                      : "border-almona-light/20 hover:border-almona-light/40"
                  }`}
                  onClick={() => handleMarketSelect("turkey")}
                >
                  <div className="text-4xl mb-4">🇹🇷</div>
                  <h3 className="text-xl font-bold mb-2">Turkey Market</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Premium maintenance services for Turkish aluminum machinery industry
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1 text-green-500" />
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
                </motion.div>
              </div>
            </motion.div>
          )}

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
                  {selectedMarket === "egypt" ? "Egypt" : "Turkey"} Maintenance Plans
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Specialized aluminum machinery maintenance for {selectedMarket === "egypt" ? "Egyptian" : "Turkish"} market
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Service Contract Selection */}
                <div>
                  <Label className="text-lg font-semibold mb-4 block">
                    Select Maintenance Plan for Aluminum Machinery
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {formatPrice(selectedMarket === "egypt" ? contract.priceEGP : contract.priceTRY)} {getCurrencySymbol()}
                          </p>
                          <p className="text-sm text-gray-400">{contract.frequency}</p>
                          <p className="text-xs text-blue-400 mt-1">
                            Response: {contract.responseTime}
                          </p>
                          <ul className="text-xs text-gray-400 mt-3 space-y-1 text-left">
                            {contract.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                <span className="text-xs">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          {contract.warrantyExtension && (
                            <Badge className="mt-2 bg-green-500/20 text-green-300">
                              ✓ Warranty Extension
                            </Badge>
                          )}
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
                  <Label htmlFor="machineCount">Number of Aluminum Machines</Label>
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
                    <Label htmlFor="companyName">
                      {selectedMarket === "egypt" ? "Company Name (الشركة)" : "Company Name (Şirket Adı)"} *
                    </Label>
                    <Input
                      id="companyName"
                      {...register("companyName", { required: "Company name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "اسم الشركة" : "Şirket Adı"}
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactName">
                      {selectedMarket === "egypt" ? "Contact Name (اسم المسؤول)" : "Contact Name (Yetkili Adı)"} *
                    </Label>
                    <Input
                      id="contactName"
                      {...register("contactName", { required: "Contact name is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "اسم المسؤول" : "Yetkili Adı"}
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
                    <Label htmlFor="phone">
                      {selectedMarket === "egypt" ? "Phone (هاتف)" : "Phone (Telefon)"} *
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
                    <Label htmlFor="governorate">
                      {selectedMarket === "egypt" ? "Governorate (المحافظة)" : "City (Şehir)"} *
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
                    <Label htmlFor="city">
                      {selectedMarket === "egypt" ? "City/Area (المدينة/المنطقة)" : "District (İlçe)"} *
                    </Label>
                    <Input
                      id="city"
                      {...register("city", { required: "City/District is required" })}
                      className="bg-almona-darker/50 border-almona-light/20"
                      placeholder={selectedMarket === "egypt" ? "المدينة أو المنطقة" : "İlçe"}
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm">{errors.city.message}</p>
                    )}
                  </div>

                  {/* Machine Details */}
                  <div>
                    <Label htmlFor="machineType">Machine Type *</Label>
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
                    <Label htmlFor="machineBrand">Machine Brand *</Label>
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
                    <Label htmlFor="machineModel">Machine Model *</Label>
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
                    <Label htmlFor="preferredLanguage">Preferred Language</Label>
                    <Select
                      onValueChange={(value: "ar" | "tr" | "en") => setValue("preferredLanguage", value)}
                      defaultValue={selectedMarket === "egypt" ? "ar" : "tr"}
                    >
                      <SelectTrigger className="bg-almona-darker/50 border-almona-light/20">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Preferred Start Date *</Label>
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
                  <Label htmlFor="notes">
                    {selectedMarket === "egypt" ? "Special Requirements (متطلبات خاصة)" : "Special Requirements (Özel İstekler)"}
                  </Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder={
                      selectedMarket === "egypt" 
                        ? "أي متطلبات خاصة أو ملاحظات للصيانة..." 
                        : "Özel bakım istekleri veya notlar..."
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
                        <span className="font-bold">{selectedMarket === "egypt" ? "Egypt 🇪🇬" : "Turkey 🇹🇷"}</span>
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
                        <span className="font-bold text-orange-500">
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
              <h3 className="text-2xl font-bold mb-2">
                {selectedMarket === "egypt" ? "الصيانة المجدولة! (Maintenance Scheduled!)" : "Bakım Planlandı! (Maintenance Scheduled!)"}
              </h3>
              <p className="text-gray-400 mb-4">
                {selectedMarket === "egypt" 
                  ? "تم جدولة خدمة الصيانة الوقائية الخاصة بك بنجاح لآلات الألومنيوم."
                  : "Alüminyum makineleriniz için önleyici bakım hizmeti başarıyla planlandı."
                }
              </p>
              <Badge className="bg-green-500/20 text-green-300">
                Contract ID: {selectedMarket === "egypt" ? "EG" : "TR"}-PM-{Date.now().toString().slice(-8)}
              </Badge>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <p>✓ {selectedMarket === "egypt" ? "عقد الخدمة تم إنشاؤه" : "Servis sözleşmesi oluşturuldu"}</p>
                <p>✓ {selectedMarket === "egypt" ? "الجداول الزمنية AI مفعلة" : "AI zamanlamaları etkinleştirildi"}</p>
                <p>✓ {selectedMarket === "egypt" ? "وصول إلى البوابة الإلكترونية" : "Müşteri portalı erişimi verildi"}</p>
                <p>✓ {selectedMarket === "egypt" ? "دعم محلي باللغة العربية/التركية" : "Yerel Türkçe/Arapça destek"}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};