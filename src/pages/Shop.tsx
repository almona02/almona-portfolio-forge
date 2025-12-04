// Enhanced Shop Component for Almona Portfolio

import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import SEO from "@/components/SEO";
import { 
  Search, 
  Truck, 
  Shield, 
  RotateCcw,
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
// import ErrorBoundary from "@/components/ErrorBoundary";
import { IndustrialProductCard } from "@/components/shop/IndustrialProductCard";
import { ProductQuickView } from "@/components/shop/ProductQuickView";
import { RecentlyViewedProducts } from "@/components/shop/RecentlyViewedProducts";
import SmartCategoryNavigation from "@/components/products/SmartCategoryNavigation";
import CategoryBreadcrumb from "@/components/products/CategoryBreadcrumb";
import SmartCategoryFilter from "@/components/products/SmartCategoryFilter";
// import { EquipmentComparisonTool } from "@/components/shop/EquipmentComparisonTool";
const AiEquipmentAdvisor = lazy(() => import("@/components/shop/ai-advisor/AiEquipmentAdvisor"));
import FreightCalculator from "@/components/shop/FreightCalculator";
import EgyptianStandardsGuide from "@/components/shop/EgyptianStandardsGuide";
import EgyptianTechnicalSupportHub from "@/components/shop/EgyptianTechnicalSupportHub";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Input } from "@/shared/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Button } from "@/shared/ui/ui/button";
// import { Badge } from "@/shared/ui/ui/badge";
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
import { smartCategoryMapping } from "@/constants/smartCategories";
import type { Database, ProductCategory } from "@/types/database";
import type { Machine as TypesMachine } from "@/types";

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
  return 'specifications' in product && 'certifications' in product;
}

// Removed unused isProduct type guard to satisfy lint rules

function isRatedProduct(product: ShopProduct): product is ShopProduct & RatedProduct {
  return 'rating' in product;
}

type ViewMode = 'grid' | 'list' | 'detailed';

// Adapter: convert Shop Machine to the global TypesMachine expected by ProductQuickView
function toTypesMachine(m: Machine): TypesMachine {
  return {
    id: m.id,
    name: m.name,
    description: m.description || "",
    imageUrl: m.imageUrl,
    category: m.category,
    featured: !!m.isFeatured,
    releaseDate: new Date().toISOString(),
    type: m.category || "Machine",
    powerSpec: { voltage: "", frequency: "", phase: "3", consumption: "" },
    tags: m.tags,
    specifications: (m.specifications || []).map(s => `${s.key}: ${s.value}`),
    certifications: (m.certifications || []).map(c => c.standard),
  };
}

// Adapter: map ShopProduct to Database products Row shape used by QuoteContext
function shopProductToDbProduct(product: ShopProduct): Database['public']['Tables']['products']['Row'] {
  const now = new Date().toISOString();
  const price = (isMachine(product) ? product.pricing?.basePrice : ('price' in product ? product.price : null)) ?? null;
  const category: ProductCategory = ((): ProductCategory => {
    const c = product.category as string | undefined;
    const allowed: ProductCategory[] = ['machine', 'spare_part', 'raw_material', 'tool', 'accessory'];
    if (c && (allowed as string[]).includes(c)) return c as ProductCategory;
    // Heuristic: machines tab -> 'machine', parts -> 'spare_part'
    return isMachine(product) ? 'machine' : 'spare_part';
  })();
  const specs: Record<string, string | number | boolean> = {};
  if (isMachine(product)) {
    (product.specifications || []).forEach(s => { specs[s.key] = s.value; });
  }
  return {
    id: product.id,
    sku: product.id,
    name_ar: product.name,
    name_en: product.name,
    description_ar: product.description ?? null,
    description_en: product.description ?? null,
    short_description_ar: null,
    short_description_en: null,
    category,
    subcategory: null,
    brand: null,
    model: null,
    price,
    cost_price: null,
    currency: 'EGP',
    stock_quantity: 'stock' in product ? product.stock : 0,
    min_stock_level: 0,
    max_stock_level: 0,
    weight_kg: null,
    dimensions: null,
    specifications: specs,
    features: {},
    compatible_machines: null,
    image_urls: 'imageUrl' in product && product.imageUrl ? [product.imageUrl] : null,
    video_urls: null,
    document_urls: null,
    model_3d_url: null,
    meta_title_ar: null,
    meta_title_en: null,
    meta_description_ar: null,
    meta_description_en: null,
    keywords: 'tags' in product ? product.tags : null,
    is_active: true,
  is_featured: isMachine(product) ? !!product.isFeatured : false,
  is_new: isMachine(product) ? !!product.isNew : false,
  is_on_sale: isMachine(product) ? !!product.discount : false,
    created_at: now,
    updated_at: now,
  };
}

