import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorkshopARView } from '../ar/WorkspaceChecker';
import { MACHINE_PRESETS } from '../ar/machinePresets';
import { getEquipmentRecommendation } from '@/lib/ai/gemini';

export const ARViewer = ({ productId }: { productId: string }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<keyof typeof MACHINE_PRESETS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webXRSupported, setWebXRSupported] = useState(true);
  const [maintenanceInfo, setMaintenanceInfo] = useState<string | null>(null);

  useEffect(() => {
    // Check for WebXR AR support
    if (!('xr' in navigator)) {
      setWebXRSupported(false);
      setIsLoading(false);
      return;
    }

    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      setIsSupported(supported);
      setWebXRSupported(supported);
      setIsLoading(false);
    }).catch(() => {
      setWebXRSupported(false);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    // Fetch predictive maintenance info when selectedMachine changes
    const fetchMaintenanceInfo = async () => {
      if (!selectedMachine) {
        setMaintenanceInfo(null);
        return;
      }
      try {
        // Example prompt for AI maintenance info
        const prompt = `Provide predictive maintenance schedule for machine ${MACHINE_PRESETS[selectedMachine].id}`;
        // Assuming getEquipmentRecommendation is available for AI calls
        const info = await getEquipmentRecommendation(prompt);
        setMaintenanceInfo(info);
      } catch (error) {
        setMaintenanceInfo('Failed to load maintenance info.');
      }
    };
    fetchMaintenanceInfo();
  }, [selectedMachine]);

  const startAR = async () => {
    if (!isSupported || !selectedMachine) return;
    try {
      console.log(`Starting AR view for product ${productId}`);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to start AR session:', error);
    }
  };

  const handle2DFallback = () => {
    alert('2D fallback is not implemented yet.');
  };

  if (isLoading) {
    return (
      <div className="ar-skeleton animate-pulse">
        <div className="bg-gray-200 h-64 rounded-lg" />
        <div className="mt-2 text-center text-gray-500">Loading AR experience...</div>
      </div>
    );
  }

  if (!webXRSupported) {
    return (
      <div className="ar-fallback bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-bold text-yellow-800">WebXR Not Supported</h3>
        <p className="mt-2 text-yellow-700">
          Try opening in Chrome on Android or Safari on iOS. 
          <button className="ml-2 text-blue-600 font-medium" onClick={handle2DFallback}>
            View in 2D instead
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <select 
        value={selectedMachine || ''}
        onChange={(e) => setSelectedMachine(e.target.value as keyof typeof MACHINE_PRESETS)}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Machine</option>
        {Object.keys(MACHINE_PRESETS).map((key) => (
          <option key={key} value={key}>
            {MACHINE_PRESETS[key].id}
          </option>
        ))}
      </select>

      {selectedMachine && (
        <>
          <WorkshopARView machine={MACHINE_PRESETS[selectedMachine]} />
          {maintenanceInfo && (
            <div className="mt-4 p-4 bg-almona-darker rounded text-sm text-gray-300">
              <h4 className="font-semibold mb-2">Predictive Maintenance Info</h4>
              <p>{maintenanceInfo}</p>
            </div>
          )}
        </>
      )}

      <Button 
        onClick={startAR}
        disabled={!isSupported || !selectedMachine}
        className="w-full"
      >
        {isSupported ? 'View in AR' : 'AR Not Supported'}
      </Button>

      {isOpen && (
        <div className="ar-container">
          {/* AR content will be rendered here */}
        </div>
      )}
    </div>
  );
};
