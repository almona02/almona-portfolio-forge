
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import ProductCard from "@/shared/ui/ui/ProductCard";
import { ArrowRight } from "lucide-react";
import { yilmazMachines } from "@/constants/yilmazMachines";
import { useTranslation } from "@/hooks/useTranslation";
import { Machine } from "@/types";

const FeaturedProducts = () => {
  const [activeTab, setActiveTab] = useState("machines");
  const { t } = useTranslation('common');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Get featured machines with proper typing
  const featuredMachines = yilmazMachines.filter(machine => machine.featured).slice(0, 3);
  
  const machineProducts = featuredMachines.map((machine: Machine) => ({
    id: machine.id,
    title: machine.name,
    description: machine.description,
    imageUrl: machine.imageUrl,
    features: machine.specifications.slice(0, 3),
    tags: machine.tags,
    badge: machine.certifications?.includes('CE') ? 'CE Certified' : undefined,
    specPdf: machine.specPdf,
    youtubeUrl: machine.youtubeUrl,
    // Additional machine-specific data
    powerSpec: machine.powerSpec,
    dimensions: machine.dimensions,
    category: machine.category,
    safetyFeatures: machine.safetyFeatures
  }));

  // Get featured profiles with proper typing
  const featuredProfiles: any[] = [];
  
  const profileProducts = featuredProfiles.map((profile: any) => ({
    id: profile.id,
    title: profile.name,
    description: profile.description,
    imageUrl: profile.imageUrl,
    features: [
      `Material: ${profile.material}`,
      `Color: ${profile.color}`,
      `Applications: ${profile.applications.join(', ')}`
    ],
    tags: [profile.material],
    badge: profile.thermalProperties?.thermalBreak ? 'Thermal Break' : undefined,
    // Additional profile-specific data
    material: profile.material,
    applications: profile.applications,
    thermalProperties: profile.thermalProperties
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
              <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5">
                <Link to="/shop" className="flex items-center gap-2 justify-center">
                  {t('common.actions.viewMore')} Machines
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
