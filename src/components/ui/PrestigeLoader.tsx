import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PrestigeLoaderProps {
  children: React.ReactNode;
}

export const PrestigeLoader: React.FC<PrestigeLoaderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Almona Platforms ...');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    const loadingSteps = [
      { progress: 15, message: 'Forging excellence...' },
      { progress: 30, message: 'Crafting precision...' },
      { progress: 45, message: 'Engineering innovation...' },
      { progress: 60, message: 'Building the future...' },
      { progress: 75, message: 'Perfecting quality...' },
      { progress: 90, message: 'Almost ready...' },
      { progress: 100, message: 'Welcome to Almona Company' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingProgress(step.progress);
        setLoadingMessage(step.message);
        
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
        }, 2000);
      }
    }, 200);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
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
          {/* Logo/Icon area with premium reflective effects */}
          <div className="relative">
            {/* Main logo container with metallic gradient */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center shadow-2xl animate-pulse relative overflow-hidden">
              {/* Inner metallic shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full"></div>
              
              {/* Core spinning element */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 animate-spin relative">
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-amber-400/50 animate-ping"></div>
                  
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              {/* Reflective highlight */}
              <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm"></div>
            </div>
            
            {/* Multiple rotating rings with different speeds */}
            <div className="absolute inset-0 w-36 h-36 border-2 border-transparent border-t-amber-400/60 border-r-orange-500/60 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-44 h-44 border border-transparent border-b-orange-400/40 border-l-amber-500/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '4s' }}></div>
            <div className="absolute inset-0 w-52 h-52 border border-transparent border-t-red-500/20 border-b-amber-400/20 rounded-full animate-spin" style={{ animationDuration: '6s' }}></div>
            
            {/* Outer glow effects */}
            <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-amber-400/40 to-orange-500/40 blur-2xl animate-pulse"></div>
            <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Sparkle effects */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                style={{
                  left: `${20 + Math.cos((i * Math.PI * 2) / 6) * 30}px`,
                  top: `${20 + Math.sin((i * Math.PI * 2) / 6) * 30}px`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>

          {/* Welcome text with premium styling */}
          <div className="space-y-6">
            <h1 className={cn(
              "text-5xl md:text-7xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 bg-clip-text text-transparent",
              "drop-shadow-2xl tracking-tight leading-tight",
              showWelcome && "animate-bounce"
            )} style={{
              textShadow: '0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(249, 115, 22, 0.3)',
              filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))'
            }}>
              Welcome to Almona Forge
            </h1>
            
            <div className="text-xl md:text-2xl text-slate-200 font-semibold animate-pulse relative">
              <span className="relative z-10">{loadingMessage}</span>
              {/* Text glow effect */}
              <div className="absolute inset-0 text-amber-400/30 blur-sm animate-pulse">
                {loadingMessage}
              </div>
            </div>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-amber-400/50"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-amber-400/50"></div>
            </div>
          </div>

          {/* Premium progress bar */}
          <div className="w-full max-w-lg space-y-6">
            <div className="relative">
              {/* Progress bar container with premium styling */}
              <div className="w-full h-4 bg-slate-800/60 rounded-full overflow-hidden shadow-2xl border border-slate-700/50 relative">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-full"></div>
                
                {/* Progress fill */}
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{ width: `${loadingProgress}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                  
                  {/* Moving light effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{
                    animation: 'shimmer 2s infinite linear',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    backgroundSize: '200% 100%'
                  }}></div>
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/60 to-orange-500/60 blur-sm"></div>
                </div>
                
                {/* Inner highlight */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
              </div>
              
              {/* Progress percentage with glow */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-lg font-bold text-amber-400 drop-shadow-lg">
                <span className="relative z-10">{loadingProgress}%</span>
                <div className="absolute inset-0 text-amber-400/50 blur-sm animate-pulse">
                  {loadingProgress}%
                </div>
              </div>
            </div>
            
            {/* Enhanced loading dots */}
            <div className="flex justify-center space-x-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-bounce relative"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {/* Dot glow */}
                  <div className="absolute inset-0 bg-amber-400/50 blur-sm rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium tagline */}
          <div className="text-base text-slate-300 font-medium animate-pulse relative">
            <span className="relative z-10">Crafting Excellence • Engineering Innovation • Building Tomorrow</span>
            <div className="absolute inset-0 text-amber-400/20 blur-sm">
              Crafting Excellence • Engineering Innovation • Building Tomorrow
            </div>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating geometric shapes with enhanced effects */}
          <div className="absolute top-1/4 left-1/4 w-20 h-20 border-2 border-amber-400/30 rotate-45 animate-spin" style={{ animationDuration: '10s' }}>
            <div className="absolute inset-2 border border-orange-500/20 rotate-45 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>
          </div>
          <div className="absolute top-3/4 right-1/4 w-16 h-16 border-2 border-orange-500/30 rounded-full animate-pulse">
            <div className="absolute inset-2 border border-amber-400/20 rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rotate-12 animate-bounce">
            <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-sm"></div>
          </div>
          
          {/* Additional floating elements */}
          <div className="absolute top-1/2 right-1/5 w-6 h-6 border border-red-500/20 rotate-45 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/2 right-1/3 w-4 h-4 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Enhanced gradient orbs */}
          <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-gradient-to-br from-amber-400/8 to-orange-500/8 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-orange-500/8 to-red-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-2/3 left-1/2 w-24 h-24 bg-gradient-to-br from-red-500/6 to-amber-400/6 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `
              linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
