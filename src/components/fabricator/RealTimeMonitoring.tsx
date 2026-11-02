import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { WindowUnit } from '@/types/fabricator';
import { Activity, CheckCircle, Clock } from 'lucide-react';
import React from 'react';

interface RealTimeMonitoringProps {
  projects: WindowUnit[];
}

export const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({ projects }) => {
  const activeProjects = projects.filter(p => p.status === 'production');
  const completedProjects = projects.filter(p => p.status === 'delivered');

  return (
    <Card className="bg-muted/50 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-warning" />
          Real-time Production Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Production Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 text-info mx-auto mb-2" />
                <div className="text-2xl font-bold text-info">{activeProjects.length}</div>
                <div className="text-sm text-muted-foreground">Active Projects</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold text-success">{completedProjects.length}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
                <div className="text-2xl font-bold text-warning">2.5h</div>
                <div className="text-sm text-muted-foreground">Avg. Production Time</div>
              </CardContent>
            </Card>
          </div>

          {/* Active Projects */}
          {activeProjects.length > 0 ? (
            <div className="space-y-4">
              <h3 className="typography-h3 text-lg">Active Production</h3>
              {activeProjects.map((project) => (
                <div key={project.id} className="p-4 bg-card rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="typography-h4">{project.orderNumber}</h4>
                      <p className="text-sm text-muted-foreground">
                        {project.type.replace('_', ' ').toUpperCase()} • {project.overallWidth}mm × {project.overallHeight}mm
                      </p>
                    </div>
                    <Badge variant="outline" className="btn-primary">
                      IN PRODUCTION
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Started: {project.createdAt.toLocaleTimeString()}</span>
                      <span>ETA: 45 minutes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="typography-h3 text-lg mb-2">No Active Production</h3>
              <p className="text-muted-foreground">Start a production run to see real-time monitoring.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
