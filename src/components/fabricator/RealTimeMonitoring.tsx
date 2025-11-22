import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { WindowUnit } from '@/types/fabricator';

interface RealTimeMonitoringProps {
  projects: WindowUnit[];
}

export const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({ projects }) => {
  const activeProjects = projects.filter(p => p.status === 'production');
  const completedProjects = projects.filter(p => p.status === 'completed');

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-400" />
          Real-time Production Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Production Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{activeProjects.length}</div>
                <div className="text-sm text-gray-400">Active Projects</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{completedProjects.length}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">2.5h</div>
                <div className="text-sm text-gray-400">Avg. Production Time</div>
              </CardContent>
            </Card>
          </div>

          {/* Active Projects */}
          {activeProjects.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Production</h3>
              {activeProjects.map((project) => (
                <div key={project.id} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{project.orderNumber}</h4>
                      <p className="text-sm text-gray-400">
                        {project.type.replace('_', ' ').toUpperCase()} • {project.overallWidth}mm × {project.overallHeight}mm
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-400">
                      IN PRODUCTION
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Started: {project.createdAt.toLocaleTimeString()}</span>
                      <span>ETA: 45 minutes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Production</h3>
              <p className="text-gray-400">Start a production run to see real-time monitoring.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
