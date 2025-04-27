
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AboutSection = () => {
  return (
    <section className="py-20 bg-almona-dark-lighter">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              <span className="text-gradient-orange">ALMONA Co.</span> - Your Trusted Partner Since 1991
            </h2>
            <p className="text-gray-300 mb-6">
              With over three decades of experience in the machinery and profile industry, ALMONA has established itself as a leading provider of high-quality equipment and materials for aluminum and UPVC fabrication in Egypt.
            </p>
            <p className="text-gray-300 mb-6">
              As the first and authorized dealer of YILMAZ machines since 2000, we've built a reputation for excellence in both products and services. Our commitment to quality extends to our partnership with ALFAPEN profiles, ensuring our clients receive only the best materials for their projects.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-almona-dark p-4 rounded-lg border border-gray-800">
                <div className="text-almona-orange text-2xl font-bold">30+</div>
                <div className="text-gray-400">Years of Experience</div>
              </div>
              <div className="bg-almona-dark p-4 rounded-lg border border-gray-800">
                <div className="text-almona-orange text-2xl font-bold">1000+</div>
                <div className="text-gray-400">Projects Completed</div>
              </div>
              <div className="bg-almona-dark p-4 rounded-lg border border-gray-800">
                <div className="text-almona-orange text-2xl font-bold">500+</div>
                <div className="text-gray-400">Satisfied Clients</div>
              </div>
              <div className="bg-almona-dark p-4 rounded-lg border border-gray-800">
                <div className="text-almona-orange text-2xl font-bold">24/7</div>
                <div className="text-gray-400">Customer Support</div>
              </div>
            </div>
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
              <Link to="/about">
                Learn More About Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-almona-orange/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-almona-yellow/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-40 bg-almona-dark-light rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7" 
                    alt="ALMONA Workshop" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-64 bg-almona-dark-light rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
                    alt="ALMONA Team" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="h-64 bg-almona-dark-light rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475" 
                    alt="ALMONA Machines" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-40 bg-almona-dark-light rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1531297484001-80022131f5a1" 
                    alt="ALMONA Office" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
