/**
 * automation Suggestion Panel
 * Displays ML-powered K-factor predictions with confidence and user feedback
 * The crown jewel feature that makes the system truly intelligent
 */

import { calibrationLearner, type PredictionInput, type PredictionResult } from '@/lib/ml/CalibrationLearner';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import type { Profile } from '@/types/fabricator';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AISuggestionPanelProps {
  profile: Profile;
  jointType?: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom';
  cutAngle?: number;
  onSuggestionApplied?: (kFactor: number) => void;
  onSuggestionIgnored?: () => void;
  userId?: string;
}

export const AISuggestionPanel: React.FC<AISuggestionPanelProps> = ({
  profile,
  jointType = 'miter_45',
  cutAngle = 45,
  onSuggestionApplied,
  onSuggestionIgnored,
  userId,
}) => {
  const { t } = useTranslation('fabricator');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    isTrained: boolean;
    sampleCount: number;
  } | null>(null);

  useEffect(() => {
    void loadPrediction();
    checkModelStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, jointType, cutAngle]);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const input: PredictionInput = {
        profileWidth: profile.width,
        profileHeight: profile.height,
        materialThickness: profile.thickness || 1.5,
        cutAngle,
        jointType,
        profileRole: (profile.profileRole === 'frame' || profile.profileRole === 'sash' || profile.profileRole === 'glazing_bead' || profile.profileRole === 'mullion' || profile.profileRole === 'transom' || profile.profileRole === 'interlock') 
          ? profile.profileRole 
          : 'frame',
        material: profile.material,
      };

      const result = await calibrationLearner.predict(input);
      setPrediction(result);
    } catch (error) {
      console.error('Error loading automation prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkModelStatus = () => {
    const status = calibrationLearner.getStatus();
    setModelStatus({
      isTrained: status.isTrained,
      sampleCount: status.sampleCount,
    });
  };

  const handleApply = async () => {
    if (!prediction) return;

    setFeedbackGiven(true);

    // Record feedback
    if (userId) {
      await calibrationLearner.recordFeedback(
        {
          profileWidth: profile.width,
          profileHeight: profile.height,
          materialThickness: profile.thickness || 1.5,
          cutAngle,
          jointType,
        },
        prediction,
        'applied',
        prediction.predictedKFactor
      );
    }

    onSuggestionApplied?.(prediction.predictedKFactor);
  };

  const handleIgnore = async () => {
    if (!prediction) return;

    setFeedbackGiven(true);

    // Record feedback
    if (userId) {
      await calibrationLearner.recordFeedback(
        {
          profileWidth: profile.width,
          profileHeight: profile.height,
          materialThickness: profile.thickness || 1.5,
          cutAngle,
          jointType,
        },
        prediction,
        'ignored'
      );
    }

    onSuggestionIgnored?.();
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-info" />
            <span className="text-foreground">{t('calibration_wizard.ai.analyzing', 'Analyzing calibration patterns...')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!modelStatus?.isTrained) {
    return (
      <Card className="bg-card/50 border-border border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{t('calibration_wizard.ai.training_title', 'Calibration Analysis')}</p>
              <p className="text-xs text-muted-foreground">
                {t('calibration_wizard.ai.training_desc', 'The system is learning from calibration data. Suggestions will appear once enough data is collected.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction || prediction.confidence < 0.3) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm text-foreground">Low Confidence Prediction</p>
              <p className="text-xs text-muted-foreground">
                Not enough similar calibration data. Recommend manual calibration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidencePercent = Math.round(prediction.confidence * 100);
  const confidenceColor =
    confidencePercent >= 70
      ? 'text-success'
      : confidencePercent >= 50
      ? 'text-warning'
      : 'text-warning';

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-amber-900/20 border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-info" />
          automation Suggestion
          <Badge variant="outline" className={`ml-auto ${confidenceColor} border-current`}>
            {confidencePercent}% Confidence
          </Badge>
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Based on {prediction.sampleCount} calibration examples
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prediction Display */}
        <div className="p-4 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Predicted K-Factor</span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="text-3xl font-bold text-info mb-2">
            {prediction.predictedKFactor.toFixed(2)} mm
          </div>
          <p className="text-xs text-muted-foreground">{prediction.reasoning}</p>
        </div>

        {/* Action Buttons */}
        {!feedbackGiven ? (
          <div className="flex gap-2">
            <Button
              onClick={() => void handleApply()}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply Suggestion
            </Button>
            <Button
              onClick={() => void handleIgnore()}
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4 mr-2" />
              Ignore
            </Button>
          </div>
        ) : (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm text-success">
              Your feedback has been recorded. The system will learn from this to improve future suggestions.
            </AlertDescription>
          </Alert>
        )}

        {/* Model Info */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Model trained on {modelStatus.sampleCount} successful calibrations. Your actions help improve
            predictions for everyone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
