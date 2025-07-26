import React, { useState } from 'react';
import { EnhancedGLBViewer } from './EnhancedGLBViewer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Model3DDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelPath?: string;
  machineName?: string;
}

export function Model3DDialog({ 
  isOpen, 
  onClose, 
  modelPath = "/models/AR-Code-Object-Capture-app-1752786892 (1).glb",
  machineName = "3D Model Viewer"
}: Model3DDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{machineName} - 3D Model</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-red-800 font-semibold mb-2">Error Loading Model</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <div className="h-[600px] rounded-lg overflow-hidden">
            <EnhancedGLBViewer
              modelPath={modelPath}
              scale={1}
              autoRotate={true}
              autoRotateSpeed={0.5}
              shadows={true}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Controls:</strong> Click and drag to rotate • Scroll to zoom • Right-click to pan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model3DDialog;
