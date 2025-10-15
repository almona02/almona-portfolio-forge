import { motion, AnimatePresence } from 'framer-motion';
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
import { Eye } from "lucide-react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import React, { useEffect, useState, Suspense, useCallback, useMemo } from "react";
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
  
  // SINGLE SOURCE OF TRUTH for filters
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "all",
    sortOption: "featured"
  });
  
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Machine | null>(null);
  const [show3DModel, setShow3DModel] = useState(false);
  const [selectedMachineFor3D, setSelectedMachineFor3D] = useState<Machine | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Machine | null>(null);
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
      has3DModel: Boolean(machine.modelPath) || machine.id === 'FR223',
      modelPath: machine.modelPath || (machine.id === 'FR223' ? '/models/FR223.glb' : undefined)
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


  return (
    <main className="flex-grow pt-24">
          <div className="mx-auto px-4 xl:px-8 py-12 max-w-screen-2xl">
            {/* Existing Products page content */}
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-bold mb-4">
                <span className="text-gradient-orange">YILMAZ Machines</span>
              </h1>
              <p className="text-gray-400 max-w-3xl mx-auto">
                Premium aluminum & PVC processing machines from Turkey&apos;s leading
                manufacturer. Authorized dealer since 2000.
              </p>
              <Button onClick={() => setWizardOpen(true)} className="mt-4">
                Machine Recommendation Wizard
              </Button>
            </div>

            <Tabs defaultValue="yilmaz" className="mb-8">
              {/* Category selection with adaptive gradient */}
              <TabsList className="grid w-full grid-cols-1 max-w-xs mx-auto rounded-md shadow-sm border border-gray-700 bg-[linear-gradient(135deg,rgba(0,0,0,0.85)_0%,rgba(30,30,30,0.85)_60%,rgba(55,55,55,0.75)_100%)] backdrop-blur">
                <TabsTrigger value="yilmaz">YILMAZ Machines</TabsTrigger>
              </TabsList>

              <TabsContent value="yilmaz">
                <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
                  {/* Smart Category Navigation Sidebar */}
                  <div className="w-full xl:w-80 xl:flex-shrink-0">
                    <SmartCategoryNavigation
                      machines={enhancedMachines}
                      selectedCategory={filters.category}
                      onCategorySelect={(category) => handleFilterChange('category', category)}
                      onSearchChange={(search) => handleFilterChange('searchTerm', search)}
                      onSearchResults={(results) => {
                        // The search results are already filtered by the SmartCategoryNavigation
                        // The onSearchChange will update the main search term for useVirtualizedMachines
                      }}
                      className="sticky top-24"
                      showSearch={true}
                      showRecommendations={true}
                      showPopular={true}
                      desktopMode="dropdown"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
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
                </div>
              </TabsContent>

            </Tabs>

            <Separator className="my-12 bg-almona-light/20" />

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
              onClose={() => setShow3DModel(false)}
              machineName={selectedMachineFor3D.name}
              modelPath={
                selectedMachineFor3D.modelPath ||
                "/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
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
    </main>
  );
};

const ProductsPage = withErrorBoundary(Products);
export default ProductsPage;
