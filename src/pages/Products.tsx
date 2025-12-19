import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
// Lazy load heavy 3D components to reduce initial bundle size (~2.2MB saved)
const EnhancedModel3DDialog = React.lazy(() => import("@/components/3d-model/EnhancedModel3DDialog").then(module => ({ default: module.EnhancedModel3DDialog })));

import SEO from "@/components/SEO";
import CompareBar from "@/components/comparison/CompareBar";
import CompareDialog from "@/components/comparison/CompareDialog";
import { MobileFilterPanel } from "@/components/optimized/MobileFilterPanel";
import { MobileOptimizedGrid } from "@/components/optimized/MobileOptimizedGrid";
import { VirtualizedMachineGrid } from "@/components/optimized/VirtualizedMachineGrid";
import CategoryBreadcrumb from "@/components/products/CategoryBreadcrumb";
import SmartCategoryNavigation from "@/components/products/SmartCategoryNavigation";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";
import { ProductQuickView } from "@/components/shop/ProductQuickView";
import MachineRecommendationWizard from "@/components/shop/machine-recommendation/MachineRecommendationWizard";
import { smartCategoryMapping } from "@/constants/smartCategories";
import type { Machine } from "@/constants/yilmazMachines";
import { useAuth } from "@/context/AuthContext";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { useScrollThreshold } from "@/hooks/useScrollThreshold";
import { useToast } from "@/hooks/useToast";
import { useVirtualizedMachines } from "@/hooks/useVirtualizedMachines";
import { loadComparisons, saveComparison } from "@/lib/comparisonStorage";
import { debounce } from "@/lib/utils";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Separator } from "@/shared/ui/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import type { Machine as UiMachine } from "@/types/index";
import { Eye, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";

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
  const { t } = useTranslation('products');
  const { toast } = useToast();
  const { user: _user } = useAuth();
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
  const [_showNewsletter, setShowNewsletter] = useState(false);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const _scrolled = useScrollThreshold(48);

  // Debounced filter handler for search performance
  const debouncedSetFilters = useMemo(
    () => debounce((key: keyof typeof filters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      // Update URL parameter when search changes (debounced)
      if (key === 'searchTerm') {
        const newParams = new URLSearchParams(searchParams);
        if (value.trim()) {
          newParams.set('search', value.trim());
        } else {
          newParams.delete('search');
        }
        setSearchParams(newParams, { replace: true });
      }
    }, 300),
    [searchParams, setSearchParams]
  );

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string) => {
    // For search, use debounce (which will update URL); for others, update immediately
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
          title: t('comparison.maxReached'),
          description: t('comparison.maxReachedDescription'),
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

  const _handleSaveComparison = () => {
    saveComparison(selectedMachines);
    toast({
      title: t('comparison.saved'),
      description: t('comparison.savedDescription'),
    });
  };

  useEffect(() => {
    document.title = t('page.title');
  }, [t]);

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
      title: t('industry40.features.aiSearch.title'),
      description: t('industry40.features.aiSearch.description'),
      color: "text-blue-400"
    },
    {
      icon: "📊",
      title: t('industry40.features.analytics.title'),
      description: t('industry40.features.analytics.description'),
      color: "text-green-400"
    },
    {
      icon: "🔗",
      title: t('industry40.features.iot.title'),
      description: t('industry40.features.iot.description'),
      color: "text-purple-400"
    },
    {
      icon: "⚡",
      title: t('industry40.features.automation.title'),
      description: t('industry40.features.automation.description'),
      color: "text-orange-400"
    },
    {
      icon: "🌐",
      title: t('industry40.features.digitalTwin.title'),
      description: t('industry40.features.digitalTwin.description'),
      color: "text-cyan-400"
    },
    {
      icon: "🔒",
      title: t('industry40.features.blockchain.title'),
      description: t('industry40.features.blockchain.description'),
      color: "text-red-400"
    }
  ];

  // Customer testimonials
  const _testimonials = [
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
    { name: "ISO 9001", description: t('certifications.iso9001') },
    { name: "CE Mark", description: t('certifications.ceMark') },
    { name: "Industry 4.0", description: t('certifications.industry40') },
    { name: "Energy Star", description: t('certifications.energyStar') },
    { name: "RoHS", description: t('certifications.rohs') },
    { name: "UL Listed", description: t('certifications.ulListed') }
  ];

  // FAQ data
  const faqs = [
    {
      question: t('faq.industry40.question'),
      answer: t('faq.industry40.answer')
    },
    {
      question: t('faq.installation.question'),
      answer: t('faq.installation.answer')
    },
    {
      question: t('faq.warranty.question'),
      answer: t('faq.warranty.answer')
    },
    {
      question: t('faq.customization.question'),
      answer: t('faq.customization.answer')
    }
  ];

  const location = useLocation();
  const currentUrl = `https://www.almona02.com${location.pathname}${location.search}`;

  return (
    <>
      <SEO
        title={t('page.title')}
        description={t('page.description')}
        url={currentUrl}
        keywords={t('page.keywords')}
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
              <span className="text-gradient-orange">{t('hero.title')}</span>
              <br />
              <span className="text-white">{t('hero.subtitle')}</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              {t('hero.description')}
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
                aria-label={t('hero.aiWizard')}
                title={t('hero.aiWizard')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 text-lg font-semibold shadow-md hover:shadow-lg transition-colors"
              >
                {t('hero.aiWizard')}
              </Button>
              <Button
                onClick={() => setShowConfigurator(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {t('hero.liveConfigurator')}
              </Button>
              <Button
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 px-8 py-3 text-lg font-semibold"
              >
                {t('hero.viewAnalytics')}
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
            <div className="text-sm text-gray-300">{t('industry40.stats.uptime')}</div>
          </div>
          <div className="text-center bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-green-400 mb-2">45%</div>
            <div className="text-sm text-gray-300">{t('industry40.stats.energySavings')}</div>
          </div>
          <div className="text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
            <div className="text-sm text-gray-300">{t('industry40.stats.monitoring')}</div>
          </div>
          <div className="text-center bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-6">
            <div className="text-3xl font-bold text-orange-400 mb-2">AI</div>
            <div className="text-sm text-gray-300">{t('industry40.stats.powered')}</div>
          </div>
        </div>



        {/* Certifications */}
        <div
          className="mb-16 fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            <span className="text-gradient-orange">{t('certifications.title')}</span>
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
            <span className="text-gradient-orange">{t('machines.title')}</span>
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            {t('machines.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="yilmaz" className="mb-8">
          {/* Category selection with adaptive gradient */}
          <TabsList className="grid w-full grid-cols-1 max-w-xs mx-auto rounded-md shadow-sm border border-gray-700 bg-[linear-gradient(135deg,rgba(0,0,0,0.85)_0%,rgba(30,30,30,0.85)_60%,rgba(55,55,55,0.75)_100%)] backdrop-blur">
            <TabsTrigger value="yilmaz">{t('machines.tabs.yilmaz')}</TabsTrigger>
          </TabsList>

          <TabsContent value="yilmaz">
            {/* Smart Category Navigation - Above grid for better visibility on large screens */}
            <div className="mb-6">
              <SmartCategoryNavigation
                machines={enhancedMachines}
                selectedCategory={filters.category}
                onCategorySelect={(category) => handleFilterChange('category', category)}
                onSearchChange={(search) => handleFilterChange('searchTerm', search)}
                onSearchResults={(_results) => {
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
                      {t('machines.showing', { count: enhancedMachines.length, total: totalCount })}
                      {(filters.searchTerm || filters.category !== 'all') && (
                        <span className="text-orange-400 ml-2">{t('machines.filtered')}</span>
                      )}
                    </div>
                    {(filters.searchTerm || filters.category !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                      >
                        {t('machines.clearFilters')}
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
              {isLoadingMore ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">{t('machines.loading') || 'Loading machines...'}</p>
                </div>
              ) : enhancedMachines.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">
                    {t('machines.noMachines.title')}
                  </h3>
                  <p className="text-gray-400">
                    {t('machines.noMachines.description')}
                  </p>
                  <Button
                    className="mt-4 border border-almona-light hover:bg-almona-light/10"
                    onClick={handleClearFilters}
                  >
                    {t('machines.noMachines.clearFilters')}
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
            <span className="text-gradient-orange">{t('technology.title')}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">{t('technology.aiRecommendations.title')}</h3>
              <p className="text-gray-400">
                {t('technology.aiRecommendations.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-green-400">{t('technology.iotConnectivity.title')}</h3>
              <p className="text-gray-400">
                {t('technology.iotConnectivity.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-purple-400">{t('technology.digitalTwins.title')}</h3>
              <p className="text-gray-400">
                {t('technology.digitalTwins.description')}
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
            <span className="text-gradient-orange">{t('faq.title')}</span>
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
            <span className="text-gradient-orange">{t('newsletter.title')}</span>
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            {t('newsletter.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Input
              type="email"
              placeholder={t('newsletter.placeholder')}
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
            <Button
              onClick={() => setShowNewsletter(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {t('newsletter.subscribe')}
            </Button>
          </div>
        </div>

        {/* Factory Prestige Card */}
        <div className="bg-almona-darker/60 border border-gray-800 rounded-xl p-6 sm:p-8 mb-12 fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient-orange">{t('whyChoose.title')}</h2>
              <p className="text-gray-300 leading-relaxed">
                {t('whyChoose.description')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">{t('whyChoose.badges.industry40')}</Badge>
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">{t('whyChoose.badges.digitalQA')}</Badge>
                <Badge variant="outline" className="text-xs border-orange-400/60 text-orange-300">{t('whyChoose.badges.ceCertified')}</Badge>
              </div>
              <div className="flex gap-3 pt-2">
                <Button asChild className="bg-gradient-orange hover:bg-orange-600 text-white">
                  <a href="https://youtu.be/Q0i1AOCOUgo?si=boDqL2T7eFgtny4w" target="_blank" rel="noreferrer">
                    {t('whyChoose.factoryTour')}
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
            {t('whyChoose.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  1
                </Badge>
                {t('whyChoose.premiumQuality.title')}
              </h3>
              <p className="text-gray-400">
                {t('whyChoose.premiumQuality.description')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  2
                </Badge>
                {t('whyChoose.technicalSupport.title')}
              </h3>
              <p className="text-gray-400">
                {t('whyChoose.technicalSupport.description')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                <Badge variant="outline" className="mr-2">
                  3
                </Badge>
                {t('whyChoose.genuineParts.title')}
              </h3>
              <p className="text-gray-400">
                {t('whyChoose.genuineParts.description')}
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
        machines={selectedMachines.map(mapToUiMachine)}
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

      {/* Enhanced 3D Dialog - Lazy loaded to save 2.2MB on initial load */}
      {selectedMachineFor3D && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-white">Loading 3D Engine...</p>
            </div>
          </div>
        }>
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
        </Suspense>
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
                <span className="text-gradient-orange">{t('configurator.title')}</span>
              </h2>
              <p className="text-gray-300 mb-8">
                {t('configurator.description')}
              </p>

              {/* Placeholder for configurator content */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">⚙️</div>
                  <p className="text-lg">{t('configurator.comingSoon')}</p>
                  <p className="text-sm mt-2">
                    {t('configurator.comingSoonDescription')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setShowConfigurator(false)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {t('configurator.close')}
                </Button>
                <Button
                  onClick={() => {
                    setShowConfigurator(false);
                    setWizardOpen(true);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {t('configurator.tryWizard')}
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
