// Enhanced Shop Component for Almona Portfolio

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Heart, 
  Star, 
  Truck, 
  Shield, 
  RotateCcw,
  Eye,
  GitCompare,
  ChevronDown,
  Sparkles,
  Grid,
  List,
  SlidersHorizontal,
  Settings
} from "lucide-react";
import i18n from "@/lib/i18n";
import { inventory } from "@/data/inventory";
import { useQuote } from "@/context/QuoteContext";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { IndustrialProductCard } from "@/components/shop/IndustrialProductCard";
import { ProductQuickView } from "@/components/shop/ProductQuickView";
import { RecentlyViewedProducts } from "@/components/shop/RecentlyViewedProducts";
import { EquipmentComparisonTool } from "@/components/shop/EquipmentComparisonTool";
import AiEquipmentAdvisor from "@/components/shop/ai-advisor/AiEquipmentAdvisor";
import FreightCalculator from "@/components/shop/FreightCalculator";
import EgyptianStandardsGuide from "@/components/shop/EgyptianStandardsGuide";
import EgyptianTechnicalSupportHub from "@/components/shop/EgyptianTechnicalSupportHub";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Input } from "@/shared/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Button } from "@/shared/ui/ui/button";
import { Badge } from "@/shared/ui/ui/badge";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { Skeleton } from "@/shared/ui/ui/skeleton";
import { NeonButton } from "@/shared/ui/ui/neon-button";
import { Checkbox } from "@/shared/ui/ui/checkbox";
import { Label } from "@/shared/ui/ui/label";
import { Slider } from "@/shared/ui/ui/slider";

// Data
import { yilmazMachines, yilmazParts } from "@/constants/productsData";
import { yilmazMachines as yilmazMachinesSpecs } from "@/constants/yilmazMachines";
import { uniqueProducts } from "@/constants/uniqueProductsData";

// Types
interface Machine {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  specifications: { key: string; value: string }[];
  pricing?: { basePrice: number };
  certifications: { standard: string }[];
  tags: string[];
  category: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  discount?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  stock: number;
  tags: string[];
  category: string;
  rating?: number;
  reviewCount?: number;
}

interface Part {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  price?: number;
}

interface RatedProduct {
  rating?: number;
  reviewCount?: number;
}

type ProductTab = 
  | 'industrial-machines' 
  | 'industrial-parts' 
  | 'egypt-standards' 
  | 'nile-logistics' 
  | 'local-support'
  | 'unique-prototypes'
  | 'unique-custom-fabrications';

interface ShopFilters {
  searchTerm: string;
  category: string;
  sortBy: 'featured' | 'price-low' | 'price-high' | 'name' | 'rating' | 'newest';
  priceRange: [number, number];
  inStock: boolean;
  hasDiscount: boolean;
  rating: number;
}

type ShopProduct = Machine | Product | Part;

function isMachine(product: ShopProduct): product is Machine {
  return 'specifications' in product;
}

function isProduct(product: ShopProduct): product is Product {
  return 'price' in product;
}

function isPart(product: ShopProduct): product is Part {
  return !isMachine(product) && !isProduct(product);
}

function isRatedProduct(product: ShopProduct): product is ShopProduct & RatedProduct {
  return 'rating' in product;
}

type ViewMode = 'grid' | 'list' | 'detailed';

interface ProductGridProps {
  isLoading: boolean;
  filteredProducts: ShopProduct[];
  displayedProductCount: number;
  setDisplayedProductCount: (value: number | ((prev: number) => number)) => void;
  viewMode: ViewMode;
  wishlist: string[];
  handleToggleWishlist: (productId: string) => void;
  setQuickViewProduct: (product: Machine | null) => void;
  addToQuote: (product: ShopProduct) => void;
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  comparisonList: Machine[];
  handleToggleCompare: (product: Machine) => void;
  formatPrice: (price?: number) => string;
  setFilters: (filters: ShopFilters) => void;
}

