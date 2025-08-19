import React, { useEffect, useState, useMemo, useCallback } from "react";
import i18n from "@/lib/i18n";
import { inventory } from "@/data/inventory";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";
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
}

interface Part {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
}
import { EgyptCertification, MachineSpec } from "@/types/shop";

// Components
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AiEquipmentAdvisor from "@/components/shop/ai-advisor/AiEquipmentAdvisor";
import { IndustrialProductCard } from "@/components/shop/IndustrialProductCard";
import { Skeleton } from "@/shared/ui/ui/skeleton";
import { EquipmentComparisonTool } from "@/components/shop/EquipmentComparisonTool";
import FreightCalculator from "@/components/shop/FreightCalculator";
import EgyptianStandardsGuide from "@/components/shop/EgyptianStandardsGuide";
import EgyptianTechnicalSupportHub from "@/components/shop/EgyptianTechnicalSupportHub";
import { ProductQuickView } from "@/components/shop/ProductQuickView";
import { RecentlyViewedProducts } from "@/components/shop/RecentlyViewedProducts";

import ErrorBoundary from "@/components/ErrorBoundary";

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Input } from "@/shared/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { NeonButton } from "@/shared/ui/ui/neon-button";
import { Button } from "@/shared/ui/ui/button";

// Data
import { yilmazMachines, yilmazParts } from "@/constants/productsData";
import { yilmazMachines as yilmazMachinesSpecs } from "@/constants/yilmazMachines";
import { uniqueProducts } from "@/constants/uniqueProductsData";

// Enhanced Type Definitions
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
  sortBy: 'featured' | 'price-low' | 'price-high' | 'name';
}

type ShopProduct = Machine | Product | Part;

// Type guards
function isMachine(product: ShopProduct): product is Machine {
  return 'specifications' in product && 'pricing' in product;
}

function isProduct(product: ShopProduct): product is Product {
  return 'price' in product && 'stock' in product;
}

const PRODUCTS_PER_LOAD = 9; // Number of products to load each time

// Custom hook for shop state management
function useShopState() {
  const [activeTab, setActiveTab] = useState<ProductTab>('industrial-machines');
  const [viewMode, setViewMode] = useState<'grid' | 'configurator'>('grid');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonList, setComparisonList] = useState<Machine[]>([]);
  const [filters, setFilters] = useState<ShopFilters>({
    searchTerm: "",
    category: "all",
    sortBy: "featured"
  });
  const [displayedProductCount, setDisplayedProductCount] = useState(PRODUCTS_PER_LOAD);

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    advisorOpen,
    setAdvisorOpen,
    selectedProduct,
    setSelectedProduct,
    quickViewProduct,
    setQuickViewProduct,
    isLoading,
    setIsLoading,
    comparisonList,
    setComparisonList,
    filters,
    setFilters,
    displayedProductCount,
    setDisplayedProductCount
  };
}

