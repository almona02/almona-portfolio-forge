import { Model3DDialog } from "@/components/3d-model/Model3DDialog";
import { EnhancedModel3DDialog } from "@/components/3d-model/EnhancedModel3DDialog";
import CompareBar from "@/components/comparison/CompareBar";
import CompareDialog from "@/components/comparison/CompareDialog";
import { VirtualizedMachineGrid } from "@/components/optimized/VirtualizedMachineGrid";
import { MobileOptimizedGrid } from "@/components/optimized/MobileOptimizedGrid";
import { MobileFilterPanel } from "@/components/optimized/MobileFilterPanel";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";
import { ProductQuickView } from "@/components/shop/ProductQuickView";
import MachineRecommendationWizard from "@/components/shop/machine-recommendation/MachineRecommendationWizard";
import SmartCategoryNavigation from "@/components/products/SmartCategoryNavigation";
import CategoryBreadcrumb from "@/components/products/CategoryBreadcrumb";
import { useVirtualizedMachines } from "@/hooks/useVirtualizedMachines";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/context/AuthContext";
import { loadComparisons, saveComparison } from "@/lib/comparisonStorage";
import { smartCategoryMapping } from "@/constants/smartCategories";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import ProductCard from "@/shared/ui/ui/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Separator } from "@/shared/ui/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import type { Machine as UiMachine } from "@/types/index";
import type { Machine } from "@/constants/yilmazMachines";

interface SourceMachineLike {
  id: string; name: string; description?: string; imageUrl?: string; image_url?: string;
  category?: string; releaseDate?: string; release_date?: string; type?: string; tags?: string[];
  certifications?: string[]; powerSpec?: { consumption?: string; voltage?: string; frequency?: string; phase?: string }; power?: string;
  dimensions?: { length?: string; width?: string; height?: string };
  safetyFeatures?: string[];
  specPdf?: string; youtubeUrl?: string; featured?: boolean;
  airSpec?: { consumption?: string; pressure?: string };
  modelPath?: string;
}
import { Eye, X } from "lucide-react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import React, { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import SEO from "@/components/SEO";
import { useScrollThreshold } from "@/hooks/useScrollThreshold";
import { debounce } from "@/lib/utils";

// UI wrapper union ensures compatibility with comparison + quote components expecting UiMachine shape
const mapToUiMachine = (m: SourceMachineLike): UiMachine => ({
  id: m.id,
  name: m.name,
  description: m.description || '',
  imageUrl: m.imageUrl || m.image_url || '',
  category: m.category || 'general',
  releaseDate: m.releaseDate || m.release_date || new Date().toISOString(),
  type: m.type || 'machine',
  tags: m.tags || [],
  certifications: m.certifications || [],
  powerSpec: {
    consumption: m.powerSpec?.consumption || m.power || '0 kW',
    voltage: m.powerSpec?.voltage || '380V',
    frequency: m.powerSpec?.frequency || '50Hz',
    phase: m.powerSpec?.phase || '3'
  },
  dimensions: m.dimensions || { length: '', width: '', height: '' },
  airSpec: m.airSpec || { consumption: '0 L/min', pressure: '0 bar' },
  safetyFeatures: (m.safetyFeatures || []).filter((s): s is 'TwoHandOperation' | 'AutomaticGuards' | 'EmergencyStop' =>
    ['TwoHandOperation','AutomaticGuards','EmergencyStop'].includes(s as 'TwoHandOperation' | 'AutomaticGuards' | 'EmergencyStop')
  ),
});

