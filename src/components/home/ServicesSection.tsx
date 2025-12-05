
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ServicesSection = () => {
  const services = [
    {
      title: "Machine Sales",
      description: "Full range of YILMAZ machines for aluminum and UPVC processing",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M2 9V5c0-1 .9-2 2-2h3.95c1 0 1.9.45 2.5 1.22L12 6l1.55-1.78c.6-.77 1.5-1.22 2.5-1.22H20c1 0 2 .9 2 2v4"></path>
          <path d="M2 12v3c0 1 .9 2 2 2h16c1 0 2-.9 2-2v-3"></path>
          <path d="M2 12h20"></path>
          <path d="M7 21v-6"></path>
          <path d="M17 21v-6"></path>
        </svg>
      ),
      path: "/services/sales"
    },
    {
      title: "Used Machines",
      description: "Verified B2B used-machine marketplace with logistics support.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect>
          <path d="M16 3v4"></path>
          <path d="M8 3v4"></path>
          <path d="M3 11h18"></path>
          <path d="M7 16h.01"></path>
          <path d="M11 16h.01"></path>
          <path d="M15 16h.01"></path>
        </svg>
      ),
      path: "/usedmachines"
    },
    {
      title: "Maintenance & Support",
      description: "Expert maintenance and technical support for all machinery",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      ),
      path: "/services"
    },
    {
      title: "Spare Parts",
      description: "Genuine spare parts and accessories for all machines",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
          <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      ),
      path: "/services/spare-parts"
    },
    {
      title: "Technical Training",
      description: "Comprehensive training programs for machine operation",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M18 8a6 6 0 0 0-6-6"></path>
          <path d="M6 8a6 6 0 0 1 6-6"></path>
          <circle cx="12" cy="8" r="7"></circle>
          <path d="M8 22v-4"></path>
          <path d="M16 22v-4"></path>
          <path d="M8 18h8"></path>
        </svg>
      ),
      path: "/services/training"
    },
    {
      title: "Remnant Marketplace",
      description: "B2B remnant exchange with verification, pricing, and logistics baked in.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M3 3v5h5"></path>
          <path d="M21 21v-5h-5"></path>
          <path d="M3 21v-5h5"></path>
          <path d="M21 3v5h-5"></path>
          <rect x="7" y="7" width="10" height="10" rx="2"></rect>
        </svg>
      ),
      path: "/fabricator"
    },
    {
      title: "Analytics & Optimization",
      description: "Waste reduction (15–30%), OEE dashboards, and AI advisory for jobs.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <path d="M3 3v18h18"></path>
          <path d="M7 14l3-3 2 2 5-5"></path>
          <circle cx="7" cy="14" r="1"></circle>
          <circle cx="10" cy="11" r="1"></circle>
          <circle cx="12" cy="13" r="1"></circle>
          <circle cx="17" cy="8" r="1"></circle>
        </svg>
      ),
      path: "/fabricator"
    }
  ];

  return (
    <section className="py-10 sm:py-12 md:py-16 lg:py-20 bg-gradient-dark">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <span className="text-almona-orange font-medium text-xs sm:text-sm md:text-base opacity-90 sm:opacity-100">What We Offer</span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-2 mb-2 sm:mb-3 md:mb-4 leading-tight px-2">
            Comprehensive <span className="text-gradient-orange">Services</span> for Your Business
          </h2>
          <p className="text-gray-400/90 sm:text-gray-400 text-xs sm:text-sm md:text-base px-3 sm:px-4">
            From sales and maintenance to training and customization, we provide end-to-end solutions for aluminum and UPVC fabricators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Link 
              to={service.path} 
              key={index} 
              className="bg-almona-dark-lighter p-3 sm:p-4 md:p-6 rounded-lg border border-gray-800/80 sm:border-gray-800 hover:border-almona-orange/30 transition-all hover:shadow-lg hover:shadow-almona-orange/5 group opacity-95 sm:opacity-100"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-almona-orange/10 flex items-center justify-center rounded-lg mb-2 sm:mb-3 md:mb-4 group-hover:bg-almona-orange/20 transition-colors">
                {service.icon}
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-1.5 sm:mb-2 group-hover:text-almona-orange transition-colors leading-tight">
                {service.title}
              </h3>
              <p className="text-gray-400/90 sm:text-gray-400 mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base leading-relaxed">
                {service.description}
              </p>
              <div className="flex items-center text-almona-orange font-medium text-xs sm:text-sm">
                <span>Learn More</span>
                <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 md:mt-12 text-center">
          <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5">
            <Link to="/services" className="flex items-center gap-2 justify-center">
              View All Services
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
