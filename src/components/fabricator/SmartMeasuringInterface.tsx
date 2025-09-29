import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Ruler, Camera, Scan, Smartphone } from 'lucide-react';

interface SmartMeasuringInterfaceProps {
  onMeasurementComplete: (data: any) => void;
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

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (measurements.width && measurements.height && measurements.windowType) {
      onMeasurementComplete(measurements);
    }
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                type="number"
                value={measurements.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                placeholder="1200"
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                type="number"
                value={measurements.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="1500"
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="windowType">Window Type</Label>
            <Select value={measurements.windowType} onValueChange={(value) => handleInputChange('windowType', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600">
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

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!measurements.width || !measurements.height || !measurements.windowType}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Continue to Design
        </Button>
      </div>
    </div>
  );
};
