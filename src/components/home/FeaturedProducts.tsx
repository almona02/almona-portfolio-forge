
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "@/components/ui/ProductCard";
import { ArrowRight } from "lucide-react";

const FeaturedProducts = () => {
  const [activeTab, setActiveTab] = useState("machines");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const machineProducts = [
    {
      id: "m1",
      name: "NC300 Cutting Machine",
      brand: "YILMAZ",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500",
      description: "Precision cutting machine for aluminum profiles",
      category: "Cutting Machines",
      price: 12500,
      featured: true,
      path: "/products/machines/nc300"
    },
    {
      id: "m2",
      name: "FR221 Milling Machine",
      brand: "YILMAZ",
      imageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=500",
      description: "Advanced milling machine with digital control",
      category: "Milling Machines",
      price: 8900,
      featured: true,
      path: "/products/machines/fr221"
    },
    {
      id: "m3",
      name: "PVC400 Welder",
      brand: "YILMAZ",
      imageUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=500",
      description: "High-performance welding machine for PVC",
      category: "Welding Machines",
      price: 7500,
      featured: true,
      path: "/products/machines/pvc400"
    }
  ];

  const profileProducts = [
    {
      id: "p1",
      name: "Elegance 76 Series",
      brand: "ALFAPEN",
      imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=500",
      description: "Premium UPVC profiles with enhanced insulation",
      category: "UPVC Profiles",
      price: 45,
      featured: true,
      path: "/products/profiles/elegance76"
    },
    {
      id: "p2",
      name: "Thermal Break Series",
      brand: "ALFAPEN",
      imageUrl: "https://images.unsplash.com/photo-1487887235947-a955ef187fcc?auto=format&fit=crop&w=500",
      description: "Thermal break aluminum profiles for energy efficiency",
      category: "Aluminum Profiles",
      price: 65,
      featured: true,
      path: "/products/profiles/thermalbreak"
    },
    {
      id: "p3",
      name: "Sliding Series 60",
      brand: "ALFAPEN",
      imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=500",
      description: "Premium sliding door and window profiles",
      category: "Sliding Systems",
      price: 55,
      featured: true,
      path: "/products/profiles/sliding60"
    }
  ];

  return (
    <section className="py-20 bg-almona-dark">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-almona-orange font-medium">Our Products</span>
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
                <Link to="/products/machines">
                  View All Machines
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {profileProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
                <Link to="/products/profiles">
                  View All Profiles
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
