import { Link } from "react-router-dom";
import { CompanyTimeline } from "@/components/about/CompanyTimeline";
import { TeamProfiles } from "@/components/about/TeamProfiles";
import { CompanyValues } from "@/components/about/CompanyValues";
import { CustomerTestimonials } from "@/components/about/CustomerTestimonials";
import { Button } from "@/shared/ui/ui/button";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { Factory, Globe, Award, Target } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const About = () => {
  const isMobile = useIsMobile();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 }
    }
  };

  return (
    <>
      <main className="pt-24">
        {/* Epic Hero Section with Egyptian-Ottoman Industrial Background */}
        <section className="relative min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] overflow-hidden -mt-24 pt-24 mb-12 sm:mb-16">
          {/* Background Image */}
          <motion.div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/images/egyptian-industrial-hero-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: isMobile ? 0.4 : 0.5,
              willChange: 'opacity'
            }}
            animate={{
              opacity: isMobile ? [0.4, 0.45, 0.4] : [0.5, 0.55, 0.5]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Dark overlay for text readability */}
          <div 
            className="absolute inset-0 z-[5]"
            style={{
              background: `
                radial-gradient(ellipse at center, rgba(10, 10, 10, 0.85) 0%, rgba(10, 10, 10, 0.70) 50%, rgba(10, 10, 10, 0.90) 100%),
                linear-gradient(
                  to bottom,
                  rgba(10, 10, 10, 0.95) 0%,
                  rgba(10, 10, 10, 0.80) 50%,
                  rgba(10, 10, 10, 0.95) 100%
                )
              `
            }}
          />

          {/* Content */}
          <div className="relative z-[100] flex flex-col justify-center items-center min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Badge 
                  variant="secondary" 
                  className="mb-4 sm:mb-6 text-xs sm:text-sm md:text-base lg:text-lg py-2 px-4 sm:py-3 sm:px-6 bg-almona-orange/20 text-almona-yellow border-almona-orange/40 backdrop-blur-sm"
                  style={{
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(255, 193, 7, 0.5)',
                    fontWeight: 'bold'
                  }}
                >
                  Since 1991
                </Badge>
              </motion.div>
              
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                style={{
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 95, 31, 0.4)'
                }}
              >
                <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_3px_8px_rgba(255,95,31,0.6)]">
                  About Almona
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-3xl mx-auto px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 1)'
                }}
              >
                Pioneering industrial excellence in Egypt, Africa and the Middle East for over three decades
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Epic Egyptian-Ottoman Industrial Image Display */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 sm:mb-16 lg:mb-20"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-almona-orange/20"
            >
              {/* Image with elegant frame - Full image visible, no cropping */}
              <div className="relative w-full overflow-hidden bg-almona-dark" style={{ aspectRatio: '1536/2720' }}>
                <img
                  src="/images/egyptian-industrial-hero-bg.png"
                  alt="Cross-Empire Innovation: Egyptian Pharaoh and Ottoman Pasha overseeing YILMAZ industrial machinery"
                  className="w-full h-full object-contain object-center"
                  loading="lazy"
                />
                
                {/* Subtle overlay gradient for depth */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `
                      linear-gradient(
                        to bottom,
                        rgba(10, 10, 10, 0.1) 0%,
                        transparent 20%,
                        transparent 80%,
                        rgba(10, 10, 10, 0.1) 100%
                      )
                    `
                  }}
                />
              </div>
              
              {/* Decorative border glow */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
                boxShadow: 'inset 0 0 40px rgba(255, 95, 31, 0.1), 0 0 60px rgba(255, 95, 31, 0.15)'
              }} />
            </motion.div>
            
            {/* Caption */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-center mt-4 sm:mt-6 text-sm sm:text-base text-gray-400 italic max-w-3xl mx-auto"
            >
              Cross-Empire Innovation: Bridging legendary craftsmanship from ancient Egypt and the Ottoman Empire with modern YILMAZ industrial technology
            </motion.p>
          </div>
        </motion.section>

        <div className="container py-8 px-4 sm:py-12 sm:px-6">

      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 sm:mb-16 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="order-2 lg:order-1">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-white">Our Story</h2>
          <p className="text-base sm:text-lg mb-4 sm:mb-6 text-gray-300">
            Founded in 1991, Almona has grown from a humble equipment importer to a
            leading industrial equipment provider in Egypt, Africa and the
            Middle East.
          </p>
          <p className="text-base sm:text-lg mb-6 sm:mb-8 text-gray-300">
            We specialize in high-quality machinery for metal fabrication,
            plastic processing, and aluminum profile production, serving thousands
            of businesses across the region.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full sm:w-auto">
              <Link to="/contact" className="mt-4">
                Contact Our Team
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative order-1 lg:order-2">
          <div className="absolute inset-0 bg-gradient-to-r from-almona-orange/20 to-almona-light/20 rounded-2xl blur-xl"></div>
          <CompanyTimeline />
        </motion.div>
      </motion.div>

      <motion.div 
        className="bg-gradient-to-r from-almona-dark/60 to-almona-darker/60 p-6 sm:p-8 rounded-2xl border border-almona-light/20 mb-12 sm:mb-16 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            className="flex justify-center mb-4 sm:mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <Target className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-white">Our Mission</h2>
          <p className="text-lg sm:text-xl text-gray-300">
            To empower Egyptian manufacturers with world-class equipment, training, and support, 
            enabling them to compete effectively in global markets and drive industrial growth 
            across the region.
          </p>
        </div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <Factory className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Industrial Expertise</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <p className="text-sm sm:text-base text-gray-400">30+ years specializing in metal fabrication and processing equipment</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Regional Reach</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <p className="text-sm sm:text-base text-gray-400">Serving clients across Egypt, Africa, and the Middle East</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <Award className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Quality Assurance</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <p className="text-sm sm:text-base text-gray-400">Certified equipment with comprehensive warranty and support</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mb-12 sm:mb-16"
      >
        <TeamProfiles />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mb-12 sm:mb-16"
      >
        <CompanyValues />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mb-12 sm:mb-16"
      >
        <CustomerTestimonials />
      </motion.div>

      <motion.div 
        className="mt-16 sm:mt-20 bg-gradient-to-r from-almona-orange/10 to-almona-light/10 p-8 sm:p-12 rounded-2xl border border-almona-orange/30 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Ready to Transform Your Business?</h2>
        <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
          Join thousands of manufacturers who trust Almona for their industrial equipment needs
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full sm:w-auto px-8 py-3">
              <Link to="/products">Explore Our Products</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
            <Button asChild className="border-almona-light text-almona-light hover:bg-almona-light/10 w-full sm:w-auto px-8 py-3 bg-transparent border">
              <Link to="/contact">Request Consultation</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default withErrorBoundary(About);
