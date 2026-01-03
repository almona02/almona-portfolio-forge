/**
 * Machine Fault Detection with TensorFlow.js
 * 
 * Uses lazy loading for TensorFlow.js to reduce initial bundle size (~870KB saved)
 */

// Lazy load TensorFlow.js - only loads when fault detection is needed
let tf: typeof import('@tensorflow/tfjs') | null = null;

const loadTensorFlow = async () => {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
  }
  return tf;
};

// Module-level cache
let modelCache: any = null; // tf.LayersModel | null, but using any to avoid type issues
const _modelVersion = 'v1';

// Pre-trained model for machine fault detection
export const loadFaultDetectionModel = async () => {
  if (modelCache) return modelCache;

  try {
    // Lazy load TensorFlow.js
    const tfModule = await loadTensorFlow();
    const model = await tfModule.loadLayersModel('/models/fault-model.json');
    modelCache = model;
    console.log('Model loaded and cached');
    return model;
  } catch (error) {
    console.error('Failed to load fault detection model:', error);
    throw error;
  }
};

export function invalidateModelCache(version?: string) {
  modelCache = null;
  if (version) {
    // Version tracking (currently unused but kept for future use)
    void version;
  }
}

// Feature extraction from audio data
export const extractAudioFeatures = async (audioBuffer: AudioBuffer): Promise<any> => {
  // Convert to mono
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : leftChannel;
  
  const monoData = new Float32Array(leftChannel.length);
  for (let i = 0; i < leftChannel.length; i++) {
    monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
  }

  // Create spectrogram (simplified for demo)
  // Note: This function should be called after TensorFlow is loaded
  // For now, we'll make it async and load TensorFlow if needed
  const tfModule = await loadTensorFlow();
  const spectrogram = tfModule.tensor(monoData).reshape([1, monoData.length, 1]);
  return spectrogram;
};

// Analyze vibration data
export const analyzeVibration = (acceleration: DeviceMotionEvent['acceleration']): number => {
  if (!acceleration) return 0;
  
  return Math.sqrt(
    Math.pow(acceleration.x || 0, 2) +
    Math.pow(acceleration.y || 0, 2) + 
    Math.pow(acceleration.z || 0, 2)
  );
};

// Thresholds for fault detection
const VIBRATION_THRESHOLD = 2.5;
const AUDIO_FAULT_THRESHOLD = 0.8;

export const detectFaults = async (
  audioBuffer: AudioBuffer | null,
  vibrationData: DeviceMotionEvent['acceleration'] | null
): Promise<{
  audioDiagnosis: string;
  vibrationDiagnosis: string;
  hasFault: boolean;
}> => {
  let audioDiagnosis = 'No audio data provided';
  let vibrationDiagnosis = 'No vibration data provided';
  let hasFault = false;

  if (audioBuffer) {
    try {
      const model = await loadFaultDetectionModel();
      const features = await extractAudioFeatures(audioBuffer);
      const prediction = model.predict(features) as any;
      const predictionValue = (await prediction.data())[0];
      
      audioDiagnosis = predictionValue > AUDIO_FAULT_THRESHOLD 
        ? 'Blade needs replacement!' 
        : 'Normal sound pattern';
      hasFault = hasFault || predictionValue > AUDIO_FAULT_THRESHOLD;
    } catch {
      audioDiagnosis = 'Audio analysis failed';
    }
  }

  if (vibrationData) {
    const vibrationLevel = analyzeVibration(vibrationData);
    vibrationDiagnosis = vibrationLevel > VIBRATION_THRESHOLD
      ? 'Abnormal vibration detected! Possible bearing wear or imbalance.'
      : 'Vibration levels normal';
    hasFault = hasFault || vibrationLevel > VIBRATION_THRESHOLD;
  }

  return { audioDiagnosis, vibrationDiagnosis, hasFault };
};
