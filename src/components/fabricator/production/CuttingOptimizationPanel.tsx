'use client';

import {
  HeavyCutInput,
  HeavyStockInput,
} from '@/lib/api/pythonHeavyClient';
import { unifiedOptimize } from '@/lib/api/unifiedOptimizer';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Separator } from '@/shared/ui/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  BarChart3,
  Download,
  Package,
  Plus,
  RefreshCw,
  Scissors,
  Shield,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Types
interface CutPiece {
  id: string;
  length: number;
  quantity: number;
  material: string;
  profile: string;
  priority: number;
  label: string;
}

interface StockPiece {
  id: string;
  length: number;
  quantity: number;
  material: string;
  profile: string;
  cost: number;
  isRemnant: boolean;
}

interface OptimizationResult {
  plans: Array<{
    stockPieceId: string;
    stockLength: number;
    cuts: CutPiece[];
    usedLength: number;
    wasteLength: number;
    utilization: number;
    isRemnant: boolean;
  }>;
  summary: {
    totalWaste: number;
    totalCost: number;
    overallUtilization: number;
    stockPiecesUsed: number;
    estimatedSavings: number;
  };
}

interface CuttingOptimizationPanelProps {
  profiles?: Array<{ id: string; name: string }>;
  onExportGCode?: (result: OptimizationResult) => void;
}

