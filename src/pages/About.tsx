import { Link, useLocation } from "react-router-dom";
import { CompanyTimeline } from "@/components/about/CompanyTimeline";
import { TeamProfiles } from "@/components/about/TeamProfiles";
import { CompanyValues } from "@/components/about/CompanyValues";
import { CustomerTestimonials } from "@/components/about/CustomerTestimonials";
import { Button } from "@/shared/ui/ui/button";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { Factory, Globe, Award, Target } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const About = () => {
  const isMobile = useIsMobile();

  const location = useLocation();
  const currentUrl = `https://www.almona02.com${location.pathname}`;

  return (
    <>
      <SEO
        title="About Us - Almona Co. | YILMAZ Authorized Dealer Egypt"
        description="Learn about Almona Co., the official YILMAZ authorized dealer in Egypt. Over 30 years of experience in industrial machinery and smart manufacturing solutions."
        url={currentUrl}
        keywords="Almona Co., YILMAZ dealer Egypt, industrial machinery Egypt, company history"
      />
      <main className="pt-24">
        {/* Epic Hero Section with Egyptian-Ottoman Industrial Background */}
        <section className="relative min-h-[45vh] sm:min-h-[55vh] md:min-h-[65vh] lg:min-h-[70vh] xl:min-h-[75vh] overflow-hidden -mt-24 pt-24 mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          {/* Background Image */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/images/egyptian-industrial-hero-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: isMobile ? 0.4 : 0.5,
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
          <div className="relative z-[100] flex flex-col justify-center items-center min-h-[45vh] sm:min-h-[55vh] md:min-h-[65vh] lg:min-h-[70vh] xl:min-h-[75vh] container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-12 lg:py-16">
            <div
              className="text-center max-w-4xl mx-auto w-full fade-in-up"
            >
              <div
                className="mb-3 sm:mb-4 md:mb-6 fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                <Badge 
                  variant="secondary" 
                  className="text-xs sm:text-sm md:text-base lg:text-lg py-1.5 px-3 sm:py-2 sm:px-4 md:py-2.5 md:px-5 lg:py-3 lg:px-6 bg-almona-orange/20 text-almona-yellow border-almona-orange/40 backdrop-blur-sm"
                  style={{
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(255, 193, 7, 0.5)',
                    fontWeight: 'bold'
                  }}
                >
                  Since 1991
                </Badge>
              </div>
              
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-5 lg:mb-6 text-white leading-tight px-2 fade-in-up"
                style={{
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 95, 31, 0.4)',
                  animationDelay: '0.3s'
                }}
              >
                <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_3px_8px_rgba(255,95,31,0.6)]">
                  About Almona
                </span>
              </h1>
              
              <p 
                className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white max-w-3xl mx-auto px-2 sm:px-4 leading-relaxed fade-in-up"
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 1)',
                  animationDelay: '0.4s'
                }}
              >
                Pioneering industrial excellence in Egypt, Africa and the Middle East for over three decades
              </p>
            </div>
          </div>
        </section>

        <div className="container py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-8 lg:px-12">

      {/* Epic Egyptian-Ottoman Industrial Image Display - Side by Side with Our Story */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 mb-8 sm:mb-10 md:mb-12 items-start lg:items-stretch fade-in-up"
      >
        {/* Image Display Section */}
        <div
          className="order-1 lg:order-2 flex flex-col fade-in-up"
        >
          <div
            className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-almona-orange/20 flex-1 fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            {/* Image with elegant frame - Responsive aspect ratio */}
            <div className="relative w-full overflow-hidden bg-almona-dark">
              <div className="relative w-full" style={{ 
                aspectRatio: isMobile ? '9/16' : '1536/2720',
                minHeight: isMobile ? '400px' : '500px'
              }}>
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
            </div>
            
            {/* Decorative border glow */}
            <div className="absolute inset-0 pointer-events-none rounded-xl sm:rounded-2xl" style={{
              boxShadow: 'inset 0 0 20px rgba(255, 95, 31, 0.1), 0 0 40px rgba(255, 95, 31, 0.15)'
            }} />
          </div>
          
          {/* Caption - Moved outside image container with proper spacing */}
          <p
            className="text-center mt-4 sm:mt-5 md:mt-6 mb-4 sm:mb-6 md:mb-8 lg:mb-0 text-xs sm:text-sm md:text-base text-gray-300 italic px-2 sm:px-4 leading-relaxed fade-in-up"
            style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', animationDelay: '0.4s' }}
          >
            Cross-Empire Innovation: Bridging legendary craftsmanship from ancient Egypt and the Ottoman Empire with modern YILMAZ industrial technology
          </p>
        </div>

        {/* Our Story Section */}
        <div className="order-2 lg:order-1 flex flex-col justify-center pt-0 lg:pt-0 fade-in-up">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4 md:mb-5 text-white leading-tight" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Our Story</h2>
          <p className="text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-5 text-gray-200 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>
            Founded in 1991, Almona has grown from a humble equipment importer to a
            leading industrial equipment provider in Egypt, Africa and the
            Middle East.
          </p>
          <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-5 md:mb-6 text-gray-200 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>
            We specialize in high-quality machinery for metal fabrication,
            plastic processing, and aluminum profile production, serving thousands
            of businesses across the region.
          </p>
          <div className="mt-4 sm:mt-5 md:mt-6 transition-transform hover:scale-105 active:scale-95">
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5 shadow-lg">
              <Link to="/contact">
                Contact Our Team
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Company Timeline Section - Full Width Below */}
      <div className="fade-in-up mb-6 sm:mb-8 md:mb-10">
        <div className="relative w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-almona-orange/20 to-almona-light/20 rounded-xl sm:rounded-2xl blur-xl -z-10"></div>
          <CompanyTimeline />
        </div>
      </div>

      <div 
        className="bg-gradient-to-r from-almona-dark/60 to-almona-darker/60 p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-almona-light/20 mb-6 sm:mb-8 md:mb-10 backdrop-blur-sm fade-in-up"
        style={{ animationDelay: '0.3s' }}
      >
        <div className="max-w-4xl mx-auto text-center px-2 sm:px-4">
          <div 
            className="flex justify-center mb-2 sm:mb-3 md:mb-4 fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <Target className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-almona-orange" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-3 md:mb-4 text-white leading-tight px-2" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Our Mission</h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 leading-relaxed px-2" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>
            To empower Egyptian manufacturers with world-class equipment, training, and support, 
            enabling them to compete effectively in global markets and drive industrial growth 
            across the region.
          </p>
        </div>
      </div>

      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10 fade-in-up"
      >
        <div className="fade-in-up">
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors p-4 sm:p-5 md:p-6">
            <CardHeader className="text-center pb-3 sm:pb-4 p-0">
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <Factory className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-base sm:text-lg md:text-xl leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)' }}>Industrial Expertise</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0 px-0 pb-0">
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>30+ years specializing in metal fabrication and processing equipment</p>
            </CardContent>
          </Card>
        </div>

        <div className="fade-in-up">
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors p-4 sm:p-5 md:p-6">
            <CardHeader className="text-center pb-3 sm:pb-4 p-0">
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <Globe className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-base sm:text-lg md:text-xl leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)' }}>Regional Reach</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0 px-0 pb-0">
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>Serving clients across Egypt, Africa, and the Middle East</p>
            </CardContent>
          </Card>
        </div>

        <div className="sm:col-span-2 lg:col-span-1 fade-in-up">
          <Card className="bg-almona-dark/60 border-almona-light/20 h-full backdrop-blur-sm hover:border-almona-orange/50 transition-colors p-4 sm:p-5 md:p-6">
            <CardHeader className="text-center pb-3 sm:pb-4 p-0">
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <Award className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-almona-orange" />
              </div>
              <CardTitle className="text-base sm:text-lg md:text-xl leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)' }}>Quality Assurance</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0 px-0 pb-0">
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>Certified equipment with comprehensive warranty and support</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fade-in-up mb-6 sm:mb-8 md:mb-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <TeamProfiles />
      </div>

      <div
        className="mb-6 sm:mb-8 md:mb-10 fade-in-up"
        style={{ animationDelay: '0.2s' }}
      >
        <CompanyValues />
      </div>

      {/* New Image Display Section */}
      <section
        className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 fade-in-up"
      >
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div
            className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-almona-orange/20 fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            {/* Image with elegant frame - Responsive aspect ratio */}
            <div className="relative w-full overflow-hidden bg-almona-dark">
              <div className="relative w-full" style={{ 
                aspectRatio: isMobile ? '16/9' : '16/9',
                maxHeight: isMobile ? '55vh' : '70vh'
              }}>
                <img
                  src="/images/about-page-image.png"
                  alt="Almona Industrial Excellence - Cross-Empire Innovation"
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
            </div>
            
            {/* Decorative border glow */}
            <div className="absolute inset-0 pointer-events-none rounded-xl sm:rounded-2xl" style={{
              boxShadow: 'inset 0 0 20px rgba(255, 95, 31, 0.1), 0 0 40px rgba(255, 95, 31, 0.15)'
            }} />
          </div>
        </div>
      </section>

      <div
        className="mb-6 sm:mb-8 md:mb-10 fade-in-up"
        style={{ animationDelay: '0.4s' }}
      >
        <CustomerTestimonials />
      </div>

      <div 
        className="mt-8 sm:mt-10 md:mt-12 bg-gradient-to-r from-almona-orange/10 to-almona-light/10 p-5 sm:p-6 md:p-8 lg:p-10 rounded-xl sm:rounded-2xl border border-almona-orange/30 text-center fade-in-up"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight px-2" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Ready to Transform Your Business?</h2>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-3 sm:mb-4 md:mb-6 max-w-2xl mx-auto px-2 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>
          Join thousands of manufacturers who trust Almona for their industrial equipment needs
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center px-2">
          <div className="w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
            <Button asChild className="bg-gradient-orange hover:bg-almona-orange-dark text-white w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base">
              <Link to="/products">Explore Our Products</Link>
            </Button>
          </div>
          <div className="w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
            <Button asChild className="border-almona-light text-almona-light hover:bg-almona-light/10 w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-transparent border text-sm sm:text-base">
              <Link to="/contact">Request Consultation</Link>
            </Button>
          </div>
        </div>
      </div>
        </div>
      </main>
    </>
  );
};

export default withErrorBoundary(About);
