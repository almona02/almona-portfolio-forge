import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/ui/radio-group";
import { 
  Calculator, 
  Shield, 
  Clock, 
  CheckCircle, 
  Building, 
  Zap, 
  Thermometer, 
  Volume2, 
  Eye,
  Download,
  FileText,
  Video,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Square,
  DollarSign,
  RotateCcw
} from 'lucide-react';
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import Footer from '@/components/layout/Footer';

const systemsData = {
  upvc: {
    title: "UPVC Windows & Doors",
    description: "High-performance unplasticized polyvinyl chloride systems for exceptional thermal insulation and durability",
    features: [
      {
        title: "Thermal Insulation",
        description: "UPVC provides excellent thermal insulation, reducing energy costs by up to 40% compared to aluminum",
        icon: Thermometer,
        stats: "U-value as low as 0.8 W/m²K",
        benefits: ["Reduced energy bills", "Consistent indoor temperature", "Eco-friendly solution"]
      },
      {
        title: "Sound Reduction",
        description: "Multi-chamber profiles and specialized glass reduce noise pollution by up to 45 dB",
        icon: Volume2,
        stats: "45 dB noise reduction",
        benefits: ["Peaceful living environment", "Ideal for urban areas", "Enhanced privacy"]
      },
      {
        title: "Low Maintenance",
        description: "UPVC requires no painting or special treatments, maintaining its appearance for decades",
        icon: Zap,
        stats: "Virtually maintenance-free",
        benefits: ["No repainting needed", "Easy to clean", "Long-lasting beauty"]
      },
      {
        title: "Security Features",
        description: "Multi-point locking systems and reinforced profiles provide exceptional security",
        icon: Shield,
        stats: "RC2 security classification",
        benefits: ["Burglar-resistant", "Child safety features", "Insurance benefits"]
      }
    ],
    applications: ["Residential buildings", "Offices", "Healthcare facilities", "Educational institutions"],
    technologies: ["Multi-chamber profiles", "Reinforced steel cores", "Dual weather seals", "Corner welding technology"],
    calculatorConfig: {
      profileTypes: [
        { id: "standard", name: "Standard Profile", pricePerSqm: 3200 },
        { id: "premium", name: "Premium Profile", pricePerSqm: 4200 },
        { id: "luxury", name: "Luxury Profile", pricePerSqm: 5200 }
      ],
      glassTypes: [
        { id: "single", name: "Single Glazing", priceFactor: 0.9 },
        { id: "double", name: "Double Glazing", priceFactor: 1.0 },
        { id: "triple", name: "Triple Glazing", priceFactor: 1.3 },
        { id: "argon", name: "Double Glazing (Argon)", priceFactor: 1.2 },
        { id: "acoustic", name: "Acoustic Glazing", priceFactor: 1.5 }
      ],
      openingTypes: [
        { id: "casement", name: "Casement", complexityFactor: 1.0 },
        { id: "sliding", name: "Sliding", complexityFactor: 1.1 },
        { id: "tilt-turn", name: "Tilt & Turn", complexityFactor: 1.4 },
        { id: "fixed", name: "Fixed", complexityFactor: 0.8 }
      ]
    }
  },
  aluminum: {
    title: "Aluminum Systems",
    description: "Sleek, strong and versatile aluminum solutions for modern architectural projects",
    features: [
      {
        title: "Structural Strength",
        description: "Aluminum's strength allows for slimmer profiles and larger glass areas",
        icon: Building,
        stats: "High strength-to-weight ratio",
        benefits: ["Larger panoramic views", "Sleek modern appearance", "Architectural flexibility"]
      },
      {
        title: "Thermal Break Technology",
        description: "Advanced thermal break systems eliminate thermal bridging for improved efficiency",
        icon: Thermometer,
        stats: "U-value as low as 1.2 W/m²K",
        benefits: ["Energy efficient", "Condensation prevention", "Comfort in all seasons"]
      },
      {
        title: "Design Flexibility",
        description: "Wide range of colors, finishes and configurations to match any architectural style",
        icon: Eye,
        stats: "100+ color options",
        benefits: ["Custom architectural matching", "Modern or traditional styles", "Premium aesthetic appeal"]
      },
      {
        title: "Durability & Longevity",
        description: "Aluminum is corrosion-resistant and maintains its structural integrity for decades",
        icon: Shield,
        stats: "40+ year lifespan",
        benefits: ["Weather resistance", "Minimal maintenance", "Long-term investment value"]
      }
    ],
    applications: ["High-rise buildings", "Commercial complexes", "Luxury residences", "Renovation projects"],
    technologies: ["Thermal break technology", "Powder coating finishes", "Structural glazing", "Custom fabrication"],
    calculatorConfig: {
      profileTypes: [
        { id: "standard", name: "Standard Thermal Break", pricePerSqm: 3800 },
        { id: "premium", name: "Premium Thermal Break", pricePerSqm: 4800 },
        { id: "luxury", name: "Luxury Thermal Break", pricePerSqm: 5800 },
        { id: "curtain-wall", name: "Curtain Wall System", pricePerSqm: 7500 }
      ],
      glassTypes: [
        { id: "single", name: "Single Glazing", priceFactor: 0.9 },
        { id: "double", name: "Double Glazing", priceFactor: 1.0 },
        { id: "triple", name: "Triple Glazing", priceFactor: 1.3 },
        { id: "low-e", name: "Low-E Glass", priceFactor: 1.4 },
        { id: "structural", name: "Structural Glazing", priceFactor: 1.8 }
      ],
      openingTypes: [
        { id: "casement", name: "Casement", complexityFactor: 1.0 },
        { id: "sliding", name: "Sliding", complexityFactor: 1.2 },
        { id: "folding", name: "Folding System", complexityFactor: 1.8 },
        { id: "fixed", name: "Fixed", complexityFactor: 0.8 },
        { id: "pivot", name: "Pivot", complexityFactor: 1.5 }
      ]
    }
  }
};

