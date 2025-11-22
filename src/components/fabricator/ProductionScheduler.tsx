import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Factory, Play, Pause, RotateCw } from 'lucide-react';
import { WindowUnit, Profile, OptimizationResult, WindowComponent } from '@/types/fabricator';

interface ProductionSchedulerProps {
  project: WindowUnit | null;
  onProductionStart: () => void;
}

export const ProductionScheduler: React.FC<ProductionSchedulerProps> = ({ 
  project, 
  onProductionStart 
}) => {
  if (!project) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
          <p className="text-gray-400">Complete the design and optimization phases first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Production Status */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-orange-400" />
            Production Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{project.orderNumber}</h3>
              <p className="text-sm text-gray-400">{project.type.replace('_', ' ').toUpperCase()}</p>
            </div>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400">
              {project.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Dimensions:</span>
              <div className="font-medium">{project.overallWidth}mm × {project.overallHeight}mm</div>
            </div>
            <div>
              <span className="text-gray-400">Components:</span>
              <div className="font-medium">{project.components?.length || 0} parts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Controls */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle>Production Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={onProductionStart}
              className="bg-green-500 hover:bg-green-600"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Production
            </Button>
            <Button variant="outline" disabled>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button variant="outline" disabled>
              <RotateCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
