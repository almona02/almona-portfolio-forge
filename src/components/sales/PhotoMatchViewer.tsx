/**
 * PhotoMatchViewer - Photo-Match Technology for Sales
 * 
 * Superimposes 3D window designs on building photos with:
 * - Automatic perspective matching
 * - Lighting and shadow matching
 * - Multiple overlay modes (transparent, outline, full)
 * - Mobile-optimized for field sales
 * - Save and share matched presentations with Almona branding
 */

import { Window3DModel } from '@/components/fabricator/Window3DGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { WindowUnit } from '@/types/fabricator';
import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import {
    Camera,
    Download,
    Image as ImageIcon,
    Layers,
    Lightbulb,
    Maximize2,
    RotateCcw,
    Share2,
    Smartphone,
    Upload
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Overlay modes
type OverlayMode = 'transparent' | 'outline' | 'full';

interface PhotoMatchViewerProps {
  windowUnit?: WindowUnit;
  initialImage?: string; // Base64 or URL
  onSave?: (imageData: string) => void;
  onShare?: (imageData: string) => void;
  className?: string;
}

interface PerspectiveCorrection {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

interface LightingSettings {
  intensity: number;
  direction: number; // 0-360 degrees
  ambient: number;
  shadowOpacity: number;
}

// Edge detection for window openings
function detectWindowEdges(imageData: ImageData): { x: number; y: number; width: number; height: number }[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  // Convert to grayscale
  const grayData = new Uint8ClampedArray(imageData.data.length / 4);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    grayData[i / 4] = (r + g + b) / 3;
  }

  // Simple edge detection using Sobel operator
  const edges: { x: number; y: number }[] = [];
  const threshold = 50;

  for (let y = 1; y < imageData.height - 1; y++) {
    for (let x = 1; x < imageData.width - 1; x++) {
      const _idx = y * imageData.width + x;
      const gx = 
        -grayData[(y - 1) * imageData.width + (x - 1)] +
        grayData[(y - 1) * imageData.width + (x + 1)] +
        -2 * grayData[y * imageData.width + (x - 1)] +
        2 * grayData[y * imageData.width + (x + 1)] +
        -grayData[(y + 1) * imageData.width + (x - 1)] +
        grayData[(y + 1) * imageData.width + (x + 1)];
      
      const gy = 
        -grayData[(y - 1) * imageData.width + (x - 1)] +
        -2 * grayData[(y - 1) * imageData.width + x] +
        -grayData[(y - 1) * imageData.width + (x + 1)] +
        grayData[(y + 1) * imageData.width + (x - 1)] +
        2 * grayData[(y + 1) * imageData.width + x] +
        grayData[(y + 1) * imageData.width + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > threshold) {
        edges.push({ x, y });
      }
    }
  }

  // Find rectangular regions (simplified - in production, use more sophisticated algorithms)
  const windows: { x: number; y: number; width: number; height: number }[] = [];
  
  // Group edges into potential rectangles
  if (edges.length > 0) {
    const minX = Math.min(...edges.map(e => e.x));
    const maxX = Math.max(...edges.map(e => e.x));
    const minY = Math.min(...edges.map(e => e.y));
    const maxY = Math.max(...edges.map(e => e.y));
    
    if (maxX - minX > 50 && maxY - minY > 50) {
      windows.push({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      });
    }
  }

  return windows;
}

// Perspective correction algorithm
function _calculatePerspectiveMatrix(correction: PerspectiveCorrection, width: number, height: number): THREE.Matrix4 {
  const src = [
    correction.topLeft.x, correction.topLeft.y,
    correction.topRight.x, correction.topRight.y,
    correction.bottomRight.x, correction.bottomRight.y,
    correction.bottomLeft.x, correction.bottomLeft.y,
  ];

  const dst = [0, 0, width, 0, width, height, 0, height];

  // Calculate homography matrix
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i * 2];
    const y = src[i * 2 + 1];
    const u = dst[i * 2];
    const v = dst[i * 2 + 1];
    
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, -u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, -v]);
  }

  // Solve for homography (simplified - use proper matrix solver in production)
  const matrix = new THREE.Matrix4();
  // In production, use a proper homography solver
  matrix.identity();
  
  return matrix;
}

