import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/shared/ui/ui/ProductCard";
import CompareBar from "@/components/comparison/CompareBar";
import CompareDialog from "@/components/comparison/CompareDialog";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";
import { Machine } from "@/types/index";
import { saveComparison, loadComparisons } from "@/lib/comparisonStorage";
import { useToast } from "@/hooks/useToast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Input } from "@/shared/ui/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Button } from "@/shared/ui/ui/button";
import { Separator } from "@/shared/ui/ui/separator";
import { Badge } from "@/shared/ui/ui/badge";
import { Eye } from "lucide-react";
import { yilmazMachines, alfapenProfiles } from "@/constants/productsData";
import { Model3DDialog } from "@/components/3d-model/Model3DDialog";

const Products = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState("featured");
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<Machine[][]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Machine | null>(null);

  // Load saved comparisons on mount
  useEffect(() => {
    const loaded = loadComparisons();
    setSavedComparisons(loaded);
  }, []);

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
      setSelectedMachines(prev => [...prev, machine]);
    } else {
      setSelectedMachines(prev => prev.filter(m => m.id !== machine.id));
    }
  };

  const handleRemoveMachine = (machineId: string) => {
    setSelectedMachines(prev => prev.filter(m => m.id !== machineId));
  };

  const handleClearSelection = () => {
    setSelectedMachines([]);
  };

  const handleSaveComparison = () => {
    saveComparison(selectedMachines);
    setSavedComparisons(prev => [...prev, selectedMachines]);
    toast({
      title: "Comparison saved",
      description: "You can access this comparison later",
    });
  };

  useEffect(() => {
    document.title = "Products - ALMONA";
  }, []);

  const filteredYilmazMachines = yilmazMachines.filter((machine) => {
    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || machine.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedYilmazMachines = [...filteredYilmazMachines].sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "newest":
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      case "featured":
      default:
        return a.featured ? -1 : b.featured ? 1 : 0;
    }
  });

  return (
    <>
      <div className="flex flex-col min-h-screen bg-almona-dark text-white">
        <Navbar />
        <main className="flex-grow pt-24">
          <div className="container mx-auto px-4 py-12">
            {/* Existing Products page content */}
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-bold mb-4">
                <span className="text-gradient-orange">YILMAZ Machines</span>
              </h1>
              <p className="text-gray-400 max-w-3xl mx-auto">
                Premium aluminum & PVC processing machines from Turkey's leading manufacturer.
                Authorized dealer since 2000.
              </p>
            </div>

            <Tabs defaultValue="yilmaz" className="mb-8">
              <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
                <TabsTrigger value="yilmaz">YILMAZ Machines</TabsTrigger>
                <TabsTrigger value="alfapen">ALFAPEN Profiles</TabsTrigger>
              </TabsList>
              
              <TabsContent value="yilmaz">
                {/* Machine filtering and sorting controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div className="w-full md:w-1/2">
                    <Input
                      placeholder="Search machines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-almona-darker border-almona-light"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger className="w-[180px] bg-almona-darker border-almona-light">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <Select
                      value={sortOption}
                      onValueChange={setSortOption}
                    >
                      <SelectTrigger className="w-[180px] bg-almona-darker border-almona-light">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Machine listings */}
                {filteredYilmazMachines.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-medium mb-2">No machines found</h3>
                    <p className="text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedYilmazMachines.map((machine) => (
                      <div key={machine.id} className="relative">
                        <ProductCard
                          isSelected={selectedMachines.some(m => m.id === machine.id)}
                          onSelect={(selected) => handleSelectMachine(machine, selected)}
                          title={machine.name}
                          description={machine.description}
                          imageUrl={machine.imageUrl}
                          features={[
                            `Type: ${machine.type}`,
                            `Power: ${machine.powerSpec.consumption}`,
                            `Dimensions: ${machine.dimensions.length} × ${machine.dimensions.width} × ${machine.dimensions.height}`,
                          ]}
                          tags={machine.tags}
                          ctaText="Request Quote"
                          onCtaClick={() => {
                            setSelectedProduct(machine);
                            setShowQuoteDialog(true);
                          }}
                          badge={machine.featured ? "Featured" : undefined}
                        />
                        {(machine.id === "ym-028" || 
                          machine.id === "ym-029" || 
                          machine.id === "ym-030" || 
                          machine.name.toLowerCase().includes("fr 223") ||
                          machine.name.toLowerCase().includes("fr223")) && (
                          <div className="absolute bottom-20 right-4 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const event = new CustomEvent('open3DModel', {
                                  detail: { machineId: machine.id, machineName: machine.name }
                                });
                                window.dispatchEvent(event);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              3D
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <h2 className="text-2xl font-bold mb-4">Why Choose YILMAZ Machines?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                    <Badge variant="outline" className="mr-2">1</Badge>
                    Premium Quality
                  </h3>
                  <p className="text-gray-400">
                    Manufactured with high-grade materials and precision engineering for
                    exceptional durability and performance.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                    <Badge variant="outline" className="mr-2">2</Badge>
                    Technical Support
                  </h3>
                  <p className="text-gray-400">
                    Our expert team provides comprehensive installation, training and
                    maintenance services.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gradient-orange">
                    <Badge variant="outline" className="mr-2">3</Badge>
                    Genuine Parts
                  </h3>
                  <p className="text-gray-400">
                    We supply original spare parts with warranty to ensure optimal machine
                    performance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <CompareBar
        machines={selectedMachines}
        onRemove={handleRemoveMachine}
        onCompare={() => setShowCompareDialog(true)}
        onClear={handleClearSelection}
        onExport={handleSaveComparison}
        onShare={() => {
          navigator.clipboard.writeText(
            `${window.location.origin}/compare?ids=${selectedMachines.map(m => m.id).join(',')}`
          );
          toast({
            title: "Link copied",
            description: "Share this link to compare these machines",
          });
        }}
      />

      <CompareDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        machines={selectedMachines}
      />

      <QuoteRequestDialog
        open={showQuoteDialog}
        onOpenChange={setShowQuoteDialog}
        initialData={{
          products: selectedProduct ? [selectedProduct] : selectedMachines,
          services: [],
          contactInfo: {}
        }}
      />
    </>
  );
};

export default Products;
