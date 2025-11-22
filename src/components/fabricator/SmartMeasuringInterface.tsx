import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Ruler, Camera, Scan, Smartphone, AlertCircle, Box } from 'lucide-react';
import { MeasurementData, WindowUnit } from '@/types/fabricator';
import { validateMeasurements, ValidationError } from '@/lib/fabricatorValidation';
import { Window3DGenerator, WindowMeasurementOverlay } from './Window3DGenerator';

interface SmartMeasuringInterfaceProps {
  onMeasurementComplete: (data: MeasurementData) => void;
}

export const SmartMeasuringInterface: React.FC<SmartMeasuringInterfaceProps> = ({ onMeasurementComplete }) => {
  const [measurements, setMeasurements] = useState({
    width: '',
    height: '',
    windowType: '',
    color: '',
    glazingType: ''
  });

  const [isScanning, setIsScanning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [show3DPreview, setShow3DPreview] = useState(true);

  // Generate preview window unit from measurements for 3D visualization
  const previewWindowUnit = useMemo<WindowUnit | null>(() => {
    const width = Number(measurements.width);
    const height = Number(measurements.height);
    
    if (!measurements.width || !measurements.height || !measurements.windowType || 
        isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      id: 'preview',
      orderNumber: 'PREVIEW',
      posNumber: 'PREVIEW',
      type: measurements.windowType || 'sliding_window',
      components: [],
      overallWidth: width,
      overallHeight: height,
      color: measurements.color || 'Silver',
      glazing: {
        type: measurements.glazingType || 'double',
        thickness: 24,
        spacer: 12,
        gasFill: 'argon'
      },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }, [measurements]);

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field];
  };

  const handleSubmit = () => {
    const validation = validateMeasurements(measurements);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Map errors to field-specific errors for display
      const fieldErrorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        fieldErrorMap[error.field] = error.message;
      });
      setFieldErrors(fieldErrorMap);
      return;
    }

    // Clear errors on successful validation
    setValidationErrors([]);
    setFieldErrors({});
    onMeasurementComplete(measurements);
  };

  const startARScan = () => {
    setIsScanning(true);
    // Simulate AR scanning
    setTimeout(() => {
      setMeasurements(prev => ({
        ...prev,
        width: '1200',
        height: '1500',
        windowType: 'sliding_window'
      }));
      setIsScanning(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Manual Input */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-orange-400" />
            Manual Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">{error.message}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                type="number"
                value={measurements.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                placeholder="1200"
                min="300"
                max="5000"
                className={`bg-gray-800 border-gray-600 ${getFieldError('width') ? 'border-red-500' : ''}`}
              />
              {getFieldError('width') && (
                <p className="text-sm text-red-400 mt-1">{getFieldError('width')}</p>
              )}
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                type="number"
                value={measurements.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="1500"
                min="300"
                max="5000"
                className={`bg-gray-800 border-gray-600 ${getFieldError('height') ? 'border-red-500' : ''}`}
              />
              {getFieldError('height') && (
                <p className="text-sm text-red-400 mt-1">{getFieldError('height')}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="windowType">Window Type</Label>
            <Select value={measurements.windowType} onValueChange={(value) => handleInputChange('windowType', value)}>
              <SelectTrigger className={`bg-gray-800 border-gray-600 ${getFieldError('windowType') ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select window type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sliding_window">Sliding Window</SelectItem>
                <SelectItem value="casement">Casement</SelectItem>
                <SelectItem value="tilt_turn">Tilt & Turn</SelectItem>
                <SelectItem value="sliding_door">Sliding Door</SelectItem>
                <SelectItem value="fixed_window">Fixed Window</SelectItem>
              </SelectContent>
            </Select>
            {getFieldError('windowType') && (
              <p className="text-sm text-red-400 mt-1">{getFieldError('windowType')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Select value={measurements.color} onValueChange={(value) => handleInputChange('color', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="White">White</SelectItem>
                <SelectItem value="Black">Black</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AR Scanning */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-400" />
            AR Measurement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="p-8 border-2 border-dashed border-gray-600 rounded-lg">
              <Scan className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400 mb-4">
                {isScanning ? 'Scanning in progress...' : 'Point your device camera at the window opening'}
              </p>
              {isScanning && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                </div>
              )}
            </div>
            <Button 
              onClick={startARScan}
              disabled={isScanning}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Start AR Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3D Preview with AR Measurement Visualization */}
      {show3DPreview && previewWindowUnit && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-orange-400" />
                3D Model Preview
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow3DPreview(false)}
              >
                Hide Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-600 relative">
              <Window3DGenerator 
                windowUnit={previewWindowUnit}
                showControls={true}
                presentationMode={false}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Real-time 3D visualization with measurement overlays. The model updates as you enter dimensions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show 3D Preview Button if hidden */}
      {!show3DPreview && previewWindowUnit && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={() => setShow3DPreview(true)}
              className="w-full"
            >
              <Box className="h-4 w-4 mr-2" />
              Show 3D Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!measurements.width || !measurements.height || !measurements.windowType || isScanning}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Continue to Design
        </Button>
      </div>
    </div>
  );
};
