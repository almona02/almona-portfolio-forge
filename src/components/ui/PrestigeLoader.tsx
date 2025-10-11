import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Factory, 
  Cpu, 
  Zap, 
  Network, 
  Database, 
  Cloud, 
  Shield, 
  Settings,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
          {/* Industry 4.0 Background Grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}></div>
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(249, 115, 22, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(249, 115, 22, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {showParticles && (
            <>
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
              {/* Larger floating particles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`large-${i}`}
                  className="absolute w-2 h-2 bg-gradient-to-r from-amber-300/60 to-orange-400/60 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Main content container */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 px-8">
          {/* Enhanced Logo with Industry 4.0 Elements */}
          <motion.div 
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Main logo container with animated logo */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center shadow-2xl relative overflow-hidden">
              {/* Animated Logo */}
              <motion.img
                src="/logo.png"
                alt="Almona Logo"
                className="w-20 h-20 object-contain filter brightness-0 invert"
                initial={{ rotate: 0, scale: 0.5 }}
                animate={{ rotate: 360, scale: 1 }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 0.8, ease: "easeOut" }
                }}
              />
              
              {/* Inner metallic shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full"></div>
              
              {/* Reflective highlight */}
              <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm"></div>
            </div>
            
            {/* Industry 4.0 Rotating Rings */}
            <div className="absolute inset-0 w-40 h-40 border-2 border-transparent border-t-amber-400/60 border-r-orange-500/60 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-48 h-48 border border-transparent border-b-orange-400/40 border-l-amber-500/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '4s' }}></div>
            <div className="absolute inset-0 w-56 h-56 border border-transparent border-t-red-500/20 border-b-amber-400/20 rounded-full animate-spin" style={{ animationDuration: '6s' }}></div>
            
            {/* Outer glow effects */}
            <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-400/40 to-orange-500/40 blur-2xl animate-pulse"></div>
            <div className="absolute inset-0 w-36 h-36 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Industry 4.0 Sparkle Effects */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                style={{
                  left: `${20 + Math.cos((i * Math.PI * 2) / 8) * 35}px`,
                  top: `${20 + Math.sin((i * Math.PI * 2) / 8) * 35}px`,
                }}
              />
            ))}
          </motion.div>

          {/* Industry 4.0 Welcome Text */}
          <motion.div 
            className="space-y-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.h1 
              className={cn(
                "text-5xl md:text-7xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 bg-clip-text text-transparent",
                "drop-shadow-2xl tracking-tight leading-tight"
              )}
              style={{
                textShadow: '0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(249, 115, 22, 0.3)',
                filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))'
              }}
              animate={showWelcome ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              Welcome to Almona Forge
            </motion.h1>
            
            <motion.div 
              className="text-xl md:text-2xl text-slate-200 font-semibold relative"
              key={loadingMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative z-10">{loadingMessage}</span>
              {/* Text glow effect */}
              <div className="absolute inset-0 text-amber-400/30 blur-sm">
                {loadingMessage}
              </div>
            </motion.div>
            
            {/* Industry 4.0 Status Indicators */}
            <AnimatePresence>
              {showIndustryIcons && (
                <motion.div 
                  className="flex justify-center space-x-6"
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
                      className="flex flex-col items-center space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                        active 
                          ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg" 
                          : "bg-slate-700 text-slate-400"
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{label}</span>
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

          {/* Industry 4.0 Progress Bar */}
          <motion.div 
            className="w-full max-w-lg space-y-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="relative">
              {/* Progress bar container with Industry 4.0 styling */}
              <div className="w-full h-6 bg-slate-800/60 rounded-full overflow-hidden shadow-2xl border border-slate-700/50 relative">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-full"></div>
                
                {/* Progress fill with animated data flow */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 rounded-full relative overflow-hidden"
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
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/60 to-orange-500/60 blur-sm"></div>
                  
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
              
              {/* Progress percentage with Industry 4.0 styling */}
              <motion.div 
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-xl font-bold text-amber-400 drop-shadow-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <span className="relative z-10">{loadingProgress}%</span>
                <div className="absolute inset-0 text-amber-400/50 blur-sm">
                  {loadingProgress}%
                </div>
              </motion.div>
            </div>
            
            {/* Industry 4.0 Loading Indicators */}
            <div className="flex justify-center space-x-4">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full relative"
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
                  {/* Dot glow */}
                  <div className="absolute inset-0 bg-amber-400/50 blur-sm rounded-full"></div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Industry 4.0 Tagline */}
          <motion.div 
            className="text-base text-slate-300 font-medium relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <span className="relative z-10">Industry 4.0 • Smart Manufacturing • Digital Innovation</span>
            <div className="absolute inset-0 text-amber-400/20 blur-sm">
              Industry 4.0 • Smart Manufacturing • Digital Innovation
            </div>
          </motion.div>
        </div>

        {/* Industry 4.0 Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Industry 4.0 Icons */}
          <motion.div 
            className="absolute top-1/4 left-1/4"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-20 h-20 border-2 border-amber-400/30 rounded-full flex items-center justify-center">
              <Factory className="w-8 h-8 text-amber-400/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute top-3/4 right-1/4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-16 h-16 border-2 border-orange-500/30 rounded-full flex items-center justify-center">
              <Network className="w-6 h-6 text-orange-500/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute bottom-1/4 left-1/3"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-amber-400/60" />
            </div>
          </motion.div>
          
          {/* Additional Industry 4.0 Elements */}
          <motion.div 
            className="absolute top-1/2 right-1/5"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="w-6 h-6 border border-red-500/20 rounded-full flex items-center justify-center">
              <Database className="w-3 h-3 text-red-500/50" />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute bottom-1/2 right-1/3"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <div className="w-4 h-4 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-full flex items-center justify-center">
              <Cloud className="w-2 h-2 text-white/70" />
            </div>
          </motion.div>
          
          {/* Enhanced gradient orbs with Industry 4.0 colors */}
          <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-gradient-to-br from-amber-400/8 to-orange-500/8 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-orange-500/8 to-red-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-2/3 left-1/2 w-24 h-24 bg-gradient-to-br from-red-500/6 to-amber-400/6 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>
          
          {/* Data flow lines */}
          <motion.div 
            className="absolute top-1/6 left-1/6 w-32 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-1/6 right-1/6 w-24 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"
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
