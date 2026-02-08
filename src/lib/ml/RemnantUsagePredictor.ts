/**
 * Re-export proxy for RemnantUsagePredictor
 * 
 * The actual implementation lives in @/future/advisory/ and is wired
 * through the Advisory Gate. This proxy provides a stable import path
 * for test and library code that needs the predictor API.
 */
export {
  RemnantUsagePredictor,
  remnantMLPredictor,
} from '@/future/advisory/RemnantUsagePredictor';

export type {
  RemnantFeatures,
  PredictionResult,
} from '@/future/advisory/RemnantUsagePredictor';
