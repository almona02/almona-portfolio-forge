import { useCallback } from 'react';

/**
 * Custom hook for industrial sound effects
 * Provides mechanical "thunk" sounds for UI interactions
 */
export const useIndustrialSound = () => {
  const playClickSound = useCallback(() => {
    // Create a simple mechanical "thunk" sound using Web Audio API
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a short, mechanical sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure the sound to be a short, mechanical "thunk"
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        // Silently fail if audio context creation fails
        console.debug('Audio context not available:', error);
      }
    }
  }, []);

  const playHoverSound = useCallback(() => {
    // Create a subtle hover sound
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Subtle hover sound
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      } catch (error) {
        console.debug('Audio context not available:', error);
      }
    }
  }, []);

  return {
    playClickSound,
    playHoverSound
  };
};
