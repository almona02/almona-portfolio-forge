import React from 'react';
import { FabricatorWorkspaceLayout } from './FabricatorWorkspaceLayout';
import { FabricatorSectionProvider } from '@/contexts/FabricatorSectionContext';

export const FabricatorLayoutTest: React.FC = () => {
  return (
    <FabricatorSectionProvider sectionId="fabrication">
      <FabricatorWorkspaceLayout
        sectionId="fabrication"
        leftPanelContent={
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Left Panel</h3>
            <p className="text-gray-400">Tools and configuration will go here.</p>
          </div>
        }
        rightPanelContent={
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Right Panel</h3>
            <p className="text-gray-400">Properties and BOM will go here.</p>
          </div>
        }
        mainContent={
          <div className="h-full flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-100 mb-2">Main Workspace</h2>
              <p className="text-gray-400">This is where the canvas will be.</p>
            </div>
          </div>
        }
        title="Test Fabricator Layout"
        status="success"
        statusMessage="Layout system working correctly"
        showCostCalculator
        cost={12450}
      />
    </FabricatorSectionProvider>
  );
};