const ShopEnhanced = () => {
  const { addToQuote } = useQuote();
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    advisorOpen,
    setAdvisorOpen,
    selectedProduct,
    setSelectedProduct,
    quickViewProduct,
    setQuickViewProduct,
    isLoading,
    setIsLoading,
    comparisonList,
    setComparisonList,
    filters,
    setFilters,
    displayedProductCount,
    setDisplayedProductCount
  } = useShopState();

  // Memoized data processing
  const enhancedProducts = useMemo(() => {
    return yilmazMachines.map(product => {
      const machineSpecs = yilmazMachinesSpecs.find(spec => spec.id === product.id);
      const stock = inventory[product.id] ?? 0;
      return {
        ...product,
        specifications: machineSpecs?.specifications 
          ? Object.entries(machineSpecs.specifications).map(([key, value]) => `${key}: ${value}`)
          : product.specifications || [],
        certifications: machineSpecs?.egyptCertifications || product.certifications || [],
        stock,
      };
    });
  }, []);

  const uniqueProductsArray = useMemo(() => uniqueProducts, []);

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
  const handleFilterChange = useCallback((key: keyof ShopFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle comparison
  const handleToggleCompare = useCallback((product: Machine) => {
    setComparisonList(prev => {
      const exists = prev.some(p => p.id === product.id);
      return exists 
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product].slice(0, 4);
    });
  }, []);

  // Memoized filtering logic
  const filteredProducts = useMemo(() => {
    let products: ShopProduct[] = [];
    
    switch (activeTab) {
      case "industrial-machines":
        products = enhancedProducts;
        break;
      case "industrial-parts":
        products = yilmazParts;
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

    if (filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.category !== "all") {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return ((a as Machine).pricing?.basePrice || 0) - ((b as Machine).pricing?.basePrice || 0);
        case "price-high":
          return ((b as Machine).pricing?.basePrice || 0) - ((a as Machine).pricing?.basePrice || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activeTab, enhancedProducts, uniqueProductsArray, filters]);

  // Loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  const menuData = [
    { label: "Industrial Machines", key: "industrial-machines" },
    { label: "Industrial Parts", key: "industrial-parts" },
    { label: "Egypt Standards", key: "egypt-standards" },
    { label: "Nile Logistics", key: "nile-logistics" },
    { label: "Local Support", key: "local-support" }
  ];

  

  return (
    <div dir={i18n.language === "ar" ? "rtl" : "ltr"} 
         className={`flex flex-col min-h-screen bg-almona-dark text-white ${i18n.language === "ar" ? "font-tajawal" : ""}`}>
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient-orange">YILMAZ Authorized Dealer</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Premium industrial machinery and equipment for Egyptian manufacturers
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <NeonButton 
                variant="orange" 
                size="lg" 
                onClick={() => setAdvisorOpen(true)}
              >
                AI Equipment Advisor
              </NeonButton>
              
            </div>
          </div>

          <AiEquipmentAdvisor open={advisorOpen} onOpenChange={setAdvisorOpen} />

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductTab)}>
            <TabsList className="flex flex-wrap justify-center gap-2 mb-12">
              {menuData.map((menu) => (
                <TabsTrigger key={menu.key} value={menu.key}>
                  {menu.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-almona-darker p-4 rounded-lg">
                <div className="w-full md:w-1/2">
                  <Input 
                    placeholder="Search products..." 
                    className="bg-almona-dark border-almona-light"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <Select 
                    value={filters.category} 
                    onValueChange={(value) => handleFilterChange('category', value)}
                  >
                    <SelectTrigger className="w-[180px] bg-almona-darker border-almona-light">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="cutting">Cutting</SelectItem>
                      <SelectItem value="welding">Welding</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="w-[180px] bg-almona-darker border-almona-light">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            <TabsContent value="egypt-standards">
              <EgyptianStandardsGuide />
            </TabsContent>
            <TabsContent value="nile-logistics">
              <FreightCalculator machine={null} />
            </TabsContent>
            <TabsContent value="local-support">
              <EgyptianTechnicalSupportHub />
            </TabsContent>

            {/* Product Grid */}
            <TabsContent value={activeTab}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ErrorBoundary fallback={<div>Error loading products</div>}>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="w-full h-96" />
                    ))
                  ) : (
                    filteredProducts.slice(0, displayedProductCount).map((product) => {
                      if (isMachine(product)) {
                        return (
                          <IndustrialProductCard
                            key={product.id}
                            title={product.name}
                            description={product.description || ""}
                            imageUrl={product.imageUrl}
                            price={formatPrice(product.pricing?.basePrice)}
                            features={product.specifications.map(spec => `${spec.key}: ${spec.value}`)}
                            badges={product.tags}
                            egyptCertifications={product.certifications.map(c => c.standard)}
                            stock={product.stock}
                            actions={[
                              {
                                label: "Configure",
                                action: () => {
                                  setSelectedProduct(product.id);
                                  setViewMode("configurator");
                                },
                              },
                              {
                                label: "Quick View",
                                action: () => setQuickViewProduct(product),
                              },
                              {
                                label: "Add to Quote",
                                action: () => {
                                  addToQuote(product as any);
                                  toast.success(`${product.name} has been added to your quote.`);
                                },
                              },
                              {
                                label: comparisonList.some((p) => p.id === product.id)
                                  ? "Remove Compare"
                                  : "Compare",
                                action: () => {
                                  if ("specifications" in product) {
                                    handleToggleCompare(product);
                                  }
                                },
                              },
                            ]}
                          />
                        );
                      } else if (isProduct(product)) {
                        return (
                          <IndustrialProductCard
                            key={product.id}
                            title={product.name}
                            description={product.description || ""}
                            imageUrl={product.imageUrl}
                            price={formatPrice(product.price)}
                            features={[]}
                            badges={product.tags}
                            egyptCertifications={[]}
                            stock={product.stock}
                            actions={[
                              {
                                label: "Add to Quote",
                                action: () => {
                                  addToQuote(product as any);
                                  toast.success(`${product.name} has been added to your quote.`);
                                },
                              },
                            ]}
                          />
                        );
                      } else { // Part
                        return (
                          <IndustrialProductCard
                            key={product.id}
                            title={product.name}
                            description={product.description || ""}
                            imageUrl={product.imageUrl || ""}
                            price={"N/A"}
                            features={[]}
                            badges={[]}
                            egyptCertifications={[]}
                            stock={undefined}
                            actions={[
                              {
                                label: "Add to Quote",
                                action: () => {
                                  addToQuote(product as any);
                                  toast.success(`${product.name} has been added to your quote.`);
                                },
                              },
                            ]}
                          />
                        );
                      }
                    })
                  )}
                </ErrorBoundary>
              </div>
            </TabsContent>
          </Tabs>

          {displayedProductCount < filteredProducts.length && (
            <div className="text-center mt-8">
              <Button
                onClick={() => setDisplayedProductCount(prev => prev + PRODUCTS_PER_LOAD)}
                className="bg-almona-dark border-almona-light"
              >
                Load More
              </Button>
            </div>
          )}

          {/* Comparison Tool */}
          {comparisonList.length > 0 && (
            <div className="mt-8">
              <EquipmentComparisonTool 
                selectedMachines={comparisonList} 
                allMachines={enhancedProducts} 
                onToggleMachine={handleToggleCompare} 
              />
            </div>
          )}

          {quickViewProduct && (
            <ProductQuickView 
              product={quickViewProduct}
              isOpen={!!quickViewProduct}
              onClose={() => setQuickViewProduct(null)}
            />
          )}

          <RecentlyViewedProducts />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShopEnhanced;