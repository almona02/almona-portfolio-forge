import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useWorkflowStore } from '@/store/workflowStore';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import {
  AlertCircle,
  CheckCircle2,
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
  const { currentProject, bom, setBOM, completeStep } = useWorkflowStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const systemPack = useMemo(() => {
    if (!currentProject?.systemPackId) return null;
    return SYSTEM_PACKS.find((p) => p.meta.id === currentProject.systemPackId) ?? null;
  }, [currentProject?.systemPackId]);

  const pattern = useMemo(() => {
    const presetId = currentProject?.presetId;
    if (!presetId) return EGYPTIAN_PATTERNS[0] ?? null;
    return EGYPTIAN_PATTERNS.find((p) => p.id === presetId) ?? EGYPTIAN_PATTERNS[0] ?? null;
  }, [currentProject?.presetId]);

  const generateBOM = useCallback(async () => {
    if (!currentProject || !systemPack || !pattern) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generator = new PresetAwareBOMGenerator();
      const result = await generator.generateCompleteBOM(currentProject, pattern, systemPack);
      setBOM(result);
      completeStep('bom');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BOM generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, systemPack, pattern, setBOM, completeStep]);

  useEffect(() => {
    if (!bom && currentProject && systemPack && pattern) {
      void generateBOM();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = () => {
    completeStep('bom');
    const base = projectId && poseId
      ? `/fabricator/studio/projects/${projectId}/positions/${poseId}`
      : '/fabricator/studio/projects';
    navigate(`${base}/optimization`);
  };

  if (!currentProject) {
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
          <p className="text-xs text-slate-500">99.8% accuracy | Deterministic replay enabled</p>
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

  if (!bom) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 to-slate-900 overflow-auto">
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Header */}
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-amber-600/30 p-6">
          <div className="flex items-center justify-between">
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
              <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {(bom.accuracy * 100).toFixed(1)}% Accuracy
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                Confidence: {(bom.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </div>

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
          <TabsList className="bg-slate-900/60 border-amber-600/20 grid grid-cols-5 w-full max-w-2xl">
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
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Pattern: {bom.metadata.patternUsed}</span>
              <span>System: {bom.metadata.systemPackUsed}</span>
              <span>Generated: {new Date(bom.metadata.generationTimestamp).toLocaleString()}</span>
              <span className="font-mono">SHA: {bom.metadata.checksum.substring(0, 12)}...</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-8 right-8 z-50 flex gap-3">
        <Button variant="outline" onClick={() => void generateBOM()} className="border-amber-600/30 text-amber-300">
          Regenerate BOM
        </Button>
        <button
          onClick={handleContinue}
          className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <span className="relative z-10 flex items-center gap-2">
            Continue to Optimization
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

const ProfilesTable: React.FC<{ profiles: CompleteBOM['profiles'] }> = ({ profiles }) => (
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
              <th className="text-right py-2 px-3">Length (mm)</th>
              <th className="text-right py-2 px-3">Qty</th>
              <th className="text-right py-2 px-3">Angles</th>
              <th className="text-right py-2 px-3">Cost (EGP)</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                <td className="py-2 px-3 text-amber-300 font-medium">{p.role}</td>
                <td className="py-2 px-3 text-slate-400">{p.profileCode || '—'}</td>
                <td className="py-2 px-3 text-right text-slate-300">{p.cuttingLengths?.[0]?.toFixed(1) ?? p.length?.toFixed(1) ?? '—'}</td>
                <td className="py-2 px-3 text-right text-slate-300">{p.quantity}</td>
                <td className="py-2 px-3 text-right text-slate-400">{p.angles?.[0] ?? 90}°</td>
                <td className="py-2 px-3 text-right text-amber-200">{p.cost?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-amber-600/30 font-bold">
              <td colSpan={3} className="py-2 px-3 text-amber-200">Total</td>
              <td className="py-2 px-3 text-right text-amber-200">
                {profiles.reduce((s, p) => s + p.quantity, 0)}
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
