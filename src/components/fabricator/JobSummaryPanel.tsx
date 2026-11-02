import ErrorBoundary from '@/components/ErrorBoundary';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { WindowUnit } from '@/types/fabricator';
import { Calendar, Factory, MapPin, Palette, Ruler } from 'lucide-react';
import React, { memo, useMemo } from 'react';

interface JobSummaryPanelProps {
  project: WindowUnit | null;
}

const JobSummaryPanelComponent: React.FC<JobSummaryPanelProps> = ({ project }) => {
  // ✅ PERFORMANCE: Memoize system pack lookup
  const systemPack = useMemo(() => {
    if (!project?.systemPackId) return null;
    return SYSTEM_PACKS.find((p) => p.meta.id === project.systemPackId) || null;
  }, [project?.systemPackId]);
  if (!project) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center text-muted-foreground text-xs">
          No project selected
        </CardContent>
      </Card>
    );
  }

  const status = project.status || 'design';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Factory className="h-4 w-4 text-warning" />
          Job Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {project.projectCode && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Project Code</span>
            <Badge variant="outline" className="text-[10px]">
              {project.projectCode}
            </Badge>
          </div>
        )}

        {project.customerCode && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Customer Code</span>
            <Badge variant="outline" className="text-[10px]">
              {project.customerCode}
            </Badge>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Order #</span>
          <Badge variant="outline" className="text-[10px]">
            {project.orderNumber}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-info" />
          <span>
            {project.overallWidth} × {project.overallHeight} mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-success" />
          <span className="capitalize">{project.color}</span>
        </div>

        {systemPack && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">System</span>
            <Badge variant="outline" className="text-[10px]">
              {systemPack.meta.name}
            </Badge>
          </div>
        )}

        {/* Quantity & positional metadata for large projects */}
        {(project.quantity || project.positionMeta) && (
          <div className="space-y-1 pt-1 border-t border-border">
            {project.quantity && project.quantity > 1 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantity (poses)</span>
                <Badge variant="outline" className="text-[10px]">
                  × {project.quantity}
                </Badge>
              </div>
            )}
            {project.positionMeta && (
              <div className="flex items-start gap-2 text-[11px] text-foreground">
                <MapPin className="h-3 w-3 text-warning mt-[2px]" />
                <div className="space-y-0.5">
                  {project.positionMeta.flatNumber && (
                    <div>Flat: {project.positionMeta.flatNumber}</div>
                  )}
                  {project.positionMeta.floor && (
                    <div>Floor: {project.positionMeta.floor}</div>
                  )}
                  {project.positionMeta.elevation && (
                    <div>Elevation: {project.positionMeta.elevation}</div>
                  )}
                  {project.positionMeta.roomOrZone && (
                    <div>Room/Zone: {project.positionMeta.roomOrZone}</div>
                  )}
                  {project.positionMeta.windowIndex && (
                    <div>Window: {project.positionMeta.windowIndex}</div>
                  )}
                  {project.positionMeta.remarks && (
                    <div className="text-muted-foreground">
                      Remark: {project.positionMeta.remarks}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-warning" />
          <span>
            {project.createdAt
              ? new Date(project.createdAt).toLocaleDateString()
              : '—'}
          </span>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Badge
              className={`text-[10px] capitalize ${
                status === 'production'
                  ? 'bg-green-500/20 text-success'
                  : status === 'design'
                  ? 'bg-blue-500/20 text-info'
                  : status === 'optimized'
                  ? 'bg-amber-500/20 text-warning'
                  : 'bg-muted text-foreground'
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

JobSummaryPanelComponent.displayName = 'JobSummaryPanel';

// ✅ HARDENING: Memoize component for performance
const JobSummaryPanelMemo = memo(JobSummaryPanelComponent);

// ✅ HARDENING: Export with error boundary for production
export const JobSummaryPanel: React.FC<JobSummaryPanelProps> = (props) => (
  <ErrorBoundary level="component">
    <JobSummaryPanelMemo {...props} />
  </ErrorBoundary>
);

JobSummaryPanel.displayName = 'JobSummaryPanel';

export default JobSummaryPanel;


