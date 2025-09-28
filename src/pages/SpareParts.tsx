import { useState, useEffect, useMemo } from "react";
// import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Cpu, 
  Settings, 
  Zap, 
  Wrench, 
  ChevronRight,
  ShoppingCart
} from "lucide-react";


import { EnhancedImage } from "@/components/ui/EnhancedImage";
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
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/context/AuthContext";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
import { yilmazMachines } from "@/constants/productsData";
import { withErrorBoundary } from '@/hocs/withErrorBoundary';

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
    imageUrl: "/images/machines/CRM-250-S.jpg",
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
    imageUrl: "/images/machines/KM-215-S.jpg",
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
  }
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

/**
 * SpareParts Component
 * 
 * A comprehensive spare parts catalog for industrial machinery.
 * Features include search, filtering by category, and cart functionality.
 * 
 * @returns {JSX.Element} The SpareParts page component
 */
const SpareParts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [_selectedSubcategory, _setSelectedSubcategory] = useState<string>("all");
  const [_selectedMachine, _setSelectedMachine] = useState<string>("all");
  const [_priceRange, _setPriceRange] = useState<[number, number]>([0, 10000]);
  const [_inStockOnly, _setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [_selectedParts, _setSelectedParts] = useState<string[]>([]);
  const [_aiWizardOpen, _setAiWizardOpen] = useState(false);
  const [_aiStep, _setAiStep] = useState(0);
  const [_aiSelections, _setAiSelections] = useState<Record<string, string>>({});

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
        _selectedSubcategory === "all" || part.subcategory === _selectedSubcategory;
      
      const matchesMachine = 
        _selectedMachine === "all" || part.compatibleMachines.includes(_selectedMachine);
      
      const matchesPrice = 
        part.price >= _priceRange[0] && part.price <= _priceRange[1];
      
      const matchesStock = 
        !_inStockOnly || part.stock > 0;

      return matchesSearch && matchesCategory && matchesSubcategory && 
             matchesMachine && matchesPrice && matchesStock;
    });
  }, [searchTerm, selectedCategory, _selectedSubcategory, _selectedMachine, _priceRange, _inStockOnly]);

  /**
   * Handles adding a spare part to the cart
   * @param {string} partId - The ID of the part to add to cart
   */
  const handleAddToCart = (partId: string) => {
    _setSelectedParts(prev => [...prev, partId]);
    toast({
      title: "Part added",
      description: "Part has been added to your cart",
    });
  };

  return (
    <ProtectedComponent 
      message="يجب تسجيل الدخول للوصول إلى قطع الغيار"
    >
      <main className="flex-grow pt-20">
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
          </motion.div>

          {/* Search and Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-almona-darker p-6 rounded-lg mb-8 border border-almona-light/20"
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
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 border-almona-light/30 text-white bg-almona-dark-lighter hover:bg-almona-dark/70 border"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(selectedCategory !== "all" || _selectedMachine !== "all" || _selectedSubcategory !== "all") && (
                  <Badge variant="secondary" className="ml-1">
                    Active
                  </Badge>
                )}
              </Button>
            </div>
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
              <div className="bg-almona-darker p-6 rounded-lg sticky top-24 border border-almona-light/20">
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
              </div>
            </motion.div>

            {/* Parts Grid */}
            <div className="lg:col-span-3">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  {filteredParts.length} Parts Found
                  {selectedCategory !== "all" && ` in ${partCategories.find(c => c.id === selectedCategory)?.name}`}
                  {_selectedMachine !== "all" && ` for ${yilmazMachines.find(m => m.id === _selectedMachine)?.name}`}
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
                    Try adjusting your search criteria
                  </p>
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
                            <EnhancedImage
                              src={part.imageUrl}
                              alt={part.name}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              aspectRatio="landscape"
                              loading="lazy"
                              loadingMessage="Loading spare part image..."
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
    </ProtectedComponent>
  );
};

export default withErrorBoundary(SpareParts);
