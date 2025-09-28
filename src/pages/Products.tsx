import { Model3DDialog } from "@/components/3d-model/Model3DDialog";
import CompareBar from "@/components/comparison/CompareBar";
import CompareDialog from "@/components/comparison/CompareDialog";
import { VirtualizedMachineGrid } from "@/components/optimized/VirtualizedMachineGrid";
import { MobileOptimizedGrid } from "@/components/optimized/MobileOptimizedGrid";
import { MobileFilterPanel } from "@/components/optimized/MobileFilterPanel";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";
import MachineRecommendationWizard from "@/components/shop/machine-recommendation/MachineRecommendationWizard";
import { alfapenProfiles } from "@/constants/productsData";
import { useVirtualizedMachines } from "@/hooks/useVirtualizedMachines";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/context/AuthContext";
import { loadComparisons, saveComparison } from "@/lib/comparisonStorage";
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
}
import { Eye } from "lucide-react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import React, { useEffect, useState, Suspense } from "react";
import { useScrollThreshold } from "@/hooks/useScrollThreshold";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState("featured");
  
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Machine | null>(null);
  const [show3DModel, setShow3DModel] = useState(false);
  const [selectedMachineFor3D, setSelectedMachineFor3D] = useState<Machine | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const scrolled = useScrollThreshold(48);

  // Use virtualized machines hook for better performance
  const {
    machines: virtualizedMachines,
    totalCount,
    hasMore,
    loadMore,
    isLoading: isLoadingMore
  } = useVirtualizedMachines({
    searchTerm,
    categoryFilter,
    sortOption,
    pageSize: 12
  });

  // Load saved comparisons on mount
  useEffect(() => {
    loadComparisons();
  }, []);

  // Handle the custom event to open the 3D model dialog
  useEffect(() => {
    const handleOpen3DModel = (event: CustomEvent) => {
      const { machineId } = event.detail;
      const machine = virtualizedMachines.find((m) => m.id === machineId);
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
  }, [virtualizedMachines]);

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
          <div className="container mx-auto px-4 py-12">
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
              <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto rounded-md shadow-sm border border-gray-700 bg-[linear-gradient(135deg,rgba(0,0,0,0.85)_0%,rgba(30,30,30,0.85)_60%,rgba(55,55,55,0.75)_100%)] backdrop-blur">
                <TabsTrigger value="yilmaz">YILMAZ Machines</TabsTrigger>
                <TabsTrigger value="alfapen">ALFAPEN Profiles</TabsTrigger>
              </TabsList>

              <TabsContent value="yilmaz">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  <div className="lg:col-span-4">
                    {/* Mobile Filter Panel */}
                    <MobileFilterPanel
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      categoryFilter={categoryFilter}
                      onCategoryChange={setCategoryFilter}
                      sortOption={sortOption}
                      onSortChange={setSortOption}
                      resultCount={virtualizedMachines.length}
                    />

                    {/* Desktop Filter & sorting controls */}
                    <div className={`hidden lg:block sticky top-16 z-40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 rounded-md p-4 shadow-md border transition-colors ${scrolled ? 'border-orange-500/40 shadow-orange-500/10' : 'border-gray-800/70'} bg-[linear-gradient(145deg,rgba(0,0,0,0.92)_0%,rgba(18,18,18,0.92)_50%,rgba(32,32,32,0.88)_100%)] backdrop-blur`}> 
                      <div className="w-full md:w-1/2">
                        <Input
                          placeholder="Search machines..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-black/70 hover:bg-black/80 focus:bg-black/90 border-gray-600 focus:border-orange-500 placeholder:text-gray-400 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-[180px] bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/80 transition-colors">
                            <SelectValue placeholder="Filter by category" />
                          </SelectTrigger>
                          <SelectContent className="bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700">
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="cutting-machines">Cutting Machines</SelectItem>
                            <SelectItem value="welding-machines">Welding Machines</SelectItem>
                            <SelectItem value="processing-centers">Processing Centers</SelectItem>
                            <SelectItem value="milling-machines">Milling Machines</SelectItem>
                            <SelectItem value="cnc-machines">CNC Machines</SelectItem>
                            <SelectItem value="production-lines">Production Lines</SelectItem>
                            <SelectItem value="cleaning-machines">Cleaning Machines</SelectItem>
                            <SelectItem value="routing-machines">Routing Machines</SelectItem>
                            <SelectItem value="accessories">Accessories</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={sortOption} onValueChange={setSortOption}>
                          <SelectTrigger className="w-[180px] bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/80 transition-colors">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent className="bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700">
                            <SelectItem value="featured">Featured</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            <SelectItem value="newest">Newest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Machine listings with responsive virtualization */}
                    {virtualizedMachines.length === 0 ? (
                      <div className="text-center py-12">
                        <h3 className="text-xl font-medium mb-2">
                          No machines found
                        </h3>
                        <p className="text-gray-400">
                          Try adjusting your search or filter criteria
                        </p>
                        <Button
                          className="mt-4 border border-almona-light hover:bg-almona-light/10"
                          onClick={() => {
                            setSearchTerm("");
                            setCategoryFilter("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Mobile-optimized grid */}
                        <div className="lg:hidden">
                          <MobileOptimizedGrid
                            machines={virtualizedMachines}
                            selectedMachines={selectedMachines}
                            onSelectMachine={handleSelectMachine}
                            onQuoteRequest={handleQuoteRequest}
                            on3DView={handle3DView}
                            hasMore={hasMore}
                            onLoadMore={loadMore}
                            isLoading={isLoadingMore}
                          />
                        </div>
                        
                        {/* Desktop virtualized grid */}
                        <div className="hidden lg:block">
                          <VirtualizedMachineGrid
                            machines={virtualizedMachines}
                            selectedMachines={selectedMachines}
                            onSelectMachine={handleSelectMachine}
                            onQuoteRequest={handleQuoteRequest}
                            on3DView={handle3DView}
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

              <TabsContent value="alfapen">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {alfapenProfiles.map((profile) => (
                    <ProductCard
                      key={profile.id}
                      title={profile.name}
                      description={profile.description}
                      imageUrl={profile.imageUrl}
                      features={[
                        `Material: ${profile.material}`,
                        `Color: ${profile.color}`,
                        `Applications: ${profile.applications.join(", ")}`,
                      ]}
                      ctaText="View Details"
                      ctaLink={`/products/alfapen/${profile.id}`}
                    />
                  ))}
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
            <Model3DDialog
              isOpen={show3DModel}
              onClose={() => setShow3DModel(false)}
              machineName={selectedMachineFor3D.name}
              modelPath={
                selectedMachineFor3D.modelPath ||
                "/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
              }
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
