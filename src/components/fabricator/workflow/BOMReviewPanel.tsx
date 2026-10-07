import { approvedBOMContext } from '@/lib/fabricator/bom/approvedBOMContext';
import { ManufacturingApprovalPanel } from '@/components/fabricator/workflow/ManufacturingApprovalPanel';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useWorkflowStore, workflowIdentityMatches } from '@/store/workflowStore';
import { useEngineeringSystemPacks } from '@/hooks/fabricator/useEngineeringSystemPacks';
import { resolveEstimatePattern } from '@/lib/fabricator/bom/resolveEstimatePattern';
import { WorkflowValidator } from '@/lib/fabricator/validation/WorkflowValidator';
import {
  AlertCircle,
  ClipboardList,
  Cog,
  GlassWater,
  Loader2,
  Package,
  Wrench,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const BOMReviewPanel: React.FC = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const navigate = useNavigate();
  const { currentProject, workflowIdentity, bom, setBOM, completeStep } = useWorkflowStore();
  const engineeringPacks = useEngineeringSystemPacks();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const systemPack = useMemo(() => {
    const packId = currentProject?.systemPackId;
    if (!packId) return null;
    return engineeringPacks.find((pack) => pack.meta.id === packId) ?? null;
  }, [currentProject?.systemPackId, engineeringPacks]);

  const pattern = useMemo(() => {
    if (!currentProject?.grid) return null;
    try { return resolveEstimatePattern(currentProject); } catch { return null; }
  }, [currentProject]);

  const generateBOM = useCallback(async () => {
    if (!currentProject || !systemPack || !pattern) return;
    const generationProject = currentProject;
    const generationIdentity = workflowIdentity;
    setIsGenerating(true);
    setError(null);
    try {
      const generator = new PresetAwareBOMGenerator();
      const result = await generator.generateCompleteBOM(
        currentProject,
        pattern,
        systemPack,
        true,
        currentProject.presetId
          ? await approvedBOMContext(currentProject, generationIdentity).catch(() => ({ identity: generationIdentity }))
          : { identity: generationIdentity },
      );
      const latest = useWorkflowStore.getState();
      if (!generationIdentity || latest.currentProject !== generationProject || !workflowIdentityMatches(latest.workflowIdentity, generationIdentity)) return;
      setBOM(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BOM generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, workflowIdentity, systemPack, pattern, setBOM]);

  useEffect(() => {
    if (!bom && currentProject && systemPack && pattern) {
      void generateBOM();
    }
  }, [bom, currentProject, systemPack, pattern, generateBOM]);

  const handleContinue = () => {
    const validation = WorkflowValidator.validateBOMToOptimization(bom);
    if (!validation.passed) {
      if (projectId && poseId) navigate(`/fabricator/studio/projects/${projectId}/positions/${poseId}/optimization`);
      return;
    }
    if (!completeStep('bom')) {
      setError('The saved revision changed. Regenerate the BOM before continuing.');
      return;
    }
    const base = projectId && poseId
      ? `/fabricator/studio/projects/${projectId}/positions/${poseId}`
      : '/fabricator/studio/projects';
    navigate(`${base}/optimization`);
  };

  if (!projectId || !poseId || !currentProject) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold text-amber-200">Design Required</h2>
          <p className="text-slate-400">Complete the design step before reviewing the BOM.</p>
          <button
            onClick={() => navigate('/fabricator/studio/design')}
            className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transition-all"
          >
            Go to Design
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400">Generating Bill of Materials...</p>
          <p className="text-xs text-slate-500">Generating a revision-bound BOM estimate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-red-600/30 rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-200">BOM Generation Failed</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <Button onClick={() => void generateBOM()} className="bg-amber-500 hover:bg-amber-600">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if ((!systemPack || !pattern) && !bom) {
    const designHref = `/fabricator/studio/projects/${projectId}/positions/${poseId}/design`;
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-amber-200">BOM prerequisites missing</h2>
          <p className="text-slate-400 text-sm">
            {!systemPack
              ? `Resolve system pack "${currentProject.systemPackId ?? 'unknown'}" (built-in or owned custom) before generating the BOM.`
              : 'The saved grid does not match a supported window pattern. Return to Design and choose a compatible layout.'}
          </p>
          <Button onClick={() => navigate(designHref)} className="bg-amber-500 hover:bg-amber-600">
            Back to Design
          </Button>
        </div>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-amber-200">No BOM yet</h2>
          <p className="text-slate-400 text-sm">Generate a revision-bound BOM for this saved design.</p>
          <Button onClick={() => void generateBOM()} className="bg-amber-500 hover:bg-amber-600">
            Generate BOM
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 to-slate-900 overflow-auto">
      <div className="max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-amber-600/30 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
                <ClipboardList className="w-6 h-6" />
                Bill of Materials
              </h1>
              <p className="text-slate-400 mt-1">
                {currentProject.orderNumber} &mdash; {currentProject.overallWidth}mm &times; {currentProject.overallHeight}mm
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={bom.qualification?.status === 'qualified'
                ? 'bg-green-500/20 text-green-300 border-green-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}>
                {bom.qualification?.status === 'qualified' ? 'Manufacturing qualified' : 'Estimate only'}
              </Badge>
            </div>
          </div>
        </div>

        <ManufacturingApprovalPanel />
        {/* Cost Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <CostCard label="Profiles" value={bom.cost.materialCost} />
          <CostCard label="Hardware" value={bom.cost.hardwareCost} />
          <CostCard label="Glazing" value={bom.cost.glazingCost} />
          <CostCard label="Accessories" value={bom.cost.accessoriesCost} />
          <CostCard label="Labor" value={bom.cost.laborCost} />
          <CostCard label="Total Cost" value={bom.cost.totalCost} highlight />
        </div>

        {/* BOM Tabs */}
        <Tabs defaultValue="profiles" className="w-full">
          <TabsList className="bg-slate-900/60 border-amber-600/20 flex justify-start overflow-x-auto w-full max-w-2xl">
            <TabsTrigger value="profiles" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
              <Package className="w-3 h-3 mr-1" /> Profiles ({bom.profiles.length})
            </TabsTrigger>
            <TabsTrigger value="hardware" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
              <Wrench className="w-3 h-3 mr-1" /> Hardware ({bom.hardware.length})
            </TabsTrigger>
            <TabsTrigger value="glazing" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
              <GlassWater className="w-3 h-3 mr-1" /> Glass ({bom.glazing.length})
            </TabsTrigger>
            <TabsTrigger value="accessories" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
              <Cog className="w-3 h-3 mr-1" /> Accessories ({bom.accessories.length})
            </TabsTrigger>
            <TabsTrigger value="assembly" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
              <ClipboardList className="w-3 h-3 mr-1" /> Assembly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-4">
            <ProfilesTable profiles={bom.profiles} />
          </TabsContent>
          <TabsContent value="hardware" className="mt-4">
            <HardwareTable hardware={bom.hardware} />
          </TabsContent>
          <TabsContent value="glazing" className="mt-4">
            <GlazingTable glazing={bom.glazing} />
          </TabsContent>
          <TabsContent value="accessories" className="mt-4">
            <AccessoriesTable accessories={bom.accessories} />
          </TabsContent>
          <TabsContent value="assembly" className="mt-4">
            <AssemblySequence sequence={bom.assemblySequence} />
          </TabsContent>
        </Tabs>

        {/* Metadata */}
        <Card className="bg-slate-900/40 border-amber-600/20">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>Pattern: {bom.metadata.patternUsed}</span>
              <span>System: {bom.metadata.systemPackUsed}</span>
              <span>Generated: {new Date(bom.metadata.generationTimestamp).toLocaleString()}</span>
              <span className="font-mono">SHA: {bom.metadata.checksum.substring(0, 12)}...</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {!WorkflowValidator.validateBOMToOptimization(bom).passed && (
        <div role="status" className="mx-3 mb-3 rounded border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">Before optimization</p>
          <ul className="mt-2 list-inside list-disc break-words">
            {WorkflowValidator.validateBOMToOptimization(bom).issues.map(issue => <li key={issue.code}>{issue.message}</li>)}
          </ul>
          <p className="mt-2">Your factory administrator or technical office must provide approved manufacturing rules and profiles. Regenerate the BOM after approval.</p>
        </div>
      )}
      {/* Continue Button */}
      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 border-t border-slate-700 bg-slate-950 p-3 sm:p-4">
        <Button variant="outline" onClick={() => void generateBOM()} className="border-amber-600/30 text-amber-300">
          Regenerate BOM
        </Button>
        <button
          onClick={handleContinue}
          className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <span className="relative z-10 flex items-center gap-2">
            {WorkflowValidator.validateBOMToOptimization(bom).passed ? 'Continue to Optimization' : 'Review optimization prerequisites'}
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

const CostCard: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <Card className={`${highlight ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-900/40 border-amber-600/20'}`}>
    <CardContent className="pt-4 pb-3 px-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-bold mt-1 ${highlight ? 'text-amber-300' : 'text-amber-200'}`}>
        {value.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        <span className="text-xs font-normal text-slate-500 ml-1">EGP</span>
      </p>
    </CardContent>
  </Card>
);

export const ProfilesTable: React.FC<{ profiles: CompleteBOM['profiles'] }> = ({ profiles }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-amber-200">Profile Cut List</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
              <th className="text-left py-2 px-3">Role</th>
              <th className="text-left py-2 px-3">Profile Code</th>
              <th className="text-right py-2 px-3">Cut lengths (mm)</th>
              <th className="text-right py-2 px-3">Pieces</th>
              <th className="text-right py-2 px-3">Angles</th>
              <th className="text-right py-2 px-3">Cost (EGP)</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                <td className="py-2 px-3 text-amber-300 font-medium">{p.role}</td>
                <td className="py-2 px-3 text-slate-400">{p.profileCode || '—'}</td>
                <td className="py-2 px-3 text-right text-slate-300">{p.cuttingLengths?.length ? p.cuttingLengths.map((length, cutIndex) => <div key={cutIndex}>{length.toFixed(1)}</div>) : p.length?.toFixed(1) ?? '—'}</td>
                <td className="py-2 px-3 text-right text-slate-300">{p.cuttingLengths?.length || p.quantity}</td>
                <td className="py-2 px-3 text-right text-slate-400">{p.angles?.length ? p.angles.map((angle, cutIndex) => <div key={cutIndex}>{angle}°</div>) : '90°'}</td>
                <td className="py-2 px-3 text-right text-amber-200">{p.cost?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-amber-600/30 font-bold">
              <td colSpan={3} className="py-2 px-3 text-amber-200">Total</td>
              <td className="py-2 px-3 text-right text-amber-200">
                {profiles.reduce((s, p) => s + (p.cuttingLengths?.length || p.quantity), 0)}
              </td>
              <td />
              <td className="py-2 px-3 text-right text-amber-300">
                {profiles.reduce((s, p) => s + p.cost, 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </CardContent>
  </Card>
);

const HardwareTable: React.FC<{ hardware: CompleteBOM['hardware'] }> = ({ hardware }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-amber-200">Hardware List</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
              <th className="text-left py-2 px-3">Category</th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-right py-2 px-3">Qty</th>
              <th className="text-left py-2 px-3">Supplier Code</th>
              <th className="text-right py-2 px-3">Est. Time (min)</th>
            </tr>
          </thead>
          <tbody>
            {hardware.map((h, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                <td className="py-2 px-3 text-amber-300 font-medium">{h.category}</td>
                <td className="py-2 px-3 text-slate-400">{h.name}</td>
                <td className="py-2 px-3 text-right text-slate-300">{h.quantity}</td>
                <td className="py-2 px-3 text-slate-400 font-mono text-xs">{h.supplierCode || '—'}</td>
                <td className="py-2 px-3 text-right text-slate-400">{h.estimatedTime ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const GlazingTable: React.FC<{ glazing: CompleteBOM['glazing'] }> = ({ glazing }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-amber-200">Glass Specifications</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Width (mm)</th>
              <th className="text-right py-2 px-3">Height (mm)</th>
              <th className="text-right py-2 px-3">Area (m²)</th>
              <th className="text-right py-2 px-3">U-Value</th>
              <th className="text-right py-2 px-3">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {glazing.map((g, i) => {
              const w = g.dimensions?.width;
              const h = g.dimensions?.height;
              return (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                  <td className="py-2 px-3 text-amber-300 font-medium">{g.type || 'Standard'}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{w?.toFixed(0) ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{h?.toFixed(0) ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {w && h ? ((w * h) / 1_000_000).toFixed(2) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">{g.uValue?.toFixed(2) ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-amber-200">{g.weight?.toFixed(1) ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const AccessoriesTable: React.FC<{ accessories: CompleteBOM['accessories'] }> = ({ accessories }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-amber-200">Accessories</CardTitle>
    </CardHeader>
    <CardContent>
      {accessories.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No accessories required.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
                <th className="text-left py-2 px-3">Item</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-right py-2 px-3">Qty</th>
                <th className="text-right py-2 px-3">Unit (EGP)</th>
                <th className="text-right py-2 px-3">Total (EGP)</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((a, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                  <td className="py-2 px-3 text-amber-300">{a.name}</td>
                  <td className="py-2 px-3 text-slate-400">{a.category}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{a.quantity}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{a.unitPrice.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-amber-200">{a.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

const AssemblySequence: React.FC<{ sequence: CompleteBOM['assemblySequence'] }> = ({ sequence }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-amber-200">Assembly Sequence</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {sequence.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-amber-300">{step.step ?? i + 1}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">{step.operation || `Step ${i + 1}`}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">Station: {step.station}</span>
                {step.estimatedTime && (
                  <span className="text-xs text-slate-500">Est. {step.estimatedTime} min</span>
                )}
                <span className="text-xs text-slate-600">Skill: {step.skillsRequired}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