const Products = function ProductsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // SINGLE SOURCE OF TRUTH for filters
  const [filters, setFilters] = useState({
    searchTerm: searchParams.get('search') || "",
    category: "all",
    sortOption: "featured"
  });

  // Update search term when URL param changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setFilters(prev => {
      if (prev.searchTerm !== urlSearch) {
        return { ...prev, searchTerm: urlSearch };
      }
      return prev;
    });
  }, [searchParams]);

  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Machine | null>(null);
  const [show3DModel, setShow3DModel] = useState(false);
  const [selectedMachineFor3D, setSelectedMachineFor3D] = useState<Machine | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Machine | null>(null);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const scrolled = useScrollThreshold(48);

  // Debounced filter handler for search performance
  const debouncedSetFilters = useMemo(
    () => debounce((key: keyof typeof filters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, 300),
    []
  );

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string) => {
    // For search, use debounce; for others, update immediately
    if (key === 'searchTerm') {
      debouncedSetFilters(key, value);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  }, [debouncedSetFilters]);

  // Map smart category to legacy category for filtering
  const getLegacyCategoryFilter = useCallback((smartCategory: string) => {
    if (smartCategory === 'all') return 'all';
    return smartCategoryMapping[smartCategory] || smartCategory;
  }, []);

  // Use virtualized machines hook with consolidated filters
  const {
    machines: virtualizedMachines,
    totalCount,
    hasMore,
    loadMore,
    isLoading: isLoadingMore
  } = useVirtualizedMachines({
    searchTerm: filters.searchTerm,
    categoryFilter: getLegacyCategoryFilter(filters.category),
    sortOption: filters.sortOption,
    pageSize: 12
  });

  // Enhanced machines with 3D model flags
  const enhancedMachines = useMemo(() => {
    return virtualizedMachines.map(machine => ({
      ...machine,
      has3DModel: Boolean(machine.modelPath),
      modelPath: machine.modelPath
    }));
  }, [virtualizedMachines]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      category: "all",
      sortOption: "featured"
    });
  }, []);

  // Load saved comparisons on mount
  useEffect(() => {
    loadComparisons();
  }, []);

  // Listen for quick-view compare adds
  useEffect(() => {
    const handleAddToComparison = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const product = detail?.product as Machine | undefined;
      if (!product) return;
      setSelectedMachines((prev) => {
        if (prev.find((m) => m.id === product.id)) return prev;
        if (prev.length >= 5) {
          toast({
            title: "Maximum reached",
            description: "You can compare up to 5 machines at a time",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, product];
      });
    };
    window.addEventListener('addToComparison', handleAddToComparison as EventListener);
    return () => window.removeEventListener('addToComparison', handleAddToComparison as EventListener);
  }, [toast]);

  // Handle the custom event to open the 3D model dialog
  useEffect(() => {
    const handleOpen3DModel = (event: CustomEvent) => {
      const { machineId } = event.detail;
      const machine = enhancedMachines.find((m) => m.id === machineId);
      if (machine) {
        setSelectedMachineFor3D(machine);
        setShow3DModel(true);
      }
    };

    window.addEventListener("open3DModel", handleOpen3DModel as EventListener);

    return () => {
      window.removeEventListener(
        "open3DModel",
        handleOpen3DModel as EventListener
      );
    };
  }, [enhancedMachines]);

  const handleSelectMachine = (machine: Machine, selected: boolean) => {
    if (selected) {
      if (selectedMachines.length >= 5) {
        toast({
          title: "Maximum reached",
          description: "You can compare up to 5 machines at a time",
          variant: "destructive",
        });
        return;
      }
      setSelectedMachines((prev) => [...prev, machine]);
    } else {
      setSelectedMachines((prev) => prev.filter((m) => m.id !== machine.id));
    }
  };

  const handleRemoveMachine = (machineId: string) => {
    setSelectedMachines((prev) => prev.filter((m) => m.id !== machineId));
  };

  const handleClearSelection = () => {
    setSelectedMachines([]);
  };

  const handleSaveComparison = () => {
    saveComparison(selectedMachines);
    toast({
      title: "Comparison saved",
      description: "You can access this comparison later",
    });
  };

  useEffect(() => {
    document.title = "Products - ALMONA";
  }, []);

  const handleQuoteRequest = (machine: Machine) => {
    setSelectedProduct(machine);
    setShowQuoteDialog(true);
  };

  const handle3DView = (machine: Machine) => {
    setSelectedMachineFor3D(machine);
    setShow3DModel(true);
  };

  // Industry 4.0 Features
  const industry40Features = [
    {
      icon: "🤖",
      title: "AI-Powered Search",
      description: "Intelligent machine recommendations based on your requirements",
      color: "text-blue-400"
    },
    {
      icon: "📊",
      title: "Real-time Analytics",
      description: "Live performance monitoring and predictive maintenance",
      color: "text-green-400"
    },
    {
      icon: "🔗",
      title: "IoT Integration",
      description: "Connected machines with remote monitoring capabilities",
      color: "text-purple-400"
    },
    {
      icon: "⚡",
      title: "Smart Automation",
      description: "Automated workflows and production optimization",
      color: "text-orange-400"
    },
    {
      icon: "🌐",
      title: "Digital Twin",
      description: "Virtual machine models for simulation and testing",
      color: "text-cyan-400"
    },
    {
      icon: "🔒",
      title: "Blockchain Traceability",
      description: "Secure supply chain tracking and certification",
      color: "text-red-400"
    }
  ];

  // Customer testimonials
  const testimonials = [
    {
      name: "Ahmed Hassan",
      company: "Aluminum Solutions Ltd",
      role: "Operations Manager",
      content: "The YILMAZ machines have transformed our production efficiency. We've seen a 40% increase in output with the Industry 4.0 features.",
      rating: 5,
      avatar: "👨‍💼"
    },
    {
      name: "Sarah Johnson",
      company: "Modern Windows Co",
      role: "CEO",
      content: "Outstanding quality and support. The AI recommendations helped us choose exactly the right equipment for our needs.",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      name: "Mohammed Al-Rashid",
      company: "Gulf Manufacturing",
      role: "Technical Director",
      content: "The predictive maintenance features have saved us thousands in downtime costs. Highly recommended.",
      rating: 5,
      avatar: "👨‍🔧"
    }
  ];

  // Certifications
  const certifications = [
    { name: "ISO 9001", description: "Quality Management Systems" },
    { name: "CE Mark", description: "European Safety Standards" },
    { name: "Industry 4.0", description: "Smart Manufacturing Certified" },
    { name: "Energy Star", description: "Energy Efficiency" },
    { name: "RoHS", description: "Environmental Standards" },
    { name: "UL Listed", description: "Safety Certification" }
  ];

  // FAQ data
  const faqs = [
    {
      question: "What makes YILMAZ machines Industry 4.0 ready?",
      answer: "YILMAZ machines feature IoT connectivity, AI-powered diagnostics, predictive maintenance, and digital twin technology for optimal performance monitoring."
    },
    {
      question: "Do you provide installation and training?",
      answer: "Yes, we provide comprehensive installation services, operator training, and ongoing technical support to ensure smooth integration into your operations."
    },
    {
      question: "What is the warranty coverage?",
      answer: "All YILMAZ machines come with a comprehensive 1-year warranty covering parts and labor, with extended warranty options available."
    },
    {
      question: "Can I get a custom configuration?",
      answer: "Absolutely! We offer customization options to meet your specific production requirements and space constraints."
    }
  ];

  const location = useLocation();
  const currentUrl = `https://www.almona02.com${location.pathname}${location.search}`;

  return (
    <>
      <SEO
        title="YILMAZ Industrial Machinery - Products Catalog | Almona Co."
        description="Browse our complete catalog of YILMAZ industrial machinery including CNC machines, copy routers, and aluminum processing equipment. Industry 4.0 solutions for smart manufacturing."
        url={currentUrl}
        keywords="YILMAZ machines, CNC machines Egypt, industrial machinery, aluminum processing, PVC machines, copy routers"
      />
      <main className="flex-grow pt-24">
        {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "YILMAZ Industrial Machinery",
            "description": "Premium aluminum & PVC processing machines with Industry 4.0 capabilities",
            "brand": {
              "@type": "Brand",
              "name": "YILMAZ"
            },
            "manufacturer": {
              "@type": "Organization",
              "name": "YILMAZ Makina"
            },
            "offers": {
              "@type": "AggregateOffer",
              "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "150"
            }
          })
        }}
      />

      <div className="mx-auto px-4 xl:px-8 py-12 max-w-screen-2xl">
        {/* Industry 4.0 Hero Section */}
        <div className="mb-16 text-center relative overflow-hidden">
          <div
            className="relative z-10 fade-in-up"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gradient-orange">Industry 4.0</span>
              <br />
              <span className="text-white">Smart Manufacturing</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              Experience the future of industrial machinery with AI-powered recommendations,
              IoT connectivity, and digital twin technology. Transform your production
              with intelligent automation and predictive analytics.
            </p>

            {/* Industry 4.0 Feature Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 max-w-6xl mx-auto">
              {industry40Features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-all duration-300 hover:scale-105 fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`text-2xl mb-2 ${feature.color}`}>{feature.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-400 leading-tight">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => setWizardOpen(true)}
                aria-label="Open AI Machine Wizard"
                title="Open AI Machine Wizard"
                className="bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 text-lg font-semibold shadow-md hover:shadow-lg transition-colors"
              >
                🚀 AI Machine Wizard
              </Button>
              <Button
                onClick={() => setShowConfigurator(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ⚙️ Live Configurator
              </Button>
              <Button
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 px-8 py-3 text-lg font-semibold"
              >
                📊 View Analytics
              </Button>
            </div>
          </div>

          {/* Animated Background Elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl animate-bounce"></div>
          </div>
        </div>

        {/* Smart Manufacturing Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="text-center bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
            <div className="text-sm text-gray-300">Uptime</div>
          </div>
          <div className="text-center bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-green-400 mb-2">45%</div>
            <div className="text-sm text-gray-300">Energy Savings</div>
          </div>
          <div className="text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
            <div className="text-sm text-gray-300">Monitoring</div>
          </div>
          <div className="text-center bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-orange-400 mb-2">AI</div>
            <div className="text-sm text-gray-300">Powered</div>
          </div>
        </div>



        {/* Certifications */}
        <div
          className="mb-16 fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            <span className="text-gradient-orange">Certifications & Standards</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
              {certifications.map((cert, index) => (
              <div
                key={cert.name}
                className="bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-center hover:from-gray-700 hover:to-gray-600 transition-all duration-300 fade-in-up"
                style={{ animationDelay: `${0.6 + index * 0.05}s` }}
              >
                <div className="text-sm font-semibold text-white">{cert.name}</div>
                <div className="text-xs text-gray-400">{cert.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Products page content */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">
            <span className="text-gradient-orange">YILMAZ Machines</span>
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Premium aluminum & PVC processing machines from Turkey&apos;s leading
            manufacturer. Authorized dealer since 2000.
          </p>
        </div>

        <Tabs defaultValue="yilmaz" className="mb-8">
          {/* Category selection with adaptive gradient */}
          <TabsList className="grid w-full grid-cols-1 max-w-xs mx-auto rounded-md shadow-sm border border-gray-700 bg-[linear-gradient(135deg,rgba(0,0,0,0.85)_0%,rgba(30,30,30,0.85)_60%,rgba(55,55,55,0.75)_100%)] backdrop-blur">
            <TabsTrigger value="yilmaz">YILMAZ Machines</TabsTrigger>
          </TabsList>

          <TabsContent value="yilmaz">
            {/* Smart Category Navigation - Above grid for better visibility on large screens */}
            <div className="mb-6">
              <SmartCategoryNavigation
                machines={enhancedMachines}
                selectedCategory={filters.category}
                onCategorySelect={(category) => handleFilterChange('category', category)}
                onSearchChange={(search) => handleFilterChange('searchTerm', search)}
                onSearchResults={(results) => {
                  // The search results are already filtered by the SmartCategoryNavigation
                  // The onSearchChange will update the main search term for useVirtualizedMachines
                }}
                showSearch={true}
                showRecommendations={true}
                showPopular={true}
                desktopMode="dropdown"
              />
            </div>

            <div>
              {/* Breadcrumb Navigation */}
              <div className="mb-6">
                <CategoryBreadcrumb
                  currentCategoryId={filters.category}
                  onCategorySelect={(category) => handleFilterChange('category', category)}
                  onHomeClick={() => handleFilterChange('category', 'all')}
                  className="text-sm"
                />

                {/* Filter Status Bar */}
                {(filters.searchTerm || filters.category !== 'all' || enhancedMachines.length < totalCount) && (
                  <div className="flex items-center justify-between mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-300">
                      Showing {enhancedMachines.length} of {totalCount} machines
                      {(filters.searchTerm || filters.category !== 'all') && (
                        <span className="text-orange-400 ml-2">• Filtered</span>
                      )}
                    </div>
                    {(filters.searchTerm || filters.category !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Filter Panel */}
              <MobileFilterPanel
                searchTerm={filters.searchTerm}
                onSearchChange={(search) => handleFilterChange('searchTerm', search)}
                categoryFilter={filters.category}
                onCategoryChange={(category) => handleFilterChange('category', category)}
                sortOption={filters.sortOption}
                onSortChange={(sort) => handleFilterChange('sortOption', sort)}
                resultCount={enhancedMachines.length}
              />

              {/* Machine listings with responsive virtualization */}
              {enhancedMachines.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">
                    No machines found
                  </h3>
                  <p className="text-gray-400">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    className="mt-4 border border-almona-light hover:bg-almona-light/10"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile-optimized grid */}
                  <div className="lg:hidden">
                    <MobileOptimizedGrid
                      machines={enhancedMachines}
                      selectedMachines={selectedMachines}
                      onSelectMachine={handleSelectMachine}
                      onQuoteRequest={handleQuoteRequest}
                      on3DView={handle3DView}
                      onQuickPreview={(machine) => setQuickViewProduct(machine)}
                      hasMore={hasMore}
                      onLoadMore={loadMore}
                      isLoading={isLoadingMore}
                    />
                  </div>

                  {/* Desktop virtualized grid */}
                  <div className="hidden lg:block">
                    <VirtualizedMachineGrid
                      machines={enhancedMachines}
                      selectedMachines={selectedMachines}
                      onSelectMachine={handleSelectMachine}
                      onQuoteRequest={handleQuoteRequest}
                      on3DView={handle3DView}
                      onQuickPreview={(machine) => setQuickViewProduct(machine)}
                      hasMore={hasMore}
                      onLoadMore={loadMore}
                      isLoading={isLoadingMore}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

        </Tabs>

        <Separator className="my-12 bg-almona-light/20" />

        {/* Industry 4.0 Technology Showcase */}
        <div
          className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-lg p-8 mb-12 fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <h2 className="text-3xl font-bold mb-6 text-center">
            <span className="text-gradient-orange">Advanced Technology</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">AI Recommendations</h3>
              <p className="text-gray-400">
                Machine learning algorithms analyze your requirements to suggest the perfect equipment
                for your specific manufacturing needs.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-green-400">IoT Connectivity</h3>
              <p className="text-gray-400">
                Real-time monitoring and data collection from connected machines enables
                predictive maintenance and performance optimization.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-purple-400">Digital Twins</h3>
              <p className="text-gray-400">
                Virtual representations of physical machines allow for simulation,
                testing, and optimization before actual deployment.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div
          className="mb-12 fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="text-gradient-orange">Frequently Asked Questions</span>
          </h2>
          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6 hover:bg-gray-800/50 transition-all duration-300 fade-in-up"
                style={{ animationDelay: `${0.7 + index * 0.1}s` }}
              >
                <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div
          className="mb-12 bg-gradient-to-r from-orange-500/10 to-blue-500/10 border border-orange-500/20 rounded-lg p-8 text-center fade-in-up"
          style={{ animationDelay: '0.7s' }}
        >
          <h2 className="text-2xl font-bold mb-4">
            <span className="text-gradient-orange">Stay Updated</span>
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Get the latest Industry 4.0 insights, product updates, and exclusive offers
            delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
            <Button
              onClick={() => setShowNewsletter(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              Subscribe
            </Button>
          </div>
        </div>

        {/* Factory Prestige Card */}
        <div className="bg-almona-darker/60 border border-gray-800 rounded-xl p-6 sm:p-8 mb-12 fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient-orange">Why Choose YILMAZ Machines?</h2>
              <p className="text-gray-300 leading-relaxed">
                Precision-built in our state-of-the-art factory with Industry 4.0 standards, digital QA, and
                certified processes. See the production floor in action—exactly where your machines are born.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">Industry 4.0</Badge>
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">Digital QA</Badge>
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">CE Certified</Badge>
              </div>
              <div className="flex gap-3 pt-2">
                <Button asChild className="bg-gradient-orange hover:bg-orange-600 text-white">
                  <a href="https://youtu.be/Q0i1AOCOUgo?si=boDqL2T7eFgtny4w" target="_blank" rel="noreferrer">
                    Roll out a Visit
                  </a>
                </Button>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-xl border border-gray-800 bg-slate-900/40 aspect-video">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-blue-500/10 opacity-80 pointer-events-none" />
              {!isTourPlaying ? (
                <>
                  <img
                    src="/images/factory .png"
                    alt="YILMAZ Factory"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => setIsTourPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Play factory tour inline"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/65 border border-orange-400/50 text-white text-sm backdrop-blur">
                      <Eye className="h-4 w-4" />
                      Play Tour
                    </div>
                  </button>
                </>
              ) : (
                <div className="absolute inset-0">
                  <iframe
                    src="https://www.youtube.com/embed/Q0i1AOCOUgo?si=boDqL2T7eFgtny4w&autoplay=1&rel=0&modestbranding=1"
                    title="Factory tour video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => setIsTourPlaying(false)}
                    className="absolute top-3 right-3 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 text-slate-800 shadow-md shadow-black/20 ring-1 ring-white/70 hover:bg-white"
                    aria-label="Close factory tour video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-almona-darker/50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">
            Why Choose YILMAZ Machines?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  1
                </Badge>
                Premium Quality
              </h3>
              <p className="text-gray-400">
                Manufactured with high-grade materials and precision
                engineering for exceptional durability and performance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  2
                </Badge>
                Technical Support
              </h3>
              <p className="text-gray-400">
                Our expert team provides comprehensive installation,
                training and maintenance services.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  3
                </Badge>
                Genuine Parts
              </h3>
              <p className="text-gray-400">
                We supply original spare parts with warranty to ensure
                optimal machine performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick View Slide-out Panel */}
      {quickViewProduct && (
        <ProductQuickView
          product={mapToUiMachine(quickViewProduct)}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          position="right"
        />
      )}

      <CompareBar
        machines={selectedMachines}
        onRemove={handleRemoveMachine}
        onCompare={() => setShowCompareDialog(true)}
        onClear={handleClearSelection}
      />
      <CompareDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        machines={selectedMachines as unknown as UiMachine[]}
      />

      <Suspense fallback={null}>
        <QuoteRequestDialog
          open={showQuoteDialog}
          onOpenChange={setShowQuoteDialog}
          initialData={{
            products: selectedProduct ? [selectedProduct as unknown as UiMachine] : (selectedMachines as unknown as UiMachine[]),
            services: [],
            contactInfo: {},
          }}
        />
      </Suspense>

      {selectedMachineFor3D && (
        <EnhancedModel3DDialog
          isOpen={show3DModel}
          onClose={() => {
            setShow3DModel(false);
            // Clear selection after a brief delay to allow animation
            setTimeout(() => setSelectedMachineFor3D(null), 300);
          }}
          machineName={selectedMachineFor3D.name}
          modelPath={
            selectedMachineFor3D.modelPath ||
            "/models/demo-machine.glb"
          }
          machineData={{
            dimensions: selectedMachineFor3D.dimensions ? {
              length: selectedMachineFor3D.dimensions.length,
              width: selectedMachineFor3D.dimensions.width,
              height: selectedMachineFor3D.dimensions.height
            } : undefined,
            power: selectedMachineFor3D.powerSpec?.consumption,
            features: selectedMachineFor3D.tags
          }}
        />
      )}

      <MachineRecommendationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />

      {/* Live Configurator Modal Placeholder */}
      {showConfigurator && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in-up"
          onClick={() => setShowConfigurator(false)}
        >
          <div
            className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                <span className="text-gradient-orange">Live Machine Configurator</span>
              </h2>
              <p className="text-gray-300 mb-8">
                Customize your YILMAZ machine with our interactive configurator.
                Select options, view real-time pricing, and get instant quotes.
              </p>

              {/* Placeholder for configurator content */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">⚙️</div>
                  <p className="text-lg">Configurator Coming Soon</p>
                  <p className="text-sm mt-2">
                    We're working on an advanced interactive configurator that will allow you to
                    customize machines, view 3D models, and get real-time pricing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setShowConfigurator(false)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowConfigurator(false);
                    setWizardOpen(true);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  Try AI Wizard Instead
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </>
  );
};

export default withErrorBoundary(Products);
