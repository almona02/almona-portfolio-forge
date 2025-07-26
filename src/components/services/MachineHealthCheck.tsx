import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { useToast } from '@/shared/ui/ui/use-toast';
import { detectFaults } from '../../lib/ai/faultDetection';
import type { Dealer } from '../../types/maintenance';


interface Dealer {
  name: string;
  location: string;
  phone: string;
  address: string;
}

const ALEXANDRIA_DEALERS: Dealer[] = [
  {
    name: 'Alexandria Industrial Supplies',
    location: 'Alexandria',
    phone: '+20 3 1234567',
    address: '123 Industrial Zone, Alexandria'
  },
  {
    name: 'Mediterranean Machine Parts',
    location: 'Alexandria',
    phone: '+20 3 7654321',
    address: '456 Coastal Road, Alexandria'
  }
];

const CAIRO_DEALERS: Dealer[] = [
  {
    name: 'Cairo Machine Parts',
    location: 'Cairo',
    phone: '+20 2 7654321',
    address: '456 Downtown, Cairo'
  },
  {
    name: 'Nile Industrial Equipment',
    location: 'Cairo',
    phone: '+20 2 9876543',
    address: '789 Nile Corniche, Cairo'
  }
];

export const MachineHealthCheck = () => {
  const [audioDiagnosis, setAudioDiagnosis] = useState<string>('');
  const [vibrationDiagnosis, setVibrationDiagnosis] = useState<string>('');
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isMonitoringVibration, setIsMonitoringVibration] = useState(false);
  const { toast } = useToast();

  // New predictive maintenance state
  const [predictiveMaintenance, setPredictiveMaintenance] = useState({
    bladeWear: 0,
    hydraulicPressure: 0,
    motorEfficiency: 0,
    nextService: ""
  });

  // Handle audio analysis
  const analyzeAudio = async (blob: Blob) => {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const { audioDiagnosis, hasFault } = await detectFaults(audioBuffer, null);
      setAudioDiagnosis(audioDiagnosis);
      
      if (hasFault) {
        setDealers([...ALEXANDRIA_DEALERS, ...CAIRO_DEALERS]);
      }
    } catch (error) {
      console.error('Audio analysis failed:', error);
      setAudioDiagnosis('Analysis failed');
    }
  };


  // Vibration analysis
  useEffect(() => {
    if (!isMonitoringVibration) return;

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration;
      if (acceleration) {
        const vibrationLevel = Math.sqrt(
          Math.pow(acceleration.x || 0, 2) +
          Math.pow(acceleration.y || 0, 2) +
          Math.pow(acceleration.z || 0, 2)
        );

        if (vibrationLevel > 2.5) {
          setVibrationDiagnosis('Abnormal vibration detected! Possible bearing wear or imbalance.');
        } else {
          setVibrationDiagnosis('Vibration levels normal');
        }
      }
    };

    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotionEvent);
      return () => window.removeEventListener('devicemotion', handleMotionEvent);
    } else {
      toast({
        title: 'Error',
        description: 'Device motion not supported',
        variant: 'destructive'
      });
    }
  }, [isMonitoringVibration, toast]);

  // Handle audio recording
  const handleAudioRecord = async () => {
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks);
        await analyzeAudio(audioBlob);
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      }, 3000);
    } catch (error) {
      console.error('Audio recording failed:', error);
      toast({
        title: 'Error',
        description: 'Microphone access denied',
        variant: 'destructive'
      });
      setIsListening(false);
    }
  };


  const toggleVibrationMonitoring = () => {
    setIsMonitoringVibration(!isMonitoringVibration);
  };

  return (
    <div className="p-4 border rounded-lg space-y-6">
      <h2 className="text-xl font-bold">Machine Health Check</h2>
      
      <div className="space-y-4">
        <div className="border p-4 rounded-lg">
          <h3 className="font-medium mb-2">Audio Analysis</h3>
          <p className="text-sm text-gray-600 mb-3">
            Record machine sound to detect blade wear and other issues
          </p>
          <Button 
            onClick={handleAudioRecord} 
            disabled={isListening}
            className="w-full"
          >
            {isListening ? 'Listening to machine... (3s)' : 'Check Blade Sound'}
          </Button>
          {audioDiagnosis && (
            <div className="mt-3 p-3 rounded bg-gray-50">
              <p className="font-medium">Diagnosis:</p>
              <p>{audioDiagnosis}</p>
            </div>
          )}
        </div>

        <div className="border p-4 rounded-lg">
          <h3 className="font-medium mb-2">Vibration Analysis</h3>
          <p className="text-sm text-gray-600 mb-3">
            Monitor machine vibration patterns for abnormalities
          </p>
          <Button 
            onClick={toggleVibrationMonitoring}
            className="w-full"
            variant={isMonitoringVibration ? 'destructive' : 'default'}
          >
            {isMonitoringVibration ? 'Stop Monitoring' : 'Start Vibration Check'}
          </Button>
          {vibrationDiagnosis && (
            <div className="mt-3 p-3 rounded bg-gray-50">
              <p className="font-medium">Vibration Status:</p>
              <p>{vibrationDiagnosis}</p>
            </div>
          )}
        </div>

        {dealers.length > 0 && (
          <div className="border p-4 rounded-lg">
            <h3 className="font-medium mb-2">Recommended Spare Part Dealers</h3>
            <div className="space-y-3">
              {dealers.map((dealer, index) => (
                <div key={index} className="p-3 border rounded">
                  <p className="font-medium">{dealer.name}</p>
                  <p className="text-sm">{dealer.address}</p>
                  <p className="text-sm">{dealer.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
