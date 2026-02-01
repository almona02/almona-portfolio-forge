import { Variants } from "framer-motion";

// Gold Tier Animation Constants
// "Spring Physics" inspired by iOS and high-end native apps

export const SPRING_TIGHT = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 1,
} as const;

export const SPRING_DEFAULT = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 1,
} as const;

export const SPRING_LOOSE = {
  type: "spring",
  stiffness: 100,
  damping: 15,
  mass: 1,
} as const;

// Transition Presets
export const TRANSITION_EASE_OUT = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1], // easeOutQuad equivalent
};

// Common Variants
export const FADE_IN: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" } 
  },
};

export const SCALE_IN: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: SPRING_DEFAULT
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

export const SLIDE_UP: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: SPRING_DEFAULT
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: { duration: 0.2 }
  },
};

export const SLIDE_IN_RIGHT: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: SPRING_DEFAULT 
  },
  exit: { 
    x: 20, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

export const STAGGER_CHILDREN = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  }
};

// Micro-Interaction Variants (Hover/Tap)
export const TAP_SCALE = {
  scale: 0.98,
  transition: { duration: 0.05 }
};

export const HOVER_LIFT = {
  y: -2,
  transition: SPRING_TIGHT
};

export const HOVER_GLOW = {
  boxShadow: "0 0 15px rgba(245, 158, 11, 0.4)",
  transition: { duration: 0.2 }
};