interface ProductGridProps {
  isLoading: boolean;
  filteredProducts: ShopProduct[];
  displayedProductCount: number;
  setDisplayedProductCount: (value: number | ((prev: number) => number)) => void;
  viewMode: ViewMode;
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
      <div className={`grid items-stretch ${
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4' : 'grid-cols-1 gap-4'
      }`}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-96" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16">
  <div className="bg-almona-darker p-8 rounded-lg border border-almona-light/20">
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
      <div className={`grid items-stretch ${
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4' : 'grid-cols-1 gap-4'
      }`}>
        {filteredProducts.slice(0, displayedProductCount).map((product: ShopProduct, index: number) => (
          <div
            key={product.id}
            className="h-full fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
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
              ].filter((badge, index, array) => array.indexOf(badge) === index)}
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
          </div>
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

      const parsedSpecifications = (machineSpecs?.specifications || product.specifications || []).map(spec => {
        if (typeof spec === 'string') {
          const parts = spec.split(':');
          const key = parts[0]?.trim();
          const value = parts.slice(1).join(':').trim();
          return { key, value };
        }
        return spec; // Assume it's already in the correct format
      });

      const parsedCertifications = (machineSpecs?.certifications || product.certifications || []).map(cert => {
        if (typeof cert === 'string') {
          return { standard: cert };
        }
        return cert; // Assume it's already in the correct format
      });

      return {
        ...product,
        specifications: parsedSpecifications,
        certifications: parsedCertifications,
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

  // Map smart category to legacy category for filtering
  const getLegacyCategoryFilter = useCallback((smartCategory: string) => {
    if (smartCategory === 'all') return 'all';
    return smartCategoryMapping[smartCategory] || smartCategory;
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

  // Wishlist feature removed for now to resolve type/usage issues
  //   return (
  //     <div className="flex items-center gap-1">
  //       {[...Array(5)].map((_, i) => (
  //         <Star 
  //           key={i} 
  //           className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} 
  //         />
  //       ))}
  //       <span className="text-xs text-gray-400 ml-1">({rating.toFixed(1)})</span>
  //     </div>
  //   );
  // };

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
      const legacyCategory = getLegacyCategoryFilter(filters.category);
      filtered = filtered.filter(p => p.category === legacyCategory);
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

  // Rating renderer removed (unused)

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
    <>
      <SEO
        title="Shop - Industrial Machinery & Equipment | Almona Co."
        description="Browse our extensive catalog of industrial machinery, spare parts, and custom fabrications. YILMAZ authorized dealer in Egypt."
        url={`https://www.almona02.com${location.pathname}`}
        keywords="industrial machinery shop, YILMAZ machines, spare parts, custom fabrications"
      />
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section 
          className="relative bg-gradient-to-br from-almona-dark to-almona-darker py-16 overflow-hidden fade-in-up"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=2000')] opacity-10 mix-blend-overlay"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-gradient-orange">Industrial Equipment Hub</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Premium machinery, genuine parts, and expert support for Egypt&#39;s manufacturing industry
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
        </section>

        {/* Main Shop Content */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
            {/* Smart Category Navigation Sidebar */}
            <aside 
              className="w-full xl:w-80 xl:flex-shrink-0 fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              <SmartCategoryNavigation
                machines={enhancedProducts}
                selectedCategory={filters.category}
                onCategorySelect={(categoryId) => handleFilterChange('category', categoryId)}
                className="sticky top-24"
                showSearch={true}
                showRecommendations={true}
                showPopular={true}
                desktopMode="dropdown"
              />
              

              {/* Value Propositions */}
              <div className="mt-6 space-y-4">
                <Card className="bg-slate-800 border-slate-600 shadow-lg">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Truck className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium text-white">Free Shipping in Cairo</h4>
                      <p className="text-sm text-gray-300">On orders over 150,000 EGP</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-600 shadow-lg">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Shield className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium text-white">1-Year Warranty</h4>
                      <p className="text-sm text-gray-300">On all machinery</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-600 shadow-lg">
                  <CardContent className="p-4 flex items-center gap-3">
                    <RotateCcw className="h-6 w-6 text-almona-orange" />
                    <div>
                      <h4 className="font-medium text-white">24/7 Support</h4>
                      <p className="text-sm text-gray-300">quality guaranteed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb Navigation */}
              <div className="mb-6">
                <CategoryBreadcrumb
                  currentCategoryId={filters.category}
                  onCategorySelect={(categoryId) => handleFilterChange('category', categoryId)}
                  onHomeClick={() => handleFilterChange('category', 'all')}
                  className="text-sm"
                />
              </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductTab)}>
              {/* Header with tabs and controls */}
              <div 
                className="bg-almona-darker p-4 lg:p-6 rounded-lg border border-almona-light/20 mb-8 fade-in-up"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold">
                    {activeTab === 'industrial-machines' && 'Industrial Machinery'}
                    {activeTab === 'industrial-parts' && 'Spare Parts'}
                    {activeTab === 'egypt-standards' && 'Egyptian Standards'}
                    {activeTab === 'nile-logistics' && 'Logistics Services'}
                    {activeTab === 'local-support' && 'Technical Support'}
                  </h2>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
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
                      <SelectTrigger className="w-full sm:w-[180px] bg-almona-dark border-almona-light/30">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="featured" className="text-white hover:bg-slate-700">Featured</SelectItem>
                        <SelectItem value="newest" className="text-white hover:bg-slate-700">Newest</SelectItem>
                        <SelectItem value="price-low" className="text-white hover:bg-slate-700">Price: Low to High</SelectItem>
                        <SelectItem value="price-high" className="text-white hover:bg-slate-700">Price: High to Low</SelectItem>
                        <SelectItem value="rating" className="text-white hover:bg-slate-700">Top Rated</SelectItem>
                        <SelectItem value="name" className="text-white hover:bg-slate-700">Name A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search machinery, parts, accessories..."
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                      className="pl-10 bg-almona-dark border-almona-light/30"
                    />
                  </div>

                  <TabsList className="bg-almona-dark border border-almona-light/20 w-full lg:w-auto">
                    {menuData.map((menu) => (
                      <TabsTrigger key={menu.key} value={menu.key} className="flex items-center gap-2 flex-1 lg:flex-none">
                        {menu.icon}
                        <span className="hidden sm:inline">{menu.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              {productTabs.map(tab => (
                <TabsContent key={tab} value={tab}>
                  <ProductGrid
                    isLoading={isLoading}
                    filteredProducts={filteredProducts}
                    displayedProductCount={displayedProductCount}
                    setDisplayedProductCount={setDisplayedProductCount}
                    viewMode={viewMode}
                    setQuickViewProduct={setQuickViewProduct}
                    addToQuote={(product) => { void addToQuote(shopProductToDbProduct(product)); }}
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
        <Suspense fallback={null}>
          <AiEquipmentAdvisor open={advisorOpen} onOpenChange={setAdvisorOpen} />
        </Suspense>

        {/* Quick View Modal */}
        {quickViewProduct && (
          <ProductQuickView 
            product={toTypesMachine(quickViewProduct)}
            isOpen={!!quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
          />
        )}
      </main>
    </>
  );
};

export default Shop;
