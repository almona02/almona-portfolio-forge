import React, { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Model3DGallery as Model3DGalleryComponent } from '@/components/3d-model/Model3DGallery';
// Lazy load heavy 3D components to reduce initial bundle size (~2.2MB saved)
const EnhancedModel3DDialog = React.lazy(() => import('@/components/3d-model/EnhancedModel3DDialog').then(module => ({ default: module.EnhancedModel3DDialog })));
import { ModelMeasurementTool } from '@/components/3d-model/ModelMeasurementTool';
import { SwiftXRIframe } from '@/components/swiftxr/SwiftXRIframe';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { 
  Grid3X3, 
  Ruler, 
  Download, 
  Share2, 
  Star,
  Eye,
  Move3D,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useLocation } from 'react-router-dom';

import modelsData from '@/data/models.json';

export default function Model3DGalleryPage() {
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [show3DDialog, setShow3DDialog] = useState(false);
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'mm' | 'cm' | 'm' | 'in' | 'ft'>('mm');
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const { toast } = useToast();
  const swiftxrRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  const handleModelSelect = (model: any) => {
    setSelectedModel(model);
    setShow3DDialog(true);
  };

  const handleModelDownload = (model: any) => {
    // Simulate download
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
  };

  const handleModelShare = (model: any) => {
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
  };

  const handleMeasurementAdd = (measurement: any) => {
    console.log('Measurement added:', measurement);
  };

  const handleMeasurementRemove = (measurementId: string) => {
    console.log('Measurement removed:', measurementId);
  };

  const handleMeasurementExport = (measurements: any[]) => {
    console.log('Measurements exported:', measurements);
  };

  // Center the SwiftXR section when navigating via hash from CTAs
  useEffect(() => {
    if (location.hash === '#swiftxr' && swiftxrRef.current) {
      // Slight delay to allow layout/iframes to settle
      requestAnimationFrame(() => {
        swiftxrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [location.hash]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              3D Model Gallery
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-8">
            Explore our collection of interactive 3D models. View, measure, and interact with industrial machinery 
            in immersive 3D environments with AR support.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-400/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Interactive 3D Viewing</h3>
                  <p className="text-gray-400 text-sm">
                    Rotate, zoom, and explore models with smooth controls and realistic lighting
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-400/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ruler className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Precision Measurements</h3>
                  <p className="text-gray-400 text-sm">
                    Measure distances, angles, and dimensions with professional-grade tools
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-400/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Move3D className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">AR Integration</h3>
                  <p className="text-gray-400 text-sm">
                    View models in augmented reality on supported devices
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Gallery Controls */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              {modelsData.filter(m => m.featured).length} Featured
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {modelsData.length} 3D Models Available
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMeasurementTool(!showMeasurementTool)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Ruler className="w-4 h-4 mr-2" />
              Measurement Tool
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </motion.div>

        {/* 3D Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Model3DGalleryComponent
            models={modelsData}
            onModelSelect={handleModelSelect}
            onModelDownload={handleModelDownload}
            onModelShare={handleModelShare}
            showFilters={true}
            showSearch={true}
            defaultView="grid"
          />
        </motion.div>

        {/* Enhanced 3D Dialog - Lazy loaded to save 2.2MB on initial load */}
        {selectedModel && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-white">Loading 3D Engine...</p>
              </div>
            </div>
          }>
            <EnhancedModel3DDialog
              isOpen={show3DDialog}
              onClose={() => {
                setShow3DDialog(false);
                setSelectedModel(null);
              }}
              machineName={selectedModel.name}
              modelPath={selectedModel.modelPath}
              machineData={{
                dimensions: selectedModel.dimensions,
                features: selectedModel.tags
              }}
              autoRotateEnabled={autoRotateEnabled}
              onAutoRotateChange={setAutoRotateEnabled}
            />
          </Suspense>
        )}

        {/* Measurement Tool */}
        <ModelMeasurementTool
          isVisible={showMeasurementTool}
          onToggle={() => setShowMeasurementTool(!showMeasurementTool)}
          onMeasurementAdd={handleMeasurementAdd}
          onMeasurementRemove={handleMeasurementRemove}
          onMeasurementExport={handleMeasurementExport}
          modelDimensions={selectedModel?.dimensions ? {
            length: parseFloat(selectedModel.dimensions.length),
            width: parseFloat(selectedModel.dimensions.width),
            height: parseFloat(selectedModel.dimensions.height)
          } : undefined}
          unit={measurementUnit}
          onUnitChange={setMeasurementUnit}
          onAutoRotateToggle={setAutoRotateEnabled}
          autoRotateEnabled={autoRotateEnabled}
        />

        {/* SwiftXR Iframe Section */}
        <motion.div
          id="swiftxr"
          ref={swiftxrRef}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-12 mb-8 scroll-mt-28"
        >
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Move3D className="w-5 h-5 text-orange-500" />
                Yilmaz AR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SwiftXRIframe
                title="Almona"
                projectUrl="https://almona.swiftxr.site/almona"
                height="480px"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
