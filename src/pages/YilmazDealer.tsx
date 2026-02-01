import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Check, Wrench, GraduationCap, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Link } from 'react-router-dom';

const YilmazDealer = () => {
  const benefits = [
    {
      icon: <Award className="w-8 h-8 text-amber-500" />,
      title: "Authorized Dealer",
      description: "Official distributor in Egypt since 2000. Full warranty and manufacturer backing guaranteed."
    },
    {
      icon: <Wrench className="w-8 h-8 text-blue-500" />,
      title: "Certified Service",
      description: "Factory-trained technicians for installation, maintenance, and repair of all Yilmaz machinery."
    },
    {
      icon: <GraduationCap className="w-8 h-8 status-valid" />,
      title: "Expert Training",
      description: "Comprehensive operator training to ensure maximum efficiency and safety in your workshop."
    },
    {
      icon: <Check className="w-8 h-8 text-purple-500" />,
      title: "Genuine Parts",
      description: "Direct access to original spare parts inventory in Cairo for minimal downtime."
    }
  ];

  const featuredMachines = [
    { name: "Yilmaz CNC Processing Center", image: "/images/machines/PIM-6509.jpg", link: "/products/machines/ym-007" },
    { name: "Double Head Cutting Machine", image: "/images/machines/DC-421-PBS.jpg", link: "/products/machines/ym-002" },
    { name: "Corner Cleaning Machine", image: "/images/machines/CNC-608.jpg", link: "/products/machines/ym-024" }
  ];

  return (
    <>
      <Helmet>
        <title>Yilmaz Machines Egypt | Authorized Dealer | ALMONA Co.</title>
        <meta name="description" content="ALMONA Co. is the official authorized dealer of Yilmaz industrial machinery in Egypt. We provide sales, service, installation, and training for aluminium and UPVC fabrication machines." />
        <meta name="keywords" content="Yilmaz Egypt, Yilmaz Authorized Dealer, Yilmaz Machines Cairo, Aluminium Machinery Egypt, UPVC Fabrication Machines, Yilmaz Service Egypt" />
        <link rel="canonical" href="https://almona.eg/yilmaz-machines-egypt" />
      </Helmet>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative bg-gray-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-gray-900" />
             {/* Placeholder for a background image of a machine or workshop */}
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="btn-primary">
                  Official Partner
                </span>
                <h1 className="typography-h1 md:text-6xl mb-6">
                  YILMAZ Machines Authorized Dealer in Egypt
                </h1>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  ALMONA Co. brings world-class Turkish engineering to Egyptian manufacturers. 
                  Get authentic machinery, expert local support, and comprehensive warranty services.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/products/machines">
                    <Button size="lg" className="btn-primary">
                      View Machine Catalog <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="mb-4">{benefit.icon}</div>
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Categories Preview */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="typography-h2 mb-4">Popular Yilmaz Machinery in Egypt</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                From high-speed CNC processing centers to precise cutting saws, we supply the full range of Yilmaz equipment tailored for the Egyptian market.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredMachines.map((machine, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-xl aspect-video bg-gray-200 dark:bg-gray-800"
                >
                   {/* Fallback for missing images would go here, using simple divs for now */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-800">
                    <img 
                      src={machine.image} 
                      alt={machine.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1f2937/orange?text=Yilmaz+Machine';
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="typography-h3 text-white mb-2">{machine.name}</h3>
                      <Link to={machine.link} className="text-amber-400 hover:text-amber-300 text-sm font-medium inline-flex items-center">
                        View Details <ArrowRight className="ml-1 w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link to="/products/machines">
                <Button variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-50">
                  Explore Full Catalog
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="btn-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="typography-h2 md:text-4xl mb-6">Ready to Upgrade Your Production?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              Join hundreds of Egyptian fabricators trusting ALMONA and Yilmaz for their manufacturing needs.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link to="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-amber-600 hover:bg-gray-100">
                  Request a Quote
                </Button>
              </Link>
              <Link to="/services/consulting">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                  Book a Consultation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default YilmazDealer;
