
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import ProductCard from "@/shared/ui/ui/ProductCard";
import { ArrowRight, Box } from "lucide-react";
import { yilmazMachines } from "@/constants/yilmazMachines";
import { useTranslation } from "react-i18next";
import { Machine } from "@/types";

const FeaturedProducts = () => {
  const [activeTab, setActiveTab] = useState("machines");
  const { t } = useTranslation('home');

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
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12">
          <span className="text-amber-400 font-medium text-xs sm:text-sm md:text-base opacity-90 sm:opacity-100">{t('featured_products.badge')}</span>
          <h2 className="typography-h2 text-xl sm:text-2xl md:text-3xl lg:text-4xl mt-2 mb-2 sm:mb-3 md:mb-4 leading-tight px-2">
            {t('featured_products.title_prefix')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400">{t('featured_products.title_highlight')}</span>
          </h2>
          <p className="text-gray-400/90 sm:text-gray-400 text-xs sm:text-sm md:text-base px-3 sm:px-4">
            {t('featured_products.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="machines" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-10">
            <TabsList className="bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm">
              <TabsTrigger 
                value="machines" 
                className={`${activeTab === "machines" ? "text-white" : "text-gray-400"} px-4 sm:px-5 md:px-6 text-xs sm:text-sm md:text-base`}
              >
                {t('featured_products.tabs.machines')}
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
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300"
              >
                <Link
                  to="/products/3d-gallery#swiftxr"
                  className="flex items-center gap-2 justify-center"
                  aria-label="Open SwiftXR AR experience"
                >
                  <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('featured_products.cta')}
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
