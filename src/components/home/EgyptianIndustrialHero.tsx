import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

interface EgyptianIndustrialHeroProps {
  children: React.ReactNode;
}

/**
 * Epic Cross-Empire Industrial Hero Background
 * Fuses Egyptian & Ottoman architectural marvels with modern YILMAZ machinery
 * and futuristic holographic UI elements - A collaborative scene of cross-empire innovation
 */
export const EgyptianIndustrialHero: React.FC<EgyptianIndustrialHeroProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hologramRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // LCP FIX: Progressive image loading - use native priority instead of artificial delay
  const shouldLoadImage = true;
  const [imageLoaded, setImageLoaded] = useState(false);

  // No artificial delay needed - browser handles priority better


  // Debug: Log component mount (remove in production)
  useEffect(() => {
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('🎨 EgyptianIndustrialHero mounted', { isMobile });
    }
  }, [isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Defer canvas initialization to avoid blocking LCP
    let cleanup: (() => void) | null = null;
    let idleCallbackId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const initCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Mobile optimization: Reduce animation complexity
      const isMobileDevice = window.innerWidth < 768;

      // Set canvas size - Ensure proper initialization on mobile
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      // Force initial render on mobile
      if (isMobileDevice) {
        setTimeout(() => resizeCanvas(), 100);
      }

      const particleCount = isMobileDevice ? 8 : 20; // Fewer particles on mobile
      const hieroglyphCount = isMobileDevice ? 2 : 3; // Fewer hieroglyphs on mobile
      const arabesqueCount = isMobileDevice ? 1 : 3; // Fewer arabesque patterns on mobile
      const animationSpeed = isMobileDevice ? 0.015 : 0.02; // Slower animation on mobile

      // Holographic UI elements animation
      let animationFrame: number | undefined;
      let time = 0;
      let frameCount = 0;

      const drawHolographicElements = () => {
        frameCount++;

        // Mobile: Skip frames for better performance (render every 2nd frame)
        // But ensure we always render at least something
        if (isMobileDevice && frameCount % 2 !== 0 && frameCount > 2) {
          animationFrame = requestAnimationFrame(drawHolographicElements);
          return;
        }

        // Ensure canvas is properly sized before drawing
        if (canvas.width === 0 || canvas.height === 0) {
          resizeCanvas();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += animationSpeed;

        // Draw glowing hieroglyphs on Egyptian pillars (left side) - Reduced on mobile
        ctx.save();
        ctx.globalAlpha = isMobileDevice ? 0.2 : 0.3;
        ctx.fillStyle = '#FFC107'; // Egyptian gold
        for (let i = 0; i < hieroglyphCount; i++) {
          const x = (canvas.width / (hieroglyphCount + 2)) * (i + 1);
          const y = canvas.height * 0.3;
          const size = isMobileDevice ? 15 : 20;
          ctx.beginPath();
          ctx.arc(x, y, size + Math.sin(time + i) * (isMobileDevice ? 3 : 5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Draw Ottoman arabesque patterns (right side) - Simplified on mobile
        if (!isMobileDevice) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = '#1E90FF'; // Ottoman blue
          ctx.lineWidth = isMobileDevice ? 1 : 2;
          for (let i = 0; i < arabesqueCount; i++) {
            const x = canvas.width * 0.75 + (i * (isMobileDevice ? 50 : 100));
            const y = canvas.height * 0.35;
            ctx.beginPath();
            // Draw arabesque-inspired pattern (simplified geometric flower)
            const petalCount = isMobileDevice ? 6 : 8;
            for (let j = 0; j < petalCount; j++) {
              const angle = (j * Math.PI * 2) / petalCount + time;
              const radius = (isMobileDevice ? 10 : 15) + Math.sin(time * 2 + i) * (isMobileDevice ? 2 : 3);
              const px = x + Math.cos(angle) * radius;
              const py = y + Math.sin(angle) * radius;
              if (j === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw holographic network nodes (PLC/Sensor visualization) - Simplified on mobile
        ctx.save();
        ctx.strokeStyle = '#00BCD4'; // Egyptian blue
        ctx.lineWidth = isMobileDevice ? 1 : 2;
        ctx.globalAlpha = isMobileDevice ? 0.3 : (0.4 + Math.sin(time) * 0.2);

        const nodeCount = isMobileDevice ? 3 : 4;
        const nodes: { x: number, y: number }[] = [];
        for (let i = 0; i < nodeCount; i++) {
          nodes.push({
            x: canvas.width * (0.2 + (i * 0.2)),
            y: canvas.height * (0.6 - (i % 2) * 0.1)
          });
        }

        // Draw connections - Simplified on mobile
        if (!isMobileDevice) {
          nodes.forEach((node, i) => {
            if (i < nodes.length - 1) {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
              ctx.stroke();
            }
          });
        }

        // Draw pulsing nodes - Smaller on mobile
        nodes.forEach((node, i) => {
          const pulse = Math.sin(time * 2 + i) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 140, 0, ${pulse})`; // Orange/amber
          ctx.beginPath();
          const nodeSize = isMobileDevice ? 6 : 8;
          ctx.arc(node.x, node.y, nodeSize * pulse, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // Draw sparks effect (from cutting machine) - Reduced on mobile
        ctx.save();
        for (let i = 0; i < particleCount; i++) {
          const sparkX = canvas.width * 0.7 + Math.random() * (isMobileDevice ? 50 : 100);
          const sparkY = canvas.height * 0.8 + Math.sin(time * 5 + i) * (isMobileDevice ? 20 : 30);
          const sparkSize = Math.random() * (isMobileDevice ? 2 : 3);
          ctx.fillStyle = `rgba(255, ${200 + Math.random() * 55}, 0, ${isMobileDevice ? 0.6 : 0.8})`;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        animationFrame = requestAnimationFrame(drawHolographicElements);
      };

      // Start animation after a small delay to ensure content is rendered first
      const startAnimation = () => {
        drawHolographicElements();
      };

      // Defer animation start to avoid blocking LCP
      // Use requestIdleCallback with timeout fallback
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(startAnimation, { timeout: 1000 });
      } else {
        setTimeout(startAnimation, 100);
      }

      cleanup = () => {
        window.removeEventListener('resize', resizeCanvas);
        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame);
        }
      };
    };

    // Defer canvas initialization to improve LCP - wait longer for better performance
    if ('requestIdleCallback' in window) {
      idleCallbackId = (window as any).requestIdleCallback(initCanvas, { timeout: 3000 });
    } else {
      // Fallback for browsers without requestIdleCallback - increased delay for better LCP
      timeoutId = setTimeout(initCanvas, 1000);
    }

    return () => {
      if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [isMobile]);

  return (
    <div className="btn-secondary" data-hero-bg="egyptian-industrial">
      {/* IMMEDIATE: CSS Gradient Background - Never blocks LCP, shows instantly */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(26, 32, 44, 0.95) 0%, 
              rgba(45, 55, 72, 0.95) 50%,
              rgba(26, 32, 44, 0.98) 100%
            ),
            radial-gradient(circle at 20% 50%, 
              rgba(79, 70, 229, 0.15) 0%, 
              transparent 50%
            ),
            radial-gradient(circle at 80% 20%, 
              rgba(124, 58, 237, 0.1) 0%, 
              transparent 50%
            )
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* PROGRESSIVE: Load image only after LCP is determined (non-blocking) */}
      {shouldLoadImage && (
        <motion.div
          className="absolute inset-0 z-0 w-full h-full"
          style={{
            opacity: imageLoaded ? (isMobile ? 0.5 : 0.6) : 0,
            transition: 'opacity 0.5s ease-in-out',
            willChange: 'opacity'
          }}
          animate={imageLoaded ? {
            opacity: isMobile ? [0.5, 0.55, 0.5] : [0.6, 0.65, 0.6]
          } : {}}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ResponsiveImage
            src="/images/egyptian-industrial-hero-bg.webp"
            alt="Egyptian-Ottoman Industrial Scene"
            className="w-full h-full object-cover object-right"
            width={1920}
            height={1080}
            sizes="100vw"
            priority={true}
            fallback="/images/egyptian-industrial-hero-bg.webp"
            onImageLoad={() => setImageLoaded(true)}
          />
        </motion.div>
      )}

      {/* Dark overlay to blend image with background - Ensures text readability on left */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            linear-gradient(
              to left,
              transparent 0%,
              rgba(10, 10, 10, 0.15) 25%,
              rgba(10, 10, 10, 0.35) 45%,
              rgba(10, 10, 10, 0.6) 65%,
              rgba(10, 10, 10, 0.8) 80%,
              rgba(10, 10, 10, 0.92) 100%
            )
          `
        }}
      />

      {/* Base gradient - Egyptian sandstone + Ottoman Iznik tiles fusion with industrial dark - Always visible */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(184, 134, 11, ${isMobile ? 0.25 : 0.15}) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, rgba(30, 144, 255, ${isMobile ? 0.20 : 0.12}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 30%, rgba(46, 125, 50, ${isMobile ? 0.18 : 0.1}) 0%, transparent 50%),
            linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)
          `
        }}
      />

      {/* Egyptian Sandstone texture overlay - Temple pillars - Visible on mobile */}
      <div
        className="absolute inset-0 z-0 opacity-15 sm:opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(184, 134, 11, 0.15) 2px,
              rgba(184, 134, 11, 0.15) 4px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(184, 134, 11, 0.15) 2px,
              rgba(184, 134, 11, 0.15) 4px
            )
          `,
          backgroundSize: isMobile ? '60px 60px' : '100px 100px'
        }}
      />

      {/* Ottoman Iznik tile pattern overlay - Elegant arabesque patterns - Hidden on mobile */}
      <div
        className="absolute inset-0 opacity-0 sm:opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(30, 144, 255, 0.08) 40px,
              rgba(30, 144, 255, 0.08) 80px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(46, 125, 50, 0.08) 40px,
              rgba(46, 125, 50, 0.08) 80px
            )
          `,
          backgroundSize: '200px 200px'
        }}
      />

      {/* Ottoman arches pattern - Elegant architectural elements - Hidden on mobile */}
      <div className="absolute inset-0 opacity-0 sm:opacity-10 hidden sm:block">
        <svg className="w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="none">
          <defs>
            <pattern id="ottoman-arches" x="0" y="0" width="200" height="300" patternUnits="userSpaceOnUse">
              <path
                d="M 0 300 Q 50 250 100 300 L 100 300 L 0 300 Z"
                fill="none"
                stroke="rgba(30, 144, 255, 0.1)"
                strokeWidth="1"
              />
              <path
                d="M 100 300 Q 150 250 200 300 L 200 300 L 100 300 Z"
                fill="none"
                stroke="rgba(46, 125, 50, 0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ottoman-arches)" />
        </svg>
      </div>

      {/* Holographic UI Elements - Integrated into ancient walls */}
      <div ref={hologramRef} className="absolute inset-0 pointer-events-none">
        {/* Left side - Siemens PLC Logic Ladder (etched in blue light) - Repositioned for better text alignment */}
        <motion.div
          className="absolute left-[3%] sm:left-[5%] md:left-[6%] lg:left-[8%] xl:left-[10%] top-[12%] sm:top-[15%] md:top-[18%] w-40 h-56 sm:w-64 sm:h-80 md:w-72 md:h-96 opacity-20 sm:opacity-25 md:opacity-30 lg:opacity-35 z-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.15) 0%, rgba(0, 188, 212, 0.05) 100%)',
            border: '2px solid rgba(0, 188, 212, 0.4)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(0, 188, 212, 0.3), inset 0 0 20px rgba(0, 188, 212, 0.1)',
            borderRadius: '4px'
          }}
          animate={{
            opacity: [0.25, 0.45, 0.25],
            scale: [1, 1.02, 1],
            boxShadow: [
              '0 0 40px rgba(0, 188, 212, 0.3), inset 0 0 20px rgba(0, 188, 212, 0.1)',
              '0 0 60px rgba(0, 188, 212, 0.5), inset 0 0 30px rgba(0, 188, 212, 0.2)',
              '0 0 40px rgba(0, 188, 212, 0.3), inset 0 0 20px rgba(0, 188, 212, 0.1)'
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Simulated Siemens PLC ladder diagram - Simplified on mobile */}
          <div className="absolute inset-2 sm:inset-4">
            {/* Horizontal rungs - Fewer on mobile */}
            {[...Array(isMobile ? 6 : 10)].map((_, i) => (
              <div
                key={`rung-${i}`}
                className="absolute w-full h-px bg-cyan-400/20 sm:bg-cyan-400/30"
                style={{ top: `${i * (100 / (isMobile ? 6 : 10))}%` }}
              />
            ))}
            {/* Vertical connections - Fewer on mobile */}
            {[...Array(isMobile ? 3 : 6)].map((_, i) => (
              <div
                key={`vert-${i}`}
                className="absolute h-full w-px bg-cyan-400/15 sm:bg-cyan-400/20"
                style={{ left: `${i * (100 / (isMobile ? 3 : 6))}%` }}
              />
            ))}
            {/* Logic nodes - Fewer on mobile */}
            {[...Array(isMobile ? 6 : 15)].map((_, i) => (
              <motion.div
                key={`node-${i}`}
                className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full"
                style={{
                  left: `${15 + (i % (isMobile ? 3 : 5)) * (isMobile ? 30 : 20)}%`,
                  top: `${10 + Math.floor(i / (isMobile ? 3 : 5)) * (isMobile ? 15 : 10)}%`
                }}
                animate={isMobile ? {} : {
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.3, 1]
                }}
                transition={isMobile ? {} : {
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Right side - Sensor Network (pulsing amber nodes along conveyor) - Repositioned for better text alignment */}
        <motion.div
          className="absolute right-[3%] sm:right-[8%] md:right-[10%] lg:right-[12%] xl:right-[15%] top-[15%] sm:top-[20%] md:top-[22%] lg:top-[25%] w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 opacity-20 sm:opacity-25 md:opacity-28 lg:opacity-30 z-0"
          style={{
            background: 'radial-gradient(circle, rgba(255, 140, 0, 0.25) 0%, rgba(255, 140, 0, 0.1) 50%, transparent 80%)',
            border: '2px solid rgba(255, 140, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            borderRadius: '50%',
            boxShadow: '0 0 50px rgba(255, 140, 0, 0.4), inset 0 0 30px rgba(255, 140, 0, 0.2)'
          }}
          animate={{
            opacity: [0.25, 0.4, 0.25],
            scale: [1, 1.08, 1],
            boxShadow: [
              '0 0 50px rgba(255, 140, 0, 0.4), inset 0 0 30px rgba(255, 140, 0, 0.2)',
              '0 0 70px rgba(255, 140, 0, 0.6), inset 0 0 40px rgba(255, 140, 0, 0.3)',
              '0 0 50px rgba(255, 140, 0, 0.4), inset 0 0 30px rgba(255, 140, 0, 0.2)'
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Pulsing sensor nodes - proximity and optical sensors - Fewer on mobile */}
          {[...Array(isMobile ? 4 : 8)].map((_, i) => {
            const angle = (i * (360 / (isMobile ? 4 : 8))) * Math.PI / 180;
            const radius = isMobile ? 25 : 35;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            return (
              <motion.div
                key={i}
                className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-amber-400 rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: isMobile
                    ? '0 0 10px rgba(255, 140, 0, 0.7), 0 0 20px rgba(255, 140, 0, 0.4)'
                    : '0 0 15px rgba(255, 140, 0, 0.9), 0 0 30px rgba(255, 140, 0, 0.5)'
                }}
                animate={isMobile ? {
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.9, 0.5]
                } : {
                  scale: [1, 1.8, 1],
                  opacity: [0.4, 1, 0.4],
                  boxShadow: [
                    '0 0 15px rgba(255, 140, 0, 0.9), 0 0 30px rgba(255, 140, 0, 0.5)',
                    '0 0 25px rgba(255, 140, 0, 1), 0 0 50px rgba(255, 140, 0, 0.7)',
                    '0 0 15px rgba(255, 140, 0, 0.9), 0 0 30px rgba(255, 140, 0, 0.5)'
                  ]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            );
          })}
          {/* Central hub - Smaller on mobile */}
          <motion.div
            className="btn-primary"
            style={{
              boxShadow: isMobile
                ? '0 0 15px rgba(255, 140, 0, 0.8), 0 0 30px rgba(255, 140, 0, 0.5)'
                : '0 0 20px rgba(255, 140, 0, 1), 0 0 40px rgba(255, 140, 0, 0.6)'
            }}
            animate={isMobile ? {
              scale: [1, 1.2, 1],
              opacity: [0.7, 0.9, 0.7]
            } : {
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Bottom center - Servo Drives & Power Supplies (geometric glowing shapes) - Smaller on mobile */}
        <motion.div
          className="absolute left-1/2 bottom-[10%] sm:bottom-[12%] -translate-x-1/2 w-64 h-24 sm:w-96 sm:h-40 opacity-15 sm:opacity-25 hidden sm:block"
          style={{
            background: 'linear-gradient(90deg, rgba(192, 192, 192, 0.15) 0%, rgba(255, 140, 0, 0.15) 30%, rgba(192, 192, 192, 0.15) 60%, rgba(255, 140, 0, 0.15) 100%)',
            border: '2px solid rgba(255, 140, 0, 0.3)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(192, 192, 192, 0.3), 0 0 60px rgba(255, 140, 0, 0.2)',
            borderRadius: '8px'
          }}
          animate={{
            opacity: [0.2, 0.35, 0.2],
            boxShadow: [
              '0 0 40px rgba(192, 192, 192, 0.3), 0 0 60px rgba(255, 140, 0, 0.2)',
              '0 0 60px rgba(192, 192, 192, 0.5), 0 0 80px rgba(255, 140, 0, 0.4)',
              '0 0 40px rgba(192, 192, 192, 0.3), 0 0 60px rgba(255, 140, 0, 0.2)'
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Geometric shapes representing servo drives and power supplies */}
          <div className="absolute inset-4 flex items-center justify-around">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-14 h-14 border-2"
                style={{
                  borderColor: i % 2 === 0 ? 'rgba(255, 140, 0, 0.5)' : 'rgba(192, 192, 192, 0.5)',
                  background: i % 2 === 0
                    ? 'linear-gradient(135deg, rgba(255, 140, 0, 0.2) 0%, rgba(255, 140, 0, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%)',
                  boxShadow: i % 2 === 0
                    ? '0 0 20px rgba(255, 140, 0, 0.6), inset 0 0 10px rgba(255, 140, 0, 0.3)'
                    : '0 0 20px rgba(192, 192, 192, 0.6), inset 0 0 10px rgba(192, 192, 192, 0.3)'
                }}
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.15, 1]
                }}
                transition={{
                  rotate: {
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.5
                  },
                  scale: {
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Flow Chart - Inputs (sensors) → Logic (PLC) → Outputs (actuators, motors) - Hidden on mobile */}
        <motion.div
          className="absolute left-[45%] top-[60%] w-80 h-32 opacity-20 hidden md:block"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 140, 0, 0.1) 0%, rgba(0, 188, 212, 0.1) 50%, rgba(76, 175, 80, 0.1) 100%)',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '4px'
          }}
          animate={{
            opacity: [0.15, 0.28, 0.15]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Flow chart elements */}
          <div className="absolute inset-3 flex items-center justify-between">
            {/* Inputs (Sensors) */}
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-amber-400/50 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(255, 140, 0, 0.2) 0%, transparent 70%)',
                boxShadow: '0 0 15px rgba(255, 140, 0, 0.4)'
              }}
              animate={{
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-2 h-2 bg-amber-400 rounded-full" />
            </motion.div>

            {/* Arrow */}
            <div className="flex-1 h-px bg-cyan-400/30 mx-2 relative">
              <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-cyan-400/50 border-t-4 border-t-transparent border-b-4 border-b-transparent"
                animate={{
                  x: [-20, 0, -20]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* Logic (PLC) */}
            <motion.div
              className="w-16 h-16 border-2 border-cyan-400/50 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.2) 0%, rgba(0, 188, 212, 0.05) 100%)',
                boxShadow: '0 0 15px rgba(0, 188, 212, 0.4)'
              }}
              animate={{
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.3,
                ease: "easeInOut"
              }}
            >
              <div className="w-3 h-3 bg-cyan-400" />
            </motion.div>

            {/* Arrow */}
            <div className="flex-1 h-px bg-green-400/30 mx-2 relative">
              <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-green-400/50 border-t-4 border-t-transparent border-b-4 border-b-transparent"
                animate={{
                  x: [-20, 0, -20]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.6,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* Outputs (Actuators, Motors) */}
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-green-400/50 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(76, 175, 80, 0.2) 0%, transparent 70%)',
                boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)'
              }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{
                rotate: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.6,
                  ease: "easeInOut"
                }
              }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Animated canvas for dynamic effects - Always visible */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ mixBlendMode: 'screen', opacity: isMobile ? 0.8 : 1 }}
      />

      {/* Volumetric sun rays - Cinematic lighting (Egyptian sun + Ottoman lantern light) - Reduced on mobile */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Egyptian sun rays from upper right - Fewer on mobile */}
        {[...Array(isMobile ? 3 : 5)].map((_, i) => (
          <motion.div
            key={`sun-${i}`}
            className="absolute w-px h-full bg-gradient-to-b from-transparent via-yellow-400/15 sm:via-yellow-400/25 to-transparent"
            style={{
              left: `${20 + i * (isMobile ? 25 : 15)}%`,
              transform: `rotate(${-5 + i * (isMobile ? 3 : 2)}deg)`,
              transformOrigin: 'top center'
            }}
            animate={isMobile ? {
              opacity: [0.1, 0.25, 0.1],
              scaleY: [1, 1.2, 1]
            } : {
              opacity: [0.15, 0.35, 0.15],
              scaleY: [1, 1.3, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}
        {/* Ottoman lantern light - warm, flickering - Fewer on mobile */}
        {[...Array(isMobile ? 1 : 3)].map((_, i) => (
          <motion.div
            key={`lantern-${i}`}
            className="absolute w-20 h-20 sm:w-32 sm:h-32 rounded-full"
            style={{
              left: `${70 + i * (isMobile ? 0 : 10)}%`,
              top: `${30 + i * (isMobile ? 0 : 15)}%`,
              background: 'radial-gradient(circle, rgba(255, 193, 7, 0.15) 0%, rgba(255, 140, 0, 0.08) 50%, transparent 100%)',
              boxShadow: isMobile
                ? '0 0 40px rgba(255, 193, 7, 0.2), 0 0 60px rgba(255, 140, 0, 0.15)'
                : '0 0 60px rgba(255, 193, 7, 0.3), 0 0 100px rgba(255, 140, 0, 0.2)'
            }}
            animate={isMobile ? {
              opacity: [0.15, 0.3, 0.15],
              scale: [1, 1.1, 1]
            } : {
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 60px rgba(255, 193, 7, 0.3), 0 0 100px rgba(255, 140, 0, 0.2)',
                '0 0 80px rgba(255, 193, 7, 0.5), 0 0 120px rgba(255, 140, 0, 0.4)',
                '0 0 60px rgba(255, 193, 7, 0.3), 0 0 100px rgba(255, 140, 0, 0.2)'
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* YILMAZ Green accent - Machine representation (centerpiece) - Optimized for mobile */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4 sm:h-1/3 opacity-15 sm:opacity-12 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                to top,
                rgba(76, 175, 80, ${isMobile ? 0.15 : 0.25}) 0%,
                rgba(76, 175, 80, ${isMobile ? 0.1 : 0.15}) 40%,
                rgba(76, 175, 80, ${isMobile ? 0.03 : 0.05}) 70%,
                transparent 100%
              )
            `
          }}
        />
        {/* YILMAZ KD 400 M CNC & Circular Saw silhouette - Smaller on mobile */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] h-24 sm:h-40">
          {/* CNC Machining Center - Smaller on mobile */}
          <div
            className="absolute left-0 bottom-0 w-32 h-20 sm:w-64 sm:h-32"
            style={{
              background: 'linear-gradient(180deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.03) 100%)',
              clipPath: 'polygon(5% 100%, 15% 50%, 85% 50%, 95% 100%)',
              boxShadow: isMobile ? '0 0 20px rgba(76, 175, 80, 0.2)' : '0 0 40px rgba(76, 175, 80, 0.3)'
            }}
          />
          {/* Circular Saw - Smaller on mobile */}
          <motion.div
            className="absolute right-0 bottom-0 w-24 h-20 sm:w-48 sm:h-36"
            style={{
              background: 'linear-gradient(180deg, rgba(76, 175, 80, 0.18) 0%, rgba(76, 175, 80, 0.08) 100%)',
              clipPath: 'polygon(10% 100%, 20% 40%, 80% 40%, 90% 100%)',
              boxShadow: isMobile ? '0 0 25px rgba(76, 175, 80, 0.3)' : '0 0 50px rgba(76, 175, 80, 0.4)'
            }}
            animate={isMobile ? {} : {
              boxShadow: [
                '0 0 50px rgba(76, 175, 80, 0.4)',
                '0 0 70px rgba(76, 175, 80, 0.6)',
                '0 0 50px rgba(76, 175, 80, 0.4)'
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Spinning blade effect - Smaller on mobile */}
            <motion.div
              className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-white/15 sm:border-white/20"
              animate={{
                rotate: [0, 360]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        </div>
        {/* Golden sparks flying from the saw - Fewer on mobile */}
        <div className="absolute bottom-12 sm:bottom-20 left-1/2 translate-x-16 sm:translate-x-32">
          {[...Array(isMobile ? 6 : 12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(255, ${200 + Math.random() * 55}, 0, ${isMobile ? 0.8 : 1}) 0%, rgba(255, 140, 0, 0.3) 100%)`,
                boxShadow: isMobile ? '0 0 5px rgba(255, 200, 0, 0.6)' : '0 0 8px rgba(255, 200, 0, 0.8)',
                left: `${Math.random() * (isMobile ? 40 : 60)}px`,
                top: `${Math.random() * (isMobile ? 25 : 40)}px`
              }}
              animate={{
                y: [0, isMobile ? -40 : -60, isMobile ? -80 : -120],
                x: [0, Math.random() * (isMobile ? 25 : 40) - (isMobile ? 12 : 20), Math.random() * (isMobile ? 40 : 60) - (isMobile ? 20 : 30)],
                opacity: [1, 0.8, 0],
                scale: [1, 0.8, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>

      {/* Content overlay - Must be above all background elements */}
      <div className="relative z-[100]">
        {children}
      </div>
    </div>
  );
};