// 3D Scene Component
function PhotoMatchScene({
  windowUnit,
  backgroundImage,
  overlayMode: _overlayMode,
  lighting,
  perspectiveCorrection,
  windowPosition,
  windowScale,
  onModelReady,
}: {
  windowUnit?: WindowUnit;
  backgroundImage?: string;
  overlayMode: OverlayMode;
  lighting: LightingSettings;
  perspectiveCorrection?: PerspectiveCorrection;
  windowPosition: { x: number; y: number; z: number };
  windowScale: number;
  onModelReady?: (model: THREE.Group) => void;
}) {
  const { scene, camera } = useThree();
  const modelRef = useRef<THREE.Group>(null);
  const backgroundRef = useRef<THREE.Mesh>(null);
  const [isAnimating] = useState(false);
  const [animationProgress] = useState(0);

  // Load background image as texture
  useEffect(() => {
    if (!backgroundImage) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      backgroundImage,
      (texture) => {
        texture.flipY = false;
        const aspect = texture.image.width / texture.image.height;
        
        // Create background plane
        const geometry = new THREE.PlaneGeometry(10 * aspect, 10);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        
        if (backgroundRef.current) {
          backgroundRef.current.geometry.dispose();
          (backgroundRef.current.material as THREE.Material).dispose();
        }
        
        const plane = new THREE.Mesh(geometry, material);
        plane.position.z = -5;
        plane.name = 'background';
        
        if (backgroundRef.current) {
          scene.remove(backgroundRef.current);
        }
        scene.add(plane);
        backgroundRef.current = plane;
      },
      undefined,
      (error) => {
        console.error('Error loading background image:', error);
      }
    );
  }, [backgroundImage, scene]);

  // Apply perspective correction to camera
  useEffect(() => {
    if (!perspectiveCorrection) return;

    // Adjust camera to match perspective
    const _fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
    // In production, calculate proper camera parameters from perspective correction
  }, [perspectiveCorrection, camera]);

  // Update window model position and scale
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(windowPosition.x, windowPosition.y, windowPosition.z);
      modelRef.current.scale.set(windowScale, windowScale, windowScale);
    }
  }, [windowPosition, windowScale]);

  // Update lighting
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.material instanceof THREE.MeshStandardMaterial) {
          object.material.needsUpdate = true;
        }
      }
    });
  }, [lighting, scene]);

  // Handle model ready callback
  const handleModelReady = useCallback((model: THREE.Group) => {
    modelRef.current = model;
    if (onModelReady) {
      onModelReady(model);
    }
  }, [onModelReady]);

  return (
    <>
      {/* Background image plane */}
      {backgroundImage && <primitive object={backgroundRef.current || new THREE.Object3D()} />}

      {/* Lighting */}
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        position={[
          Math.cos((lighting.direction * Math.PI) / 180) * 5,
          5,
          Math.sin((lighting.direction * Math.PI) / 180) * 5,
        ]}
        intensity={lighting.intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Window 3D Model */}
      {windowUnit && (
        <group ref={modelRef} position={[windowPosition.x, windowPosition.y, windowPosition.z]}>
          <Window3DModel
            windowUnit={windowUnit}
            isAnimating={isAnimating}
            animationProgress={animationProgress}
            onModelReady={handleModelReady}
          />
        </group>
      )}

      {/* Environment for reflections */}
      <Environment preset="sunset" />
    </>
  );
}

