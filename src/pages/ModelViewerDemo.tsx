import React, { useState, useEffect } from 'react';
import { EnhancedGLBViewer } from '../components/3d-model/EnhancedGLBViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Demo page for testing the 3D model viewer with interactive controls
 */
export function ModelViewerDemo() {
  const [scale, setScale] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.5);
  const [showGrid, setShowGrid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelPath] = useState("/models/AR-Code-Object-Capture-app-1752786892 (1).glb");

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setIsLoading(false);
  };

  const resetView = () => {
    setScale(1);
    setAutoRotate(false);
    setAutoRotateSpeed(0.5);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">3D Model Viewer Demo</h1>
          <p className="text-gray-600">
            Interactive 3D model viewer with full TypeScript support and performance optimizations
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>3D Model Viewer</CardTitle>
                <CardDescription>
                  {isLoading ? "Loading model..." : "Interactive 3D model with controls"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px] p-0">
                <EnhancedGLBViewer
                  modelPath={modelPath}
                  scale={scale}
                  autoRotate={autoRotate}
                  autoRotateSpeed={autoRotateSpeed}
                  shadows={true}
                  onLoad={handleLoad}
                  onError={handleError}
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>Adjust model properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scale">Scale: {scale.toFixed(1)}x</Label>
                  <Slider
                    id="scale"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={[scale]}
                    onValueChange={([value]) => setScale(value)}
                  />
                </div>

                <div>
                  <Label htmlFor="autoRotate">Auto Rotate</Label>
                  <Switch
                    id="autoRotate"
                    checked={autoRotate}
                    onCheckedChange={setAutoRotate}
                  />
                </div>

                {autoRotate && (
                  <div>
                    <Label htmlFor="rotateSpeed">Rotation Speed: {autoRotateSpeed}</Label>
                    <Slider
                      id="rotateSpeed"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={[autoRotateSpeed]}
                      onValueChange={([value]) => setAutoRotateSpeed(value)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={resetView} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
                <CardDescription>Available capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✅ Full TypeScript support</li>
                  <li>✅ Interactive orbit controls</li>
                  <li>✅ Responsive sizing</li>
                  <li>✅ Loading states</li>
                  <li>✅ Error handling</li>
                  <li>✅ Performance optimization</li>
                  <li>✅ Auto-centering models</li>
                  <li>✅ Shadow casting</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Usage Examples */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
            <CardDescription>How to use the EnhancedGLBViewer component</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Basic Usage</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`<EnhancedGLBViewer 
  modelPath="/models/model.glb" 
/>`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Advanced Usage</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`<EnhancedGLBViewer 
  modelPath="/models/model.glb"
  scale={1.5}
  autoRotate={true}
  autoRotateSpeed={1}
  shadows={true}
  onLoad={() => console.log('Model loaded')}
  onError={(error) => console.error(error)}
/>`}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ModelViewerDemo;
