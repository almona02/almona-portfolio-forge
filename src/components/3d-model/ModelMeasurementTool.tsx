import { useToast } from '@/hooks/useToast';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import {
  Download,
  Eye,
  EyeOff,
  Move3D,
  RotateCcw,
  Ruler,
  Settings,
  Share2,
  Target,
  X,
  Zap
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface MeasurementPoint {
  id: string;
  position: { x: number; y: number; z: number };
  label?: string;
  color: string;
}

interface MeasurementLine {
  id: string;
  startPoint: MeasurementPoint;
  endPoint: MeasurementPoint;
  distance: number;
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  label?: string;
  color: string;
}

interface ModelMeasurementToolProps {
  isVisible: boolean;
  onToggle: () => void;
  onMeasurementAdd?: (measurement: MeasurementLine) => void;
  onMeasurementRemove?: (measurementId: string) => void;
  onMeasurementExport?: (measurements: MeasurementLine[]) => void;
  modelDimensions?: { length: number; width: number; height: number };
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  onUnitChange: (unit: 'mm' | 'cm' | 'm' | 'in' | 'ft') => void;
  onAutoRotateToggle?: (enabled: boolean) => void;
  autoRotateEnabled?: boolean;
}

export function ModelMeasurementTool({
  isVisible,
  onToggle,
  onMeasurementAdd,
  onMeasurementRemove,
  onMeasurementExport,
  modelDimensions,
  unit,
  onUnitChange,
  onAutoRotateToggle,
  autoRotateEnabled = false
}: ModelMeasurementToolProps) {
  const [measurements, setMeasurements] = useState<MeasurementLine[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'angle' | 'area'>('distance');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [measurementColor, setMeasurementColor] = useState('#ff6b35');
  const [_labelColor, _setLabelColor] = useState('#ffffff');
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  
  const _canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const convertUnit = useCallback((value: number, fromUnit: string, toUnit: string) => {
    // Unit conversion factors (to mm)
    const unitFactors = {
      mm: 1,
      cm: 10,
      m: 1000,
      in: 25.4,
      ft: 304.8
    };
    const fromFactor = unitFactors[fromUnit as keyof typeof unitFactors];
    const toFactor = unitFactors[toUnit as keyof typeof unitFactors];
    return (value * fromFactor) / toFactor;
  }, []);

  const _addMeasurement = useCallback((startPoint: MeasurementPoint, endPoint: MeasurementPoint) => {
    const distance = Math.sqrt(
      Math.pow(endPoint.position.x - startPoint.position.x, 2) +
      Math.pow(endPoint.position.y - startPoint.position.y, 2) +
      Math.pow(endPoint.position.z - startPoint.position.z, 2)
    );

    const convertedDistance = convertUnit(distance, 'mm', unit);

    const newMeasurement: MeasurementLine = {
      id: `measurement_${Date.now()}`,
      startPoint,
      endPoint,
      distance: convertedDistance,
      unit,
      color: measurementColor,
      label: `${convertedDistance.toFixed(2)} ${unit}`
    };

    setMeasurements(prev => [...prev, newMeasurement]);
    onMeasurementAdd?.(newMeasurement);
    
    toast({
      title: "Measurement Added",
      description: `Distance: ${convertedDistance.toFixed(2)} ${unit}`,
    });
  }, [unit, measurementColor, convertUnit, onMeasurementAdd, toast]);

  const removeMeasurement = useCallback((measurementId: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== measurementId));
    onMeasurementRemove?.(measurementId);
    
    if (selectedMeasurement === measurementId) {
      setSelectedMeasurement(null);
    }
  }, [selectedMeasurement, onMeasurementRemove]);

  const clearAllMeasurements = useCallback(() => {
    setMeasurements([]);
    setSelectedMeasurement(null);
    toast({
      title: "Measurements Cleared",
      description: "All measurements have been removed",
    });
  }, [toast]);

  const exportMeasurements = useCallback(() => {
    const data = {
      measurements: measurements.map(m => ({
        ...m,
        distance: convertUnit(m.distance, m.unit, 'mm') // Export in mm
      })),
      modelDimensions,
      exportDate: new Date().toISOString(),
      unit: 'mm'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurements_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onMeasurementExport?.(measurements);
    toast({
      title: "Measurements Exported",
      description: "Measurement data has been downloaded",
    });
  }, [measurements, modelDimensions, convertUnit, onMeasurementExport, toast]);

  const startMeasuring = useCallback(() => {
    setIsMeasuring(true);
    toast({
      title: "Measurement Mode Active",
      description: "Click two points to measure distance",
    });
  }, [toast]);

  const stopMeasuring = useCallback(() => {
    setIsMeasuring(false);
  }, []);

  const toggleAutoRotate = useCallback(() => {
    const newState = !autoRotateEnabled;
    onAutoRotateToggle?.(newState);
    toast({
      title: newState ? "Auto Rotate Enabled" : "Auto Rotate Disabled",
      description: newState ? "Model will rotate automatically" : "Manual rotation only",
    });
  }, [autoRotateEnabled, onAutoRotateToggle, toast]);

  // Animation variants
  const toolVariants = {
    hidden: { opacity: 0, x: 300, scale: 0.95 },
    visible: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      x: 300, 
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.2
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.15
      }
    }
  };

  if (!isVisible) return null;

  return (
    <LazyMotionDiv
      className="fixed top-4 right-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto z-40"
      variants={toolVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-amber-500" />
              Measurement Tool
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggle}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Measurement Mode */}
          <div className="space-y-2">
            <label className="typography-label text-sm font-medium text-gray-300">Measurement Mode</label>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={measurementMode === 'distance' ? 'default' : 'ghost'}
                onClick={() => setMeasurementMode('distance')}
                className="flex-1 text-white"
              >
                <Ruler className="w-4 h-4 mr-1" />
                Distance
              </Button>
              <Button
                size="sm"
                variant={measurementMode === 'angle' ? 'default' : 'ghost'}
                onClick={() => setMeasurementMode('angle')}
                className="flex-1 text-white"
                disabled
              >
                <Target className="w-4 h-4 mr-1" />
                Angle
              </Button>
              <Button
                size="sm"
                variant={measurementMode === 'area' ? 'default' : 'ghost'}
                onClick={() => setMeasurementMode('area')}
                className="flex-1 text-white"
                disabled
              >
                <Move3D className="w-4 h-4 mr-1" />
                Area
              </Button>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="typography-label text-sm font-medium text-gray-300">Unit</label>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              {(['mm', 'cm', 'm', 'in', 'ft'] as const).map((unitOption) => (
                <Button
                  key={unitOption}
                  size="sm"
                  variant={unit === unitOption ? 'default' : 'ghost'}
                  onClick={() => onUnitChange(unitOption)}
                  className="flex-1 text-white"
                >
                  {unitOption}
                </Button>
              ))}
            </div>
          </div>

          {/* Model Dimensions */}
          {modelDimensions && (
            <div className="space-y-2">
              <label className="typography-label text-sm font-medium text-gray-300">Model Dimensions</label>
              <div className="bg-gray-800 p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Length:</span>
                  <span className="text-white">{convertUnit(modelDimensions.length, 'mm', unit).toFixed(2)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Width:</span>
                  <span className="text-white">{convertUnit(modelDimensions.width, 'mm', unit).toFixed(2)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Height:</span>
                  <span className="text-white">{convertUnit(modelDimensions.height, 'mm', unit).toFixed(2)} {unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Measurement Controls */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isMeasuring ? 'destructive' : 'default'}
                onClick={isMeasuring ? stopMeasuring : startMeasuring}
                className="flex-1"
              >
                {isMeasuring ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Ruler className="w-4 h-4 mr-2" />
                    Measure
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllMeasurements}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                disabled={measurements.length === 0}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Auto Rotate Control */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={autoRotateEnabled ? 'default' : 'outline'}
                onClick={toggleAutoRotate}
                className="flex-1"
              >
                <RotateCcw className={`w-4 h-4 mr-2 ${autoRotateEnabled ? 'animate-spin' : ''}`} />
                Auto Rotate
              </Button>
              {autoRotateEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={autoRotateSpeed}
                    onChange={(e) => setAutoRotateSpeed(Number(e.target.value))}
                    className="w-16 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          <LazyAnimatePresence>
            {showSettings && (
              <LazyMotionDiv
                className="space-y-3 p-3 bg-gray-800 rounded-lg"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h4 className="typography-h4 text-sm font-medium text-white">Display Settings</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Show Labels</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowLabels(!showLabels)}
                      className="text-gray-400 hover:text-white"
                    >
                      {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Snap to Grid</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className="text-gray-400 hover:text-white"
                    >
                      {snapToGrid ? <Zap className="w-4 h-4" /> : <Zap className="w-4 h-4 opacity-50" />}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Show Grid</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowGrid(!showGrid)}
                      className="text-gray-400 hover:text-white"
                    >
                      {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="typography-label text-sm text-gray-300">Measurement Color</label>
                  <div className="flex gap-2">
                    {['#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'].map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${
                          measurementColor === color ? 'border-white' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setMeasurementColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </LazyMotionDiv>
            )}
          </LazyAnimatePresence>

          {/* Measurements List */}
          {measurements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="typography-label text-sm font-medium text-gray-300">Measurements</label>
                <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                  {measurements.length}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <LazyAnimatePresence>
                  {measurements.map((measurement) => (
                    <LazyMotionDiv
                      key={measurement.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedMeasurement === measurement.id
                          ? 'bg-amber-500/20 border-amber-500'
                          : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedMeasurement(
                        selectedMeasurement === measurement.id ? null : measurement.id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: measurement.color }}
                          />
                          <span className="text-sm text-white">
                            {measurement.distance.toFixed(2)} {measurement.unit}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMeasurement(measurement.id);
                          }}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </LazyMotionDiv>
                  ))}
                </LazyAnimatePresence>
              </div>
            </div>
          )}

          {/* Export Actions */}
          {measurements.length > 0 && (
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <Button
                size="sm"
                variant="outline"
                onClick={exportMeasurements}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    measurements.map(m => `${m.distance.toFixed(2)} ${m.unit}`).join('\n')
                  );
                  toast({
                    title: "Copied to Clipboard",
                    description: "Measurement data copied",
                  });
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-700">
            <p>• Click "Measure" to start measuring</p>
            <p>• Click two points to measure distance</p>
            <p>• Use settings to customize display</p>
            <p>• Export measurements as JSON</p>
          </div>
        </CardContent>
      </Card>
    </LazyMotionDiv>
  );
}

export default ModelMeasurementTool;
