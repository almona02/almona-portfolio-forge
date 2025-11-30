/**
 * Job Risk Indicator
 * Displays risk score and warnings for job complexity
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { useNavigate } from 'react-router-dom';

export interface RiskScore {
  score: number; // 0-100
  warnings: string[];
  recommendations: string[];
  optimalParameters?: {
    bladeSpeed?: number;
    clampingPressure?: number;
    feedRate?: number;
  };
}

interface JobRiskIndicatorProps {
  riskScore: RiskScore | null;
  projectId?: string;
}

export const JobRiskIndicator: React.FC<JobRiskIndicatorProps> = ({ riskScore, projectId }) => {
  const navigate = useNavigate();

  if (!riskScore) {
    return null;
  }

  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'high':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
    }
  };

  const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return CheckCircle2;
      case 'medium':
        return AlertTriangle;
      case 'high':
        return AlertCircle;
    }
  };

  const riskLevel = getRiskLevel(riskScore.score);
  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <Card className={`${getRiskColor(riskLevel)} border-2`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiskIcon className="h-5 w-5" />
          Job Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Risk Score</span>
          <Badge
            variant="outline"
            className={`${getRiskColor(riskLevel)} text-lg font-bold px-3 py-1`}
          >
            {riskScore.score}/100
          </Badge>
        </div>

        {/* Warnings */}
        {riskScore.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Warnings</h4>
            {riskScore.warnings.map((warning, idx) => (
              <Alert
                key={idx}
                className={
                  riskLevel === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {riskScore.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Recommendations</h4>
            <ul className="space-y-1">
              {riskScore.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimal Parameters */}
        {riskScore.optimalParameters && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Optimal Parameters</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {riskScore.optimalParameters.bladeSpeed && (
                <div className="p-2 bg-gray-900/50 rounded">
                  <div className="text-gray-400">Blade Speed</div>
                  <div className="font-medium">{riskScore.optimalParameters.bladeSpeed} RPM</div>
                </div>
              )}
              {riskScore.optimalParameters.clampingPressure && (
                <div className="p-2 bg-gray-900/50 rounded">
                  <div className="text-gray-400">Clamping</div>
                  <div className="font-medium">
                    {riskScore.optimalParameters.clampingPressure} bar
                  </div>
                </div>
              )}
              {riskScore.optimalParameters.feedRate && (
                <div className="p-2 bg-gray-900/50 rounded">
                  <div className="text-gray-400">Feed Rate</div>
                  <div className="font-medium">{riskScore.optimalParameters.feedRate} mm/min</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Link to Calibration Wizard if high risk */}
        {riskLevel === 'high' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/fabricator/calibration')}
            className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            Open Calibration Wizard
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

