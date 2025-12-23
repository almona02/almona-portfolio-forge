import React, { useState, useRef, useEffect } from 'react';
import { LazyAnimatePresence, LazyMotionDiv, LazyMotionButton } from '@/utils/lazyMotion';
import { Play, Pause, Volume2, VolumeX, X, Maximize2, Minimize2 } from 'lucide-react';

interface ProductVideoPlayerProps {
  youtubeUrl: string;
  thumbnailUrl?: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  autoPlay?: boolean;
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle youtu.be format
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/watch?v= format
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  
  // Handle youtube.com/embed/ format
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  
  return null;
};

export const ProductVideoPlayer: React.FC<ProductVideoPlayerProps> = ({
  youtubeUrl,
  _thumbnailUrl,
  productName,
  isOpen,
  onClose,
  autoPlay = true
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [_isPlaying, _setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const videoId = getYouTubeVideoId(youtubeUrl);
  
  // YouTube embed URL with parameters for minimal branding
  const embedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?` + new URLSearchParams({
        autoplay: autoPlay ? '1' : '0',
        mute: '1', // Start muted for autoplay
        controls: '0', // Hide default controls
        modestbranding: '1', // Minimal YouTube branding
        rel: '0', // Don't show related videos
        showinfo: '0', // Hide video info
        iv_load_policy: '3', // Hide annotations
        playsinline: '1', // Play inline on mobile
        loop: '1', // Loop the video
        playlist: videoId, // Required for loop to work
        enablejsapi: '1', // Enable JS API
        origin: window.location.origin
      }).toString()
    : null;

  // Note: Video playback is controlled via iframe autoplay parameter
  // No need for local isPlaying state as YouTube handles it

  // Handle escape key to close or exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        } else if (isOpen) {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isFullscreen, onClose]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = async () => {
    if (containerRef.current) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  if (!videoId) return null;

  return (
    <LazyAnimatePresence>
      {isOpen && (
        <LazyMotionDiv
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`bg-black overflow-hidden ${
            isFullscreen 
              ? 'fixed inset-0 z-[9999] rounded-none' 
              : 'absolute inset-0 z-20 rounded-t-xl'
          }`}
        >
          {/* Video Container */}
          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={embedUrl || ''}
              title={`${productName} Video`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            />
            
            {/* Custom Controls Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top gradient for close button visibility */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent" />
              
              {/* Bottom gradient for controls */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            
            {/* Close Button */}
            <LazyMotionButton
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-2 right-2 z-30 p-1.5 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors pointer-events-auto"
              aria-label="Close video"
            >
              <X className="w-4 h-4" />
            </LazyMotionButton>
            
            {/* Product Name Overlay */}
            <div className="absolute bottom-2 left-2 right-12 z-30">
              <p className="text-white text-xs font-medium truncate drop-shadow-lg">
                {productName}
              </p>
            </div>
            
            {/* Control Buttons - Bottom Right */}
            <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 pointer-events-auto">
              {/* Mute/Unmute Button */}
              <LazyMotionButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-1.5 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </LazyMotionButton>

              {/* Fullscreen Button */}
              <LazyMotionButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-1.5 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </LazyMotionButton>
            </div>
          </div>
        </LazyMotionDiv>
      )}
    </LazyAnimatePresence>
  );
};

// Compact video trigger button for product cards
interface VideoTriggerProps {
  onClick: () => void;
  isPlaying?: boolean;
}

export const VideoTrigger: React.FC<VideoTriggerProps> = ({ onClick, isPlaying = false }) => {
  return (
    <LazyMotionButton
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
        transition-all duration-200 shadow-lg
        ${isPlaying 
          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
        }
      `}
    >
      {isPlaying ? (
        <>
          <Pause className="w-3 h-3" />
          <span>Playing</span>
        </>
      ) : (
        <>
          <Play className="w-3 h-3" />
          <span>Video</span>
        </>
      )}
      </LazyMotionButton>
  );
};

export default ProductVideoPlayer;

