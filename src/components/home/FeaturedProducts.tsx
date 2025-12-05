
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import ProductCard from "@/shared/ui/ui/ProductCard";
import { ArrowRight, Box } from "lucide-react";
import { yilmazMachines } from "@/constants/yilmazMachines";
import { useTranslation } from "@/hooks/useTranslation";
import { Machine } from "@/types";

const FeaturedProducts = () => {
  const [activeTab, setActiveTab] = useState("machines");
  const { t } = useTranslation('common');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Curated feature order
  const curatedNames = ["ALM 6510", "NCR 300", "CDC 600", "AIM 3410", "DC-421-PBS", "KP 180"];

  const fallbackMachine: Machine = {
    id: "aim-3410",
    name: "AIM 3410",
    description: "Aluminium profile machining center with multi-axis precision and CNC-controlled operations.",
    imageUrl: "/placeholder.svg",
    category: "processing-centers",
    featured: true,
    specifications: [
      "Multi-axis CNC machining for aluminium profiles",
      "Precision drilling, milling, and cutting in one pass",
      "Servo-controlled positioning with automatic clamping"
    ],
    tags: ["CNC", "Aluminium", "Machining Center"],
  } as Machine;

  const kpFallback: Machine = {
    id: "kp-180",
    name: "KP 180",
    description: "High-precision cutting / machining unit for aluminum profiles, built for reliable daily production.",
    imageUrl: "/placeholder.svg",
    category: "processing-centers",
    featured: true,
    specifications: [
      "Precision cutting and drilling for aluminum profiles",
      "Servo positioning with automatic clamping",
      "Optimized for fast changeovers in workshop environments"
    ],
    tags: ["Aluminium", "Machining"],
  } as Machine;

  const findMachine = (name: string) => yilmazMachines.find(m => m.name.toLowerCase() === name.toLowerCase());

  const curatedMachines = curatedNames
    .map((name) => {
      if (name === "AIM 3410") return findMachine(name) ?? fallbackMachine;
      if (name === "KP 180") return findMachine(name) ?? kpFallback;
      return findMachine(name) ?? null;
    })
    .filter(Boolean) as Machine[];

  const machineProducts = curatedMachines.map((machine: Machine) => ({
    id: machine.id,
    title: machine.name,
    description: machine.description,
    imageUrl: machine.imageUrl,
    features: machine.specifications?.slice(0, 3) ?? [],
    tags: machine.tags,
    badge: machine.certifications?.includes('CE') ? 'CE Certified' : undefined,
    specPdf: machine.specPdf,
    youtubeUrl: machine.youtubeUrl,
    powerSpec: machine.powerSpec,
    dimensions: machine.dimensions,
    category: machine.category,
    safetyFeatures: machine.safetyFeatures
  }));

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-almona-dark">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12">
          <span className="text-almona-orange font-medium text-xs sm:text-sm md:text-base opacity-90 sm:opacity-100">{t('common.navigation.products')}</span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-2 mb-2 sm:mb-3 md:mb-4 leading-tight px-2">
            Featured <span className="text-gradient-orange">Products</span>
          </h2>
          <p className="text-gray-400/90 sm:text-gray-400 text-xs sm:text-sm md:text-base px-3 sm:px-4">
            Discover our selection of premium YILMAZ machines, 
            designed to elevate your aluminum and UPVC fabrication projects.
          </p>
        </div>

        <Tabs defaultValue="machines" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-10">
            <TabsList className="bg-almona-dark-lighter">
              <TabsTrigger 
                value="machines" 
                className={`${activeTab === "machines" ? "text-white" : "text-gray-400"} px-4 sm:px-5 md:px-6 text-xs sm:text-sm md:text-base`}
              >
                YILMAZ Machines
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="machines" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              {machineProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            <div className="mt-8 sm:mt-10 md:mt-12 text-center">
              <Button
                asChild
                className="bg-gradient-orange hover:bg-almona-orange-dark text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5"
              >
                <Link
                  to="/products/3d-gallery#swiftxr"
                  className="flex items-center gap-2 justify-center"
                  aria-label="Open SwiftXR AR experience"
                >
                  <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                  TRY Me (AR)
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </section>
  );
};

export default FeaturedProducts;
