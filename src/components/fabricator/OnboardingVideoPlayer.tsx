/**
 * OnboardingVideoPlayer Component
 * ---------------------------------------------------------------------------
 * Video player for onboarding tutorial steps
 * 
 * Features:
 * - Play/pause controls
 * - Progress tracking
 * - Responsive design
 * - Loading states
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Progress } from '@/shared/ui/ui/progress';
import { cn } from '@/lib/utils';

export interface OnboardingVideoPlayerProps {
  /** Video URL (can be local or remote) */
  videoUrl?: string;
  /** Poster image URL (shown before video loads) */
  posterUrl?: string;
  /** Video title */
  title?: string;
  /** Callback when video ends */
  onVideoEnd?: (duration?: number) => void;
  /** Callback when video starts playing */
  onPlay?: () => void;
  /** Callback when video progress changes */
  onProgress?: (progress: number) => void;
  /** Auto-play video */
  autoPlay?: boolean;
  /** Show controls */
  showControls?: boolean;
  /** Custom className */
  className?: string;
}

export const OnboardingVideoPlayer: React.FC<OnboardingVideoPlayerProps> = ({
  videoUrl,
  posterUrl,
  title,
  onVideoEnd,
  onPlay,
  onProgress,
  autoPlay = false,
  showControls = true,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        const currentProgress = (video.currentTime / video.duration) * 100;
        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [onProgress]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIsPlaying(false);
      const duration = video.duration || 0;
      onVideoEnd?.(duration);
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [onVideoEnd]);

  // Expose video duration for analytics
  const _getVideoDuration = (): number => {
    return videoRef.current?.duration || 0;
  };

  // Handle video loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Handle video play event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, [onPlay]);

  // Auto-play effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => {
        setIsPlaying(true);
        onPlay?.();
      }).catch(() => {
        // Auto-play was prevented (browser policy)
        setIsPlaying(false);
      });
    }
  }, [autoPlay, videoUrl, onPlay]);

  // Sync playing state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        onPlay?.();
      }).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    } else if ((video as any).mozRequestFullScreen) {
      (video as any).mozRequestFullScreen();
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className={cn('flex items-center justify-center h-64 bg-gray-800/50 rounded-lg', className)}>
        <p className="text-gray-400">No video available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-64 bg-gray-800/50 rounded-lg', className)}>
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => {
            setError(null);
            setIsLoading(true);
            if (videoRef.current) {
              videoRef.current.load();
            }
          }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        className="w-full h-auto max-h-[500px]"
        playsInline
        preload="metadata"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <Progress value={progress} className="h-1.5" />

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:text-amber-500"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:text-amber-500"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>

                <span className="text-sm text-white/80">
                  {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {title && (
                  <span className="text-sm text-white/80 font-medium">{title}</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  className="text-white hover:text-amber-500"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlay}
            className="h-16 w-16 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white/20"
          >
            <Play className="h-8 w-8 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingVideoPlayer;

