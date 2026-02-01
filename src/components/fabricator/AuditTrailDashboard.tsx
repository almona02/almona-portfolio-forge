/**
 * Audit Trail Dashboard Component
 * 
 * Gold-tier audit trail visualization with timeline, summary cards, and export functionality.
 * Displays complete audit history with constraint validation and replay metadata.
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 * 
 * Blackbox Visual Polish: Prestige dark theme, interactive timeline, export functionality
 */

import { getAuditTrailService, type AuditAnchor } from '@/core/authority/certification';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, Download, ExternalLink, FileText, Hash, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface AuditTrailDashboardProps {
  className?: string;
}

/**
 * Summary Card Component
 */
const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
}> = ({ title, value, icon, trend, className }) => (
  <Card className={`bg-slate-800/50 border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 ${className}`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</div>
          <div className="text-2xl font-bold text-amber-400">{value}</div>
          {trend && <div className="text-xs text-slate-500 mt-1">{trend}</div>}
        </div>
        <div className="text-amber-500/60">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Audit Trail Dashboard Component
 */
export const AuditTrailDashboard: React.FC<AuditTrailDashboardProps> = ({ className }) => {
  const [anchors, setAnchors] = useState<readonly AuditAnchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnchor, setSelectedAnchor] = useState<AuditAnchor | null>(null);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const auditService = getAuditTrailService();
      await auditService.initialize();
      const chain = auditService.getChain();
      setAnchors(chain);
      if (chain.length > 0) {
        setSelectedAnchor(chain[chain.length - 1]);
      }
    } catch (error) {
      console.error('Failed to load audit trail:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const summaryStats = useMemo(() => {
    const total = anchors.length;
    const withConstraints = anchors.filter(a => 
      a.decisionContext.validationResults && 
      Object.keys(a.decisionContext.validationResults).length > 0
    ).length;
    const withReplay = anchors.filter(a => 
      a.decisionContext.validationResults?.replayMetadata
    ).length;
    const tier3 = anchors.filter(a => a.decisionContext.tierClassification === 'T3').length;

    return { total, withConstraints, withReplay, tier3 };
  }, [anchors]);

  const exportToCSV = () => {
    if (anchors.length === 0) {
      toast.warning('No audit records to export');
      return;
    }

    const headers = ['Timestamp', 'Action', 'Decision', 'Tier', 'Anchor ID', 'Previous Anchor ID'];
    const rows = anchors.map(anchor => [
      anchor.timestamp.toISOString(),
      anchor.decisionContext.inputs.inputType,
      anchor.decisionContext.reasoning.decision,
      anchor.decisionContext.tierClassification,
      anchor.anchorId,
      anchor.previousAnchorId,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_trail_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Audit trail exported to CSV');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-slate-400">Loading audit trail...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-amber-200 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Audit Trail Dashboard
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Complete audit history of all certified actions (AICS-001 Section 7.4)
              </CardDescription>
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-950/30 hover:border-amber-500/50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="Total Records"
              value={summaryStats.total}
              icon={<FileText className="h-6 w-6" />}
            />
            <SummaryCard
              title="With Constraints"
              value={summaryStats.withConstraints}
              icon={<CheckCircle2 className="h-6 w-6" />}
            />
            <SummaryCard
              title="With Replay"
              value={summaryStats.withReplay}
              icon={<Hash className="h-6 w-6" />}
            />
            <SummaryCard
              title="Tier 3 Actions"
              value={summaryStats.tier3}
              icon={<Shield className="h-6 w-6" />}
            />
          </div>

          {/* Timeline View */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="bg-slate-800/50 border-amber-500/20">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-amber-950/30 data-[state=active]:text-amber-400">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-amber-950/30 data-[state=active]:text-amber-400">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {anchors.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No audit records found
                  </div>
                ) : (
                  anchors.map((anchor) => (
                    <Card
                      key={anchor.anchorId}
                      className={`bg-slate-800/30 border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-all duration-200 ${
                        selectedAnchor?.anchorId === anchor.anchorId ? 'ring-2 ring-amber-500/50' : ''
                      }`}
                      onClick={() => setSelectedAnchor(anchor)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-amber-500" />
                              <span className="font-semibold text-amber-300">
                                {anchor.decisionContext.inputs.inputType}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  anchor.decisionContext.tierClassification === 'T3'
                                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                                    : anchor.decisionContext.tierClassification === 'T2'
                                    ? 'border-amber-500/30 text-amber-400 bg-amber-950/20'
                                    : 'border-blue-500/30 text-blue-400 bg-blue-950/20'
                                }`}
                              >
                                {anchor.decisionContext.tierClassification}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-300 mb-1">
                              {anchor.decisionContext.reasoning.decision}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(anchor.timestamp, { addSuffix: true })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {anchor.anchorId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              {selectedAnchor ? (
                <Card className="bg-slate-800/30 border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-amber-300">Anchor Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Timestamp</div>
                      <div className="text-sm text-slate-200">{format(selectedAnchor.timestamp, 'PPpp')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Decision</div>
                      <div className="text-sm text-slate-200">{selectedAnchor.decisionContext.reasoning.decision}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Rationale</div>
                      <div className="text-sm text-slate-300">{selectedAnchor.decisionContext.reasoning.rationale}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Anchor ID</div>
                      <div className="text-xs font-mono text-amber-400 break-all">{selectedAnchor.anchorId}</div>
                    </div>
                    {selectedAnchor.decisionContext.validationResults?.replayMetadata && (
                      <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Replay Metadata</div>
                        <div className="text-xs font-mono text-emerald-400 break-all">
                          Computation ID: {(selectedAnchor.decisionContext.validationResults.replayMetadata as any).computationId}
                        </div>
                        {(selectedAnchor.decisionContext.validationResults.replayMetadata as any).replayVerificationUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-amber-400 hover:text-amber-300"
                            onClick={() => window.open((selectedAnchor.decisionContext.validationResults?.replayMetadata as any)?.replayVerificationUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Verify Replay
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Select an anchor from the timeline to view details
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

