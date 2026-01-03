import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { detectSwiftXR, launchARWithFallback } from '@/utils/swiftXRIntegration';
import {
    CheckCircle,
    Loader2,
    Monitor,
    Scan,
    Smartphone,
    Sparkles,
    XCircle,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import './SwiftXR.css';

interface SwiftXRManagerProps {
  modelPath: string;
  modelName?: string;
  enableWebXR?: boolean;
  enableSceneViewer?: boolean;
  enableQuickLook?: boolean;
  onARStart?: () => void;
  onAREnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

interface ARCapabilities {
  webXR: boolean;
  sceneViewer: boolean;
  quickLook: boolean;
  immersiveAR: boolean;
  hitTest: boolean;
  lightingEstimation: boolean;
}

interface DeviceInfo {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  supportsAR: boolean;
  preferredARMethod: 'webxr' | 'sceneviewer' | 'quicklook' | 'fallback';
}

export function SwiftXRManager({
  modelPath,
  modelName = 'Model',
  enableWebXR = true,
  enableSceneViewer = true,
  enableQuickLook = true,
  onARStart,
  onAREnd,
  onError,
  className,
  children
}: SwiftXRManagerProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [capabilities, setCapabilities] = useState<ARCapabilities | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isARSessionActive, setIsARSessionActive] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [swiftXRInstalled, setSwiftXRInstalled] = useState<boolean | null>(null);
  const [currentARMethod, setCurrentARMethod] = useState<string>('');
  const { toast } = useToast();

  // Device and capability detection
  useEffect(() => {
    const detectCapabilities = async () => {
      setIsDetecting(true);
      setLoadingProgress(0);

      try {
        const ua = navigator.userAgent;
        const platform = ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod') ? 'ios' :
                        ua.includes('Android') ? 'android' : 'desktop';

        const browser = ua.includes('Chrome') ? 'Chrome' :
                       ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                       ua.includes('Firefox') ? 'Firefox' :
                       ua.includes('Edge') ? 'Edge' : 'Unknown';

        setLoadingProgress(30);

        let webXR = false;
        let immersiveAR = false;
        let hitTest = false;
        let lightingEstimation = false;

        if ('xr' in navigator && enableWebXR) {
          try {
            const xr = (navigator as any).xr;
            if (xr && typeof xr.isSessionSupported === 'function') {
              immersiveAR = await xr.isSessionSupported('immersive-ar');
              webXR = immersiveAR;
              setLoadingProgress(60);

              if (immersiveAR) {
                try {
                  const session = await xr.requestSession('immersive-ar', {
                    requiredFeatures: ['hit-test'],
                    optionalFeatures: ['light-estimation', 'anchors']
                  });
                  hitTest = session && typeof session.requestHitTestSource === 'function';
                  lightingEstimation = session && 'light-estimation' in session;
                  if (session) session.end();
                } catch {
                  // Session test failed, but AR is still supported
                }
              }
            }
          } catch (error) {
            console.warn('SwiftXR: WebXR detection failed', error);
          }
        }

        setLoadingProgress(80);

        const sceneViewer = platform === 'android' && ua.includes('Chrome') && enableSceneViewer;
        const quickLook = platform === 'ios' && (browser === 'Safari' || ua.includes('CriOS')) && enableQuickLook;

        const arCapabilities: ARCapabilities = {
          webXR,
          sceneViewer,
          quickLook,
          immersiveAR,
          hitTest,
          lightingEstimation
        };

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

        const device: DeviceInfo = {
          platform,
          browser,
          supportsAR,
          preferredARMethod: preferredMethod
        };

        setDeviceInfo(device);
        setCapabilities(arCapabilities);
        setLoadingProgress(100);

        // Check if SwiftXR app is installed (iOS only)
        if (platform === 'ios') {
          const swiftXRDetection = await detectSwiftXR();
          setSwiftXRInstalled(swiftXRDetection.isInstalled);
          
          // Update preferred method if SwiftXR is installed
          if (swiftXRDetection.isInstalled) {
            device.preferredARMethod = 'swiftxr' as any;
            device.supportsAR = true;
            setDeviceInfo(device);
          }
        }

      } catch (error) {
        console.error('SwiftXR: Capability detection failed', error);
        onError?.(error as Error);
      } finally {
        setTimeout(() => setIsDetecting(false), 300);
      }
    };

    detectCapabilities();
  }, [enableWebXR, enableSceneViewer, enableQuickLook, onError]);

  const launchSwiftXR = useCallback(async () => {
    if (!deviceInfo || !capabilities) return;

    try {
      setIsARSessionActive(true);
      onARStart?.();

      // Extract model name from path
      const extractedModelName = modelPath 
        ? modelPath.split('/').pop()?.replace(/\.(glb|gltf)$/i, '') || modelName
        : modelName;

      // Build full model URL
      const fullModelUrl = modelPath?.startsWith('http') 
        ? modelPath 
        : `${window.location.origin}${modelPath}`;

      // Use intelligent fallback chain
      const success = await launchARWithFallback(
        fullModelUrl,
        extractedModelName,
        {
          preferNative: true,
          onMethodChange: (method) => {
            setCurrentARMethod(method);
            console.log(`SwiftXR: Using AR method: ${method}`);
          }
        }
      );

      if (success) {
        toast({
          title: "SwiftXR AR Started",
          description: `Experience ${extractedModelName} in augmented reality`,
          variant: "default",
        });
      } else {
        throw new Error('AR launch failed');
      }

    } catch (error) {
      console.error('SwiftXR: Failed to launch AR', error);
      setIsARSessionActive(false);
      onAREnd?.();

      toast({
        title: "SwiftXR Launch Failed",
        description: "Falling back to 3D preview mode",
        variant: "destructive",
      });

      onError?.(error as Error);
    }
  }, [deviceInfo, capabilities, modelName, modelPath, onARStart, onAREnd, onError, toast]);

  // These methods are now handled by swiftXRIntegration.ts
  // Keeping them for backward compatibility but they're not used

  const endARSession = useCallback(() => {
    setIsARSessionActive(false);
    onAREnd?.();

    toast({
      title: "SwiftXR Session Ended",
      description: "Returning to standard view",
      variant: "default",
    });
  }, [onAREnd, toast]);

  // Loading state
  if (isDetecting) {
    return (
      <Card className={cn("swiftxr-card", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-swiftxr-primary" />
            <span className="text-sm text-gray-600">SwiftXR: Detecting AR capabilities...</span>
          </div>
          <Progress value={loadingProgress} className="mt-3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("swiftxr-container", className)}>
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
            <span className="text-gray-500 text-sm">AR Method:</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={deviceInfo?.supportsAR ? "default" : "secondary"} className="swiftxr-method-badge">
                {currentARMethod || deviceInfo?.preferredARMethod || 'None available'}
              </Badge>
              {swiftXRInstalled === true && (
                <Badge className="swiftxr-badge-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Native App
                </Badge>
              )}
            </div>
          </div>

          {/* Launch Button */}
          <Button
            onClick={launchSwiftXR}
            disabled={!deviceInfo?.supportsAR || isARSessionActive}
            className="swiftxr-launch-button w-full"
            size="lg"
          >
            <Scan className="h-5 w-5 mr-2" />
            {isARSessionActive ? 'SwiftXR Active' : deviceInfo?.supportsAR ? 'Launch SwiftXR AR' : 'AR Not Available'}
          </Button>

          {/* Capabilities */}
          {capabilities && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
              <div className="flex items-center gap-2">
                {capabilities.webXR ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>WebXR</span>
              </div>
              <div className="flex items-center gap-2">
                {capabilities.hitTest ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Hit Test</span>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* AR Session Status */}
      {isARSessionActive && (
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
          </CardContent>
        </Card>
      )}

      {/* Custom children content */}
      {children}
    </div>
  );
}

export default SwiftXRManager;