const ProductGrid = ({ 
  isLoading, 
  filteredProducts, 
  displayedProductCount, 
  setDisplayedProductCount, 
  viewMode,
  wishlist,
  handleToggleWishlist,
  setQuickViewProduct,
  addToQuote,
  toast,
  comparisonList,
  handleToggleCompare,
  formatPrice,
  setFilters
}: ProductGridProps) => {
  if (isLoading) {
    return (
      <div className={`grid gap-6 ${
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-96" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-almona-darker/50 p-8 rounded-lg border border-almona-light/20">
          <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-gray-400 mb-6">
            Try adjusting your filters or search terms
          </p>
          <Button onClick={() => setFilters({
            searchTerm: "",
            category: "all",
            sortBy: "featured",
            priceRange: [0, 50000],
            inStock: false,
            hasDiscount: false,
            rating: 0
          })}>
            Reset Filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-6 ${
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        {filteredProducts.slice(0, displayedProductCount).map((product: ShopProduct, index: number) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <IndustrialProductCard
              title={product.name}
              description={product.description || ""}
              imageUrl={'imageUrl' in product ? product.imageUrl : ''}
              price={formatPrice(
                'pricing' in product ? product.pricing?.basePrice : 
                'price' in product ? product.price : undefined
              )}
              features={isMachine(product) ? product.specifications.slice(0, 3).map(s => `${s.key}: ${s.value}`) : []}
              badges={[
                ...('tags' in product ? product.tags : []),
                ...('isNew' in product && (product as Machine).isNew ? ['New'] : []),
                ...('discount' in product && (product as Machine).discount ? [`${(product as Machine).discount}% Off`] : [])
              ]}
              egyptCertifications={isMachine(product) ? product.certifications.map(c => c.standard) : []}
              stock={'stock' in product ? product.stock : 0}
              actions={[
                  ...(isMachine(product)
                    ? [
                        {
                          label: "Quick View",
                          action: () => setQuickViewProduct(product),
                        },
                      ]
                    : []),
                  {
                    label: "Add to Quote",
                    action: () => {
                      addToQuote(product);
                      toast({
                        title: "Added to quote",
                        description: `${product.name} has been added to your quote`,
                      });
                    },
                  },
                  ...(isMachine(product)
                    ? [
                        {
                          label: comparisonList.some((p: Machine) => p.id === product.id)
                            ? "Remove Compare"
                            : "Compare",
                          action: () => handleToggleCompare(product),
                        },
                      ]
                    : []),
                ]}
            />
          </motion.div>
        ))}
      </div>

      {displayedProductCount < filteredProducts.length && (
        <div className="text-center mt-12">
          <Button
            onClick={() => setDisplayedProductCount((prev: number) => prev + 12)}
            className="bg-almona-orange hover:bg-almona-orange-dark px-8 py-3"
          >
            Load More Products
          </Button>
        </div>
      )}
    </>
  )
}


// Enhanced Shop Component
const Shop = () => {
  const { addToQuote } = useQuote();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ProductTab>('industrial-machines');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonList, setComparisonList] = useState<Machine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ShopFilters>({
    searchTerm: "",
    category: "all",
    sortBy: "featured",
    priceRange: [0, 50000],
    inStock: false,
    hasDiscount: false,
    rating: 0
  });
  const [displayedProductCount, setDisplayedProductCount] = useState(12);

  // Memoized data processing
  const enhancedProducts = useMemo(() => {
    return yilmazMachines.map(product => {
      const machineSpecs = yilmazMachinesSpecs.find(spec => spec.id === product.id);
      const stock = inventory[product.id] ?? 0;
      return {
        ...product,
        specifications: machineSpecs?.specifications 
          ? Object.entries(machineSpecs.specifications).map(([key, value]) => ({ key, value }))
          : product.specifications || [],
        certifications: machineSpecs?.egyptCertifications || product.certifications || [],
        stock,
        rating: Math.random() * 2 + 3, // Random rating between 3-5
        reviewCount: Math.floor(Math.random() * 50) + 5,
        isFeatured: Math.random() > 0.7,
        isNew: Math.random() > 0.8,
        discount: Math.random() > 0.9 ? Math.floor(Math.random() * 30) + 5 : undefined
      };
    });
  }, []);

  const uniqueProductsArray = useMemo(() => uniqueProducts, []);
  const allParts = useMemo(() => yilmazParts, []);

  // Format price with proper localization
  const formatPrice = useCallback((price?: number) => {
    if (!price) return "Contact for Quote";
    const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0
    }).format(price);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof ShopFilters, value: string | number | [number, number] | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle comparison
  const handleToggleCompare = useCallback((product: Machine) => {
    setComparisonList(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        toast({
          title: "Removed from comparison",
          description: `${product.name} removed from comparison`,
        });
        return prev.filter(p => p.id !== product.id);
      } else {
        if (prev.length >= 4) {
          toast({
            title: "Comparison limit reached",
            description: "You can compare up to 4 machines at a time",
            variant: "destructive"
          });
          return prev;
        }
        toast({
          title: "Added to comparison",
          description: `${product.name} added to comparison`,
        });
        return [...prev, product];
      }
    });
  }, [toast]);

  // Toggle wishlist
  const handleToggleWishlist = useCallback((productId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to your wishlist",
        variant: "destructive"
      });
      return;
    }
    
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        toast({
          title: "Removed from wishlist",
          description: "Item removed from your wishlist",
        });
        return prev.filter(id => id !== productId);
      } else {
        toast({
          title: "Added to wishlist",
          description: "Item added to your wishlist",
        });
        return [...prev, productId];
      }
    });
  }, [user, toast]);

  // Memoized filtering logic
  const filteredProducts = useMemo(() => {
    let products: ShopProduct[] = [];
    
    switch (activeTab) {
      case "industrial-machines":
        products = enhancedProducts;
        break;
      case "industrial-parts":
        products = allParts;
        break;
      case "unique-prototypes":
      case "unique-custom-fabrications":
        products = uniqueProductsArray.filter(p => 
          activeTab === "unique-prototypes" 
            ? p.category === "prototypes" 
            : p.category === "custom-fabrications"
        );
        break;
      default:
        products = [];
    }

    let filtered = products;

    // Apply filters
    if (filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        ('tags' in p && p.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    if (filters.category !== "all") {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.inStock) {
      filtered = filtered.filter(p => 'stock' in p && p.stock > 0);
    }

    if (filters.hasDiscount) {
      filtered = filtered.filter(p => 'discount' in p && p.discount !== undefined);
    }

    if (filters.rating > 0) {
      filtered = filtered.filter(p => isRatedProduct(p) && p.rating && p.rating >= filters.rating);
    }

    // Price range filter
    filtered = filtered.filter(p => {
      const price = ('pricing' in p && p.pricing?.basePrice) || ('price' in p ? p.price : 0);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return ((a as Machine).pricing?.basePrice || (a as Product).price || 0) - 
                 ((b as Machine).pricing?.basePrice || (b as Product).price || 0);
        case "price-high":
          return ((b as Machine).pricing?.basePrice || (b as Product).price || 0) - 
                 ((a as Machine).pricing?.basePrice || (a as Product).price || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return (isRatedProduct(b) ? b.rating || 0 : 0) - (isRatedProduct(a) ? a.rating || 0 : 0);
        case "newest":
          return (('isNew' in b && b.isNew) ? 1 : 0) - (('isNew' in a && a.isNew) ? 1 : 0);
        case "featured":
        default:
          return (('isFeatured' in b && b.isFeatured) ? 1 : 0) - (('isFeatured' in a && a.isFeatured) ? 1 : 0);
      }
    });

    return filtered;
  }, [activeTab, enhancedProducts, uniqueProductsArray, allParts, filters]);

  // Loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Render star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} 
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const menuData = [
    { label: "Industrial Machines", key: "industrial-machines", icon: <SlidersHorizontal className="h-4 w-4" /> },
    { label: "Industrial Parts", key: "industrial-parts", icon: <Settings className="h-4 w-4" /> },
    { label: "Egypt Standards", key: "egypt-standards", icon: <Shield className="h-4 w-4" /> },
    { label: "Nile Logistics", key: "nile-logistics", icon: <Truck className="h-4 w-4" /> },
    { label: "Local Support", key: "local-support", icon: <RotateCcw className="h-4 w-4" /> }
  ];

  const categories = [
    { id: "all", name: "All Categories" },
    { id: "cutting", name: "Cutting Machines" },
    { id: "welding", name: "Welding Machines" },
    { id: "processing", name: "Processing Centers" },
    { id: "milling", name: "Milling Machines" },
    { id: "cnc", name: "CNC Machines" }
  ];

  const productTabs: ProductTab[] = ['industrial-machines', 'industrial-parts', 'unique-prototypes', 'unique-custom-fabrications'];

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      
      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative bg-gradient-to-br from-almona-dark to-almona-darker py-16 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=2000')] opacity-10 mix-blend-overlay"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-gradient-orange">Industrial Equipment Hub</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Premium machinery, genuine parts, and expert support for Egypt's manufacturing industry
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <NeonButton 
                  variant="industrial"
                  size="lg"
                  onClick={() => setAdvisorOpen(true)}
                  className="px-8 py-4"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  AI Equipment Advisor
                </NeonButton>
                
                <Button 
                  className="border-almona-light text-white hover:bg-almona-light/10 px-8 py-4"
                >
                  Explore Catalog
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Main Shop Content */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <motion.aside 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-1/4"
            >
              <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <Button 
                    onClick={() => setFilters({
                      searchTerm: "",
                      category: "all",
                      sortBy: "featured",
                      priceRange: [0, 50000],
                      inStock: false,
                      hasDiscount: false,
                      rating: 0
                    })}
                    className="text-almona-orange hover:text-almona-orange-dark"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Price Range */}
                  <div>
                    <Label className="mb-3 block">Price Range (EGP)</Label>
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => handleFilterChange('priceRange', value as [number, number])}
                      max={50000}
                      step={1000}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{formatPrice(filters.priceRange[0])}</span>
                      <span>{formatPrice(filters.priceRange[1])}</span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <Label className="mb-3 block">Categories</Label>
                    <Select 
                      value={filters.category} 
                      onValueChange={(value) => handleFilterChange('category', value)}
                    >
                      <SelectTrigger className="bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filters */}
                  <div className="space-y-3">
                    <Label className="block">Filters</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="inStock" 
                        checked={filters.inStock}
                        onCheckedChange={(checked) => handleFilterChange('inStock', checked === true)}
                      />
                      <Label htmlFor="inStock" className="text-sm font-normal">In Stock Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="hasDiscount" 
                        checked={filters.hasDiscount}
                        onCheckedChange={(checked) => handleFilterChange('hasDiscount', checked === true)}
                      />
                      <Label htmlFor="hasDiscount" className="text-sm font-normal">Special Offers</Label>
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <Label className="mb-3 block">Minimum Rating</Label>
                    <Select 
                      value={filters.rating.toString()} 
                      onValueChange={(value) => handleFilterChange('rating', parseInt(value))}
                    >
                      <SelectTrigger className="bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any Rating</SelectItem>
                        <SelectItem value="4">4 Stars & Up</SelectItem>
                        <SelectItem value="4.5">4.5 Stars & Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Value Propositions */}
              <div className="mt-6 space-y-4">
                <Card className="bg-almona-darker/50 border-almona-light/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Truck className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium">Free Shipping</h4>
                      <p className="text-sm text-gray-400">On orders over 50,000 EGP</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-darker/50 border-almona-light/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Shield className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium">2-Year Warranty</h4>
                      <p className="text-sm text-gray-400">On all machinery</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-darker/50 border-almona-light/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <RotateCcw className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium">30-Day Returns</h4>
                      <p className="text-sm text-gray-400">No questions asked</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.aside>

            {/* Main Content */}
            <div className="lg:w-3/4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductTab)}>
              {/* Header with tabs and controls */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20 mb-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h2 className="text-2xl font-bold">
                    {activeTab === 'industrial-machines' && 'Industrial Machinery'}
                    {activeTab === 'industrial-parts' && 'Spare Parts'}
                    {activeTab === 'egypt-standards' && 'Egyptian Standards'}
                    {activeTab === 'nile-logistics' && 'Logistics Services'}
                    {activeTab === 'local-support' && 'Technical Support'}
                  </h2>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-almona-dark rounded-lg p-1">
                      <Button
                        onClick={() => setViewMode('grid')}
                        className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-almona-light/20' : ''}`}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setViewMode('list')}
                        className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-almona-light/20' : ''}`}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    <Select 
                      value={filters.sortBy} 
                      onValueChange={(value) => handleFilterChange('sortBy', value as ShopFilters['sortBy'])}
                    >
                      <SelectTrigger className="w-[180px] bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="rating">Top Rated</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search machinery, parts, accessories..."
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                      className="pl-10 bg-almona-dark border-almona-light/30"
                    />
                  </div>

                  <TabsList className="bg-almona-dark border border-almona-light/20">
                    {menuData.map((menu) => (
                      <TabsTrigger key={menu.key} value={menu.key} className="flex items-center gap-2">
                        {menu.icon}
                        <span className="hidden sm:inline">{menu.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </motion.div>

              {productTabs.map(tab => (
                <TabsContent key={tab} value={tab}>
                  <ProductGrid
                    isLoading={isLoading}
                    filteredProducts={filteredProducts}
                    displayedProductCount={displayedProductCount}
                    setDisplayedProductCount={setDisplayedProductCount}
                    viewMode={viewMode}
                    wishlist={wishlist}
                    handleToggleWishlist={handleToggleWishlist}
                    setQuickViewProduct={setQuickViewProduct}
                    addToQuote={addToQuote}
                    toast={toast}
                    comparisonList={comparisonList}
                    handleToggleCompare={handleToggleCompare}
                    formatPrice={formatPrice}
                    setFilters={setFilters}
                  />
                </TabsContent>
              ))}
              
              <TabsContent value="egypt-standards">
                <EgyptianStandardsGuide />
              </TabsContent>
              <TabsContent value="nile-logistics">
                <FreightCalculator machine={null} />
              </TabsContent>
              <TabsContent value="local-support">
                <EgyptianTechnicalSupportHub />
              </TabsContent>

              </Tabs>
            </div>
          </div>
        </section>

        {/* Recently Viewed */}
        <RecentlyViewedProducts />

        {/* AI Advisor Modal */}
        <AiEquipmentAdvisor open={advisorOpen} onOpenChange={setAdvisorOpen} />

        {/* Quick View Modal */}
        {quickViewProduct && (
          <ProductQuickView 
            product={quickViewProduct}
            isOpen={!!quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
