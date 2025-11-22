import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { WindowUnit, Profile, OptimizationResult, WindowComponent } from '@/types/fabricator';

interface QualityControlProps {
  project: WindowUnit | null;
}

export const QualityControl: React.FC<QualityControlProps> = ({ project }) => {
  if (!project) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Project Available</h3>
          <p className="text-gray-400">
            Please complete the measurement and design phases first to enable quality control checks.
          </p>
        </CardContent>
      </Card>
    );
  }
  const qualityChecks = [
    { name: 'Dimensional Accuracy', status: 'passed', value: 98 },
    { name: 'Surface Finish', status: 'passed', value: 95 },
    { name: 'Corner Joints', status: 'warning', value: 87 },
    { name: 'Hardware Installation', status: 'pending', value: 0 },
    { name: 'Glazing Fit', status: 'pending', value: 0 }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {qualityChecks.filter(c => c.status === 'passed').length}
            </div>
            <div className="text-sm text-gray-400">Passed</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">
              {qualityChecks.filter(c => c.status === 'warning').length}
            </div>
            <div className="text-sm text-gray-400">Warnings</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-400">
              {qualityChecks.filter(c => c.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-400">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Checks */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            Quality Control Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityChecks.map((check, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(check.status)} border-current`}
                  >
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
                
                {check.value > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quality Score</span>
                      <span>{check.value}%</span>
                    </div>
                    <Progress value={check.value} className="h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