export const CuttingOptimizationPanel: React.FC<CuttingOptimizationPanelProps> = ({
  profiles: _profiles = [],
  onExportGCode,
}) => {
  const { t } = useTranslation('fabricator');
  // Cut Pieces State
  const [cutPieces, setCutPieces] = useState<CutPiece[]>([
    { id: '1', length: 1200, quantity: 4, material: 'aluminum', profile: '60mm', priority: 1, label: 'Frame Top' },
    { id: '2', length: 800, quantity: 8, material: 'aluminum', profile: '60mm', priority: 1, label: 'Frame Side' },
    { id: '3', length: 600, quantity: 6, material: 'aluminum', profile: '60mm', priority: 2, label: 'Mullion' },
  ]);
  
  // Stock Pieces State
  const [stockPieces] = useState<StockPiece[]>([
    { id: 's1', length: 6000, quantity: 10, material: 'aluminum', profile: '60mm', cost: 120, isRemnant: false },
    { id: 's2', length: 4500, quantity: 3, material: 'aluminum', profile: '60mm', cost: 90, isRemnant: true },
    { id: 's3', length: 3000, quantity: 5, material: 'aluminum', profile: '60mm', cost: 60, isRemnant: false },
  ]);
  
  // Optimization State
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('genetic');
  const [kerfWidth, setKerfWidth] = useState(3);
  const [minRemnant] = useState(100);
  
  // Add new cut piece
  const addCutPiece = useCallback(() => {
    const newId = `cut-${Date.now()}`;
    setCutPieces(prev => [...prev, {
      id: newId,
      length: 500,
      quantity: 1,
      material: 'aluminum',
      profile: '60mm',
      priority: 1,
      label: `Cut ${prev.length + 1}`
    }]);
  }, []);
  
  // Update cut piece
  const updateCutPiece = useCallback((id: string, field: keyof CutPiece, value: string | number) => {
    setCutPieces(prev => prev.map(piece => 
      piece.id === id ? { ...piece, [field]: value } : piece
    ));
  }, []);
  
  // Remove cut piece
  const removeCutPiece = useCallback((id: string) => {
    setCutPieces(prev => prev.filter(piece => piece.id !== id));
  }, []);
  
  // Run optimization (mock implementation - would call backend in production)
  const runOptimization = useCallback(async () => {
    if (cutPieces.length === 0) {
      toast.error(t('cutting_optimization.add_cut_error', 'Add at least one cut piece to optimize'));
      return;
    }

    setIsOptimizing(true);

    try {
      // Map local state to heavy optimizer inputs
      const cuts: HeavyCutInput[] = cutPieces.map((c) => ({
        id: c.id,
        lengthMm: c.length,
        quantity: c.quantity,
        priority: c.priority,
        profileId: c.profile,
        allowDefects: false,
      }));

      const stock: HeavyStockInput[] = stockPieces.map((s) => ({
        id: s.id,
        lengthMm: s.length,
        quantity: s.quantity,
        costPerUnit: s.cost,
        isRemnant: s.isRemnant,
        profileId: s.profile,
      }));

      const result = await unifiedOptimize({
        cuts,
        stock,
        objective: selectedStrategy === 'genetic' ? 'balanced' : 'minimize_waste',
        kerfWidthMm: kerfWidth,
        minUsableRemnantMm: minRemnant,
      });

      if (result.mode === 'python') {
        const { python } = result;

        // Group assignments by bar id to build panel-friendly plans
        const cutsById = new Map<string, CutPiece>();
        cutPieces.forEach((c) => cutsById.set(c.id, c));

        const plansMap = new Map<
          string,
          {
            barLength: number;
            isRemnant: boolean;
            cuts: CutPiece[];
            used: number;
          }
        >();

        python.assignments.forEach((a) => {
          const baseId = a.bar_id.split('#')[0];
          const stockDef = stockPieces.find((s) => baseId === s.id);
          if (!stockDef) return;

          const existing = plansMap.get(a.bar_id) ?? {
            barLength: stockDef.length,
            isRemnant: stockDef.isRemnant,
            cuts: [],
            used: 0,
          };

          const source = cutsById.get(a.cut_id);
          if (source) {
            existing.cuts.push(source);
          }
          existing.used += a.length;
          plansMap.set(a.bar_id, existing);
        });

        const plansArray = Array.from(plansMap.entries()).map(
          ([barId, plan]) => ({
            stockPieceId: barId,
            stockLength: plan.barLength,
            cuts: plan.cuts,
            usedLength: plan.used,
            wasteLength: Math.max(plan.barLength - plan.used, 0),
            utilization:
              plan.barLength > 0 ? plan.used / plan.barLength : 0,
            isRemnant: plan.isRemnant,
          }),
        );

        const totalWaste = plansArray.reduce(
          (sum, p) => sum + p.wasteLength,
          0,
        );
        const totalStock = plansArray.reduce(
          (sum, p) => sum + p.stockLength,
          0,
        );
        const overallUtilization =
          totalStock > 0 ? 1 - totalWaste / totalStock : 0;

        const mappedResult: OptimizationResult = {
          plans: plansArray,
          summary: {
            totalWaste,
            totalCost: python.metrics.total_cost,
            overallUtilization,
            stockPiecesUsed: plansArray.length,
            estimatedSavings: 0,
          },
        };

        setOptimizationResult(mappedResult);
        toast.success(
          t('cutting_optimization.python_complete', 'Python optimization complete: {utilization}% utilization', {
            utilization: (overallUtilization * 100).toFixed(1)
          }),
        );
      } else {
        const { local } = result;
        const mappedResult: OptimizationResult = {
          plans: local.plans.map((p) => ({
            stockPieceId: p.barId,
            stockLength: p.barLength,
            cuts: p.cuts.map((c: any) => ({
              id: c.id || '',
              length: c.lengthMm || c.length || 0,
              quantity: c.quantity || 1,
              material: c.material || 'aluminum',
              profile: c.profileId || c.profile || '60mm',
              priority: c.priority || 1,
              label: c.label || '',
            })) as CutPiece[],
            usedLength: p.usedLength,
            wasteLength: p.wasteLength,
            utilization: p.utilization,
            isRemnant: p.isRemnant,
          })),
          summary: {
            totalWaste: local.metrics.totalWaste,
            totalCost: local.metrics.totalCost,
            overallUtilization: local.metrics.overallUtilization / 100,
            stockPiecesUsed: local.metrics.stockPiecesUsed,
            estimatedSavings: 0,
          },
        };

        setOptimizationResult(mappedResult);
        toast.success(
          t('cutting_optimization.local_complete', 'Local optimization complete: {utilization}% utilization', {
            utilization: local.metrics.overallUtilization.toFixed(1)
          }),
        );
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error(t('cutting_optimization.optimization_failed', 'Optimization failed'));
    } finally {
      setIsOptimizing(false);
    }
  }, [cutPieces, stockPieces, selectedStrategy, kerfWidth, minRemnant, t]);
  
  // Export G-code
  const handleExportGCode = useCallback(() => {
    if (!optimizationResult) {
      toast.error(t('cutting_optimization.run_first_error', 'Run optimization first'));
      return;
    }
    
    if (onExportGCode) {
      onExportGCode(optimizationResult);
    } else {
      toast.success(t('cutting_optimization.export_initiated', 'G-code export initiated'));
    }
  }, [optimizationResult, onExportGCode, t]);
  
  // Calculate totals
  const totalCuts = cutPieces.reduce((sum, p) => sum + p.quantity, 0);
  const totalCutLength = cutPieces.reduce((sum, p) => sum + p.length * p.quantity, 0);
  const totalStockLength = stockPieces.reduce((sum, s) => sum + s.length * s.quantity, 0);
  
  // Floating panel state
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Algorithm rationale based on selection
  const algorithmRationale = React.useMemo(() => {
    if (totalCuts < 50) {
      return {
        algorithm: 'Greedy',
        rule: 'Rule 1.1: <50 cuts detected → Greedy algorithm selected',
        waste: '15-20%',
        duration: '<100ms'
      };
    } else if (totalCuts < 200) {
      return {
        algorithm: 'Best-Fit Decreasing',
        rule: 'Rule 1.2: 50-200 cuts → Best-Fit Decreasing selected',
        waste: '12-18%',
        duration: '<500ms'
      };
    } else {
      return {
        algorithm: 'Genetic Algorithm',
        rule: 'Rule 1.3: >200 cuts → Genetic algorithm selected',
        waste: '10-15%',
        duration: '<2s'
      };
    }
  }, [totalCuts]);
  
  return (
    <div
      className="fixed bottom-6 right-6 card-glass-dark rounded-2xl shadow-glow-intense overflow-hidden transition-all duration-500 z-50"
      style={{ width: isExpanded ? '380px' : '280px' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <div className="text-xs text-amber-400 uppercase tracking-wider">{t('cutting_optimization.algorithm', 'Algorithm')}</div>
            <div className="text-sm font-bold text-slate-100">{algorithmRationale.algorithm}</div>
          </div>
        </div>

        <div className={`transition-all duration-500 overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="card-dark rounded-lg p-3">
              <div className="text-cyan-400 font-semibold mb-1">{t('cutting_optimization.selection_rationale', 'Selection Rationale:')}</div>
              <p>{algorithmRationale.rule}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                <div className="text-xs mb-1 status-valid">{t('cutting_optimization.waste', 'Waste')}</div>
                <div className="text-lg font-bold text-emerald-300">{algorithmRationale.waste}</div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
                <div className="text-cyan-400 text-xs mb-1">{t('cutting_optimization.duration', 'Duration')}</div>
                <div className="text-lg font-bold text-cyan-300">{algorithmRationale.duration}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-3 h-3" />
              <span>{t('cutting_optimization.deterministic', 'Deterministic • Auditable • Constitutional')}</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
              <Shield className="w-4 h-4 status-valid" />
              <span className="text-xs text-emerald-300 font-semibold">{t('cutting_optimization.tier_3', 'Tier 3 Deterministic')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Full panel content - shown when expanded or clicked */}
      <div className={`transition-all duration-500 ${
        isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <Card className="bg-transparent border-none shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm tracking-[0.02em] uppercase">
              <Scissors className="w-4 h-4 text-amber-400" />
              {t('cutting_optimization.panel_title', 'Cutting Optimization')}
            </CardTitle>
          </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="cuts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 card-dark">
            <TabsTrigger value="cuts" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              {t('cutting_optimization.tabs.cuts', 'Cut Pieces')}
            </TabsTrigger>
            <TabsTrigger value="stock" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              {t('cutting_optimization.tabs.stock', 'Stock')}
            </TabsTrigger>
            <TabsTrigger value="optimize" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              {t('cutting_optimization.tabs.optimize', 'Optimize')}
            </TabsTrigger>
          </TabsList>
          
          {/* Cut Pieces Tab */}
          <TabsContent value="cuts" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('cutting_optimization.cut_list', 'Cut List')}</span>
              <Button size="sm" variant="outline" onClick={addCutPiece}>
                <Plus className="w-3 h-3 mr-1" />
                {t('cutting_optimization.add_cut', 'Add Cut')}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cutPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="p-3 card-dark rounded-lg grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-3">
                    <Label className="typography-label text-[10px] text-slate-400 tracking-[0.05em] uppercase">{t('cutting_optimization.length', 'Length (mm)')}</Label>
                    <Input
                      type="number"
                      value={piece.length}
                      onChange={(e) => updateCutPiece(piece.id, 'length', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="typography-label text-[10px] text-gray-400">{t('cutting_optimization.quantity', 'Qty')}</Label>
                    <Input
                      type="number"
                      value={piece.quantity}
                      onChange={(e) => updateCutPiece(piece.id, 'quantity', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="typography-label text-[10px] text-gray-400">{t('cutting_optimization.label', 'Label')}</Label>
                    <Input
                      value={piece.label}
                      onChange={(e) => updateCutPiece(piece.id, 'label', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="typography-label text-[10px] text-gray-400">{t('cutting_optimization.priority', 'Priority')}</Label>
                    <Select
                      value={piece.priority.toString()}
                      onValueChange={(v) => updateCutPiece(piece.id, 'priority', Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('cutting_optimization.priority_high', 'High')}</SelectItem>
                        <SelectItem value="2">{t('cutting_optimization.priority_medium', 'Medium')}</SelectItem>
                        <SelectItem value="3">{t('cutting_optimization.priority_low', 'Low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      onClick={() => removeCutPiece(piece.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
              <span>{t('cutting_optimization.total_cuts', 'Total cuts: {count}', { count: totalCuts })}</span>
              <span>{t('cutting_optimization.total_length', 'Total length: {length} mm', { length: totalCutLength.toLocaleString() })}</span>
            </div>
          </TabsContent>
          
          {/* Stock Tab */}
          <TabsContent value="stock" className="space-y-4">
            <div className="space-y-2">
              {stockPieces.map((stock) => (
                <div
                  key={stock.id}
                  className="p-3 card-dark rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{stock.length}mm</span>
                      {stock.isRemnant && (
                        <Badge variant="outline" className="btn-primary">
                          {t('cutting_optimization.remnant', 'Remnant')}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t('cutting_optimization.available', '{count} available', { count: stock.quantity })}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                    <span>{t('cutting_optimization.material', 'Material: {material}', { material: stock.material })}</span>
                    <span>{t('cutting_optimization.profile', 'Profile: {profile}', { profile: stock.profile })}</span>
                    <span>{t('cutting_optimization.cost', 'Cost: ${cost}', { cost: stock.cost })}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
              <span>{t('cutting_optimization.total_stock', 'Total stock: {length} mm', { length: totalStockLength.toLocaleString() })}</span>
            </div>
          </TabsContent>
          
          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="typography-label text-xs">{t('cutting_optimization.strategy', 'Strategy')}</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genetic">{t('cutting_optimization.strategy_genetic', 'Genetic Algorithm (Best)')}</SelectItem>
                    <SelectItem value="best-fit">{t('cutting_optimization.strategy_best_fit', 'Best-Fit Decreasing')}</SelectItem>
                    <SelectItem value="first-fit">{t('cutting_optimization.strategy_first_fit', 'First-Fit Decreasing')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="typography-label text-xs">{t('cutting_optimization.kerf_width', 'Kerf Width (mm)')}</Label>
                <Input
                  type="number"
                  value={kerfWidth}
                  onChange={(e) => setKerfWidth(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
            
            <Button
              onClick={runOptimization}
              disabled={isOptimizing || cutPieces.length === 0}
              className="w-full btn-primary-gradient font-semibold"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('cutting_optimization.optimizing', 'Optimizing...')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('cutting_optimization.run_optimization', 'Run Optimization')}
                </>
              )}
            </Button>
            
            {/* Results */}
            {optimizationResult && (
              <>
                <Separator />
                
                <div className="grid grid-cols-4 gap-2">
                  <Card className="card-dark p-3 shadow-card">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">
                        {(optimizationResult.summary.overallUtilization * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400 tracking-[0.05em] uppercase">{t('cutting_optimization.utilization', 'Utilization')}</div>
                    </div>
                  </Card>
                  <Card className="card-dark p-3 shadow-card">
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {optimizationResult.summary.stockPiecesUsed}
                      </div>
                      <div className="text-[10px] text-gray-400">{t('cutting_optimization.bars_used', 'Bars Used')}</div>
                    </div>
                  </Card>
                  <Card className="card-dark p-3 shadow-card">
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-400">
                        {optimizationResult.summary.totalWaste.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-gray-400">{t('cutting_optimization.waste', 'Waste (mm)')}</div>
                    </div>
                  </Card>
                  <Card className="card-dark p-3 shadow-card">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-400">
                        ${optimizationResult.summary.estimatedSavings.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-400">{t('cutting_optimization.savings', 'Savings')}</div>
                    </div>
                  </Card>
                </div>
                
                {/* Cutting Plans Visualization */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">{t('cutting_optimization.cutting_plans', 'Cutting Plans')}</span>
                  {optimizationResult.plans.slice(0, 3).map((plan, idx) => (
                    <div key={idx} className="p-2 card-dark rounded">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                          {t('cutting_optimization.stock_number', 'Stock #{number}', { number: idx + 1 })}
                          {plan.isRemnant && (
                            <Badge variant="outline" className="text-[8px] h-4">{t('cutting_optimization.remnant', 'Remnant')}</Badge>
                          )}
                        </span>
                        <span>{(plan.utilization * 100).toFixed(1)}%</span>
                      </div>
                      <div className="btn-secondary">
                        {plan.cuts.map((cut, cutIdx) => {
                          const widthPercent = (cut.length / plan.stockLength) * 100;
                          const offset = plan.cuts
                            .slice(0, cutIdx)
                            .reduce((sum, c) => sum + (c.length / plan.stockLength) * 100, 0);
                          
                          return (
                            <div
                              key={cutIdx}
                              className="absolute top-0 h-full border-r border-white/20"
                              style={{
                                left: `${offset}%`,
                                width: `${widthPercent}%`,
                                backgroundColor: cut.priority === 1 ? '#3b82f6' : 
                                               cut.priority === 2 ? '#f59e0b' : '#10b981'
                              }}
                              title={`${cut.label}: ${cut.length}mm`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={handleExportGCode}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('cutting_optimization.export_gcode', 'Export G-code')}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CuttingOptimizationPanel;




