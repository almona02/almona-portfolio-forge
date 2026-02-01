import { Hardener } from '@/lib/error/Hardener';
import { cn } from '@/lib/utils';
import { AlertCircle, Camera, CheckCircle, Flashlight, RotateCcw, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// QR Scanner configuration
export interface QRScannerConfig {
  facingMode: 'user' | 'environment';
  aspectRatio?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  zoom?: number;
  torch?: boolean;
}

// Scan result interface
export interface QRScanResult {
  text: string;
  format: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

// Scanner props
export interface QRScannerProps {
  config?: Partial<QRScannerConfig>;
  onScan?: (result: QRScanResult) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
  overlayClassName?: string;
  showControls?: boolean;
  enableLocation?: boolean;
  autoCloseOnScan?: boolean;
  scanDelay?: number; // Delay between scans in ms
}

// Scanner state
interface ScannerState {
  isActive: boolean;
  hasPermission: boolean;
  isScanning: boolean;
  torchSupported: boolean;
  torchEnabled: boolean;
  facingMode: 'user' | 'environment';
  error: string | null;
  lastScanTime: number;
}

// QR Scanner component with gold-tier mobile UX
const QRScanner: React.FC<QRScannerProps> = ({
  config = {},
  onScan,
  onError,
  onClose,
  className,
  overlayClassName,
  showControls = true,
  enableLocation = false,
  autoCloseOnScan = true,
  scanDelay = 1000,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const _hardener = React.useMemo(() => new Hardener(), []);

  const [state, setState] = useState<ScannerState>({
    isActive: false,
    hasPermission: false,
    isScanning: false,
    torchSupported: false,
    torchEnabled: false,
    facingMode: config.facingMode || 'environment',
    error: null,
    lastScanTime: 0,
  });

  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Default configuration
  const defaultConfig = useMemo<QRScannerConfig>(() => ({
    facingMode: 'environment',
    aspectRatio: 16/9,
    width: 640,
    height: 480,
    frameRate: 30,
    zoom: 1,
    torch: false,
    ...config,
  }), [config]);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: defaultConfig.facingMode,
          width: { ideal: defaultConfig.width },
          height: { ideal: defaultConfig.height },
          frameRate: { ideal: defaultConfig.frameRate },
          aspectRatio: defaultConfig.aspectRatio,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;
          videoRef.current.onloadedmetadata = () => resolve();
        });

        await videoRef.current.play();

        // Check for torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        const torchSupported = 'torch' in capabilities;

        setState(prev => ({
          ...prev,
          isActive: true,
          hasPermission: true,
          torchSupported,
        }));

        // Start scanning
        startScanning();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        hasPermission: false,
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [defaultConfig, onError, startScanning]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      isScanning: false,
    }));
  }, []);

  // Toggle torch/flashlight
  const toggleTorch = useCallback(async () => {
    if (!state.torchSupported || !streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newTorchState = !state.torchEnabled;

      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as any],
      });

      setState(prev => ({
        ...prev,
        torchEnabled: newTorchState,
      }));
    } catch (error) {
      console.error('Failed to toggle torch:', error);
    }
  }, [state.torchSupported, state.torchEnabled]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    const newFacingMode = state.facingMode === 'user' ? 'environment' : 'user';

    setState(prev => ({
      ...prev,
      facingMode: newFacingMode,
    }));

    // Restart camera with new facing mode
    stopCamera();
    setTimeout(() => {
      initializeCamera();
    }, 100);
  }, [state.facingMode, stopCamera, initializeCamera]);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  // Process QR code from canvas
  const processQRCode = useCallback(async (_imageData: ImageData): Promise<string | null> => {
    // This is a simplified QR processing implementation
    // In a real implementation, you would use a QR library like jsQR
    // For now, we'll simulate QR detection

    try {
      // Simulate QR processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock QR detection - in real implementation, use jsQR or similar
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      // return code?.data || null;

      // For demo purposes, return null (no QR found)
      return null;
    } catch (error) {
      console.error('QR processing error:', error);
      return null;
    }
  }, []);

  // Capture frame and scan for QR codes
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !state.isActive || isProcessing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR processing
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    setIsProcessing(true);

    try {
      const qrText = await processQRCode(imageData);

      if (qrText) {
        const now = Date.now();

        // Check scan delay
        if (now - state.lastScanTime < scanDelay) {
          return;
        }

        let location: QRScanResult['location'] | undefined;

        // Get location if enabled
        if (enableLocation) {
          try {
            const coords = await getCurrentLocation();
            location = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
            };
          } catch (error) {
            console.warn('Failed to get location:', error);
          }
        }

        const result: QRScanResult = {
          text: qrText,
          format: 'QR_CODE', // In real implementation, detect format
          timestamp: now,
          location,
        };

        setScanResult(result);
        setState(prev => ({ ...prev, lastScanTime: now }));

        onScan?.(result);

        if (autoCloseOnScan) {
          setTimeout(() => {
            onClose?.();
          }, 1500); // Show success feedback for 1.5s
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      onError?.(error instanceof Error ? error : new Error('Scan failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [
    state.isActive,
    state.lastScanTime,
    scanDelay,
    enableLocation,
    isProcessing,
    processQRCode,
    getCurrentLocation,
    onScan,
    onError,
    autoCloseOnScan,
    onClose,
  ]);

  // Start scanning loop
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(scanFrame, 200); // Scan every 200ms
    setState(prev => ({ ...prev, isScanning: true }));
  }, [scanFrame]);

  // Stop scanning
  const _stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, isScanning: false }));
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    setScanResult(null);
    onClose?.();
  }, [stopCamera, onClose]);

  // Initialize on mount
  useEffect(() => {
    initializeCamera();

    return () => {
      stopCamera();
    };
  }, [initializeCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        disablePictureInPicture
      />

      {/* Hidden canvas for processing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Scanning overlay */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        overlayClassName
      )}>
        {/* Scanning frame */}
        <div className="relative">
          {/* Corner brackets */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>

          {/* Scanning area */}
          <div className="w-64 h-64 border-2 border-white/50 bg-transparent">
            {/* Animated scanning line */}
            {state.isScanning && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Scan result feedback */}
        {scanResult && (
          <div className="absolute bottom-20 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">QR Code Scanned!</span>
            </div>
            <p className="text-sm mt-1 opacity-90 truncate">{scanResult.text}</p>
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Camera Error</span>
            </div>
            <p className="text-sm mt-1 opacity-90">{state.error}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
          {/* Torch button */}
          {state.torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={cn(
                "p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20",
                "hover:bg-black/70 transition-colors",
                state.torchEnabled && "bg-yellow-500/20 border-yellow-400/50"
              )}
              aria-label={state.torchEnabled ? "Turn off flashlight" : "Turn on flashlight"}
            >
              <Flashlight
                className={cn(
                  "h-6 w-6 text-white",
                  state.torchEnabled && "text-yellow-400"
                )}
              />
            </button>
          )}

          {/* Switch camera button */}
          <button
            type="button"
            onClick={switchCamera}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
            aria-label="Switch camera"
          >
            <RotateCcw className="h-6 w-6 text-white" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
            aria-label="Close scanner"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {!state.isActive && !state.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-sm">Initializing camera...</p>
          </div>
        </div>
      )}

      {/* Permission denied */}
      {!state.hasPermission && state.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-8">
          <div className="text-center">
            <Camera className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Camera Access Required</h3>
            <p className="text-gray-300 text-sm mb-4">
              Please allow camera access to scan QR codes.
            </p>
            <button
              type="button"
              onClick={initializeCamera}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { QRScanner };

