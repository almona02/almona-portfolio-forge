import { CurtainWallEngine, FacadeGridSpec, FacadeModel } from '@/lib/facade/CurtainWallEngine';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Slider } from '@/shared/ui/ui/slider';
import { Calculator, Grid, Layers, Settings, Table } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FacadeGridEditorProps {
  onModelChange: (model: FacadeModel) => void;
  initialSpec?: Partial<FacadeGridSpec>;
}

export const FacadeGridEditor: React.FC<FacadeGridEditorProps> = ({ 
  onModelChange, 
  initialSpec 
}) => {
  // Grid Configuration State
  const [cols, setCols] = useState(initialSpec?.cols || 4);
  const [rows, setRows] = useState(initialSpec?.rows || 3);
  const [width, setWidth] = useState(initialSpec?.width || 4000);
  const [height, setHeight] = useState(initialSpec?.height || 3000);
  
  // Profile Selection (Mock - normally would come from DB)
  const [mullionProfileId, setMullionProfileId] = useState(initialSpec?.mullionProfileId || 'pf-mullion-50');
  const [transomProfileId, setTransomProfileId] = useState(initialSpec?.transomProfileId || 'pf-transom-50');

  // Generated Model State
  const [model, setModel] = useState<FacadeModel | null>(null);

  // Auto-generate model on changes
  useEffect(() => {
    const spec: FacadeGridSpec = {
      width,
      height,
      rows,
      cols,
      rowHeights: [], // Evenly distributed for now
      colWidths: [],  // Evenly distributed for now
      mullionProfileId,
      transomProfileId,
      glassType: 'glass-clear-6mm'
    };

    const newModel = CurtainWallEngine.generateStickSystem(spec);
    setModel(newModel);
    onModelChange(newModel);
  }, [width, height, rows, cols, mullionProfileId, transomProfileId, onModelChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* LEFT: Controls */}
      <Card className="md:col-span-1 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Grid className="w-5 h-5" />
            Facade Grid Spec
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Overall Dimensions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Dimensions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Width (mm)</Label>
                <Input 
                  type="number" 
                  value={width} 
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Height (mm)</Label>
                <Input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* Profile Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Profiles
            </h3>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Mullion Profile ID</Label>
              <Input 
                value={mullionProfileId}
                onChange={(e) => setMullionProfileId(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Transom Profile ID</Label>
              <Input 
                value={transomProfileId}
                onChange={(e) => setTransomProfileId(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* Grid Layout */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Table className="w-4 h-4" /> Grid Layout
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Columns (Verticals)</span>
                <span className="text-amber-400 font-mono">{cols}</span>
              </div>
              <Slider 
                value={[cols]} 
                min={1} 
                max={20} 
                step={1} 
                onValueChange={(v) => setCols(v[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Rows (Horizontals)</span>
                <span className="text-amber-400 font-mono">{rows}</span>
              </div>
              <Slider 
                value={[rows]} 
                min={1} 
                max={50} 
                step={1} 
                onValueChange={(v) => setRows(v[0])}
                className="py-2"
              />
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* Statistics */}
          {model && (
            <div className="bg-gray-800_50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-300 mb-2">
                <Calculator className="w-3 h-3" /> Calculated Metrics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Area</div>
                  <div className="text-white font-mono">{(model.totalArea / 1000000).toFixed(2)} m²</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Perimeter</div>
                  <div className="text-white font-mono">{(model.totalPerimeter / 1000).toFixed(2)} m</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Mullions</div>
                  <div className="text-white font-mono">{model.members.filter(m => m.type === 'mullion').length}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Panels</div>
                  <div className="text-white font-mono">{model.panels.length}</div>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* RIGHT: Preview (Simplified 2D Grid Visualization) */}
      <Card className="md:col-span-2 bg-gray-950 border-gray-800">
         <CardHeader>
           <div className="flex justify-between items-center">
             <CardTitle className="text-gray-200 text-sm">Drafting Preview</CardTitle>
             <Badge variant="outline" className="border-amber-500 text-amber-400">Stick System</Badge>
           </div>
         </CardHeader>
         <CardContent className="h-[500px] flex items-center justify-center relative overflow-hidden bg-gray-900/50 m-4 rounded-xl border border-gray-800 border-dashed">
            {/* Simple SVG Generation for Preview */}
            <svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${width + 500} ${height + 500}`} 
              className="w-full h-full max-w-full max-h-full"
            >
              {/* Grid Background */}
              <defs>
                <pattern id="smallGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-800/20" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />

              {/* Facade Model Rendering */}
              <g transform={`translate(250, 250)`}>
                {/* 1. Transoms (Draw first so mullions cover them if needed, or vice-versa depending on detail) */}
                {model?.members.filter(m => m.type === 'transom').map(member => (
                   <rect 
                     key={member.id}
                     x={member.position.x}
                     y={member.position.y - 25} // Centered (assuming 50mm profile)
                     width={member.length}
                     height={50} 
                     fill="#4b5563"
                     stroke="#1f2937"
                     strokeWidth="2"
                   />
                ))}

                {/* 2. Mullions (Verticals) */}
                {model?.members.filter(m => m.type === 'mullion').map(member => (
                   <rect 
                     key={member.id}
                     x={member.position.x - 25} // Centered (assuming 50mm profile)
                     y={member.position.y}
                     width={50}
                     height={member.length}
                     fill="#6366f1"
                     stroke="#312e81"
                     strokeWidth="2"
                   />
                ))}

                {/* 3. Panels (Glass) */}
                {/* Note: In a real implementation, we'd iterate panels. Here we can visualize them if we calculated their rects explicitly in the component,
                    or just rely on the gaps between members. The Engine provides panels array with row/col but not explicit coords yet in this simple UI code.
                    We'll trust the member visualization for now.
                */}
              </g>

              {/* Dimensions Labels */}
              <text x={250 + width/2} y={150} fill="white" textAnchor="middle" fontSize="40">{width} mm</text>
              <text x={100} y={250 + height/2} fill="white" textAnchor="middle" fontSize="40" transform={`rotate(-90, 100, ${250 + height/2})`}>{height} mm</text>
            </svg>
         </CardContent>
      </Card>
    </div>
  );
};
