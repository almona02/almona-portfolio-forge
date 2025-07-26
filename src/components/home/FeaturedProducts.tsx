
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import ProductCard from "@/shared/ui/ui/ProductCard";
import { ArrowRight } from "lucide-react";
import { yilmazMachines } from "@/constants/yilmazMachines";
import { alfapenProfiles } from "@/constants/productsData";
import { useTranslation } from "@/hooks/useTranslation";
import { Machine, Profile } from "@/types";

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
    ctaText: t('common.actions.learnMore'),
    ctaLink: `/machines/${machine.id}`,
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
  const featuredProfiles = alfapenProfiles.slice(0, 3);
  
  const profileProducts = featuredProfiles.map((profile: Profile) => ({
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
    ctaText: t('common.actions.learnMore'),
    ctaLink: `/profiles/${profile.id}`,
    badge: profile.thermalProperties?.thermalBreak ? 'Thermal Break' : undefined,
    // Additional profile-specific data
    material: profile.material,
    applications: profile.applications,
    thermalProperties: profile.thermalProperties
  }));

  return (
    <section className="py-20 bg-almona-dark">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-almona-orange font-medium">{t('common.navigation.products')}</span>
          <h2 className="text-3xl font-bold mt-2 mb-4">
            Featured <span className="text-gradient-orange">Products</span>
          </h2>
          <p className="text-gray-400">
            Discover our selection of premium YILMAZ machines and ALFAPEN profiles, 
            designed to elevate your aluminum and UPVC fabrication projects.
          </p>
        </div>

        <Tabs defaultValue="machines" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-center mb-10">
            <TabsList className="bg-almona-dark-lighter">
              <TabsTrigger 
                value="machines" 
                className={`${activeTab === "machines" ? "text-white" : "text-gray-400"} px-6`}
              >
                YILMAZ Machines
              </TabsTrigger>
              <TabsTrigger 
                value="profiles" 
                className={`${activeTab === "profiles" ? "text-white" : "text-gray-400"} px-6`}
              >
                ALFAPEN Profiles
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="machines" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {machineProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
                <Link to="/shop">
                  {t('common.actions.viewMore')} Machines
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {profileProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
                <Link to="/shop">
                  {t('common.actions.viewMore')} Profiles
                  <ArrowRight className="ml-2 h-4 w-4" />
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
