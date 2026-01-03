/**
 * Animation Utilities
 * 
 * Provides easing functions and animation helpers for smooth 3D animations.
 * Constitutional: Pure mathematical functions, no ML/AI.
 */

/**
 * Ease-in-out cubic function for smooth animations
 * Provides acceleration at start and deceleration at end
 * 
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value from 0 to 1
 */
export function easeInOutCubic(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t < 0.5 
    ? 4 * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease-out cubic function (deceleration only)
 * 
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value from 0 to 1
 */
export function easeOutCubic(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease-in cubic function (acceleration only)
 * 
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value from 0 to 1
 */
export function easeInCubic(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t * t * t;
}

/**
 * Linear interpolation with easing
 * 
 * @param start - Start value
 * @param end - End value
 * @param t - Progress from 0 to 1
 * @param easingFn - Easing function (default: easeInOutCubic)
 * @returns Interpolated value
 */
export function lerp(
  start: number,
  end: number,
  t: number,
  easingFn: (t: number) => number = easeInOutCubic
): number {
  const eased = easingFn(t);
  return start + (end - start) * eased;
}

