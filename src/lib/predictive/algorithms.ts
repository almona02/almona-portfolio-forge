import { RULPrediction, SensorData, VibrationAnalysis } from './types';

export class PredictiveAlgorithms {
  static performFFT(vibrationData: number[]): { frequencies: number[]; magnitudes: number[] } {
    const N = vibrationData.length;
    const frequencies = Array.from({ length: Math.floor(N / 2) }, (_, i) => i * (1000 / N));
    const cos = (k: number) => vibrationData.reduce((sum, x, n) => sum + x * Math.cos(2 * Math.PI * k * n / N), 0);
    const sin = (k: number) => vibrationData.reduce((sum, x, n) => sum + x * Math.sin(2 * Math.PI * k * n / N), 0);
    const magnitudes = frequencies.map((_, k) => Math.sqrt(cos(k) ** 2 + sin(k) ** 2));
    return { frequencies, magnitudes };
  }

  static analyzeVibration(vibrationData: number[]): VibrationAnalysis {
    const rms = Math.sqrt(vibrationData.reduce((sum, x) => sum + x * x, 0) / vibrationData.length);
    const peak = Math.max(...vibrationData.map((x) => Math.abs(x)));

    const mean = vibrationData.reduce((sum, x) => sum + x, 0) / vibrationData.length;
    const variance = vibrationData.reduce((sum, x) => sum + (x - mean) ** 2, 0) / vibrationData.length;
    const kurtosis = variance === 0
      ? 0
      : vibrationData.reduce((sum, x) => sum + (x - mean) ** 4, 0) / (vibrationData.length * variance ** 2);

    const fft = this.performFFT(vibrationData);
    const lowBand = fft.magnitudes.slice(0, 10).reduce((sum, mag) => sum + mag, 0) / Math.max(1, Math.min(10, fft.magnitudes.length));
    const midBand = fft.magnitudes.slice(10, 100).reduce((sum, mag) => sum + mag, 0) / Math.max(1, Math.min(90, Math.max(0, fft.magnitudes.length - 10)));
    const highBand = fft.magnitudes.slice(100).reduce((sum, mag) => sum + mag, 0) / Math.max(1, Math.max(0, fft.magnitudes.length - 100));

    return {
      rms,
      peak,
      kurtosis,
      frequencyDomain: { lowBand, midBand, highBand },
    };
  }

  static detectAnomalies(sensorData: SensorData[]): number {
    if (sensorData.length === 0) return 0;
    const features = sensorData.map((s) => s.value);
    const mean = features.reduce((sum, x) => sum + x, 0) / features.length;
    const std = Math.sqrt(features.reduce((sum, x) => sum + (x - mean) ** 2, 0) / features.length) || 1;
    const anomalyScores = features.map((x) => Math.abs(x - mean) / std);
    return Math.max(...anomalyScores);
  }

  static predictRUL(
    vibration: VibrationAnalysis,
    temperature: number,
    operationalHours: number,
  ): RULPrediction {
    const baseHealth = 100;
    const vibrationImpact = Math.max(0, (vibration.rms - 2) * 10);
    const temperatureImpact = Math.max(0, (temperature - 60) * 0.5);
    const hoursImpact = operationalHours * 0.001;

    const currentHealth = Math.max(0, baseHealth - vibrationImpact - temperatureImpact - hoursImpact);
    const degradationRate = (vibrationImpact + temperatureImpact + hoursImpact) / 100;

    let failureMode: RULPrediction['failureMode'] = 'bearing';
    if (vibration.frequencyDomain.highBand > 5) failureMode = 'bearing';
    else if (vibration.frequencyDomain.midBand > 3) failureMode = 'alignment';
    else if (temperature > 80) failureMode = 'electrical';

    const hoursToFailure = degradationRate > 0 ? currentHealth / (degradationRate * 24) : 365 * 24;
    const predictedFailure = new Date(Date.now() + hoursToFailure * 60 * 60 * 1000);

    return {
      currentHealth,
      degradationRate,
      predictedFailure,
      confidence: Math.max(0, Math.min(100, 100 - vibration.rms * 10)),
      failureMode,
      recommendedActions: this.getRecommendedActions(failureMode, vibration, temperature),
    };
  }

  private static getRecommendedActions(
    failureMode: string,
    vibration: VibrationAnalysis,
    temperature: number,
  ): string[] {
    const actions: string[] = [];

    if (failureMode === 'bearing') {
      actions.push('Schedule bearing replacement');
      actions.push('Check lubrication system');
      actions.push('Monitor vibration levels daily');
    } else if (failureMode === 'alignment') {
      actions.push('Calibrate machine alignment');
      actions.push('Check foundation bolts');
      actions.push('Verify coupling alignment');
    } else if (failureMode === 'electrical') {
      actions.push('Inspect motor windings');
      actions.push('Check cooling system');
      actions.push('Verify voltage supply');
    }

    if (vibration.rms > 4) {
      actions.push('Immediate vibration analysis required');
    }

    if (temperature > 75) {
      actions.push('Investigate cooling system');
    }

    return actions;
  }
}


