// Create a new file: src/pages/SpareParts.tsx

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  Cpu, 
  Settings, 
  Zap, 
  Wrench, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  Download,
  ShoppingCart,
  X,
  CheckCircle
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Card, CardContent } from "@/shared/ui/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { yilmazMachines } from "@/constants/productsData";

// Types
interface SparePart {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  compatibleMachines: string[];
  price: number;
  stock: number;
  imageUrl: string;
  partNumber: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  specifications: {
    material: string;
    color: string;
    warranty: string;
  };
  isCritical: boolean;
  popularity: number;
}

interface PartCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  subcategories: string[];
}

// Mock data - in a real app, this would come from an API
const spareParts: SparePart[] = [
  {
    id: "sp-001",
    name: "CNC Spindle Motor",
    description: "High-precision spindle motor for YILMAZ CNC machines",
    category: "electrical",
    subcategory: "motors",
    compatibleMachines: ["ym-028", "ym-029", "ym-030"],
    price: 2450,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=500",
    partNumber: "YM-SP-5000X",
    weight: 8.5,
    dimensions: { length: 30, width: 30, height: 40 },
    specifications: {
      material: "Steel/Copper",
      color: "Silver",
      warranty: "12 months"
    },
    isCritical: true,
    popularity: 95
  },
  {
    id: "sp-002",
    name: "Cutting Blade Set",
    description: "Tungsten carbide cutting blades for aluminum profiles",
    category: "cutting",
    subcategory: "blades",
    compatibleMachines: ["ym-015", "ym-016", "ym-017"],
    price: 850,
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=500",
    partNumber: "YM-CB-AL300",
    weight: 2.3,
    dimensions: { length: 25, width: 25, height: 5 },
    specifications: {
      material: "Tungsten Carbide",
      color: "Silver",
      warranty: "6 months"
    },
    isCritical: false,
    popularity: 88
  },
  // Add more parts as needed...
];

const partCategories: PartCategory[] = [
  {
    id: "electrical",
    name: "Electrical Components",
    icon: <Zap className="h-6 w-6" />,
    description: "Motors, controllers, sensors and electrical systems",
    subcategories: ["motors", "controllers", "sensors", "wiring"]
  },
  {
    id: "mechanical",
    name: "Mechanical Parts",
    icon: <Settings className="h-6 w-6" />,
    description: "Gears, bearings, shafts and mechanical assemblies",
    subcategories: ["gears", "bearings", "shafts", "assemblies"]
  },
  {
    id: "cutting",
    name: "Cutting Tools",
    icon: <Wrench className="h-6 w-6" />,
    description: "Blades, bits, and cutting accessories",
    subcategories: ["blades", "router-bits", "saw-blades", "drill-bits"]
  },
  {
    id: "hydraulic",
    name: "Hydraulic Systems",
    icon: <Cpu className="h-6 w-6" />,
    description: "Pumps, valves, cylinders and hydraulic components",
    subcategories: ["pumps", "valves", "cylinders", "filters"]
  }
];

