import React from 'react';
import { WindowUnit } from '@/types/fabricator';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Ruler, Calendar, Palette, Factory } from 'lucide-react';

interface JobSummaryPanelProps {
  project: WindowUnit | null;
}

export const JobSummaryPanel: React.FC<JobSummaryPanelProps> = ({ project }) => {
  if (!project) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 text-center text-gray-500 text-xs">
          No project selected
        </CardContent>
      </Card>
    );
  }

  const status = project.status || 'design';

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Factory className="h-4 w-4 text-orange-400" />
          Job Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Order #</span>
          <Badge variant="outline" className="text-[10px]">
            {project.orderNumber}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-blue-400" />
          <span>
            {project.overallWidth} × {project.overallHeight} mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-green-400" />
          <span className="capitalize">{project.color}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          <span>
            {project.createdAt
              ? new Date(project.createdAt).toLocaleDateString()
              : '—'}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Status</span>
            <Badge
              className={`text-[10px] capitalize ${
                status === 'production'
                  ? 'bg-green-500/20 text-green-400'
                  : status === 'design'
                  ? 'bg-blue-500/20 text-blue-400'
                  : status === 'optimized'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              {status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobSummaryPanel;


