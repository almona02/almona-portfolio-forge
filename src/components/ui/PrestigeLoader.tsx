import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
// Temporarily using regular Framer Motion for PrestigeLoader to debug error
// TODO: Revert to LazyMotion after fixing the issue
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { 
  Factory, 
  Cpu, 
  Network, 
  Database, 
  Cloud, 
  TrendingUp
} from 'lucide-react';

interface PrestigeLoaderProps {
  children: React.ReactNode;
}

export const PrestigeLoader: React.FC<PrestigeLoaderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Industry 4.0 Platform...');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [showIndustryIcons, setShowIndustryIcons] = useState(false);

  useEffect(() => {
    const loadingSteps = [
      { progress: 10, message: 'Initializing IoT Networks...', stage: 0 },
      { progress: 20, message: 'Connecting Smart Factories...', stage: 1 },
      { progress: 35, message: 'Loading AI Systems...', stage: 2 },
      { progress: 50, message: 'Synchronizing Data Analytics...', stage: 3 },
      { progress: 65, message: 'Activating Digital Twins...', stage: 4 },
      { progress: 80, message: 'Optimizing Production Lines...', stage: 5 },
      { progress: 95, message: 'Finalizing Industry 4.0 Setup...', stage: 6 },
      { progress: 100, message: 'Welcome to Almona Forge', stage: 7 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingProgress(step.progress);
        setLoadingMessage(step.message);
        setCurrentStage(step.stage);
        
        // Show industry icons after first few steps
        if (step.stage >= 2) {
          setShowIndustryIcons(true);
        }
        
        // Show welcome text when we reach 100%
        if (step.progress === 100) {
          setShowWelcome(true);
          setShowParticles(true);
        }
        
        currentStep++;
      } else {
        clearInterval(interval);
        // Add a delay to show the welcome message
        setTimeout(() => {
          setIsLoaded(true);
        }, 3000);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  if (!isLoaded) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
            50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6), 0 0 60px rgba(249, 115, 22, 0.4); }
          }
        `}</style>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#0a0a0a] overflow-hidden" style={{ minHeight: '-webkit-fill-available' }}>
          {/* Ancient Pattern Background - Hieroglyphic-inspired grid */}
          <div className="absolute inset-0 opacity-[0.03] sm:opacity-[0.05]">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(217, 119, 6, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(217, 119, 6, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}></div>
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(245, 158, 11, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }}></div>
            {/* Ancient decorative pattern overlay */}
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(217, 119, 6, 0.1) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
        {/* Animated background particles - Reduced count on mobile */}
        <div className="absolute inset-0">
          {showParticles && (
            <>
              {/* Mobile: 15 particles, Desktop: 30 particles */}
              <div className="block sm:hidden">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={`large-mobile-${i}`}
                    className="absolute w-2 h-2 bg-gradient-to-r from-amber-300/60 to-amber-400/60 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${3 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              <div className="hidden sm:block">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`large-desktop-${i}`}
                    className="absolute w-2 h-2 bg-gradient-to-r from-amber-300/60 to-amber-400/60 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${3 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main content container - Optimized spacing for mobile */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-6 md:space-y-8 px-4 sm:px-6 md:px-8 w-full max-w-full">
          {/* Enhanced Logo with Industry 4.0 Elements */}
          <motion.div 
            className="relative flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Logo className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32" />
            </motion.div>
          </motion.div>

          {/* Industry 4.0 Welcome Text */}
          <motion.div 
            className="space-y-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div
              className="space-y-2"
              animate={showWelcome ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <motion.h1 
                className={cn(
                  "text-xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent",
                  "drop-shadow-2xl tracking-tight leading-[1.1] px-2 text-center max-w-4xl mx-auto block"
                )}
                style={{
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(217, 119, 6, 0.2)',
                  filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.3))'
                }}
              >
                Welcome to
              </motion.h1>
              <motion.h1 
                className={cn(
                  "text-xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent",
                  "drop-shadow-2xl tracking-tight leading-[1.1] px-2 text-center max-w-4xl mx-auto block"
                )}
                style={{
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(217, 119, 6, 0.2)',
                  filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.3))'
                }}
              >
                Digitalization
              </motion.h1>
            </motion.div>
            
            <motion.div 
              className="text-sm sm:text-base md:text-xl lg:text-2xl text-amber-200 font-semibold relative px-2 sm:px-4"
              key={loadingMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative z-10 text-center block">{loadingMessage}</span>
              {/* Text glow effect - Reduced on mobile */}
              <div className="absolute inset-0 text-amber-400/20 sm:text-amber-400/30 blur-sm">
                {loadingMessage}
              </div>
            </motion.div>
            
            {/* Industry 4.0 Status Indicators - Optimized for mobile */}
            <AnimatePresence>
              {showIndustryIcons && (
                <motion.div 
                  className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6 px-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                >
                  {[
                    { icon: Factory, label: "Smart Factory", active: currentStage >= 1 },
                    { icon: Network, label: "IoT Network", active: currentStage >= 2 },
                    { icon: Cpu, label: "AI Systems", active: currentStage >= 3 },
                    { icon: Database, label: "Data Analytics", active: currentStage >= 4 },
                    { icon: Cloud, label: "Digital Twins", active: currentStage >= 5 },
                    { icon: TrendingUp, label: "Optimization", active: currentStage >= 6 }
                  ].map(({ icon: Icon, label, active }, index) => (
                    <motion.div
                      key={label}
                      className="flex flex-col items-center space-y-1 sm:space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500",
                        active 
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0a0a] shadow-lg shadow-amber-500/50" 
                          : "bg-[#0f0f0f] border border-amber-600/20 text-amber-600/50"
                      )}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-amber-600/70 font-medium text-center max-w-[60px] sm:max-w-none">{label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-amber-400/50"></div>
              <motion.div 
                className="w-2 h-2 bg-amber-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                ></motion.div>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-amber-400/50"></div>
            </div>
          </motion.div>

          {/* Industry 4.0 Progress Bar - Optimized for mobile */}
          <motion.div 
            className="w-full max-w-lg space-y-2 sm:space-y-4 md:space-y-6 px-2 sm:px-4"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="relative">
              {/* Progress bar container with Ancient styling - Smaller on mobile */}
              <div className="w-full h-4 sm:h-5 md:h-6 bg-[#0f0f0f]/80 rounded-full overflow-hidden shadow-2xl border border-amber-600/30 relative card-dark">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-amber-500/10 rounded-full"></div>
                
                {/* Progress fill with animated data flow */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {/* Animated data flow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  
                  {/* Moving light effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{
                    animation: 'shimmer 2s infinite linear',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    backgroundSize: '200% 100%'
                  }}></div>
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/60 to-amber-500/60 blur-sm"></div>
                  
                  {/* Data particles */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 w-1 h-1 bg-white rounded-full"
                      animate={{ x: [0, 100, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    />
                  ))}
                </motion.div>
                
                {/* Inner highlight */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
              </div>
              
              {/* Progress percentage with Industry 4.0 styling - Optimized for mobile */}
              <motion.div 
                className="absolute -top-8 sm:-top-10 md:-top-12 left-1/2 transform -translate-x-1/2 text-base sm:text-lg md:text-xl font-bold text-amber-400 drop-shadow-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <span className="relative z-10">{loadingProgress}%</span>
                <div className="absolute inset-0 text-amber-400/40 sm:text-amber-400/50 blur-sm">
                  {loadingProgress}%
                </div>
              </motion.div>
            </div>
            
            {/* Industry 4.0 Loading Indicators - Smaller on mobile */}
            <div className="flex justify-center space-x-2 sm:space-x-3 md:space-x-4">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full relative"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                >
                  {/* Dot glow - Reduced on mobile */}
                  <div className="absolute inset-0 bg-amber-400/40 sm:bg-amber-400/50 blur-sm rounded-full"></div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Ancient Tagline - Optimized for mobile */}
          <motion.div 
            className="text-xs sm:text-sm md:text-base text-amber-300/80 font-medium relative px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <span className="relative z-10">Industry 4.0 • Smart Manufacturing • Digital Innovation</span>
            <div className="absolute inset-0 text-amber-400/15 sm:text-amber-400/20 blur-sm">
              Industry 4.0 • Smart Manufacturing • Digital Innovation
            </div>
          </motion.div>
        </div>

        {/* Industry 4.0 Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Industry 4.0 Icons - Hidden on mobile for performance */}
          <motion.div 
            className="hidden sm:block absolute top-1/4 left-1/4"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-amber-600/20 sm:border-amber-600/30 rounded-full flex items-center justify-center bg-[#0f0f0f]/30">
              <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500/40 sm:text-amber-500/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="hidden sm:block absolute top-3/4 right-1/4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 border border-amber-600/20 rounded-full flex items-center justify-center bg-[#0f0f0f]/30">
              <Network className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500/40 sm:text-amber-500/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="hidden md:block absolute bottom-1/4 left-1/3"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-600/10 sm:from-amber-600/15 to-amber-500/10 sm:to-amber-500/15 rounded-lg flex items-center justify-center border border-amber-600/20">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500/50 sm:text-amber-500/60" />
            </div>
          </motion.div>
          
          {/* Additional Industry 4.0 Elements - Hidden on mobile */}
          <motion.div 
            className="hidden lg:block absolute top-1/2 right-1/5"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="w-6 h-6 border border-amber-600/20 rounded-full flex items-center justify-center bg-[#0f0f0f]/30">
              <Database className="w-3 h-3 text-amber-500/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="hidden lg:block absolute bottom-1/2 right-1/3"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <div className="w-4 h-4 bg-gradient-to-br from-amber-500/30 to-amber-600/30 rounded-full flex items-center justify-center border border-amber-600/20">
              <Cloud className="w-2 h-2 text-amber-200/70" />
            </div>
          </motion.div>
          
          {/* Enhanced gradient orbs with Ancient amber colors - Reduced opacity for darker theme */}
          <div className="absolute top-1/3 right-1/3 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-amber-600/3 sm:from-amber-600/5 to-amber-500/3 sm:to-amber-500/5 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/4 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-to-br from-amber-500/3 sm:from-amber-500/5 to-amber-600/3 sm:to-amber-600/5 rounded-full blur-xl sm:blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-2/3 left-1/2 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-amber-600/2 sm:from-amber-600/4 to-amber-500/2 sm:to-amber-500/4 rounded-full blur-lg sm:blur-xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>
          
          {/* Ancient data flow lines - darker amber */}
          <motion.div 
            className="absolute top-1/6 left-1/6 w-32 h-px bg-gradient-to-r from-transparent via-amber-600/20 to-transparent"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-1/6 right-1/6 w-24 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
            animate={{ x: [0, -80, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          />
        </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
