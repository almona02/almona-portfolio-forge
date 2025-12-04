'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Separator } from '@/shared/ui/ui/separator';
import { 
  Scissors, 
  BarChart3, 
  Package, 
  Download,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HeavyCutInput,
  HeavyStockInput,
} from '@/lib/api/pythonHeavyClient';
import { unifiedOptimize } from '@/lib/api/unifiedOptimizer';

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
  profiles = [],
  onExportGCode,
}) => {
  // Cut Pieces State
  const [cutPieces, setCutPieces] = useState<CutPiece[]>([
    { id: '1', length: 1200, quantity: 4, material: 'aluminum', profile: '60mm', priority: 1, label: 'Frame Top' },
    { id: '2', length: 800, quantity: 8, material: 'aluminum', profile: '60mm', priority: 1, label: 'Frame Side' },
    { id: '3', length: 600, quantity: 6, material: 'aluminum', profile: '60mm', priority: 2, label: 'Mullion' },
  ]);
  
  // Stock Pieces State
  const [stockPieces, setStockPieces] = useState<StockPiece[]>([
    { id: 's1', length: 6000, quantity: 10, material: 'aluminum', profile: '60mm', cost: 120, isRemnant: false },
    { id: 's2', length: 4500, quantity: 3, material: 'aluminum', profile: '60mm', cost: 90, isRemnant: true },
    { id: 's3', length: 3000, quantity: 5, material: 'aluminum', profile: '60mm', cost: 60, isRemnant: false },
  ]);
  
  // Optimization State
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('genetic');
  const [kerfWidth, setKerfWidth] = useState(3);
  const [minRemnant, setMinRemnant] = useState(100);
  
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
      toast.error('Add at least one cut piece to optimize');
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
          `Python optimization complete: ${(overallUtilization * 100).toFixed(
            1,
          )}% utilization`,
        );
      } else {
        const { local } = result;
        const mappedResult: OptimizationResult = {
          plans: local.plans.map((p) => ({
            stockPieceId: p.barId,
            stockLength: p.barLength,
            cuts: p.cuts as CutPiece[],
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
          `Local optimization complete: ${local.metrics.overallUtilization.toFixed(
            1,
          )}% utilization`,
        );
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [cutPieces, stockPieces, selectedStrategy, kerfWidth, minRemnant]);
  
  // Export G-code
  const handleExportGCode = useCallback(() => {
    if (!optimizationResult) {
      toast.error('Run optimization first');
      return;
    }
    
    if (onExportGCode) {
      onExportGCode(optimizationResult);
    } else {
      toast.success('G-code export initiated');
    }
  }, [optimizationResult, onExportGCode]);
  
  // Calculate totals
  const totalCuts = cutPieces.reduce((sum, p) => sum + p.quantity, 0);
  const totalCutLength = cutPieces.reduce((sum, p) => sum + p.length * p.quantity, 0);
  const totalStockLength = stockPieces.reduce((sum, s) => sum + s.length * s.quantity, 0);
  
  return (
    <Card className="bg-gray-900/60 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-blue-400" />
          Cutting Optimization
        </CardTitle>
        <CardDescription>
          Optimize material usage and minimize waste with AI-powered algorithms
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="cuts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="cuts" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Cut Pieces
            </TabsTrigger>
            <TabsTrigger value="stock" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="optimize" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Optimize
            </TabsTrigger>
          </TabsList>
          
          {/* Cut Pieces Tab */}
          <TabsContent value="cuts" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cut List</span>
              <Button size="sm" variant="outline" onClick={addCutPiece}>
                <Plus className="w-3 h-3 mr-1" />
                Add Cut
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cutPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="p-3 bg-gray-800 rounded-lg grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-3">
                    <Label className="text-[10px] text-gray-400">Length (mm)</Label>
                    <Input
                      type="number"
                      value={piece.length}
                      onChange={(e) => updateCutPiece(piece.id, 'length', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-gray-400">Qty</Label>
                    <Input
                      type="number"
                      value={piece.quantity}
                      onChange={(e) => updateCutPiece(piece.id, 'quantity', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px] text-gray-400">Label</Label>
                    <Input
                      value={piece.label}
                      onChange={(e) => updateCutPiece(piece.id, 'label', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-gray-400">Priority</Label>
                    <Select
                      value={piece.priority.toString()}
                      onValueChange={(v) => updateCutPiece(piece.id, 'priority', Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">High</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">Low</SelectItem>
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
            
            <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
              <span>Total cuts: {totalCuts}</span>
              <span>Total length: {totalCutLength.toLocaleString()} mm</span>
            </div>
          </TabsContent>
          
          {/* Stock Tab */}
          <TabsContent value="stock" className="space-y-4">
            <div className="space-y-2">
              {stockPieces.map((stock) => (
                <div
                  key={stock.id}
                  className="p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{stock.length}mm</span>
                      {stock.isRemnant && (
                        <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-300 border-orange-500/40">
                          Remnant
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stock.quantity} available
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                    <span>Material: {stock.material}</span>
                    <span>Profile: {stock.profile}</span>
                    <span>Cost: ${stock.cost}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
              <span>Total stock: {totalStockLength.toLocaleString()} mm</span>
            </div>
          </TabsContent>
          
          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Strategy</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genetic">Genetic Algorithm (Best)</SelectItem>
                    <SelectItem value="best-fit">Best-Fit Decreasing</SelectItem>
                    <SelectItem value="first-fit">First-Fit Decreasing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kerf Width (mm)</Label>
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
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Optimization
                </>
              )}
            </Button>
            
            {/* Results */}
            {optimizationResult && (
              <>
                <Separator />
                
                <div className="grid grid-cols-4 gap-2">
                  <Card className="bg-gray-800 border-gray-700 p-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">
                        {(optimizationResult.summary.overallUtilization * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-400">Utilization</div>
                    </div>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700 p-3">
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {optimizationResult.summary.stockPiecesUsed}
                      </div>
                      <div className="text-[10px] text-gray-400">Bars Used</div>
                    </div>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700 p-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-400">
                        {optimizationResult.summary.totalWaste.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-gray-400">Waste (mm)</div>
                    </div>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700 p-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-400">
                        ${optimizationResult.summary.estimatedSavings.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-400">Savings</div>
                    </div>
                  </Card>
                </div>
                
                {/* Cutting Plans Visualization */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Cutting Plans</span>
                  {optimizationResult.plans.slice(0, 3).map((plan, idx) => (
                    <div key={idx} className="p-2 bg-gray-800 rounded">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                          Stock #{idx + 1}
                          {plan.isRemnant && (
                            <Badge variant="outline" className="text-[8px] h-4">Remnant</Badge>
                          )}
                        </span>
                        <span>{(plan.utilization * 100).toFixed(1)}%</span>
                      </div>
                      <div className="relative h-6 bg-gray-700 rounded overflow-hidden">
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
                  Export G-code
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CuttingOptimizationPanel;




