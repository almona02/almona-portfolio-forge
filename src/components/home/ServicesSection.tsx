
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
      description: "Browse and sell used aluminum and UPVC machines",
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
      path: "/services/maintenance"
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
      title: "Profile Fabrication",
      description: "Custom ALFAPEN profile fabrication for your specific needs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
      ),
      path: "/services/fabrication"
    },
    {
      title: "Consulting",
      description: "Expert advice on machinery selection and workshop setup",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-almona-orange">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      path: "/services/consulting"
    }
  ];

  return (
    <section className="py-20 bg-gradient-dark">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-almona-orange font-medium">What We Offer</span>
          <h2 className="text-3xl font-bold mt-2 mb-4">
            Comprehensive <span className="text-gradient-orange">Services</span> for Your Business
          </h2>
          <p className="text-gray-400">
            From sales and maintenance to training and customization, we provide end-to-end solutions for aluminum and UPVC fabricators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Link 
              to={service.path} 
              key={index} 
              className="bg-almona-dark-lighter p-6 rounded-lg border border-gray-800 hover:border-almona-orange/30 transition-all hover:shadow-lg hover:shadow-almona-orange/5 group"
            >
              <div className="w-12 h-12 bg-almona-orange/10 flex items-center justify-center rounded-lg mb-4 group-hover:bg-almona-orange/20 transition-colors">
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-almona-orange transition-colors">
                {service.title}
              </h3>
              <p className="text-gray-400 mb-4">
                {service.description}
              </p>
              <div className="flex items-center text-almona-orange font-medium">
                <span>Learn More</span>
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
            <Link to="/services">
              View All Services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
