import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { inventory } from "@/data/inventory";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";
import { Machine, Part } from "../types/machine";
import { Product } from "../types/product";
import { UniqueProduct } from "../types/unique-product";
import { Certification } from "../types/certification";
import { EgyptCertification } from "../types/shop";

// Components
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AiEquipmentAdvisor from "../components/shop/ai-advisor/AiEquipmentAdvisor";
import { IndustrialProductCard } from "../components/shop/IndustrialProductCard";
import { Skeleton } from "../shared/ui/ui/skeleton";
import { EquipmentComparisonTool } from "../components/shop/EquipmentComparisonTool";
import FreightCalculator from "../components/shop/FreightCalculator";
import EgyptianStandardsGuide from "../components/shop/EgyptianStandardsGuide";
import EgyptianTechnicalSupportHub from "../components/shop/EgyptianTechnicalSupportHub";
import { ProductQuickView } from "../components/shop/ProductQuickView";
import { RecentlyViewedProducts } from "../components/shop/RecentlyViewedProducts";
import { DurabilityDetailsModal } from "../components/shop/DurabilityDetailsModal";
import { DurabilityInfo } from "../components/shop/DurabilityDetailsModal";

import ErrorBoundary from "@/components/ErrorBoundary";

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/ui/ui/tabs";
import { Input } from "../shared/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../shared/ui/ui/select";
import { NeonButton } from "../shared/ui/ui/neon-button";
import { Button } from "../shared/ui/ui/button";

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

// Define ShopMachine with additional properties
interface ShopMachine extends Machine {
  stock: number;
  pricing?: {
    currency: "EGP" | "USD" | "EUR";
    basePrice?: number;
    installationCost?: number;
    warrantyYears?: number;
  };
}

interface CommonProduct {
  id: string;
  name: string;
  category?: string;
  tags?: string[];
  stock?: number;
}

type ShopProduct = (ShopMachine | Product | Part | UniqueProduct) & CommonProduct;

// Type guards
function isPart(product: ShopProduct): product is Part & CommonProduct {
  return 'partNumber' in product;
}

function isProduct(product: ShopProduct): product is Product & CommonProduct {
  return 'sku' in product;
}

function isShopMachine(product: ShopProduct): product is ShopMachine & CommonProduct {
  return 'manufacturer' in product && 'model' in product;
}

function isUniqueProduct(product: ShopProduct): product is UniqueProduct & CommonProduct {
  return 'uniqueId' in product;
}

// Custom hook for shop state management
const PRODUCTS_PER_LOAD = 9;

// Custom hook for shop state management
    function useShopState() {
  const [activeTab, setActiveTab] = useState<ProductTab>('industrial-machines');
  const [viewMode, setViewMode] = useState<'grid' | 'configurator'>('grid');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<ShopMachine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonList, setComparisonList] = useState<ShopMachine[]>([]);
  const [filters, setFilters] = useState<ShopFilters>({
    searchTerm: "",
    category: "all",
    sortBy: "featured"
  });
  const [displayedProductCount, setDisplayedProductCount] = useState(PRODUCTS_PER_LOAD);
  const [showDurabilityModal, setShowDurabilityModal] = useState(false);
  const [selectedDurabilityProduct, setSelectedDurabilityProduct] = useState<{ info: DurabilityInfo; name: string } | null>(null);

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    advisorOpen,
    setAdvisorOpen,
    selectedProduct,
    setSelectedProduct,
    isLoading,
    setIsLoading,
    comparisonList,
    setComparisonList,
    filters,
    setFilters,
    displayedProductCount,
    setDisplayedProductCount,
    quickViewProduct,
    setQuickViewProduct,
    showDurabilityModal,
    setShowDurabilityModal,
    selectedDurabilityProduct,
    setSelectedDurabilityProduct
  };
}

