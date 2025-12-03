import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyEnhancedGLBViewer } from './LazyGLBViewer';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { 
  X, 
  Download, 
  Share2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Ruler,
  Camera,
  Smartphone,
  Monitor,
  Info,
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ModelMeasurementTool } from './ModelMeasurementTool';
import { Collaborative3DViewer } from './Collaborative3DViewer';
import { SwiftXRIframe } from '@/components/swiftxr/SwiftXRIframe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';

interface EnhancedModel3DDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelPath?: string;
  machineName?: string;
  machineData?: {
    dimensions?: { length: string; width: string; height: string };
    weight?: string;
    power?: string;
    features?: string[];
  };
  autoRotateEnabled?: boolean;
  onAutoRotateChange?: (enabled: boolean) => void;
}

interface LoadingProgress {
  stage: 'initializing' | 'downloading' | 'parsing' | 'rendering' | 'complete';
  progress: number;
  message: string;
}

export function EnhancedModel3DDialog({ 
  isOpen, 
  onClose, 
  modelPath = "/models/demo-machine.glb",
  machineName = "3D Model Viewer",
  machineData,
  autoRotateEnabled = false,
  onAutoRotateChange
}: EnhancedModel3DDialogProps) {
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    stage: 'initializing',
    progress: 0,
    message: 'Initializing 3D viewer...'
  });
  const [error, setError] = useState<string | null>(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'mm' | 'cm' | 'm' | 'in' | 'ft'>(() => {
    try {
      const saved = localStorage.getItem('model_measurement_unit');
      if (saved === 'mm' || saved === 'cm' || saved === 'm' || saved === 'in' || saved === 'ft') return saved;
    } catch {/* ignore */}
    return 'mm';
  });
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(autoRotateEnabled);
  const [isMuted, setIsMuted] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'ar' | 'compare' | 'collaborate' | 'swiftxr'>('desktop');
  
  // Check if this is FR222 to show SwiftXR option
  const isFR222 = machineName?.toLowerCase().includes('fr 222') || 
                   machineName?.toLowerCase().includes('fr222') ||
                   modelPath?.toLowerCase().includes('fr-222') ||
                   modelPath?.toLowerCase().includes('fr222');
  const [compareModels, setCompareModels] = useState<{left?: string; right?: string}>({});
  const [leftCamera, setLeftCamera] = useState<{ position: [number, number, number]; target: [number, number, number] } | undefined>(undefined);
  const [rightCamera, setRightCamera] = useState<{ position: [number, number, number]; target: [number, number, number] } | undefined>(undefined);
  const [sharedMeasurements, setSharedMeasurements] = useState<Array<{ id: string; distance: number; unit: 'mm' | 'cm' | 'm' | 'in' | 'ft' }>>([]);
  
  const viewerRef = useRef<any>(null);
  const { toast } = useToast();

  // Simulate realistic loading progress
  const simulateLoadingProgress = useCallback(() => {
    const stages = [
      { stage: 'initializing' as const, progress: 10, message: 'Initializing 3D viewer...' },
      { stage: 'downloading' as const, progress: 30, message: 'Downloading model data...' },
      { stage: 'parsing' as const, progress: 60, message: 'Parsing 3D geometry...' },
      { stage: 'rendering' as const, progress: 85, message: 'Rendering model...' },
      { stage: 'complete' as const, progress: 100, message: 'Model loaded successfully!' }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoadingProgress(stages[currentStage]);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const handleLoad = useCallback(() => {
    setLoadingProgress({
      stage: 'complete',
      progress: 100,
      message: 'Model loaded successfully!'
    });
    setError(null);
    
    // Check AR support - WebXR, iOS Quick Look, Android Scene Viewer
    const checkARSupport = async () => {
      let supported = false;
      
      // Check WebXR
      if ('xr' in navigator) {
        try {
          const xrSupported = await navigator.xr?.isSessionSupported('immersive-ar');
          if (xrSupported) supported = true;
        } catch (e) {
          console.warn('WebXR check failed:', e);
        }
      }
      
      // Check iOS Quick Look
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      if (isIOS) supported = true;
      
      // Check Android Scene Viewer
      const isAndroid = /Android/.test(ua);
      if (isAndroid && ua.includes('Chrome')) supported = true;
      
      setIsARSupported(supported);
    };
    
    checkARSupport();
  }, []);

  const handleError = useCallback((error: Error) => {
    setError(error.message);
    setLoadingProgress({
      stage: 'initializing',
      progress: 0,
      message: 'Failed to load model'
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (modelPath) {
      const link = document.createElement('a');
      link.href = modelPath;
      link.download = `${machineName.replace(/\s+/g, '_')}_3D_Model.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "3D model download has begun",
      });
    }
  }, [modelPath, machineName, toast]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `${machineName} - 3D Model`,
        text: `Check out this 3D model of ${machineName}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Model link copied to clipboard",
      });
    }
  }, [machineName, toast]);

  const handleResetView = useCallback(() => {
    if (viewerRef.current?.resetCamera) {
      viewerRef.current.resetCamera();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleUnitChange = useCallback((unit: 'mm' | 'cm' | 'm' | 'in' | 'ft') => {
    setMeasurementUnit(unit);
    try { localStorage.setItem('model_measurement_unit', unit); } catch {/* ignore */}
  }, []);

  // Animation variants
  const modalVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 }
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      >
        <motion.div 
          className={`bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-orange-500/20 ${
            isFullscreen ? 'w-full h-full max-w-none max-h-none' : 'max-w-7xl w-full max-h-[95vh]'
          } overflow-hidden`}
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <motion.h2 
                className="text-2xl font-bold text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {machineName} - 3D Model
              </motion.h2>
              {isARSupported && (
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                  <Smartphone className="w-3 h-3 mr-1" />
                  AR Ready
                </Badge>
              )}
              {isFR222 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 ml-2">
                  <Move3D className="w-3 h-3 mr-1" />
                  SwiftXR Available
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('desktop')}
                  className="text-white"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('mobile')}
                  className="text-white"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                {isARSupported && (
                  <Button
                    size="sm"
                    variant={viewMode === 'ar' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('ar')}
                    className="text-white"
                  >
                    <Move3D className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={viewMode === 'compare' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('compare')}
                  className="text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'collaborate' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('collaborate')}
                  className="text-white"
                >
                  <Users className="w-4 h-4" />
                </Button>
                {isFR222 && (
                  <Button
                    size="sm"
                    variant={viewMode === 'swiftxr' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('swiftxr')}
                    className="text-white"
                    title="SwiftXR Interactive Experience"
                  >
                    <Move3D className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Action Buttons */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetView}
                className="text-gray-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-white"
              >
                {isFullscreen ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row h-full">
            {/* 3D Viewer */}
            <div className="flex-1 relative">
              <div className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[60vh]'} min-h-[480px] relative`}>
                {viewMode === 'swiftxr' && isFR222 ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
                    <SwiftXRIframe
                      title="Almona"
                      projectUrl="https://almona.swiftxr.site/almona"
                      height="100%"
                      className="w-full"
                    />
                  </div>
                ) : viewMode === 'collaborate' ? (
                  <Collaborative3DViewer
                    modelPath={modelPath || ''}
                    onClose={onClose}
                  />
                ) : viewMode !== 'compare' ? (
                  <LazyEnhancedGLBViewer
                    ref={viewerRef}
                    modelPath={modelPath}
                    enableAR={true}
                    enableWebXR={true}
                    onLoaded={handleLoad}
                    onError={handleError}
                    autoPlayAnimations={autoRotate}
                    title={machineName}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
                    <div className="relative">
                      <LazyEnhancedGLBViewer
                        modelPath={compareModels.left || modelPath}
                        enableAR={false}
                        onLoaded={handleLoad}
                        onError={handleError}
                        autoPlayAnimations={false}
                        cameraState={rightCamera}
                        onCameraChange={setLeftCamera}
                      />
                      {sharedMeasurements.length > 0 && (
                        <div className="absolute bottom-3 left-3 text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                          {sharedMeasurements.map(m => (
                            <div key={`left_${m.id}`}>{m.distance.toFixed(2)} {m.unit}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <LazyEnhancedGLBViewer
                        modelPath={compareModels.right || modelPath}
                        enableAR={false}
                        onLoaded={handleLoad}
                        onError={handleError}
                        autoPlayAnimations={false}
                        cameraState={leftCamera}
                        onCameraChange={setRightCamera}
                      />
                      {sharedMeasurements.length > 0 && (
                        <div className="absolute bottom-3 left-3 text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                          {sharedMeasurements.map(m => (
                            <div key={`right_${m.id}`}>{m.distance.toFixed(2)} {m.unit}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Loading Overlay */}
                <AnimatePresence>
                  {loadingProgress.stage !== 'complete' && !error && (
                    <motion.div 
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="text-center space-y-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">{loadingProgress.message}</p>
                          <div className="w-64 bg-gray-700 rounded-full h-2">
                            <motion.div 
                              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${loadingProgress.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-sm text-gray-400">{loadingProgress.progress}%</p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Overlay */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                          <X className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-red-400">Error Loading Model</h3>
                          <p className="text-sm text-gray-300 mt-2">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Control Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className="bg-black/50 backdrop-blur-sm text-white border-gray-600"
                  >
                    <Ruler className="w-4 h-4 mr-2" />
                    {showMeasurements ? 'Hide' : 'Show'} Measurements
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const newState = !autoRotate;
                      setAutoRotate(newState);
                      onAutoRotateChange?.(newState);
                    }}
                    className="bg-black/50 backdrop-blur-sm text-white border-gray-600"
                  >
                    {autoRotate ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {autoRotate ? 'Stop' : 'Auto'} Rotate
                  </Button>
                </div>

                {viewMode === 'compare' && (
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-lg border border-gray-700 space-y-2">
                    <div className="text-xs text-gray-300">Compare Models</div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Left model path" className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded" value={compareModels.left || ''} onChange={(e) => setCompareModels(s => ({ ...s, left: e.target.value }))} />
                      <input type="text" placeholder="Right model path" className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded" value={compareModels.right || ''} onChange={(e) => setCompareModels(s => ({ ...s, right: e.target.value }))} />
                    </div>
                    <div className="text-[10px] text-gray-400">Paths should be public GLB URLs</div>
                  </div>
                )}

                {/* AR Button */}
                {isARSupported && viewMode === 'ar' && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
                    >
                      <Move3D className="w-5 h-5 mr-2" />
                      View in AR
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 border-l border-gray-700 bg-gray-900/50 backdrop-blur-sm">
              <div className="p-6 space-y-6">
                {/* Machine Info */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Machine Details</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {machineData && (
                    <div className="space-y-3">
                      {machineData.dimensions && (
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm text-gray-400">Dimensions</div>
                          <div className="text-white font-medium">
                            {machineData.dimensions.length} × {machineData.dimensions.width} × {machineData.dimensions.height}
                          </div>
                        </div>
                      )}
                      
                      {machineData.power && (
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm text-gray-400">Power</div>
                          <div className="text-white font-medium">{machineData.power}</div>
                        </div>
                      )}
                      
                      {machineData.weight && (
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm text-gray-400">Weight</div>
                          <div className="text-white font-medium">{machineData.weight}</div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-lg font-semibold text-white">Actions</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShare}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </motion.div>

                {/* Controls */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold text-white">Controls</h3>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Move3D className="w-4 h-4" />
                      <span>Drag to rotate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" />
                      <span>Scroll to zoom</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>Right-click to pan</span>
                    </div>
                    {isARSupported && (
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>AR button for immersive view</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

        {/* Measurement Tool Overlay */}
        <ModelMeasurementTool
          isVisible={showMeasurements}
          onToggle={() => setShowMeasurements(false)}
          unit={measurementUnit}
          onUnitChange={handleUnitChange}
          onAutoRotateToggle={(enabled) => setAutoRotate(enabled)}
          autoRotateEnabled={autoRotate}
          onMeasurementAdd={(m) => setSharedMeasurements(prev => [...prev, { id: m.id, distance: m.distance, unit: m.unit }])}
          onMeasurementRemove={(id) => setSharedMeasurements(prev => prev.filter(x => x.id !== id))}
        />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EnhancedModel3DDialog;
