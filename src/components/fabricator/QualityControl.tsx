import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { WindowUnit } from '@/types/fabricator';

interface QualityControlProps {
  project: WindowUnit | null;
}

export const QualityControl: React.FC<QualityControlProps> = ({ project }) => {
  if (!project) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-8 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="typography-h3 text-lg mb-2">No Project Available</h3>
          <p className="text-muted-foreground">
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
      case 'passed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-border" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-success';
      case 'failed': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">
              {qualityChecks.filter(c => c.status === 'passed').length}
            </div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning">
              {qualityChecks.filter(c => c.status === 'warning').length}
            </div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <div className="text-2xl font-bold text-destructive">
              {qualityChecks.filter(c => c.status === 'failed').length}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Checks */}
      <Card className="bg-muted/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Quality Control Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityChecks.map((check, index) => (
              <div key={index} className="p-4 bg-card rounded-lg">
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
