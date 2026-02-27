/**
 * BOMReviewPage - Dedicated BOM review step (IMPROVEMENT_PLAN 1.2.3, 1.4)
 *
 * Between design and optimization. Generates and displays CompleteBOM.
 * User reviews parts list before proceeding to cut optimization.
 *
 * Route: /fabricator/studio/projects/:projectId/positions/:poseId/bom
 */

import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { findBestMatchingPattern, getPatternById } from '@/lib/fabricator/presetUtils';
import { useWorkflowStore } from '@/store/workflowStore';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export const BOMReviewPage: React.FC = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const navigate = useNavigate();
  const { currentProject, bom, setBOM } = useWorkflowStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const systemPack = SYSTEM_PACKS.find(
    (p) => p.meta?.id === (currentProject?.systemPackId ?? 'generic-60')
  ) ?? SYSTEM_PACKS[0];

  const generateBOM = useCallback(async () => {
    if (!currentProject || !systemPack || !currentProject.grid) return null;
    const pattern =
      (currentProject as { presetId?: string }).presetId
        ? getPatternById((currentProject as { presetId: string }).presetId)
        : findBestMatchingPattern(currentProject.grid, currentProject.systemPackId ?? null)?.pattern;
    if (!pattern) return null;
    const generator = new PresetAwareBOMGenerator();
    return generator.generateCompleteBOM(currentProject, pattern, systemPack).catch(() => null);
  }, [currentProject, systemPack]);

  useEffect(() => {
    if (bom || !currentProject) return;
    let mounted = true;
    setIsGenerating(true);
    void generateBOM().then((result) => {
      if (mounted && result) setBOM(result);
      if (mounted) setIsGenerating(false);
    });
    return () => { mounted = false; };
  }, [currentProject, bom, generateBOM, setBOM]);

  const handleContinue = useCallback(() => {
    const projId = projectId ?? currentProject?.id;
    const posId = poseId ?? projId;
    if (projId && posId) {
      navigate(fabricatorRoutes.poseOptimization(projId, posId));
    } else {
      navigate(fabricatorRoutes.studioProjects());
    }
  }, [projectId, poseId, currentProject, navigate]);

  const handleBackToDesign = useCallback(() => {
    const projId = projectId ?? currentProject?.id;
    const posId = poseId ?? projId;
    if (projId && posId) {
      navigate(fabricatorRoutes.poseDesign(projId, posId));
    } else {
      navigate(fabricatorRoutes.studioProjects());
    }
  }, [projectId, poseId, currentProject, navigate]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
        <Layers className="h-16 w-16 mb-4 opacity-50" />
        <p>No project data. Complete design first.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(fabricatorRoutes.studioProjects())}>
          Back to Projects
        </Button>
      </div>
    );
  }

  if (isGenerating && !bom) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12">
        <Loader2 className="h-12 w-12 text-amber-400 animate-spin mb-4" />
        <p className="text-slate-400">Generating Bill of Materials...</p>
      </div>
    );
  }

  const hasBOM = bom && (bom.profiles?.length > 0 || bom.hardware?.length > 0 || bom.glazing?.length > 0);

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
      <Card className="bg-slate-900/50 border-amber-600/30 flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <Layers className="h-5 w-5" />
              Bill of Materials
            </CardTitle>
            <p className="text-slate-400 text-sm mt-1">
              {currentProject.orderNumber || currentProject.id} · {currentProject.posNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackToDesign} className="border-slate-600 text-slate-300">
              Back to Design
            </Button>
            <Button onClick={handleContinue} className="bg-amber-600 hover:bg-amber-700" disabled={!hasBOM}>
              Continue to Optimization <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasBOM ? (
            <div className="text-center py-12 text-slate-400">
              <p>No BOM generated. Ensure design has grid and pattern.</p>
              <p className="text-sm mt-2">You can continue to optimization to generate BOM there.</p>
              <Button onClick={handleContinue} variant="outline" className="mt-4">
                Skip to Optimization
              </Button>
            </div>
          ) : (
            <>
              {bom?.profiles && bom.profiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-amber-300 mb-2">Profiles</h4>
                  <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400">
                          <th className="text-left p-3">Role</th>
                          <th className="text-right p-3">Length (mm)</th>
                          <th className="text-right p-3">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.profiles.map((p, i) => (
                          <tr key={i} className="border-t border-slate-700 text-slate-300">
                            <td className="p-3">{p.role}</td>
                            <td className="text-right p-3">{p.length?.toFixed(0)}</td>
                            <td className="text-right p-3">{p.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {bom?.cost != null && (
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <span className="text-slate-400">Estimated cost: </span>
                  <span className="font-mono text-amber-300">
                    {(typeof bom.cost === 'object' && bom.cost?.totalCost != null)
                      ? bom.cost.totalCost.toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })
                      : typeof bom.cost === 'number'
                        ? bom.cost.toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })
                        : '—'}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
