
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AboutSection = () => {
  const navigate = useNavigate();

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate("/about");
    // Scroll to top after navigation
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-12 md:py-16 lg:py-20 bg-almona-dark-lighter">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
              <span className="text-gradient-orange">ALMONA Co.</span> - Your Trusted Partner Since 1991
            </h2>
            <p className="text-gray-300/90 sm:text-gray-300 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base leading-relaxed">
              With over three decades of experience in the machinery and profile industry, ALMONA has established itself as a leading provider of high-quality equipment and materials for aluminum and UPVC fabrication in Egypt.
            </p>
            <p className="text-gray-300/90 sm:text-gray-300 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base leading-relaxed">
              As the first and authorized dealer of YILMAZ machines since 2000, we&apos;ve built a reputation for excellence in both products and services. Our commitment to quality ensures our clients receive only the best materials for their projects.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="bg-almona-dark p-2.5 sm:p-3 md:p-4 rounded-lg border border-gray-800/80 sm:border-gray-800">
                <div className="text-almona-orange text-lg sm:text-xl md:text-2xl font-bold">30+</div>
                <div className="text-gray-400/90 sm:text-gray-400 text-[10px] sm:text-xs md:text-sm">Years of Experience</div>
              </div>
              <div className="bg-almona-dark p-2.5 sm:p-3 md:p-4 rounded-lg border border-gray-800/80 sm:border-gray-800">
                <div className="text-almona-orange text-lg sm:text-xl md:text-2xl font-bold">1000+</div>
                <div className="text-gray-400/90 sm:text-gray-400 text-[10px] sm:text-xs md:text-sm">Projects Completed</div>
              </div>
              <div className="bg-almona-dark p-2.5 sm:p-3 md:p-4 rounded-lg border border-gray-800/80 sm:border-gray-800">
                <div className="text-almona-orange text-lg sm:text-xl md:text-2xl font-bold">500+</div>
                <div className="text-gray-400/90 sm:text-gray-400 text-[10px] sm:text-xs md:text-sm">Satisfied Clients</div>
              </div>
              <div className="bg-almona-dark p-2.5 sm:p-3 md:p-4 rounded-lg border border-gray-800/80 sm:border-gray-800">
                <div className="text-almona-orange text-lg sm:text-xl md:text-2xl font-bold">24/7</div>
                <div className="text-gray-400/90 sm:text-gray-400 text-[10px] sm:text-xs md:text-sm">Customer Support</div>
              </div>
            </div>
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5">
              <Link to="/about" onClick={handleAboutClick} className="flex items-center gap-2">
                Learn More About Us
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="relative mt-6 lg:mt-0">
            <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-16 h-16 sm:w-20 sm:h-24 bg-almona-orange/15 sm:bg-almona-orange/20 rounded-full blur-xl sm:blur-2xl"></div>
            <div className="absolute -bottom-6 -right-6 sm:-bottom-10 sm:-right-10 w-20 h-20 sm:w-28 sm:h-32 bg-almona-yellow/15 sm:bg-almona-yellow/20 rounded-full blur-2xl sm:blur-3xl"></div>
            <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                <div className="h-32 sm:h-36 md:h-40 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <img 
                    src="/images/hero01 (1).png" 
                    alt="ALMONA Workshop" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="h-48 sm:h-56 md:h-64 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <img 
                    src="/images/hero01 (2).png" 
                    alt="ALMONA Team" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3 md:space-y-4 mt-4 sm:mt-6 md:mt-8">
                <div className="h-48 sm:h-56 md:h-64 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <img 
                    src="/images/hero01 (3).png" 
                    alt="ALMONA Machines" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="h-32 sm:h-36 md:h-40 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <img 
                    src="/images/hero01 (4).png" 
                    alt="ALMONA Office" 
                    className="w-full h-full object-cover"
                    loading="lazy"
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