const ShopEnhanced = () => {
  const { t } = useTranslation('shop');
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
    isLoading,
    setIsLoading,
    comparisonList,
    setComparisonList,
    filters,
    setFilters,
    displayedProductCount,
    setDisplayedProductCount,
    quickViewProduct,
    setQuickViewProduct,
    showDurabilityModal,
    setShowDurabilityModal,
    selectedDurabilityProduct,
    setSelectedDurabilityProduct
  } = useShopState();

  // Memoized data processing
  const enhancedProducts = useMemo(() => {
    return yilmazMachines.map(product => {
      const machineSpecs = yilmazMachinesSpecs.find(spec => spec.id === product.id);
      const stock = inventory[product.id] ?? 0;
      
      // Dummy durability info for demonstration
      const durabilityInfo = {
        score: Math.floor(Math.random() * 3) + 3, // Random score between 3 and 5
        maintenanceInterval: product.category === "cutting" ? "Every 3 months or 500 operating hours" : "Every 6 months or 1000 operating hours",
        keyDurabilityFeatures: [
          "High-grade steel frame",
          "Precision-engineered components",
          "Corrosion-resistant coating"
        ]
      };

      return {
        ...product,
        specifications: machineSpecs?.specifications
          ? Object.entries(machineSpecs.specifications).map(([key, value]) => ({ key, value }))
          : product.specifications || [],
        certifications: machineSpecs?.certifications || product.certifications || [],
        stock,
        durabilityInfo, // Add durability info
      };
    });
  }, []);

  const uniqueProductsArray = useMemo(() => uniqueProducts, []);

  // Format price with proper localization
  const formatPrice = useCallback((price?: number) => {
    if (!price) return t("shop.contact_quote");
    const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0
    }).format(price);
  }, [t]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof ShopFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, [setFilters]);

  // Toggle comparison
  const handleToggleCompare = useCallback((product: ShopMachine) => {
    setComparisonList(prev => {
      const exists = prev.some(p => p.id === product.id);
      return exists 
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product].slice(0, 4);
    });
  }, [setComparisonList]);

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
        (isShopMachine(p) && p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (isShopMachine(p) && p.specifications && p.specifications.some(spec => spec.value.toLowerCase().includes(searchTerm)))
      );
    }

    if (filters.category !== "all") {
      filtered = filtered.filter(p => (p as Machine).category === filters.category);
    }

          filtered.sort((a, b) => {
            switch (filters.sortBy) {
              case "price-low":
                return ((a as ShopMachine).pricing?.basePrice || 0) - ((b as ShopMachine).pricing?.basePrice || 0);
              case "price-high":
                return ((b as ShopMachine).pricing?.basePrice || 0) - ((a as ShopMachine).pricing?.basePrice || 0);
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
    { label: t("shop.tabs.industrial-machines"), key: "industrial-machines" },
    { label: t("shop.tabs.industrial-parts"), key: "industrial-parts" },
    { label: t("shop.tabs.egypt-standards"), key: "egypt-standards" },
    { label: t("shop.tabs.nile-logistics"), key: "nile-logistics" },
    { label: t("shop.tabs.local-support"), key: "local-support" }
  ];

  

  return (
    <div dir={i18n.language === "ar" ? "rtl" : "ltr"} 
         className={`flex flex-col min-h-screen bg-almona-dark text-white ${i18n.language === "ar" ? "font-tajawal" : ""}`}>
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient-orange">{t("shop.title.yilmaz_authorized")}</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t("shop.subtitle.authorized_dealer")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <NeonButton 
                variant="orange" 
                size="lg" 
                onClick={() => setAdvisorOpen(true)}
              >
                {t("shop.buttons.ai_advisor")}
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
                    placeholder={t("shop.search_placeholder")} 
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
                    <SelectTrigger className="w-[180px] bg-almona-dark border-almona-light">
                      <SelectValue placeholder={t("shop.filter_by_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("shop.filters.all_categories")}</SelectItem>
                      <SelectItem value="cutting">{t("shop.filters.cutting")}</SelectItem>
                      <SelectItem value="welding">{t("shop.filters.welding")}</SelectItem>
                      <SelectItem value="processing">{t("shop.filters.processing")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="w-[180px] bg-almona-dark border-almona-light">
                      <SelectValue placeholder={t("shop.sort_by")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">{t("shop.sort.featured")}</SelectItem>
                      <SelectItem value="price-low">{t("shop.sort.price_low")}</SelectItem>
                      <SelectItem value="price-high">{t("shop.sort.price_high")}</SelectItem>
                      <SelectItem value="name">{t("shop.sort.name")}</SelectItem>
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
                <ErrorBoundary fallback={<div>{t("shop.errors.product_load")}</div>}>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="w-full h-96" />
                    ))
                  ) : (
                    filteredProducts.slice(0, displayedProductCount).map((product) => (
                      <IndustrialProductCard
                        key={product.id}
                        title={product.name}
                        description={product.description || ""}
                        imageUrl={product.imageUrl}
                        price={formatPrice((product as ShopMachine).pricing?.basePrice)}
                        features={(product as Machine).serviceHistory.map(e => e.type) || []}
                        badges={[
                          ...(product as Machine).tags || [],
                          ...((product as Machine).healthMetrics.components ? Object.keys((product as Machine).healthMetrics.components) : [])
                        ]}
                        stock={(product as { stock?: number }).stock ?? 0}
                        durabilityInfo={(product as ShopMachine).durabilityInfo}
                        onDurabilityClick={(info) => {
                          setSelectedDurabilityProduct({ info, name: product.name });
                          setShowDurabilityModal(true);
                        }}
                        actions={[
                          {
                            label: t("shop.buttons.configure"),
                            action: () => {
                              setSelectedProduct(product.id);
                              setViewMode("configurator");
                            }
                          },
                          {
                            label: t("shop.buttons.quick_view"),
                            action: () => setQuickViewProduct(product as ShopMachine)
                          },
                          {
                            label: t("shop.buttons.add_to_quote"),
                            action: () => {
                              addToQuote(product as Machine);
                              toast.success(`${product.name} has been added to your quote.`);
                            }
                          },
                          {
                            label: comparisonList.some(p => p.id === product.id) 
                              ? t("shop.buttons.remove_compare") 
                              : t("shop.buttons.compare"),
                            action: () => {
                              if ('specifications' in product) {
                                handleToggleCompare(product as ShopMachine);
                              }
                            }
                          }
                        ]}
                      />
                    ))
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
                {t('shop.buttons.load_more')}
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

      {showDurabilityModal && selectedDurabilityProduct && (
        <DurabilityDetailsModal
          isOpen={showDurabilityModal}
          onClose={() => setShowDurabilityModal(false)}
          durabilityInfo={selectedDurabilityProduct.info}
          productName={selectedDurabilityProduct.name}
        />
      )}
    </div>
  );
};

export default ShopEnhanced;