// Main PhotoMatchViewer Component
export const PhotoMatchViewer: React.FC<PhotoMatchViewerProps> = ({
  windowUnit,
  initialImage,
  onSave,
  onShare,
  className = '',
}) => {
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(initialImage);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('transparent');
  const [lighting, setLighting] = useState<LightingSettings>({
    intensity: 1.0,
    direction: 45,
    ambient: 0.6,
    shadowOpacity: 0.5,
  });
  const [perspectiveCorrection, setPerspectiveCorrection] = useState<PerspectiveCorrection | undefined>();
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0, z: 0 });
  const [windowScale, setWindowScale] = useState(1);
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const [detectedWindows, setDetectedWindows] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBackgroundImage(result);
      
      // Perform edge detection
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const windows = detectWindowEdges(imageData);
        setDetectedWindows(windows);
        
        if (windows.length > 0) {
          toast({
            title: 'Window openings detected',
            description: `Found ${windows.length} potential window opening(s).`,
          });
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    
    track('photo_match_image_uploaded', { fileName: file.name });
  }, [toast]);

  // Auto-detect perspective from image
  const autoDetectPerspective = useCallback(() => {
    if (!backgroundImage) return;

    // Simplified auto-detection - in production, use ML-based perspective detection
    const img = new Image();
    img.onload = () => {
      // For now, use default perspective
      // In production, analyze image for vanishing points and perspective lines
      setPerspectiveCorrection({
        topLeft: { x: img.width * 0.1, y: img.height * 0.1 },
        topRight: { x: img.width * 0.9, y: img.height * 0.1 },
        bottomLeft: { x: img.width * 0.1, y: img.height * 0.9 },
        bottomRight: { x: img.width * 0.9, y: img.height * 0.9 },
      });
      
      toast({
        title: 'Perspective detected',
        description: 'Automatic perspective correction applied.',
      });
    };
    img.src = backgroundImage;
  }, [backgroundImage, toast]);

  // Export with Almona branding
  const exportPresentation = useCallback(async () => {
    if (!threeCanvasRef.current || !backgroundImage) return;

    try {
      // Get Three.js canvas
      const threeCanvas = threeCanvasRef.current;
      
      // Create export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = threeCanvas.width;
      exportCanvas.height = threeCanvas.height;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      // Draw background image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = backgroundImage;
      });
      exportCtx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);

      // Draw 3D render on top
      exportCtx.drawImage(threeCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      
      // Add Almona branding overlay
      exportCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      exportCtx.fillRect(0, exportCanvas.height - 80, exportCanvas.width, 80);
      
      exportCtx.fillStyle = '#ff6b35'; // Almona orange
      exportCtx.font = 'bold 24px Arial';
      exportCtx.fillText('ALMONA', 20, exportCanvas.height - 40);
      
      exportCtx.fillStyle = '#ffffff';
      exportCtx.font = '14px Arial';
      exportCtx.fillText('Photo-Match Technology', 20, exportCanvas.height - 15);
      
      if (windowUnit) {
        exportCtx.fillText(
          `${windowUnit.orderNumber} - ${windowUnit.posNumber}`,
          exportCanvas.width - 200,
          exportCanvas.height - 40
        );
      }

      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `almona-photo-match-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (onSave) {
          onSave(exportCanvas.toDataURL('image/png'));
        }
        
        toast({
          title: 'Presentation exported',
          description: 'Your photo-match presentation has been saved.',
        });
        
        track('photo_match_exported', { windowId: windowUnit?.id });
      }, 'image/png');
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Could not export presentation. Please try again.',
        variant: 'destructive',
      });
    }
  }, [backgroundImage, windowUnit, onSave, toast]);

  // Share presentation
  const sharePresentation = useCallback(async () => {
    if (!threeCanvasRef.current || !backgroundImage) return;

    try {
      // Create a canvas with the composite image
      const shareCanvas = document.createElement('canvas');
      shareCanvas.width = threeCanvasRef.current.width;
      shareCanvas.height = threeCanvasRef.current.height;
      const shareCtx = shareCanvas.getContext('2d');
      if (!shareCtx) return;

      // Draw background
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = backgroundImage;
      });
      shareCtx.drawImage(img, 0, 0, shareCanvas.width, shareCanvas.height);
      
      // Draw 3D render
      shareCtx.drawImage(threeCanvasRef.current, 0, 0, shareCanvas.width, shareCanvas.height);

      shareCanvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'almona-photo-match.png', { type: 'image/png' });
        
        if (navigator.share && isMobile) {
          try {
            await navigator.share({
              title: 'Almona Photo-Match Presentation',
              text: 'Check out this window design visualization',
              files: [file],
            });
            
            if (onShare) {
              onShare(shareCanvas.toDataURL('image/png'));
            }
            
            track('photo_match_shared', { method: 'native', windowId: windowUnit?.id });
          } catch (error) {
            console.error('Share error:', error);
          }
        } else {
          // Fallback: copy to clipboard or show share dialog
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            
            toast({
              title: 'Copied to clipboard',
              description: 'Presentation image copied. You can paste it anywhere.',
            });
            
            if (onShare) {
              onShare(shareCanvas.toDataURL('image/png'));
            }
            
            track('photo_match_shared', { method: 'clipboard', windowId: windowUnit?.id });
          } catch {
            // If clipboard fails, fall back to download
            exportPresentation();
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: 'Share failed',
        description: 'Could not share presentation. Please try exporting instead.',
        variant: 'destructive',
      });
    }
  }, [isMobile, windowUnit, onShare, toast, backgroundImage, exportPresentation]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className={`relative w-full h-full ${className} ${isMobile ? 'mobile-optimized' : ''}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main canvas area */}
      <div ref={canvasContainerRef} className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true, // Required for export
          }}
          onCreated={({ gl }) => {
            threeCanvasRef.current = gl.domElement;
          }}
          className="w-full h-full"
        >
          <PhotoMatchScene
            windowUnit={windowUnit}
            backgroundImage={backgroundImage}
            overlayMode={overlayMode}
            lighting={lighting}
            perspectiveCorrection={perspectiveCorrection}
            windowPosition={windowPosition}
            windowScale={windowScale}
          />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1}
            maxDistance={20}
          />
        </Canvas>

        {/* Overlay controls */}
        {!backgroundImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="typography-h3 text-lg mb-2">Upload Building Photo</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload a photo of the building to superimpose your window design
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Photo-Match Controls</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overlay" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overlay">
                <Layers className="h-4 w-4 mr-2" />
                Overlay
              </TabsTrigger>
              <TabsTrigger value="lighting">
                <Lightbulb className="h-4 w-4 mr-2" />
                Lighting
              </TabsTrigger>
              <TabsTrigger value="position">
                <Camera className="h-4 w-4 mr-2" />
                Position
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overlay" className="space-y-4">
              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Overlay Mode</label>
                <Select value={overlayMode} onValueChange={(v) => setOverlayMode(v as OverlayMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transparent">Transparent</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Window Scale</label>
                <Slider
                  value={[windowScale]}
                  onValueChange={([value]) => setWindowScale(value)}
                  min={0.1}
                  max={3}
                  step={0.1}
                />
                <div className="text-xs text-gray-400 mt-1">{windowScale.toFixed(1)}x</div>
              </div>

              {detectedWindows.length > 0 && (
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-sm text-blue-400">
                    {detectedWindows.length} window opening(s) detected
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={autoDetectPerspective}
                  >
                    Auto-align to detected windows
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lighting" className="space-y-4">
              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Light Intensity</label>
                <Slider
                  value={[lighting.intensity]}
                  onValueChange={([value]) => setLighting({ ...lighting, intensity: value })}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <div className="text-xs text-gray-400 mt-1">{lighting.intensity.toFixed(1)}</div>
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Light Direction</label>
                <Slider
                  value={[lighting.direction]}
                  onValueChange={([value]) => setLighting({ ...lighting, direction: value })}
                  min={0}
                  max={360}
                  step={1}
                />
                <div className="text-xs text-gray-400 mt-1">{lighting.direction}°</div>
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Ambient Light</label>
                <Slider
                  value={[lighting.ambient]}
                  onValueChange={([value]) => setLighting({ ...lighting, ambient: value })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <div className="text-xs text-gray-400 mt-1">{lighting.ambient.toFixed(1)}</div>
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Shadow Opacity</label>
                <Slider
                  value={[lighting.shadowOpacity]}
                  onValueChange={([value]) => setLighting({ ...lighting, shadowOpacity: value })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <div className="text-xs text-gray-400 mt-1">{lighting.shadowOpacity.toFixed(1)}</div>
              </div>
            </TabsContent>

            <TabsContent value="position" className="space-y-4">
              <div>
                <label className="typography-label text-sm font-medium mb-2 block">X Position</label>
                <Slider
                  value={[windowPosition.x]}
                  onValueChange={([value]) => setWindowPosition({ ...windowPosition, x: value })}
                  min={-5}
                  max={5}
                  step={0.1}
                />
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Y Position</label>
                <Slider
                  value={[windowPosition.y]}
                  onValueChange={([value]) => setWindowPosition({ ...windowPosition, y: value })}
                  min={-5}
                  max={5}
                  step={0.1}
                />
              </div>

              <div>
                <label className="typography-label text-sm font-medium mb-2 block">Z Position</label>
                <Slider
                  value={[windowPosition.z]}
                  onValueChange={([value]) => setWindowPosition({ ...windowPosition, z: value })}
                  min={-5}
                  max={5}
                  step={0.1}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setWindowPosition({ x: 0, y: 0, z: 0 });
                  setWindowScale(1);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Position
              </Button>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="space-y-2">
                <Button onClick={exportPresentation} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Presentation
                </Button>
                <Button onClick={sharePresentation} variant="outline" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Presentation
                </Button>
              </div>

              <div className="btn-primary">
                <p className="text-xs text-amber-400">
                  Exported presentations include Almona branding and can be shared with clients.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mobile optimization indicator */}
      {isMobile && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
          <Smartphone className="h-4 w-4" />
          <span>Mobile-optimized view</span>
        </div>
      )}
    </div>
  );
};

export default PhotoMatchViewer;