const SpareParts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiSelections, setAiSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Spare Parts - ALMONA";
  }, []);

  // Filter parts based on all criteria
  const filteredParts = useMemo(() => {
    return spareParts.filter(part => {
      const matchesSearch = 
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "all" || part.category === selectedCategory;
      
      const matchesSubcategory = 
        selectedSubcategory === "all" || part.subcategory === selectedSubcategory;
      
      const matchesMachine = 
        selectedMachine === "all" || part.compatibleMachines.includes(selectedMachine);
      
      const matchesPrice = 
        part.price >= priceRange[0] && part.price <= priceRange[1];
      
      const matchesStock = 
        !inStockOnly || part.stock > 0;

      return matchesSearch && matchesCategory && matchesSubcategory && 
             matchesMachine && matchesPrice && matchesStock;
    });
  }, [searchTerm, selectedCategory, selectedSubcategory, selectedMachine, priceRange, inStockOnly]);

  const handleAddToCart = (partId: string) => {
    setSelectedParts(prev => [...prev, partId]);
    toast({
      title: "Part added",
      description: "Part has been added to your cart",
    });
  };

  const handleAiWizardNext = () => {
    if (aiStep < 3) {
      setAiStep(prev => prev + 1);
    } else {
      // Process AI recommendations
      setAiWizardOpen(false);
      setAiStep(0);
      // Apply filters based on AI selections
      if (aiSelections.machine) setSelectedMachine(aiSelections.machine);
      if (aiSelections.category) setSelectedCategory(aiSelections.category);
    }
  };

  const handleAiSelection = (step: string, value: string) => {
    setAiSelections(prev => ({ ...prev, [step]: value }));
  };

  const aiSteps = [
    {
      question: "Which machine are you looking parts for?",
      options: yilmazMachines.map(machine => ({
        value: machine.id,
        label: machine.name
      }))
    },
    {
      question: "What type of part do you need?",
      options: partCategories.map(cat => ({
        value: cat.id,
        label: cat.name
      }))
    },
    {
      question: "What specific issue are you experiencing?",
      options: [
        { value: "wear", label: "Normal wear and tear" },
        { value: "breakage", label: "Part breakage" },
        { value: "performance", label: "Performance issues" },
        { value: "preventive", label: "Preventive maintenance" }
      ]
    },
    {
      question: "How urgently do you need this part?",
      options: [
        { value: "critical", label: "Critical - Machine is down" },
        { value: "urgent", label: "Urgent - Needed within days" },
        { value: "planned", label: "Planned - For future maintenance" }
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient-orange">Genuine Spare Parts</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Original manufacturer parts with warranty for optimal machine performance and longevity
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setAiWizardOpen(true)}
                className="bg-gradient-orange hover:bg-almona-orange-dark text-white px-8 py-6 rounded-full group"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                AI Part Finder
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                className="border-almona-light text-white hover:bg-almona-light/10 px-8 py-6 rounded-full"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Parts Catalog
              </Button>
            </div>
          </motion.div>

          {/* Search and Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-almona-darker/50 p-6 rounded-lg mb-8 backdrop-blur-sm border border-almona-light/20"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by part name, number, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-almona-dark border-almona-light/30"
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 border-almona-light/30 text-white hover:bg-almona-light/10"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(selectedCategory !== "all" || selectedMachine !== "all" || selectedSubcategory !== "all") && (
                  <Badge variant="secondary" className="ml-1">
                    Active
                  </Badge>
                )}
              </Button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <div>
                    <label className="text-sm font-medium mb-2 block">Machine</label>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger className="bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="All Machines" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Machines</SelectItem>
                        {yilmazMachines.map(machine => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {partCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Subcategory</label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger className="bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="All Subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {selectedCategory !== "all" && 
                          partCategories
                            .find(cat => cat.id === selectedCategory)
                            ?.subcategories.map(sub => (
                              <SelectItem key={sub} value={sub}>
                                {sub.split('-').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded border-almona-light/30 text-almona-orange focus:ring-almona-orange"
                      />
                      <span className="text-sm">In stock only</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-almona-darker/50 p-6 rounded-lg sticky top-24 border border-almona-light/20">
                <h3 className="text-lg font-semibold mb-4">Part Categories</h3>
                <div className="space-y-2">
                  {partCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-300 flex items-center gap-3 ${
                        selectedCategory === category.id
                          ? "bg-almona-orange/20 text-white border border-almona-orange/50"
                          : "text-gray-400 hover:text-white hover:bg-almona-light/10"
                      }`}
                    >
                      <span className="text-almona-orange">{category.icon}</span>
                      <span>{category.name}</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </button>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-almona-light/20">
                  <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                      Compatibility Guide
                    </Button>
                    <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                      Installation Manuals
                    </Button>
                    <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                      Warranty Information
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Parts Grid */}
            <div className="lg:col-span-3">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  {filteredParts.length} Parts Found
                  {selectedCategory !== "all" && ` in ${partCategories.find(c => c.id === selectedCategory)?.name}`}
                  {selectedMachine !== "all" && ` for ${yilmazMachines.find(m => m.id === selectedMachine)?.name}`}
                </h2>
                
                <Select defaultValue="popular">
                  <SelectTrigger className="w-[180px] bg-almona-darker border-almona-light/30">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredParts.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">No parts found</h3>
                  <p className="text-gray-400 mb-4">
                    Try adjusting your search criteria or use our AI Part Finder
                  </p>
                  <Button onClick={() => setAiWizardOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Use AI Part Finder
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredParts.map((part, index) => (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <Card className="bg-almona-darker/50 border-almona-light/20 hover:border-almona-orange/30 transition-all duration-300 overflow-hidden group">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img
                              src={part.imageUrl}
                              alt={part.name}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {part.isCritical && (
                              <Badge className="absolute top-2 left-2 bg-red-600 hover:bg-red-700">
                                Critical Part
                              </Badge>
                            )}
                            <Badge className="absolute top-2 right-2 bg-almona-orange">
                              {part.stock > 0 ? `${part.stock} in stock` : "Out of stock"}
                            </Badge>
                          </div>
                          
                          <div className="p-6">
                            <h3 className="font-semibold text-lg mb-2 group-hover:text-almona-orange transition-colors">
                              {part.name}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">{part.description}</p>
                            
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-2xl font-bold text-almona-orange">
                                  ${part.price}
                                </p>
                                <p className="text-xs text-gray-500">Part #: {part.partNumber}</p>
                              </div>
                              
                              <Badge variant="outline" className="bg-almona-dark/50">
                                {partCategories.find(c => c.id === part.category)?.name}
                              </Badge>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-sm text-gray-400 mb-2">Compatible with:</p>
                              <div className="flex flex-wrap gap-1">
                                {part.compatibleMachines.slice(0, 3).map(machineId => {
                                  const machine = yilmazMachines.find(m => m.id === machineId);
                                  return machine ? (
                                    <Badge key={machineId} variant="secondary" className="text-xs">
                                      {machine.name}
                                    </Badge>
                                  ) : null;
                                })}
                                {part.compatibleMachines.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{part.compatibleMachines.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              className="w-full bg-gradient-orange hover:bg-almona-orange-dark"
                              disabled={part.stock === 0}
                              onClick={() => handleAddToCart(part.id)}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              {part.stock > 0 ? "Add to Cart" : "Out of Stock"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* AI Part Finder Wizard Modal */}
      <AnimatePresence>
        {aiWizardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setAiWizardOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-almona-dark border border-almona-light/20 rounded-lg shadow-2xl max-w-2xl w-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-almona-light/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center gap-3">
                    <Sparkles className="text-almona-orange h-6 w-6" />
                    AI Part Finder
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setAiWizardOpen(false)} className="text-gray-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="bg-almona-darker rounded-full h-2.5">
                    <motion.div
                      className="bg-almona-orange h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((aiStep + 1) / aiSteps.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-right text-sm text-gray-400 mt-1">Step {aiStep + 1} of {aiSteps.length}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-grow overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={aiStep}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h4 className="text-xl font-medium mb-6 text-center">
                      {aiSteps[aiStep].question}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                      {aiSteps[aiStep].options.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleAiSelection(`step${aiStep}`, option.value)}
                          className={`w-full text-left p-4 rounded-lg transition-all duration-200 flex items-center justify-between border-2 ${
                            aiSelections[`step${aiStep}`] === option.value
                              ? 'bg-almona-orange/20 border-almona-orange'
                              : 'bg-almona-darker/50 border-almona-light/20 hover:border-almona-orange/50'
                          }`}
                        >
                          <span className="font-medium">{option.label}</span>
                          {aiSelections[`step${aiStep}`] === option.value && (
                            <motion.div initial={{scale: 0.5, opacity: 0}} animate={{scale: 1, opacity: 1}}>
                              <CheckCircle className="h-5 w-5 text-almona-orange" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex justify-between p-6 border-t border-almona-light/20 bg-almona-darker/30 rounded-b-lg">
                <Button
                  variant="outline"
                  onClick={() => aiStep > 0 ? setAiStep(prev => prev - 1) : setAiWizardOpen(false)}
                  className="border-almona-light/30"
                >
                  {aiStep > 0 ? 'Back' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleAiWizardNext}
                  disabled={!aiSelections[`step${aiStep}`]}
                  className="bg-gradient-orange hover:bg-almona-orange-dark"
                >
                  {aiStep < aiSteps.length - 1 ? 'Next' : 'Find Parts'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpareParts;