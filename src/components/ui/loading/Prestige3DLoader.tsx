/**
 * Prestige 3D Loader
 * 
 * Enhanced loading screen with 3D elements showcasing ALMONA's 3D capabilities.
 * Features a cinematic "self-assembling" window animation, decoding text effects,
 * and a high-drama shutter exit transition.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box as BoxIcon,
  Cpu,
  Layers,
  Ruler,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal
} from 'lucide-react';
import React, { Suspense, useEffect, useState } from 'react';

// --- Helper Components ---

// Fantasy Text Effect - Elegant Reveal
const FantasyRevealText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text}
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(4px)' }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("font-serif relative w-full", className)}
      >
        <span className="relative z-10 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-100 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
          {text}
        </span>
        <span className="absolute inset-0 z-0 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-100 bg-clip-text text-transparent opacity-30 blur-sm select-none" aria-hidden="true">
          {text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

// System Console Log component
const SystemConsole: React.FC<{ progress: number }> = ({ progress }) => {
  const logs = [
    { p: 0, text: "INITIALIZING_CORE_SYSTEMS..." },
    { p: 10, text: "ESTABLISHING_SECURE_CONNECTION..." },
    { p: 20, text: "LOADING_GEOMETRY_ENGINE_V2..." },
    { p: 30, text: "CONFIGURING_THEATRICAL_LIGHTING..." },
    { p: 40, text: "ASSEMBLING_COMPONENT_MATRIX..." },
    { p: 60, text: "OPTIMIZING_RENDER_PIPELINE..." },
    { p: 80, text: "VALIDATING_INTEGRITY_CHECKS..." },
    { p: 90, text: "PREPARING_USER_INTERFACE..." },
    { p: 98, text: "SYSTEM_READY" }
  ];

  const activeLogs = logs.filter(l => l.p <= progress).slice(-3);

  return (
    <div className="absolute bottom-8 right-8 font-mono text-xs text-amber-500/60 hidden sm:block text-right">
      <div className="flex items-center justify-end gap-2 mb-2 text-amber-500/80">
        <Terminal className="w-3 h-3" />
        <span className="font-bold tracking-wider">SYSTEM_LOG</span>
      </div>
      <div className="space-y-1">
        <AnimatePresence>
          {activeLogs.map((log) => (
            <motion.div
              key={log.text}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-end gap-2"
            >
              <span>{log.text}</span>
              <span className="text-[10px] opacity-50">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};



// Lazy load 3D Scene
const Prestige3DScene = React.lazy(() => import('./Prestige3DScene'));


interface Prestige3DLoaderProps {
  children: React.ReactNode;
  loadingSteps?: Array<{
    progress: number;
    message: string;
    icon?: React.ReactNode;
  }>;
  show3DAnimation?: boolean;
  variant?: 'fullscreen' | 'inline';
}

const DEFAULT_LOADING_STEPS = [
  { progress: 15, message: 'Initializing Fabricator Core...', icon: <Cpu className="w-4 h-4" /> },
  { progress: 30, message: 'Loading Component Libraries...', icon: <Layers className="w-4 h-4" /> },
  { progress: 50, message: 'Assembling User Interface...', icon: <BoxIcon className="w-4 h-4" /> },
  { progress: 70, message: 'Verifying Security Protocols...', icon: <ShieldCheck className="w-4 h-4" /> },
  { progress: 85, message: 'Calibrating 3D Engine...', icon: <Sparkles className="w-4 h-4" /> },
  { progress: 95, message: 'Finalizing Workspace...', icon: <Settings className="w-4 h-4" /> },
  { progress: 100, message: 'Welcome to Almona', icon: <Ruler className="w-4 h-4" /> },
];

export const Prestige3DLoader: React.FC<Prestige3DLoaderProps> = ({
  children,
  loadingSteps = DEFAULT_LOADING_STEPS,
  show3DAnimation = true,
  variant = 'fullscreen'
}) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(loadingSteps[0]?.message || 'Loading...');
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Controls the "Curtain" exit animation
  const [isExiting, setIsExiting] = useState(false);

  // Load 3D logic - Fast load for performance
  useEffect(() => {
    if (show3DAnimation) {
      console.log('Prestige3DLoader: Initializing 3D Scene...');
      setShouldLoad3D(true);
    } else {
      console.log('Prestige3DLoader: 3D Animation disabled');
    }
  }, [show3DAnimation, variant]);

  const [is3DReady, setIs3DReady] = useState(false);

  // Progress logic
  useEffect(() => {
    // OPTIMIZED: Faster loading simulation (20ms interval instead of 30ms)
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        // Pause at 85% if 3D animation is enabled but not ready yet
        if (show3DAnimation && !is3DReady && prev >= 85) {
          return 85;
        }

        if (prev >= 100) {
          clearInterval(interval);
          // Start exit sequence
          // OPTIMIZED: Reduced wait time from 500ms to 200ms
          setTimeout(() => setIsExiting(true), 200);
          return 100;
        }

        // Update message based on progress
        // OPTIMIZED: Faster increment (2 steps instead of 1)
        const increment = prev < 80 ? 2 : 1;
        const nextProgress = Math.min(prev + increment, 100);
        const step = loadingSteps.find(s => s.progress === nextProgress);
        if (step) {
          setCurrentMessage(step.message);
        }
        return nextProgress;
      });
    }, 30); // Fast simulation

    return () => clearInterval(interval);
  }, [loadingSteps, show3DAnimation, is3DReady]);

  const handleExitComplete = () => {
    setIsAnimationComplete(true);
  };

  // If animation is done, we just render children cleaner (no wrapper)
  // Although technically we could just keep the wrapper structure but it's better to unmount fully
  if (isAnimationComplete) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 
        We render children immediately but hidden (or z-index -1) 
        so they are ready when the "Curtains" open. 
        Note: If children trigger heavy effects on mount, this might lag the animation.
        For a loader, usually it's fine.
      */}
      <div className="fixed inset-0 z-0">
        {children}
      </div>

      <AnimatePresence onExitComplete={handleExitComplete}>
        {!isExiting && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent pointer-events-none"
          // The container itself doesn't fade out, the curtains do the work. 
          // Actually, we need the container to stay while curtains move.
          // So we structure this differently: The Loader IS the curtains.
          >
            {/* This inner part is just for the AnimatePresence logic to trigger 'exit' on something */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
          The Shutter/Curtain Overlay 
          We manually handle the exit animation state here using the isExiting flag
          because we want to split the screen.
      */}
      {!isAnimationComplete && (
        <div className="fixed inset-0 z-[10000] pointer-events-auto flex">
          {/* Left Shutter */}
          <motion.div
            className="w-1/2 h-full bg-[#0a0a0a] relative overflow-hidden"
            initial={{ x: 0 }}
            animate={isExiting ? { x: '-100%' } : { x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} // Custom bezier for "heavy door" feel
            onAnimationComplete={() => {
              if (isExiting) handleExitComplete();
            }}
          >
            {/* Background Texture Left */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_100%_50%,rgba(245,158,11,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a)', backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px' }} />
          </motion.div>

          {/* Right Shutter */}
          <motion.div
            className="w-1/2 h-full bg-[#0a0a0a] relative overflow-hidden"
            initial={{ x: 0 }}
            animate={isExiting ? { x: '100%' } : { x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Background Texture Right */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_0%_50%,rgba(245,158,11,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a)', backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px' }} />
          </motion.div>

          {/* 
               Loader Content - Centered 
               Ideally this fades out BEFORE shutters open.
            */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={isExiting ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center justify-center w-full max-w-4xl px-6">
              {/* Logo Area */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 relative"
              >
                <div className="absolute -inset-10 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
                {/* The Top Gear / Cutting Blade - Spinning Animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Logo className="w-24 h-24 sm:w-32 sm:h-32 relative z-10" />
                </motion.div>
              </motion.div>

              {/* 3D Scene Area */}
              <div className="w-full h-64 sm:h-80 relative mb-8">
                {shouldLoad3D ? (
                  <Suspense fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/50">
                      <div className="w-12 h-12 border-4 border-amber-500/20 rounded-full animate-spin border-t-amber-500 mb-2" />
                      <span className="text-xs font-mono">LOADING_ASSETS...</span>
                    </div>
                  }>
                    <Prestige3DScene progress={loadingProgress} onReady={() => {
                      console.log('Prestige3DLoader: 3D Scene Ready');
                      setIs3DReady(true);
                    }} />
                  </Suspense>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-32 h-32 border-4 border-amber-500/20 rounded-full animate-spin border-t-amber-500" />
                    <p className="absolute mt-40 text-amber-500/40 text-xs">3D DISABLED</p>
                  </div>
                )}
              </div>

              {/* Text & Progress */}
              <div className="w-full max-w-md space-y-4">
                {/* Decoding Message */}
                {/* Decoding Message */}
                <div className="min-h-[3rem] flex items-end justify-center mb-2 px-4">
                  <FantasyRevealText
                    text={currentMessage}
                    className="text-xl sm:text-2xl font-bold tracking-widest italic text-center leading-relaxed py-2"
                  />
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  />
                  {/* Shimmer effect on bar */}
                  <motion.div
                    className="absolute inset-y-0 width-full bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {/* Percentage */}
                <div className="flex justify-between text-xs text-amber-500/60 font-mono">
                  <span>SYSTEM_VERIFICATION</span>
                  <span>{loadingProgress.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* System Console Bottom Right */}
            <SystemConsole progress={loadingProgress} />

            {/* Decorative corners */}
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-amber-500/30 rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-amber-500/30 rounded-tr-lg" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-amber-500/30 rounded-bl-lg" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-amber-500/30 rounded-br-lg" />

          </motion.div>
        </div>
      )}
    </>
  );
};
