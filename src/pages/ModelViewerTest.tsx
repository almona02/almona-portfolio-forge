import React, { useState } from 'react';
import { EnhancedGLBViewer } from '../components/3d-model/EnhancedGLBViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Simple test page for the 3D model viewer
 */
export function ModelViewerTest() {
  const [scale, setScale] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleError = (error: Error) => {
    setError(error.message)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">3D Model Test</h1>
          <p className="text-gray-600">
            Testing the 3D model viewer functionality
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Model</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>3D Model Viewer</CardTitle>
                <div className="text-sm text-gray-600">
                  {isLoading ? "Loading model..." : "Interactive 3D model"}
                </div>
              </CardHeader>
              <CardContent className="h-[500px] p-0">
                <EnhancedGLBViewer
                  modelPath="/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
                  scale={scale}
                  autoRotate={autoRotate}
                  autoRotateSpeed={0.5}
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
                <div className="text-sm text-gray-600">Adjust model properties</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scale: {scale.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Auto Rotate</span>
                  </label>
                </div>

                <Button 
                  onClick={() => {
                    setScale(1)
                    setAutoRotate(false)
                  }} 
                  className="w-full"
                >
                  Reset View
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model Info</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li><strong>File:</strong> AR-Code-Object-Capture-app-1752786892 (1).glb</li>
                  <li><strong>Size:</strong> ~13.4 MB</li>
                  <li><strong>Format:</strong> GLB (Binary glTF)</li>
                  <li><strong>Features:</strong></li>
                  <ul className="ml-4 space-y-1">
                    <li>• Interactive controls</li>
                    <li>• Auto-centering</li>
                    <li>• Shadow casting</li>
                    <li>• Performance optimized</li>
                  </ul>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Rotate</h4>
                <p className="text-gray-600">Click and drag to rotate the model</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Zoom</h4>
                <p className="text-gray-600">Scroll wheel to zoom in/out</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Pan</h4>
                <p className="text-gray-600">Right-click and drag to pan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ModelViewerTest
