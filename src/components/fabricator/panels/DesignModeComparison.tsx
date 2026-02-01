/**
 * DesignModeComparison - Feature Comparison Matrix
 * 
 * Visual comparison table showing feature parity between SmartDraw and Drafting modes
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import React from 'react';

interface Feature {
  name: string;
  smartDraw: 'yes' | 'partial' | 'no';
  drafting: 'yes' | 'partial' | 'no';
  description: string;
  bestFor?: string;
}

const features: Feature[] = [
  {
    name: 'Grid-based design',
    smartDraw: 'yes',
    drafting: 'no',
    description: 'Quick layout using predefined grid cells',
    bestFor: 'Standard window configurations'
  },
  {
    name: 'CAD precision',
    smartDraw: 'no',
    drafting: 'yes',
    description: 'Pixel-perfect measurements and positioning',
    bestFor: 'Custom architectural designs'
  },
  {
    name: 'Egyptian templates',
    smartDraw: 'yes',
    drafting: 'yes',
    description: 'Pre-built patterns for common window types',
    bestFor: 'Both modes'
  },
  {
    name: '3D preview',
    smartDraw: 'yes',
    drafting: 'yes',
    description: 'Real-time 3D visualization',
    bestFor: 'Both modes'
  },
  {
    name: 'Hardware placement',
    smartDraw: 'partial',
    drafting: 'yes',
    description: 'Precise hardware positioning (hinges, handles, locks)',
    bestFor: 'Complex window systems'
  },
  {
    name: 'Keyboard shortcuts',
    smartDraw: 'no',
    drafting: 'yes',
    description: 'Power user productivity features',
    bestFor: 'Professional designers'
  },
  {
    name: 'Learning curve',
    smartDraw: 'yes',
    drafting: 'partial',
    description: 'Ease of use for beginners',
    bestFor: 'SmartDraw for beginners'
  },
  {
    name: 'Custom geometry',
    smartDraw: 'no',
    drafting: 'yes',
    description: 'Draw custom shapes, arcs, and complex geometries',
    bestFor: 'Unique architectural requirements'
  },
  {
    name: 'Layer management',
    smartDraw: 'no',
    drafting: 'yes',
    description: 'Organize design elements in layers',
    bestFor: 'Complex multi-element designs'
  },
  {
    name: 'Undo/Redo',
    smartDraw: 'partial',
    drafting: 'yes',
    description: 'Full history with unlimited undo/redo',
    bestFor: 'Iterative design process'
  },
  {
    name: 'Export formats',
    smartDraw: 'partial',
    drafting: 'yes',
    description: 'DXF, JSON, and other CAD formats',
    bestFor: 'Professional workflows'
  },
  {
    name: 'Real-time validation',
    smartDraw: 'yes',
    drafting: 'yes',
    description: 'Live constraint checking and error detection',
    bestFor: 'Both modes'
  }
];

const getFeatureIcon = (status: 'yes' | 'partial' | 'no') => {
  switch (status) {
    case 'yes':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'partial':
      return <Minus className="h-5 w-5 text-amber-400" />;
    case 'no':
      return <XCircle className="h-5 w-5 text-slate-600" />;
  }
};

export const DesignModeComparison: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-600/30 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-amber-200">SmartDraw</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-3">
              Perfect for quick designs using templates and grid-based layouts.
            </p>
            <div className="space-y-2">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                ✅ Best for beginners
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                ⚡ Fast workflow
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                📐 Template-based
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-600/30 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-amber-200">Professional Drafting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-3">
              Advanced CAD tools for custom designs with precision control.
            </p>
            <div className="space-y-2">
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">
                🎯 CAD precision
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">
                ⌨️ Keyboard shortcuts
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">
                🔧 Advanced tools
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Matrix */}
      <Card className="border-amber-600/30 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-amber-200">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-600/20">
                  <th className="text-left py-3 px-4 text-amber-300 font-semibold">Feature</th>
                  <th className="text-center py-3 px-4 text-amber-300 font-semibold">SmartDraw</th>
                  <th className="text-center py-3 px-4 text-amber-300 font-semibold">Drafting</th>
                  <th className="text-left py-3 px-4 text-amber-300 font-semibold">Best For</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-amber-600/10 ${
                      index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/10'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-200">{feature.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{feature.description}</div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {getFeatureIcon(feature.smartDraw)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {getFeatureIcon(feature.drafting)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {feature.bestFor || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-amber-600/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-amber-200">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div>
            <strong className="text-amber-400">Choose SmartDraw if:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>You're new to window design</li>
              <li>You need quick layouts using templates</li>
              <li>You're working with standard window configurations</li>
              <li>Speed is more important than precision</li>
            </ul>
          </div>
          <div>
            <strong className="text-amber-400">Choose Drafting if:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>You need CAD-level precision</li>
              <li>You're designing custom or complex geometries</li>
              <li>You're a professional architect or engineer</li>
              <li>You need advanced features like layers and custom shapes</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-slate-900/50 rounded border border-amber-600/20">
            <p className="text-xs text-amber-300">
              💡 <strong>Tip:</strong> You can switch between modes at any time. Your design state is automatically synchronized.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

