import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Model3DDialog } from './Model3DDialog';

interface Machine3DButtonProps {
  machineId: string;
  machineName: string;
  className?: string;
}

export function Machine3DButton({ machineId, machineName, className = "" }: Machine3DButtonProps) {
  const [show3DModel, setShow3DModel] = useState(false);

  // Show 3D model button for FR-223 machine and its variants
  const isFR223 = machineId === "ym-028" || 
                  machineId === "ym-029" || 
                  machineId === "ym-030" || 
                  machineName.toLowerCase().includes("fr 223") ||
                  machineName.toLowerCase().includes("fr223");

  if (!isFR223) return null;

  return (
    <>
      <button
        onClick={() => setShow3DModel(true)}
        className={`flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className}`}
      >
        <Eye className="w-4 h-4" />
        3D Model
      </button>

      <Model3DDialog
        isOpen={show3DModel}
        onClose={() => setShow3DModel(false)}
        machineName={machineName}
        modelPath="/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
      />
    </>
  );
}

export default Machine3DButton;
