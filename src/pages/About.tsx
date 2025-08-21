import { Link } from "react-router-dom";
import { CompanyTimeline } from "@/components/about/CompanyTimeline";
import { TeamProfiles } from "@/components/about/TeamProfiles";
import { CompanyValues } from "@/components/about/CompanyValues";
import { CustomerTestimonials } from "@/components/about/CustomerTestimonials";
import { Button } from "@/shared/ui/ui/button";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, Users, Globe, Award, Target, Shield } from 'lucide-react';

const About = () => {
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
    <div className="container py-8 px-4 sm:py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 sm:mb-16"
      >
        <Badge variant="secondary" className="mb-4 text-sm sm:text-lg py-1 px-3 sm:py-2 sm:px-4 bg-almona-orange/10 text-almona-orange border-almona-orange/30">
          Since 1991
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-gradient-orange">About Almona</h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto px-4">
          Pioneering industrial excellence in Egypt, Africa and the Middle East for over three decades
        </p>
      </motion.div>

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
  );
};

export default About;
