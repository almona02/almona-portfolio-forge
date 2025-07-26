
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { NeonButton } from "@/shared/ui/ui/neon-button";
import ResponsiveImage from "@/shared/ui/ui/ResponsiveImage";

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  
  const slides = [
    {
      title: "YILMAZ Machines",
      subtitle: "Premium Quality Aluminium & PVC Processing Machines",
      description: "Authorized dealer in Egypt since 2000",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200",
      link: "/products/machines"
    },
    {
      title: "ALFAPEN Profiles",
      subtitle: "High-Performance UPVC Window & Door Systems",
      description: "Superior quality profiles for modern construction",
      image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200",
      link: "/products/profiles"
    },
    {
      title: "ALMONA Co.",
      subtitle: "Your Trusted Partner Since 1991",
      description: "Expert consultation, sales and service",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200",
      link: "/about"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleDotClick = (index: number) => {
    setActiveSlide(index);
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Background Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            activeSlide === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-almona-dark-dark/90 to-almona-dark-dark/50 z-10"></div>
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
            sizes="100vw"
            loading={index === activeSlide ? "eager" : "lazy"}
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 flex flex-col justify-center h-full px-4 sm:px-6 lg:px-8 container mx-auto">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`transition-all duration-700 ${
              activeSlide === index
                ? "opacity-100 transform translate-y-0"
                : "opacity-0 transform -translate-y-8 absolute"
            }`}
          >
            {activeSlide === index && (
              <div className="max-w-3xl">
                <span className="inline-block text-almona-yellow mb-3 text-sm font-medium uppercase tracking-wider animate-fade-in">
                  {slide.description}
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white animate-slide-in">
                  <span className="text-gradient-orange">{slide.title}</span>
                </h1>
                <h2 className="text-xl sm:text-2xl lg:text-3xl text-gray-200 mb-6 animate-slide-in" style={{animationDelay: "0.1s"}}>
                  {slide.subtitle}
                </h2>
                <div className="flex flex-wrap gap-4 animate-fade-in" style={{animationDelay: "0.3s"}}>
                  <NeonButton
                    variant="industrial"
                    glow="industrialGlow"
                    size="lg"
                    className="px-6 py-6"
                  >
                    <Link to={slide.link} className="flex items-center gap-2">
                      Explore {slide.title}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </NeonButton>
                  <NeonButton
                    variant="outline"
                    glow="subtle"
                    size="lg"
                    className="border-white/20 text-white"
                  >
                    <Link to="/contact" className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Contact Us
                    </Link>
                  </NeonButton>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Slide Navigation Dots */}
        <div className="absolute bottom-12 left-0 right-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-start space-x-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeSlide === index
                      ? "bg-almona-orange w-8"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
