import { LazyEnhancedGLBViewer } from '@/components/3d-model/LazyGLBViewer';
import { ModelMeasurementTool } from '@/components/3d-model/ModelMeasurementTool';
import '@/components/3d-model/SwiftXR.css';
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Slider } from '@/shared/ui/ui/slider';
import { Switch } from '@/shared/ui/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { motion } from 'framer-motion';
import {
    Download,
    Eye,
    GitCompare,
    Grid3X3,
    Info,
    List,
    Monitor,
    Move3D,
    RotateCcw,
    Ruler,
    Settings,
    Share2,
    Smartphone,
    Star,
    Users,
    Zap
} from 'lucide-react';
import React, { Suspense, useCallback, useState } from 'react';
// Lazy load heavy 3D components to reduce initial bundle size (~2.2MB saved)
const Collaborative3DViewer = React.lazy(() => import('@/components/3d-model/Collaborative3DViewer').then(module => ({ default: module.Collaborative3DViewer })));

import modelsData from '@/data/models.json';

interface ViewerSettings {
  scale: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  backgroundColor: string;
  showGrid: boolean;
  showAxes: boolean;
  lighting: 'studio' | 'warehouse' | 'outdoor';
  quality: 'low' | 'medium' | 'high';
}

export function AdvancedModelViewer() {
  const [selectedModel, setSelectedModel] = useState<any>(modelsData[0]);
  const [viewerMode, setViewerMode] = useState<'single' | 'gallery' | 'compare' | 'collaborate'>('single');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'ar'>('desktop');
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid');
  const [compareModels, setCompareModels] = useState<{left?: any; right?: any}>({});
  const [measurementUnit, setMeasurementUnit] = useState<'mm' | 'cm' | 'm' | 'in' | 'ft'>('mm');

  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>({
    scale: 1,
    autoRotate: false,
    autoRotateSpeed: 1,
    backgroundColor: '#111',
    showGrid: false,
    showAxes: false,
    lighting: 'warehouse',
    quality: 'high'
  });

  const { toast } = useToast();

  const handleModelSelect = useCallback((model: any) => {
    setSelectedModel(model);
    setViewerMode('single');
  }, []);

  const handleModelDownload = useCallback((model: any) => {
    const link = document.createElement('a');
    link.href = model.modelPath;
    link.download = `${model.name.replace(/\s+/g, '_')}_3D_Model.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: `Downloading ${model.name}...`,
    });
  }, [toast]);

  const handleModelShare = useCallback((model: any) => {
    const shareData = {
      title: `${model.name} - 3D Model`,
      text: `Check out this 3D model of ${model.name}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Model link copied to clipboard",
      });
    }
  }, [toast]);

  const handleCompareSelect = useCallback((model: any, side: 'left' | 'right') => {
    setCompareModels(prev => ({
      ...prev,
      [side]: model
    }));
    setViewerMode('compare');
  }, []);

  const resetViewer = useCallback(() => {
    setViewerSettings({
      scale: 1,
      autoRotate: false,
      autoRotateSpeed: 1,
      backgroundColor: '#111',
      showGrid: false,
      showAxes: false,
      lighting: 'warehouse',
      quality: 'high'
    });
  }, []);

  const renderModelCard = (model: any, isCompareMode = false) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="group cursor-pointer bg-gradient-to-br from-gray-900 to-black border-gray-700 hover:border-amber-400/50 transition-all duration-300 overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={model.thumbnail}
              alt={model.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-6 h-6 text-white mx-auto mb-2" />
                <p className="text-white text-sm font-medium">View 3D Model</p>
              </div>
            </div>
            {model.featured && (
              <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-red-500 text-white border-0">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <CardTitle className="text-white text-lg mb-2 line-clamp-2">
            {model.name}
          </CardTitle>
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {model.description}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {model.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs text-gray-400 border-gray-600">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            {!isCompareMode ? (
              <>
                <Button
                  size="sm"
                  className="btn-primary"
                  onClick={() => handleModelSelect(model)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompareSelect(model, 'left')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <GitCompare className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompareSelect(model, 'left')}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Left
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompareSelect(model, 'right')}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Right
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="typography-h1 md:text-5xl mb-4">
            <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
              Advanced 3D Model Viewer
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Professional 3D model viewer with measurement tools, AR support, collaborative features,
            and advanced visualization capabilities.
          </p>
        </motion.div>

        {/* Mode Selector */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={viewerMode} onValueChange={(value: any) => setViewerMode(value)} className="w-full max-w-2xl">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800">
              <TabsTrigger value="single" className="btn-primary">
                <Eye className="w-4 h-4 mr-2" />
                Single View
              </TabsTrigger>
              <TabsTrigger value="gallery" className="btn-primary">
                <Grid3X3 className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="compare" className="btn-primary">
                  <GitCompare className="w-4 h-4 mr-2" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="collaborate" className="btn-primary">
                <Users className="w-4 h-4 mr-2" />
                Collaborate
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Viewer Settings */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  Viewer Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scale Control */}
                <div>
                  <Label htmlFor="scale" className="typography-label text-gray-300">
                    Scale: {viewerSettings.scale.toFixed(1)}x
                  </Label>
                  <Slider
                    id="scale"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={[viewerSettings.scale]}
                    onValueChange={([value]) => setViewerSettings(prev => ({ ...prev, scale: value }))}
                    className="mt-2"
                  />
                </div>

                {/* Auto Rotate */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRotate" className="typography-label text-gray-300">Auto Rotate</Label>
                  <Switch
                    id="autoRotate"
                    checked={viewerSettings.autoRotate}
                    onCheckedChange={(checked) => setViewerSettings(prev => ({ ...prev, autoRotate: checked }))}
                  />
                </div>

                {/* Auto Rotate Speed */}
                {viewerSettings.autoRotate && (
                  <div>
                    <Label htmlFor="rotateSpeed" className="typography-label text-gray-300">
                      Speed: {viewerSettings.autoRotateSpeed.toFixed(1)}x
                    </Label>
                    <Slider
                      id="rotateSpeed"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={[viewerSettings.autoRotateSpeed]}
                      onValueChange={([value]) => setViewerSettings(prev => ({ ...prev, autoRotateSpeed: value }))}
                      className="mt-2"
                    />
                  </div>
                )}

                {/* Background Color */}
                <div>
                  <Label className="typography-label text-gray-300">Background</Label>
                  <Select
                    value={viewerSettings.backgroundColor}
                    onValueChange={(value) => setViewerSettings(prev => ({ ...prev, backgroundColor: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="#111">Dark</SelectItem>
                      <SelectItem value="#ffffff">Light</SelectItem>
                      <SelectItem value="#f3f4f6">Gray</SelectItem>
                      <SelectItem value="#1f2937">Blue Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lighting */}
                <div>
                  <Label className="typography-label text-gray-300">Lighting</Label>
                  <Select
                    value={viewerSettings.lighting}
                    onValueChange={(value: any) => setViewerSettings(prev => ({ ...prev, lighting: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality */}
                <div>
                  <Label className="typography-label text-gray-300">Quality</Label>
                  <Select
                    value={viewerSettings.quality}
                    onValueChange={(value: any) => setViewerSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={resetViewer}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Settings
                </Button>
              </CardContent>
            </Card>

            {/* Tools */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  variant={showMeasurements ? "default" : "outline"}
                  className="w-full"
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  {showMeasurements ? 'Hide' : 'Show'} Measurements
                </Button>

                <Button
                  onClick={() => setShowSettings(!showSettings)}
                  variant={showSettings ? "default" : "outline"}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Settings
                </Button>

                {selectedModel && (
                  <>
                    <Button
                      onClick={() => handleModelDownload(selectedModel)}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Model
                    </Button>

                    <Button
                      onClick={() => handleModelShare(selectedModel)}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Model
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Model Info */}
            {selectedModel && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-500" />
                    Model Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="typography-h4 text-white">{selectedModel.name}</h4>
                    <p className="text-gray-400 text-sm mt-1">{selectedModel.description}</p>
                  </div>

                  {selectedModel.dimensions && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Dimensions</div>
                      <div className="text-white text-sm">
                        {selectedModel.dimensions.length} × {selectedModel.dimensions.width} × {selectedModel.dimensions.height}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">File Size:</span>
                    <span className="text-white">{selectedModel.fileSize}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Updated:</span>
                    <span className="text-white">{selectedModel.lastUpdated}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {selectedModel.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs text-gray-400 border-gray-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Viewer */}
          <div className="lg:col-span-3">
            {viewerMode === 'single' && selectedModel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>3D Model Viewer</span>
                      <div className="flex gap-2">
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
                        <Button
                          size="sm"
                          variant={viewMode === 'ar' ? 'default' : 'ghost'}
                          onClick={() => setViewMode('ar')}
                          className="text-white"
                        >
                          <Move3D className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[70vh] relative">
                      <LazyEnhancedGLBViewer
                        modelPath={selectedModel.modelPath}
                        enableAR={viewMode === 'ar'}
                        backgroundColor={viewerSettings.backgroundColor}
                        autoPlayAnimations={viewerSettings.autoRotate}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {viewerMode === 'gallery' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="typography-h2 text-white">Model Gallery</h2>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={galleryView === 'grid' ? 'default' : 'ghost'}
                      onClick={() => setGalleryView('grid')}
                      className="text-white"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={galleryView === 'list' ? 'default' : 'ghost'}
                      onClick={() => setGalleryView('list')}
                      className="text-white"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className={
                  galleryView === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                  {modelsData.map((model) => (
                    <div key={model.id}>
                      {renderModelCard(model)}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {viewerMode === 'compare' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Left Model</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[50vh] relative">
                        {compareModels.left ? (
                          <LazyEnhancedGLBViewer
                            modelPath={compareModels.left.modelPath}
                            backgroundColor={viewerSettings.backgroundColor}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            Select a model to compare
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Right Model</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[50vh] relative">
                        {compareModels.right ? (
                          <LazyEnhancedGLBViewer
                            modelPath={compareModels.right.modelPath}
                            backgroundColor={viewerSettings.backgroundColor}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            Select a model to compare
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {modelsData.map((model) => (
                    <div key={model.id}>
                      {renderModelCard(model, true)}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {viewerMode === 'collaborate' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      Collaborative 3D Viewer
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Work together on 3D models in real-time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[70vh]">
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                            <p className="text-white">Loading 3D Collaboration Engine...</p>
                          </div>
                        </div>
                      }>
                        <Collaborative3DViewer
                          modelPath={selectedModel?.modelPath || modelsData[0].modelPath}
                        />
                      </Suspense>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Measurement Tool Overlay */}
        <ModelMeasurementTool
          isVisible={showMeasurements}
          onToggle={() => setShowMeasurements(false)}
          unit={measurementUnit}
          onUnitChange={setMeasurementUnit}
          onAutoRotateToggle={(enabled) => setViewerSettings(prev => ({ ...prev, autoRotate: enabled }))}
          autoRotateEnabled={viewerSettings.autoRotate}
        />
      </div>
    </main>
  );
}

export default withErrorBoundary(AdvancedModelViewer);
