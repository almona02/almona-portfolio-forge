import React, { useState, useEffect } from 'react';
import { Model3DDialog } from './Model3DDialog';

interface Products3DWrapperProps {
  children: React.ReactNode;
}

export function Products3DWrapper({ children }: Products3DWrapperProps) {
  const [show3DModel, setShow3DModel] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const handleOpen3DModel = (event: CustomEvent) => {
      setSelectedMachine(event.detail);
      setShow3DModel(true);
    };

    window.addEventListener('open3DModel', handleOpen3DModel as EventListener);
    
    return () => {
      window.removeEventListener('open3DModel', handleOpen3DModel as EventListener);
    };
  }, []);

  return (
    <>
      {children}
      {selectedMachine && (
        <Model3DDialog
          isOpen={show3DModel}
          onClose={() => setShow3DModel(false)}
          machineName={selectedMachine.name}
          modelPath="/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
        />
      )}
    </>
  );
}

export default Products3DWrapper;
