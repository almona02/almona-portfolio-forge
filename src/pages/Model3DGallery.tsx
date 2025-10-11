import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Model3DGallery } from '@/components/3d-model/Model3DGallery';
import { EnhancedModel3DDialog } from '@/components/3d-model/EnhancedModel3DDialog';
import { ModelMeasurementTool } from '@/components/3d-model/ModelMeasurementTool';
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

// Demo 3D models data
const demoModels = [
  {
    id: '1',
    name: 'CDC 600 - Double Head Cutting Machine',
    description: 'Full automatic double head compound cutting machine with precision cutting capabilities for aluminum profiles.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/CDC-600.jpg',
    category: 'Cutting Machines',
    tags: ['Precision', 'Double Head', 'Compound cuts', 'Automatic'],
    featured: true,
    dimensions: { length: '3500mm', width: '1500mm', height: '1500mm' },
    fileSize: '2.4 MB',
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    name: 'FR 221 S - Copy Router Machine',
    description: 'High-quality copy router machine for aluminum profiles with advanced routing capabilities.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/FR-221-S.jpg',
    category: 'Processing Centers',
    tags: ['New', 'Reliable', 'High Quality'],
    featured: true,
    dimensions: { length: '2000mm', width: '1200mm', height: '1800mm' },
    fileSize: '1.8 MB',
    lastUpdated: '2024-01-10'
  },
  {
    id: '3',
    name: 'NCR 300 - NC Router Machine',
    description: '4 Axis Numerical Controlled NC Router Machine for complex aluminum processing operations.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/NCR-300.jpg',
    category: 'Processing Centers',
    tags: ['CNC', '4-Axis', 'Numerical Control'],
    featured: false,
    dimensions: { length: '2500mm', width: '1500mm', height: '2000mm' },
    fileSize: '3.2 MB',
    lastUpdated: '2024-01-08'
  },
  {
    id: '4',
    name: 'KM 212 - End Milling Machine',
    description: 'Portable end milling machine for aluminum profiles with precision milling capabilities.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/KM-212.jpg',
    category: 'Milling Machines',
    tags: ['Portable', 'Precision', 'End Milling'],
    featured: false,
    dimensions: { length: '1200mm', width: '800mm', height: '1400mm' },
    fileSize: '1.5 MB',
    lastUpdated: '2024-01-05'
  },
  {
    id: '5',
    name: 'DK502 - Welding Machine',
    description: 'High-quality double head welding machine for UPVC profiles with advanced welding technology.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/DK502.jpg',
    category: 'Welding Machines',
    tags: ['New', 'Best Sales', 'Double Head'],
    featured: true,
    dimensions: { length: '1800mm', width: '1000mm', height: '1600mm' },
    fileSize: '2.1 MB',
    lastUpdated: '2024-01-12'
  },
  {
    id: '6',
    name: 'DC 421 PBS - Cutting Machine',
    description: 'High-precision double head cutting machine for aluminum profiles with advanced cutting technology.',
    modelPath: '/models/AR-Code-Object-Capture-app-1752786892 (1).glb',
    thumbnail: '/images/machines/DC-421-PBS.jpg',
    category: 'Cutting Machines',
    tags: ['High Precision', 'Double Head', 'Aluminum'],
    featured: false,
    dimensions: { length: '3000mm', width: '1400mm', height: '1700mm' },
    fileSize: '2.8 MB',
    lastUpdated: '2024-01-03'
  }
];

export default function Model3DGalleryPage() {
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [show3DDialog, setShow3DDialog] = useState(false);
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'mm' | 'cm' | 'm' | 'in' | 'ft'>('mm');
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const { toast } = useToast();

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
              {demoModels.filter(m => m.featured).length} Featured Models
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {demoModels.length} Total Models
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
          <Model3DGallery
            models={demoModels}
            onModelSelect={handleModelSelect}
            onModelDownload={handleModelDownload}
            onModelShare={handleModelShare}
            showFilters={true}
            showSearch={true}
            defaultView="grid"
          />
        </motion.div>

        {/* Enhanced 3D Dialog */}
        {selectedModel && (
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
              features: selectedModel.tags,
              fileSize: selectedModel.fileSize
            }}
            autoRotateEnabled={autoRotateEnabled}
            onAutoRotateChange={setAutoRotateEnabled}
          />
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
      </div>
    </main>
  );
}
