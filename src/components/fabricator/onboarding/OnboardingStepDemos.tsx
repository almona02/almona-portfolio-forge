/**
 * Onboarding Step Interactive Demos
 * ---------------------------------------------------------------------------
 * Interactive demo components for each onboarding step
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { CheckCircle2, Download, Play, Ruler, Scissors, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

/**
 * Step 1: Smart Measuring Demo
 */
export const SmartMeasuringDemo: React.FC = () => {
  const [step, setStep] = useState(0);
  const [measurements, setMeasurements] = useState({ width: 0, height: 0 });

  const steps = [
    { label: 'Select measuring tool', icon: Ruler },
    { label: 'Click to start measurement', icon: Play },
    { label: 'Drag to measure dimensions', icon: Ruler },
    { label: 'Confirm measurements', icon: CheckCircle2 },
  ];

  const handleMeasure = () => {
    // Simulate measurement
    setMeasurements({ width: 1200, height: 1500 });
    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 1000);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-5 w-5 text-blue-400" />
          Interactive Measuring Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all',
                  i === step
                    ? 'bg-blue-500/20 border border-blue-500/50'
                    : i < step
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-gray-800/50 border border-gray-700'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    i === step
                      ? 'bg-blue-500 text-white'
                      : i < step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  )}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm',
                    i === step ? 'font-semibold text-blue-300' : i < step ? 'text-green-300' : 'text-gray-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {step < steps.length - 1 ? (
          <Button onClick={handleMeasure} className="w-full bg-blue-600 hover:bg-blue-700">
            {step === 0 ? 'Start Measuring' : 'Next Step'}
          </Button>
        ) : (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-300 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Measurement Complete!</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Width: {measurements.width}mm</p>
              <p>Height: {measurements.height}mm</p>
            </div>
          </div>
        )}

        <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
      </CardContent>
    </Card>
  );
};

/**
 * Step 2: AI-Powered Design Demo
 */
export const AIDesignDemo: React.FC = () => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGetSuggestions = () => {
    setLoading(true);
    setTimeout(() => {
      setSuggestions([
        'Casement window with multi-point lock',
        'Recommended profile: 60mm aluminum',
        'Suggested accessories: Hinge, handle, lock',
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI Design Assistant Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-300">
          Click the button below to see how AI suggests optimal window configurations based on your measurements.
        </p>

        <Button
          onClick={handleGetSuggestions}
          disabled={loading || suggestions.length > 0}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'Analyzing...' : suggestions.length > 0 ? 'Suggestions Generated' : 'Get AI Suggestions'}
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-purple-300">AI Suggestions:</h4>
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg animate-in fade-in slide-in-from-left"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-200">{suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              ✓ AI has analyzed your measurements and provided optimal recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Step 3: Cutting Optimization Demo
 */
export const OptimizationDemo: React.FC = () => {
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<{
    wasteReduction: number;
    efficiency: number;
    cuts: number;
  } | null>(null);

  const handleOptimize = () => {
    setOptimizing(true);
    setTimeout(() => {
      setResults({
        wasteReduction: 23.5,
        efficiency: 94.2,
        cuts: 12,
      });
      setOptimizing(false);
    }, 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scissors className="h-5 w-5 text-orange-400" />
          Cutting Optimization Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-300">
          The optimization engine calculates the most efficient cutting plan to minimize waste and maximize material usage.
        </p>

        <Button
          onClick={handleOptimize}
          disabled={optimizing || results !== null}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {optimizing ? 'Optimizing...' : results ? 'Optimization Complete' : 'Run Optimization'}
        </Button>

        {optimizing && (
          <div className="space-y-2">
            <Progress value={75} className="h-2" />
            <p className="text-xs text-center text-gray-400">Calculating optimal cutting plan...</p>
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-300">Optimization Results:</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">{results.wasteReduction}%</div>
                <div className="text-xs text-gray-400 mt-1">Waste Reduction</div>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">{results.efficiency}%</div>
                <div className="text-xs text-gray-400 mt-1">Efficiency</div>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">{results.cuts}</div>
                <div className="text-xs text-gray-400 mt-1">Total Cuts</div>
              </div>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">
                ✓ Optimization complete! Ready to export cutting plan.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Step 4: CNC Export Demo
 */
export const CNCExportDemo: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [format, setFormat] = useState<'dxf' | 'csv' | 'pdf' | null>(null);

  const formats = [
    { id: 'dxf', label: 'DXF File', description: 'For CNC machines' },
    { id: 'csv', label: 'CSV Report', description: 'Cutting list' },
    { id: 'pdf', label: 'PDF Report', description: 'Full documentation' },
  ];

  const handleExport = (formatId: string) => {
    const validFormat: 'dxf' | 'csv' | 'pdf' = (formatId === 'dxf' || formatId === 'csv' || formatId === 'pdf') 
      ? formatId as 'dxf' | 'csv' | 'pdf'
      : 'dxf';
    setFormat(validFormat);
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExported(true);
    }, 1500);
  };

  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="h-5 w-5 text-green-400" />
          CNC Export Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-300">
          Export your optimized cutting plan in various formats for production.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {formats.map((f) => (
            <Button
              key={f.id}
              variant="outline"
              onClick={() => handleExport(f.id)}
              disabled={exporting || exported}
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-3',
                format === f.id && 'border-green-500 bg-green-500/10'
              )}
            >
              <Download className="h-5 w-5" />
              <span className="text-xs font-semibold">{f.label}</span>
              <span className="text-[10px] text-gray-400">{f.description}</span>
            </Button>
          ))}
        </div>

        {exporting && (
          <div className="space-y-2">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-center text-gray-400">
              Exporting {format?.toUpperCase()} file...
            </p>
          </div>
        )}

        {exported && format && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-300 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Export Complete!</span>
            </div>
            <p className="text-sm text-gray-300">
              Your {format.toUpperCase()} file has been generated and is ready for download.
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline" className="border-green-500/50 text-green-300">
                {format.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-green-500/50 text-green-300">
                Ready
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

