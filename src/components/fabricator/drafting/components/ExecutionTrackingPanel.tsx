/**
 * Execution Tracking Panel - Phase 2: Closed-Loop Production
 *
 * Interactive execution tracking with status transitions, feedback capture,
 * and real-time progress monitoring.
 */

import { productionService } from '@/services/productionService';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Textarea } from '@/shared/ui/ui/textarea';
import { ExecutionFeedback, ExecutionStage, ExecutionSummary } from '@/types/execution';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    RotateCcw,
    Square,
    TrendingUp,
    Wrench,
    XCircle
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ExecutionTrackingPanelProps {
  projectId: string;
  className?: string;
}

export const ExecutionTrackingPanel: React.FC<ExecutionTrackingPanelProps> = ({
  projectId,
  className
}) => {
  const [stages, setStages] = useState<ExecutionStage[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ExecutionStage | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    qualityScore: 85,
    timeSpentMinutes: 0,
    notes: '',
    issues: [] as string[],
    consumptionData: [] as {
      bomItemId: string;
      itemCategory: string;
      itemCode: string;
      itemName: string;
      plannedQuantity: number;
      actualQuantity: number;
      unit: string;
      wastageQuantity?: number;
      wastageReason?: string;
    }[]
  });

  const [consumptionDraft, setConsumptionDraft] = useState({
    bomItemId: '',
    itemCategory: 'profiles',
    itemCode: '',
    itemName: '',
    plannedQuantity: 0,
    actualQuantity: 0,
    unit: 'piece',
    wastageQuantity: 0,
    wastageReason: ''
  });

  // Load execution data
  const loadExecutionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stagesData, summaryData] = await Promise.all([
        productionService.getExecutionStages(projectId),
        productionService.getExecutionSummary(projectId)
      ]);

      setStages(stagesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load execution data:', error);
      toast.error('Failed to load execution data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initialize execution stages if not present
  const initializeStages = useCallback(async () => {
    try {
      await productionService.initializeExecutionStages(projectId);
      await loadExecutionData();
      toast.success('Execution stages initialized');
    } catch (error) {
      console.error('Failed to initialize execution stages:', error);
      toast.error('Failed to initialize execution stages');
    }
  }, [projectId, loadExecutionData]);

  // Start execution stage
  const startStage = useCallback(async (stageId: string) => {
    try {
      await productionService.startExecutionStage(stageId);
      await loadExecutionData();
      toast.success('Stage started');
    } catch (error) {
      console.error('Failed to start stage:', error);
      toast.error('Failed to start stage');
    }
  }, [loadExecutionData]);

  const addConsumptionItem = useCallback(() => {
    if (!consumptionDraft.itemCode || !consumptionDraft.itemName) {
      toast.error('Provide item code and name');
      return;
    }

    setFeedbackForm(prev => ({
      ...prev,
      consumptionData: [
        ...prev.consumptionData,
        {
          ...consumptionDraft,
          plannedQuantity: Number(consumptionDraft.plannedQuantity) || 0,
          actualQuantity: Number(consumptionDraft.actualQuantity) || 0,
          wastageQuantity: Number(consumptionDraft.wastageQuantity) || 0
        }
      ]
    }));

    setConsumptionDraft({
      bomItemId: '',
      itemCategory: 'profiles',
      itemCode: '',
      itemName: '',
      plannedQuantity: 0,
      actualQuantity: 0,
      unit: 'piece',
      wastageQuantity: 0,
      wastageReason: ''
    });
  }, [consumptionDraft]);

  const removeConsumptionItem = useCallback((index: number) => {
    setFeedbackForm(prev => ({
      ...prev,
      consumptionData: prev.consumptionData.filter((_, i) => i !== index)
    }));
  }, []);

  // Complete stage with feedback
  const completeStage = useCallback(async () => {
    if (!selectedStage) return;

    try {
      const feedback: Omit<ExecutionFeedback, 'status'> = {
        stageId: selectedStage.id,
        qualityScore: feedbackForm.qualityScore,
        timeSpentMinutes: feedbackForm.timeSpentMinutes,
        notes: feedbackForm.notes,
        issues: feedbackForm.issues.filter(issue => issue.trim()),
        consumptionData: feedbackForm.consumptionData
      };

      await productionService.completeExecutionStage(selectedStage.id, feedback);

      setFeedbackDialogOpen(false);
      setFeedbackForm({
        qualityScore: 85,
        timeSpentMinutes: 0,
        notes: '',
        issues: [],
        consumptionData: []
      });
      setConsumptionDraft({
        bomItemId: '',
        itemCategory: 'profiles',
        itemCode: '',
        itemName: '',
        plannedQuantity: 0,
        actualQuantity: 0,
        unit: 'piece',
        wastageQuantity: 0,
        wastageReason: ''
      });
      setSelectedStage(null);

      await loadExecutionData();
      toast.success('Stage completed');
    } catch (error) {
      console.error('Failed to complete stage:', error);
      toast.error('Failed to complete stage');
    }
  }, [selectedStage, feedbackForm, loadExecutionData]);

  // Fail stage with feedback
  const failStage = useCallback(async () => {
    if (!selectedStage) return;

    try {
      const feedback: Omit<ExecutionFeedback, 'status'> = {
        stageId: selectedStage.id,
        qualityScore: feedbackForm.qualityScore,
        timeSpentMinutes: feedbackForm.timeSpentMinutes,
        notes: feedbackForm.notes,
        issues: feedbackForm.issues.filter(issue => issue.trim()),
        consumptionData: feedbackForm.consumptionData
      };

      await productionService.failExecutionStage(selectedStage.id, feedback);

      setFeedbackDialogOpen(false);
      setFeedbackForm({
        qualityScore: 85,
        timeSpentMinutes: 0,
        notes: '',
        issues: [],
        consumptionData: []
      });
      setConsumptionDraft({
        bomItemId: '',
        itemCategory: 'profiles',
        itemCode: '',
        itemName: '',
        plannedQuantity: 0,
        actualQuantity: 0,
        unit: 'piece',
        wastageQuantity: 0,
        wastageReason: ''
      });
      setSelectedStage(null);

      await loadExecutionData();
      toast.error('Stage marked as failed');
    } catch (error) {
      console.error('Failed to fail stage:', error);
      toast.error('Failed to fail stage');
    }
  }, [selectedStage, feedbackForm, loadExecutionData]);

  // Load data on mount and when project changes
  useEffect(() => {
    loadExecutionData();
  }, [loadExecutionData]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!stages.length) return 0;
    const completed = stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / stages.length) * 100);
  }, [stages]);

  // Get stage status icon
  const getStageIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'in_progress': return <Wrench className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped': return <RotateCcw className="h-4 w-4 text-gray-400" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get stage status color
  const getStageColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'skipped': return 'bg-slate-800/50 text-slate-500 border-slate-700/30';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading execution tracking...</p>
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <Wrench className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2 text-slate-200">Execution Not Initialized</h3>
        <p className="text-slate-400 mb-4">
          Initialize execution stages to start tracking production progress.
        </p>
        <Button onClick={initializeStages}>
          Initialize Execution Stages
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
          <Wrench className="h-5 w-5 text-amber-400" />
          Execution Tracking
        </h3>
        <Badge variant="outline">{progress}% Complete</Badge>
      </div>

      {/* Progress Overview */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="pb-3 border-b border-slate-700/50">
          <CardTitle className="text-sm flex items-center justify-between text-slate-200">
            <span>Production Progress</span>
            <span className="text-xs font-normal text-slate-400">{summary?.completedStages || 0} of {summary?.totalStages || 0} stages</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Progress value={progress} className="mb-4 bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Efficiency:</span>
              <span className="font-medium ml-2 text-slate-200">{summary ? Math.round(summary.efficiency * 100) : 0}%</span>
            </div>
            <div>
              <span className="text-slate-500">Avg Quality:</span>
              <span className="font-medium ml-2 text-slate-200">{summary ? Math.round(summary.averageQualityScore) : 0}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Stages */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Execution Stages</h4>
        {stages.map((stage) => (
          <Card key={stage.id} className="relative bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStageIcon(stage.status)}
                  <div>
                    <h5 className="font-medium text-sm text-slate-200">{stage.stageName}</h5>
                    <p className="text-xs text-slate-400">{stage.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getStageColor(stage.status)}>
                    {stage.status.replace('_', ' ')}
                  </Badge>

                  {stage.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => startStage(stage.id)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}

                  {stage.status === 'in_progress' && (
                    <Dialog open={feedbackDialogOpen && selectedStage?.id === stage.id} onOpenChange={setFeedbackDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedStage(stage)}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-slate-900 border-slate-700/50">
                        <DialogHeader>
                          <DialogTitle className="text-slate-100">Complete {stage.stageName}</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Provide feedback for stage completion.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="quality-score" className="text-slate-300">Quality Score (0-100)</Label>
                            <Input
                              id="quality-score"
                              type="number"
                              min="0"
                              max="100"
                              value={feedbackForm.qualityScore}
                              onChange={(e) => setFeedbackForm(prev => ({
                                ...prev,
                                qualityScore: parseInt(e.target.value) || 0
                              }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="time-spent">Time Spent (minutes)</Label>
                            <Input
                              id="time-spent"
                              type="number"
                              min="0"
                              value={feedbackForm.timeSpentMinutes}
                              onChange={(e) => setFeedbackForm(prev => ({
                                ...prev,
                                timeSpentMinutes: parseInt(e.target.value) || 0
                              }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Any additional notes..."
                              value={feedbackForm.notes}
                              onChange={(e) => setFeedbackForm(prev => ({
                                ...prev,
                                notes: e.target.value
                              }))}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Inventory Consumption</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={consumptionDraft.itemCategory}
                                onValueChange={(value) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  itemCategory: value
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="profiles">Profiles</SelectItem>
                                  <SelectItem value="hardware">Hardware</SelectItem>
                                  <SelectItem value="glass">Glass</SelectItem>
                                  <SelectItem value="accessories">Accessories</SelectItem>
                                  <SelectItem value="services">Services</SelectItem>
                                </SelectContent>
                              </Select>

                              <Input
                                placeholder="Item Code"
                                value={consumptionDraft.itemCode}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  itemCode: e.target.value
                                }))}
                              />

                              <Input
                                placeholder="Item Name"
                                value={consumptionDraft.itemName}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  itemName: e.target.value
                                }))}
                              />

                              <Input
                                placeholder="Unit (piece, m, kg)"
                                value={consumptionDraft.unit}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  unit: e.target.value
                                }))}
                              />

                              <Input
                                type="number"
                                placeholder="Planned Qty"
                                value={consumptionDraft.plannedQuantity}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  plannedQuantity: parseFloat(e.target.value) || 0
                                }))}
                              />

                              <Input
                                type="number"
                                placeholder="Actual Qty"
                                value={consumptionDraft.actualQuantity}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  actualQuantity: parseFloat(e.target.value) || 0
                                }))}
                              />

                              <Input
                                type="number"
                                placeholder="Wastage Qty"
                                value={consumptionDraft.wastageQuantity}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  wastageQuantity: parseFloat(e.target.value) || 0
                                }))}
                              />

                              <Input
                                placeholder="Wastage Reason"
                                value={consumptionDraft.wastageReason}
                                onChange={(e) => setConsumptionDraft(prev => ({
                                  ...prev,
                                  wastageReason: e.target.value
                                }))}
                              />
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={addConsumptionItem}>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Add Consumption Item
                            </Button>

                            {feedbackForm.consumptionData.length > 0 && (
                              <div className="space-y-2">
                                {feedbackForm.consumptionData.map((item, index) => (
                                  <div key={`${item.itemCode}-${index}`} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                                    <div>
                                      <div className="font-medium">{item.itemName}</div>
                                      <div className="text-gray-500">{item.itemCode} • {item.actualQuantity}{item.unit}</div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeConsumptionItem(index)}
                                    >
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={completeStage} className="flex-1">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                            <Button onClick={failStage} variant="destructive" className="flex-1">
                              <XCircle className="h-4 w-4 mr-2" />
                              Fail
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {stage.qualityScore !== undefined && (
                    <div className="text-xs text-gray-500">
                      Quality: {stage.qualityScore}/100
                    </div>
                  )}
                </div>
              </div>

              {stage.actualDurationMinutes && (
                <div className="mt-2 text-xs text-slate-500">
                  Duration: {stage.actualDurationMinutes}min
                  {stage.estimatedDurationMinutes && (
                    <span className="ml-2 text-slate-600">
                      (est. {stage.estimatedDurationMinutes}min)
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Production Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Wastage:</span>
                <span className="font-medium ml-2">{summary.wastageSummary.totalWastage.toFixed(2)} units</span>
              </div>
              <div>
                <span className="text-gray-500">Time Spent:</span>
                <span className="font-medium ml-2">{summary.totalTimeSpent} min</span>
              </div>
            </div>

            {summary.wastageSummary.primaryReasons.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-500">Primary Wastage Reasons:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {summary.wastageSummary.primaryReasons.map((reason, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};