const projectTypes = [
  { value: "new-home", label: "New Home Construction" },
  { value: "renovation", label: "Home Renovation" },
  { value: "commercial", label: "Commercial Building" },
  { value: "extension", label: "Room Extension" },
  { value: "replacement", label: "Window Replacement" }
];

const FabricationServices = () => {
  const _navigate = useNavigate();
  const [activeSystem, setActiveSystem] = useState("upvc");
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [_calculatorActive, setCalculatorActive] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    width: "",
    height: "",
    quantity: "1",
    systemType: "upvc",
    profileType: "standard",
    glassType: "double",
    openingType: "casement"
  });
  const [calculatorResults, setCalculatorResults] = useState(null);

  const toggleFeature = useCallback((index: number) => {
    setExpandedFeature(prev => (prev === index ? null : index));
  }, []);

  const handleConsultationClick = useCallback((projectType: string = "") => {
    setSelectedProjectType(projectType);
    setShowConsultationForm(true);
  }, []);

  const handleCalculatorChange = useCallback((field, value) => {
    setCalculatorValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const calculateEstimate = useCallback(() => {
    const width = parseFloat(calculatorValues.width) || 0;
    const height = parseFloat(calculatorValues.height) || 0;
    const quantity = parseInt(calculatorValues.quantity) || 1;
    
    if (width <= 0 || height <= 0) {
      return;
    }
    
    const area = (width * height) / 10000; // Convert from cm² to m²
    const systemConfig = systemsData[calculatorValues.systemType].calculatorConfig;
    
    const selectedProfile = systemConfig.profileTypes.find(p => p.id === calculatorValues.profileType);
    const selectedGlass = systemConfig.glassTypes.find(g => g.id === calculatorValues.glassType);
    const selectedOpening = systemConfig.openingTypes.find(o => o.id === calculatorValues.openingType);
    
    const basePrice = selectedProfile.pricePerSqm;
    const glassFactor = selectedGlass.priceFactor;
    const complexityFactor = selectedOpening.complexityFactor;
    
    const pricePerSqm = basePrice * glassFactor * complexityFactor;
    const totalArea = area * quantity;
    const subtotal = totalArea * pricePerSqm;
    
    // Additional factors
    const installationCost = subtotal * 0.15;
    const hardwareCost = subtotal * 0.08;
    const taxes = subtotal * 0.14;
    
    const total = subtotal + installationCost + hardwareCost + taxes;
    
    setCalculatorResults({
      area: area.toFixed(2),
      totalArea: totalArea.toFixed(2),
      pricePerSqm: Math.round(pricePerSqm),
      subtotal: Math.round(subtotal),
      installationCost: Math.round(installationCost),
      hardwareCost: Math.round(hardwareCost),
      taxes: Math.round(taxes),
      total: Math.round(total),
      system: calculatorValues.systemType,
      profile: selectedProfile.name,
      glass: selectedGlass.name,
      opening: selectedOpening.name
    });
  }, [calculatorValues]);

  const resetCalculator = useCallback(() => {
    setCalculatorValues({
      width: "",
      height: "",
      quantity: "1",
      systemType: "upvc",
      profileType: "standard",
      glassType: "double",
      openingType: "casement"
    });
    setCalculatorResults(null);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: "url('/images/fabrication/fabrication-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-almona-dark/90 via-almona-dark/70 to-almona-dark/90 z-0" />
        
        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <Badge className="mb-6 text-lg py-2 px-4 bg-almona-orange/20 text-almona-orange border-almona-orange/30">
              Premium Fabrication Services
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gradient-orange">
              Precision Fabrication for Discerning Clients
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
              Expertly crafted windows and doors that combine aesthetic elegance with unmatched performance for Egyptian homes and climate
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 px-8"
                onClick={() => handleConsultationClick()}
              >
                Request Free Consultation
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-almona-light text-almona-light hover:bg-almona-light/10"
                onClick={() => {
                  setCalculatorActive(true);
                  document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Calculator className="mr-2 h-5 w-5" /> Price Calculator
              </Button>
            </div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {[
              { icon: Shield, title: "Quality Guarantee", description: "10-year warranty on all our fabrication work" },
              { icon: Clock, title: "Timely Delivery", description: "Precise project timelines with minimal disruption" },
              { icon: CheckCircle, title: "Certified Excellence", description: "ISO-certified fabrication processes" }
            ].map((item, index) => (
              <Card key={index} className="bg-almona-dark/60 backdrop-blur-md border-almona-light/20 text-center">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-almona-orange/20 rounded-full">
                      <item.icon className="h-8 w-8 text-almona-orange" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-300">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Professional Calculator Section */}
      <section id="calculator-section" className="py-20 bg-gradient-to-b from-almona-dark to-almona-darker">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6">Professional Estimation Calculator</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Get an instant preliminary estimate for your window and door project with our advanced calculator
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-almona-dark/60 backdrop-blur-md rounded-2xl border border-almona-light/20 p-6 md:p-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calculator Inputs */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                  <Calculator className="h-6 w-6 mr-2 text-almona-orange" /> Project Specifications
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width" className="text-almona-light">Width (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="150"
                        value={calculatorValues.width}
                        onChange={(e) => handleCalculatorChange('width', e.target.value)}
                        className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-orange/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="text-almona-light">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="120"
                        value={calculatorValues.height}
                        onChange={(e) => handleCalculatorChange('height', e.target.value)}
                        className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-orange/80"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-almona-light">Quantity</Label>
                    <Slider
                      defaultValue={[1]}
                      max={10}
                      min={1}
                      step={1}
                      value={[parseInt(calculatorValues.quantity)]}
                      onValueChange={(value) => handleCalculatorChange('quantity', value[0].toString())}
                      className="my-4 text-almona-orange"
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>1 unit</span>
                      <span>{calculatorValues.quantity} units</span>
                      <span>10 units</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-almona-light">System Type</Label>
                    <RadioGroup
                        value={calculatorValues.systemType}
                        onValueChange={(value) => handleCalculatorChange('systemType', value)}
                        className="grid grid-cols-2 gap-4"
                    >
                        <Label
                            htmlFor="upvc"
                            className="flex items-center justify-center rounded-md border-2 p-4 font-semibold cursor-pointer transition-colors duration-300 border-almona-light/30 bg-almona-dark/80 text-almona-light peer-data-[state=checked]:border-almona-orange peer-data-[state=checked]:bg-almona-orange/10 peer-data-[state=checked]:text-almona-orange hover:bg-almona-light/10 hover:border-almona-light/50"
                        >
                            <RadioGroupItem value="upvc" id="upvc" className="peer sr-only" />
                            UPVC System
                        </Label>
                        <Label
                            htmlFor="aluminum"
                            className="flex items-center justify-center rounded-md border-2 p-4 font-semibold cursor-pointer transition-colors duration-300 border-almona-light/30 bg-almona-dark/80 text-almona-light peer-data-[state=checked]:border-almona-orange peer-data-[state=checked]:bg-almona-orange/10 peer-data-[state=checked]:text-almona-orange hover:bg-almona-light/10 hover:border-almona-light/50"
                        >
                            <RadioGroupItem value="aluminum" id="aluminum" className="peer sr-only" />
                            Aluminum System
                        </Label>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profileType" className="text-almona-light">Profile Quality</Label>
                    <Select 
                      value={calculatorValues.profileType} 
                      onValueChange={(value) => handleCalculatorChange('profileType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select profile type" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemsData[calculatorValues.systemType].calculatorConfig.profileTypes.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="glassType" className="text-almona-light">Glass Type</Label>
                      <Select 
                        value={calculatorValues.glassType} 
                        onValueChange={(value) => handleCalculatorChange('glassType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select glass type" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemsData[calculatorValues.systemType].calculatorConfig.glassTypes.map((glass) => (
                            <SelectItem key={glass.id} value={glass.id}>{glass.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="openingType" className="text-almona-light">Opening Type</Label>
                      <Select 
                        value={calculatorValues.openingType} 
                        onValueChange={(value) => handleCalculatorChange('openingType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select opening type" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemsData[calculatorValues.systemType].calculatorConfig.openingTypes.map((opening) => (
                            <SelectItem key={opening.id} value={opening.id}>{opening.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <Button 
                      onClick={resetCalculator}
                      variant="outline" 
                      className="flex-1 border-almona-light/30 text-almona-light hover:bg-almona-light/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset
                    </Button>
                    <Button 
                      onClick={calculateEstimate}
                      className="flex-1 bg-gradient-orange hover:bg-almona-orange-dark text-white"
                      disabled={!calculatorValues.width || !calculatorValues.height}
                    >
                      <Calculator className="h-4 w-4 mr-2" /> Calculate Estimate
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Calculator Results */}
              <div className="relative">
                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                  <DollarSign className="h-6 w-6 mr-2 text-almona-orange" /> Project Estimate
                </h3>
                
                <AnimatePresence mode="wait">
                  {calculatorResults ? (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-almona-dark/80 rounded-xl p-6 space-y-6"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-gray-400 text-sm">System Type</p>
                          <p className="font-semibold capitalize">{calculatorResults.system}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400 text-sm">Profile</p>
                          <p className="font-semibold">{calculatorResults.profile}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400 text-sm">Glass Type</p>
                          <p className="font-semibold">{calculatorResults.glass}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400 text-sm">Opening Type</p>
                          <p className="font-semibold">{calculatorResults.opening}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-almona-light/20">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-gray-400">Area per unit</p>
                          <p className="font-semibold">{calculatorResults.area} m²</p>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-gray-400">Total area ({calculatorValues.quantity} units)</p>
                          <p className="font-semibold">{calculatorResults.totalArea} m²</p>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-gray-400">Price per m²</p>
                          <p className="font-semibold">EGP {calculatorResults.pricePerSqm.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-almona-light/20 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-gray-400">Product Cost</p>
                          <p className="font-semibold">EGP {calculatorResults.subtotal.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p className="text-gray-400">+ Installation (15%)</p>
                          <p>EGP {calculatorResults.installationCost.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p className="text-gray-400">+ Hardware (8%)</p>
                          <p>EGP {calculatorResults.hardwareCost.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p className="text-gray-400">+ Taxes (14%)</p>
                          <p>EGP {calculatorResults.taxes.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-almona-orange/50">
                        <div className="flex justify-between items-center">
                          <p className="text-lg font-semibold">Estimated Total</p>
                          <p className="text-2xl font-bold text-almona-orange">EGP {calculatorResults.total.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <p className="text-xs text-gray-500 text-center">
                          This is a preliminary estimate. Final pricing may vary based on site conditions and custom requirements.
                        </p>
                        <Button 
                          className="w-full mt-4 bg-gradient-orange hover:bg-almona-orange-dark text-white"
                          onClick={() => handleConsultationClick(calculatorValues.systemType)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" /> Get Detailed Quote
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-almona-dark/80 rounded-xl p-12 text-center border border-almona-light/20 border-dashed flex flex-col justify-center items-center h-full"
                    >
                      <Calculator className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-500 mb-2">Calculation Results</h4>
                      <p className="text-gray-600">Enter your project details and click Calculate to see your estimate</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="mt-12 bg-gradient-to-r from-almona-orange/10 to-almona-light/10 p-8 rounded-2xl border border-almona-orange/30 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-4">Need a Precise Quotation?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Our experts will provide you with a detailed quotation tailored to your specific project requirements
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
              onClick={() => handleConsultationClick()}
            >
              <Calendar className="mr-2 h-5 w-5" /> Request Detailed Quote
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Systems Comparison */}
      <section className="py-20 bg-almona-darker">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6">Advanced Window & Door Systems</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Discover the perfect solution for your home or project with our premium fabrication technologies
            </p>
          </motion.div>

          <Tabs value={activeSystem} onValueChange={setActiveSystem} className="mb-16">
            <TabsList className="grid w-full grid-cols-2 max-w-2xl mx-auto bg-almona-dark/80 rounded-lg p-1 mb-12">
              <TabsTrigger value="upvc" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md text-lg transition-all duration-300">
                UPVC Systems
              </TabsTrigger>
              <TabsTrigger value="aluminum" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md text-lg transition-all duration-300">
                Aluminum Systems
              </TabsTrigger>
            </TabsList>

            {Object.entries(systemsData).map(([key, system]) => (
              <TabsContent key={key} value={key} className="focus-visible:outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                    <div>
                      <h3 className="text-3xl font-bold mb-4">{system.title}</h3>
                      <p className="text-xl text-gray-300 mb-6">{system.description}</p>
                      
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold mb-3 text-almona-light">Ideal For:</h4>
                        <div className="flex flex-wrap gap-2">
                          {system.applications.map((app, i) => (
                            <Badge key={i} variant="secondary" className="bg-almona-orange/20 text-almona-orange border-almona-orange/30">
                              {app}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                        onClick={() => handleConsultationClick(key)}
                      >
                        Get {system.title} Quote
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-almona-orange/20 to-almona-light/20 rounded-2xl blur-xl"></div>
                      <div 
                        className="relative h-80 bg-cover bg-center rounded-2xl border border-almona-light/20"
                        style={{ backgroundImage: `url('/images/fabrication/${key}-showcase.jpg')` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {system.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card 
                          className={`bg-almona-dark/60 backdrop-blur-sm border-almona-light/20 cursor-pointer transition-all duration-300 ${
                            expandedFeature === index ? 'border-almona-orange/50 bg-almona-dark/80 scale-[1.02]' : 'hover:border-almona-light/40 hover:bg-almona-dark/70'
                          }`}
                          onClick={() => toggleFeature(index)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center">
                                <div className="p-2 bg-almona-orange/20 rounded-lg mr-4">
                                  <feature.icon className="h-6 w-6 text-almona-orange" />
                                </div>
                                <div>
                                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                                  <CardDescription className="text-gray-400 mt-1">
                                    {feature.stats}
                                  </CardDescription>
                                </div>
                              </div>
                              {expandedFeature === index ? (
                                <ChevronUp className="h-5 w-5 text-almona-light" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-almona-light" />
                              )}
                            </div>
                          </CardHeader>
                          
                          <AnimatePresence>
                            {expandedFeature === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CardContent className="pt-0">
                                  <p className="text-gray-300 mb-4">{feature.description}</p>
                                  <div className="bg-almona-dark/40 p-4 rounded-lg">
                                    <h5 className="font-semibold text-almona-light mb-2">Key Benefits:</h5>
                                    <ul className="space-y-1">
                                      {feature.benefits.map((benefit, i) => (
                                        <li key={i} className="flex items-center">
                                          <CheckCircle className="h-4 w-4 text-almona-orange mr-2" />
                                          <span className="text-sm">{benefit}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="bg-almona-dark/60 p-8 rounded-2xl border border-almona-light/20">
                    <h4 className="text-2xl font-semibold mb-6 text-center">Advanced Technologies</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {system.technologies.map((tech, i) => (
                        <div key={i} className="text-center p-4 bg-almona-dark/40 rounded-lg">
                          <Sparkles className="h-6 w-6 text-almona-orange mx-auto mb-2" />
                          <p className="font-medium">{tech}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>

          <motion.div 
            className="bg-gradient-to-r from-almona-orange/10 to-almona-light/10 p-8 rounded-2xl border border-almona-orange/30 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-4">Ready to Start Your Project?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Our team is ready to assist you with a detailed consultation and quote
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
              onClick={() => handleConsultationClick()}
            >
              <Calendar className="mr-2 h-5 w-5" /> Schedule a Consultation
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Project Gallery */}
      <section className="py-20 bg-almona-dark">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6">Our Premium Projects</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Discover our exceptional fabrication work across Egypt's most prestigious residences and commercial properties
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="group relative overflow-hidden rounded-2xl"
              >
                <div 
                  className="h-80 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('/images/projects/project-${item}.jpg')` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-almona-dark/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">Luxury {item % 2 === 0 ? 'UPVC' : 'Aluminum'} Installation</h3>
                    <p className="text-gray-300">Cairo, Egypt</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" className="border-almona-light text-almona-light hover:bg-almona-light/10">
              View Full Portfolio
            </Button>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-20 bg-almona-darker">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6">Client Resources</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Everything you need to make an informed decision about your window and door investment
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: FileText, title: "Technical Brochures", description: "Download detailed specifications for all our systems" },
              { icon: Calculator, title: "Energy Savings Calculator", description: "Estimate how much you can save on energy bills" },
              { icon: Video, title: "Installation Videos", description: "See our precision installation process in action" }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-almona-dark/60 backdrop-blur-sm border-almona-light/20 h-full text-center hover:border-almona-orange/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-almona-orange/20 rounded-full">
                        <item.icon className="h-8 w-8 text-almona-orange" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-300 mb-4">{item.description}</p>
                    <Button variant="outline" className="border-almona-light text-almona-light hover:bg-almona-light/10">
                      <Download className="mr-2 h-4 w-4" /> Access Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Advanced Comparison Tools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-almona-dark/60 p-8 rounded-2xl border border-almona-light/20"
          >
            <h3 className="text-2xl font-semibold mb-6 text-center">Advanced Comparison Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-almona-light flex items-center">
                  <Square className="h-5 w-5 mr-2 text-almona-orange" /> Material Comparison
                </h4>
                <div className="bg-almona-dark/40 p-4 rounded-lg">
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Thermal Insulation</span>
                    <div className="flex items-center">
                      <span className="text-almona-orange font-medium mr-2">UPVC</span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-almona-light font-medium ml-2">Aluminum</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Maintenance</span>
                    <div className="flex items-center">
                      <span className="text-almona-orange font-medium mr-2">Low</span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-almona-light font-medium ml-2">Moderate</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Lifespan</span>
                    <div className="flex items-center">
                      <span className="text-almona-orange font-medium mr-2">30+ years</span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-almona-light font-medium ml-2">40+ years</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Cost Efficiency</span>
                    <div className="flex items-center">
                      <span className="text-almona-orange font-medium mr-2">Higher</span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-almona-light font-medium ml-2">Premium</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-almona-light flex items-center">
                  <Thermometer className="h-5 w-5 mr-2 text-almona-orange" /> Climate Performance
                </h4>
                <div className="bg-almona-dark/40 p-4 rounded-lg">
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Heat Resistance</span>
                    <div className="w-32 bg-gray-600 rounded-full h-2">
                      <div className="bg-almona-orange h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Dust Protection</span>
                    <div className="w-32 bg-gray-600 rounded-full h-2">
                      <div className="bg-almona-orange h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-almona-light/10">
                    <span className="text-gray-400">Humidity Resistance</span>
                    <div className="w-32 bg-gray-600 rounded-full h-2">
                      <div className="bg-almona-orange h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">UV Protection</span>
                    <div className="w-32 bg-gray-600 rounded-full h-2">
                      <div className="bg-almona-orange h-2 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Consultation Form Modal */}
      <AnimatePresence>
        {showConsultationForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConsultationForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-almona-dark/95 backdrop-blur-md rounded-2xl border border-almona-light/20 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-2">Request Consultation</h3>
              <p className="text-gray-400 mb-6">Our expert will contact you within 24 hours</p>
              
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Your name" className="bg-almona-dark/80 border-almona-light/30" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+20XXXXXXXXXX" className="bg-almona-dark/80 border-almona-light/30" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Additional Details</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about your project, preferred system, or any specific requirements..." 
                    className="bg-almona-dark/80 border-almona-light/30 min-h-32" 
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 border-almona-light/30 text-almona-light hover:bg-almona-light/10"
                    onClick={() => setShowConsultationForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-orange hover:bg-almona-orange-dark text-white">
                    Submit Request
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default withErrorBoundary(FabricationServices);
