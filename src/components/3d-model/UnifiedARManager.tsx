import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { detectSwiftXR, launchSwiftXR as launchSwiftXRNative } from '@/utils/swiftXRIntegration';
import {
    CheckCircle,
    Loader2,
    Monitor,
    Scan,
    Settings,
    Smartphone,
    Sparkles,
    XCircle,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './SwiftXR.css';

// AR Capability Detection Types
interface ARCapabilities {
  webXR: boolean;
  sceneViewer: boolean;
  quickLook: boolean;
  immersiveAR: boolean;
  hitTest: boolean;
  lightingEstimation: boolean;
  anchors: boolean;
  depthSensing: boolean;
}

interface DeviceInfo {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  version: string;
  supportsAR: boolean;
  preferredARMethod: 'webxr' | 'sceneviewer' | 'quicklook' | 'fallback';
}

interface UnifiedARManagerProps {
  modelPath: string;
  usdzPath?: string;
  enableWebXR?: boolean;
  enableSceneViewer?: boolean;
  enableQuickLook?: boolean;
  fallbackMode?: '3d' | 'image' | 'none';
  onARStart?: () => void;
  onAREnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

interface ARSessionState {
  isActive: boolean;
  method: string;
  startTime?: number;
  performance: {
    fps: number;
    memoryUsage: number;
    batteryLevel?: number;
  };
}

export function UnifiedARManager({
  modelPath,
  usdzPath,
  enableWebXR = true,
  enableSceneViewer = true,
  enableQuickLook = true,
  fallbackMode: _fallbackMode = '3d',
  onARStart,
  onAREnd,
  onError,
  className,
  children
}: UnifiedARManagerProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [capabilities, setCapabilities] = useState<ARCapabilities | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [arSession, setArSession] = useState<ARSessionState>({
    isActive: false,
    method: '',
    performance: { fps: 0, memoryUsage: 0 }
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { toast } = useToast();
  const performanceIntervalRef = useRef<NodeJS.Timeout>();

  // Device and capability detection
  useEffect(() => {
    const detectCapabilities = async () => {
      setIsDetecting(true);

      try {
        // Detect device platform
        const ua = navigator.userAgent;
        const platform = ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod') ? 'ios' :
                        ua.includes('Android') ? 'android' : 'desktop';

        const browser = ua.includes('Chrome') ? 'Chrome' :
                       ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                       ua.includes('Firefox') ? 'Firefox' :
                       ua.includes('Edge') ? 'Edge' : 'Unknown';

        const device: DeviceInfo = {
          platform,
          browser,
          version: navigator.appVersion,
          supportsAR: false,
          preferredARMethod: 'fallback'
        };

        // Check WebXR support
        let webXR = false;
        let immersiveAR = false;
        let hitTest = false;
        let lightingEstimation = false;
        let anchors = false;
        let depthSensing = false;

        if ('xr' in navigator) {
          try {
            const xr = (navigator as any).xr;
            if (xr && typeof xr.isSessionSupported === 'function') {
              immersiveAR = await xr.isSessionSupported('immersive-ar');
              webXR = immersiveAR;

              // Check for advanced features
              if (immersiveAR) {
                const session = await xr.requestSession('immersive-ar', {
                  requiredFeatures: ['hit-test'],
                  optionalFeatures: ['light-estimation', 'anchors', 'depth-sensing']
                });

                hitTest = session && typeof session.requestHitTestSource === 'function';
                lightingEstimation = session && 'light-estimation' in session;
                anchors = session && 'anchors' in session;
                depthSensing = session && 'depth-sensing' in session;

                if (session) session.end();
              }
            }
          } catch (error) {
            console.warn('WebXR detection failed:', error);
          }
        }

        // Check Scene Viewer (Android)
        const sceneViewer = platform === 'android' && ua.includes('Chrome');

        // Check Quick Look (iOS)
        const quickLook = platform === 'ios' && (browser === 'Safari' || ua.includes('CriOS'));

        const arCapabilities: ARCapabilities = {
          webXR,
          sceneViewer,
          quickLook,
          immersiveAR,
          hitTest,
          lightingEstimation,
          anchors,
          depthSensing
        };

        // Determine preferred AR method
        let preferredMethod: DeviceInfo['preferredARMethod'] = 'fallback';
        let supportsAR = false;

        if (webXR && enableWebXR) {
          preferredMethod = 'webxr';
          supportsAR = true;
        } else if (sceneViewer && enableSceneViewer && platform === 'android') {
          preferredMethod = 'sceneviewer';
          supportsAR = true;
        } else if (quickLook && enableQuickLook && platform === 'ios') {
          preferredMethod = 'quicklook';
          supportsAR = true;
        }

        device.supportsAR = supportsAR;
        device.preferredARMethod = preferredMethod;

        setDeviceInfo(device);
        setCapabilities(arCapabilities);

      } catch (error) {
        console.error('AR capability detection failed:', error);
        onError?.(error as Error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectCapabilities();
  }, [enableWebXR, enableSceneViewer, enableQuickLook, onError]);

  // Performance monitoring during AR sessions
  useEffect(() => {
    if (!arSession.isActive) {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
      return;
    }

    const monitorPerformance = () => {
      // FPS monitoring
      let fps = 0;
      let lastTime = performance.now();

      const measureFPS = () => {
        const currentTime = performance.now();
        fps = Math.round(1000 / (currentTime - lastTime));
        lastTime = currentTime;
      };

      // Memory usage (if available)
      const perfMemory = (performance as any).memory;
      const memoryUsage = perfMemory ?
        Math.round((perfMemory.usedJSHeapSize / perfMemory.totalJSHeapSize) * 100) : 0;

      // Battery level (if available)
      let batteryLevel: number | undefined;
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          batteryLevel = Math.round(battery.level * 100);
        });
      }

      setArSession(prev => ({
        ...prev,
        performance: {
          fps,
          memoryUsage,
          batteryLevel
        }
      }));

      requestAnimationFrame(measureFPS);
    };

    performanceIntervalRef.current = setInterval(monitorPerformance, 1000);

    return () => {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
    };
  }, [arSession.isActive]);

  // Helper functions for AR launch methods
  const launchWebXR = useCallback(async () => {
    if (!capabilities?.webXR) throw new Error('WebXR not supported');

    // WebXR implementation would go here
    // This would integrate with your existing EnhancedGLBViewer WebXR code
    console.log('Launching WebXR AR session');
  }, [capabilities?.webXR]);

  const launchSceneViewer = useCallback(async () => {
    if (!capabilities?.sceneViewer) throw new Error('Scene Viewer not supported');

    const url = new URL(modelPath, window.location.origin).toString();
    const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent('Industrial Machine')}`;

    window.location.href = sceneViewerUrl;
  }, [capabilities?.sceneViewer, modelPath]);

  const launchQuickLook = useCallback(async () => {
    if (!capabilities?.quickLook || !usdzPath) throw new Error('Quick Look not supported');

    // iOS Quick Look for USDZ files
    const link = document.createElement('a');
    link.href = usdzPath;
    link.rel = 'ar';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [capabilities?.quickLook, usdzPath]);

  // Launch AR experience
  const launchAR = useCallback(async (modelName?: string) => {
    if (!deviceInfo || !capabilities) return;

    try {
      setArSession(prev => ({ ...prev, isActive: true, startTime: Date.now() }));
      onARStart?.();

      // Prioritize native SwiftXR app on iOS
      if (deviceInfo.platform === 'ios') {
        const swiftXRDetection = await detectSwiftXR();
        if (swiftXRDetection.isInstalled) {
          const extractedModelName = modelPath 
            ? modelPath.split('/').pop()?.replace(/\.(glb|gltf)$/i, '') || modelName || 'fr222'
            : modelName || 'fr222';
          
          const fullModelUrl = modelPath?.startsWith('http') 
            ? modelPath 
            : `${window.location.origin}${modelPath}`;
          
          const success = await launchSwiftXRNative({
            modelName: extractedModelName,
            modelUrl: fullModelUrl,
            modelPath: modelPath,
            fallbackToWebXR: true,
            onSuccess: () => {
              console.log('SwiftXR native app launched successfully');
            },
            onFallback: () => {
              console.log('Falling back to WebXR/Quick Look');
            }
          });
          
          if (success) {
            return;
          }
        }
      }

      switch (deviceInfo.preferredARMethod) {
        case 'webxr':
          await launchWebXR();
          break;
        case 'sceneviewer':
          await launchSceneViewer();
          break;
        case 'quicklook':
          await launchQuickLook();
          break;
        default:
          await launchFallback();
          break;
      }

      toast({
        title: "SwiftXR AR Started",
        description: `Using ${deviceInfo.preferredARMethod} for optimal performance`,
        variant: "default",
      });

    } catch (error) {
      console.error('Failed to launch AR:', error);
      setArSession(prev => ({ ...prev, isActive: false }));

      toast({
        title: "SwiftXR Launch Failed",
        description: "Falling back to 3D preview mode",
        variant: "destructive",
      });

      onError?.(error as Error);
      await launchFallback();
    }
  }, [deviceInfo, capabilities, onARStart, onError, toast, modelPath, launchWebXR, launchSceneViewer, launchQuickLook]);

  // launchSwiftXR is now handled by swiftXRIntegration.ts
  // This function is kept for backward compatibility but uses the new integration

  const launchFallback = async () => {
    // Fallback to enhanced 3D viewer
    console.log('Launching 3D fallback mode');
  };

  const endARSession = useCallback(() => {
    setArSession(prev => ({ ...prev, isActive: false }));
    onAREnd?.();

    toast({
      title: "SwiftXR Session Ended",
      description: "Returning to standard view",
      variant: "default",
    });
  }, [onAREnd, toast]);

  // Render loading state
  if (isDetecting) {
    return (
      <Card className={cn("swiftxr-card w-full max-w-md", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-swiftxr-primary" />
            <span className="text-sm text-gray-600">SwiftXR: Detecting AR capabilities...</span>
          </div>
          <Progress value={undefined} className="mt-3" />
        </CardContent>
      </Card>
    );
  }

  // Render AR capability status
  return (
    <div className={cn("space-y-4", className)}>
      {/* SwiftXR Status Card */}
      <Card className="swiftxr-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-swiftxr-primary" />
            <span className="swiftxr-title">SwiftXR</span>
            {deviceInfo?.supportsAR && (
              <Badge variant="secondary" className="swiftxr-badge">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Platform:</span>
              <div className="flex items-center gap-2 mt-1">
                {deviceInfo?.platform === 'ios' && <Smartphone className="h-4 w-4" />}
                {deviceInfo?.platform === 'android' && <Smartphone className="h-4 w-4" />}
                {deviceInfo?.platform === 'desktop' && <Monitor className="h-4 w-4" />}
                <span className="capitalize">{deviceInfo?.platform}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Browser:</span>
              <div className="mt-1">{deviceInfo?.browser}</div>
            </div>
          </div>

          {/* AR Method */}
          <div>
            <span className="text-gray-500 text-sm">Preferred AR Method:</span>
            <div className="mt-1">
              <Badge variant={deviceInfo?.supportsAR ? "default" : "secondary"}>
                {deviceInfo?.preferredARMethod || 'None available'}
              </Badge>
            </div>
          </div>

          {/* Launch Button */}
          <Button
            onClick={() => launchAR()}
            disabled={!deviceInfo?.supportsAR}
            className="swiftxr-launch-button w-full"
            size="lg"
          >
            <Scan className="h-5 w-5 mr-2" />
            {deviceInfo?.supportsAR ? 'Launch SwiftXR AR' : 'SwiftXR Not Available'}
          </Button>

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-gray-500 hover:text-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      {showAdvanced && capabilities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AR Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {capabilities.webXR ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>WebXR</span>
              </div>

              <div className="flex items-center gap-2">
                {capabilities.sceneViewer ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Scene Viewer</span>
              </div>

              <div className="flex items-center gap-2">
                {capabilities.quickLook ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Quick Look</span>
              </div>

              <div className="flex items-center gap-2">
                {capabilities.hitTest ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Hit Testing</span>
              </div>

              <div className="flex items-center gap-2">
                {capabilities.lightingEstimation ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Lighting</span>
              </div>

              <div className="flex items-center gap-2">
                {capabilities.depthSensing ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Depth</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SwiftXR Session Status */}
      {arSession.isActive && (
        <Card className="swiftxr-session-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-swiftxr-primary" />
                <span className="text-sm font-medium">SwiftXR Session Active</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={endARSession}
                className="swiftxr-end-button"
              >
                End Session
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500">FPS:</span>
                <div className="font-mono">{arSession.performance.fps}</div>
              </div>
              <div>
                <span className="text-gray-500">Memory:</span>
                <div className="font-mono">{arSession.performance.memoryUsage}%</div>
              </div>
              <div>
                <span className="text-gray-500">Battery:</span>
                <div className="font-mono">
                  {arSession.performance.batteryLevel ? `${arSession.performance.batteryLevel}%` : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom children content */}
      {children}
    </div>
  );
}

export default UnifiedARManager;
