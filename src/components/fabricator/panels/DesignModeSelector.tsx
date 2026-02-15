/**
 * DesignModeSelector - Unified Design Mode Selection Component
 * 
 * Provides a clear, user-friendly interface for choosing between:
 * - SmartDraw: Quick grid-based design (beginner-friendly)
 * - Drafting: Professional CAD-level precision tools
 * 
 * Features:
 * - Visual mode cards with feature highlights
 * - Seamless mode switching
 * - State persistence
 * - Progressive enhancement recommendations
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/ui/dialog';
import { HelpCircle, Grid3x3, Ruler, Sparkles, Zap } from 'lucide-react';
import React, { ReactNode, useEffect, useState } from 'react';
import { DesignModeComparison } from './DesignModeComparison';
import { useDesignModeRecommendation } from '@/hooks/useDesignModeRecommendation';

export type DesignMode = 'smartdraw' | 'drafting';

interface DesignModeSelectorProps {
  /** Initial mode (from URL or localStorage) */
  initialMode?: DesignMode;
  /** Callback when mode changes */
  onModeChange?: (mode: DesignMode) => void;
  /** SmartDraw canvas component */
  smartDrawCanvas?: ReactNode;
  /** Drafting workbench component */
  draftingWorkbench?: ReactNode;
  /** Show mode selector cards (false = direct canvas) */
  showSelector?: boolean;
  /** Project dimensions for recommendations */
  projectDimensions?: {
    width: number;
    height: number;
  };
}

export const DesignModeSelector: React.FC<DesignModeSelectorProps> = ({
  initialMode = 'smartdraw',
  onModeChange,
  smartDrawCanvas,
  draftingWorkbench,
  showSelector = true,
  projectDimensions
}) => {
  const [mode, setMode] = useState<DesignMode>(initialMode);
  const [showComparison, setShowComparison] = useState(false);
  const { getRecommendation } = useDesignModeRecommendation();

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem('almona-design-mode', mode);
  }, [mode]);

  // Load mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('almona-design-mode') as DesignMode | null;
    if (savedMode && (savedMode === 'smartdraw' || savedMode === 'drafting')) {
      setMode(savedMode);
      onModeChange?.(savedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run on mount - onModeChange is optional callback

  // Get smart recommendation
  const recommendation = projectDimensions ? getRecommendation(projectDimensions) : null;

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  // If selector is hidden, just render the canvas for current mode
  if (!showSelector) {
    return (
      <div className="w-full h-full">
        {mode === 'smartdraw' ? smartDrawCanvas : draftingWorkbench}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SmartDraw Card */}
        <Card
          className={`cursor-pointer transition-all duration-300 ${
            mode === 'smartdraw'
              ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30'
              : 'border-amber-600/20 bg-slate-900/50 hover:border-amber-600/40 hover:bg-slate-900/70'
          }`}
          onClick={() => handleModeChange('smartdraw')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  mode === 'smartdraw' 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <Grid3x3 className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-semibold text-amber-200">
                  SmartDraw
                </CardTitle>
              </div>
              {mode === 'smartdraw' && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm text-slate-400">
              Quick grid-based design with Egyptian templates
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                <Sparkles className="h-3 w-3 mr-1" />
                Template-based
              </Badge>
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                Beginner-friendly
              </Badge>
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                Fast workflow
              </Badge>
            </div>
            {recommendation?.mode === 'smartdraw' && recommendation.reason && (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400">
                💡 {recommendation.reason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drafting Card */}
        <Card
          className={`cursor-pointer transition-all duration-300 ${
            mode === 'drafting'
              ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30'
              : 'border-amber-600/20 bg-slate-900/50 hover:border-amber-600/40 hover:bg-slate-900/70'
          }`}
          onClick={() => handleModeChange('drafting')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  mode === 'drafting' 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <Ruler className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-semibold text-amber-200">
                  Professional Drafting
                </CardTitle>
              </div>
              {mode === 'drafting' && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                  Active
                </Badge>
              )}
              {mode !== 'drafting' && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                  Premium
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm text-slate-400">
              CAD-level precision tools for custom designs
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                <Zap className="h-3 w-3 mr-1" />
                CAD precision
              </Badge>
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                Advanced tools
              </Badge>
              <Badge variant="secondary" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                Keyboard shortcuts
              </Badge>
            </div>
            {recommendation?.mode === 'drafting' && recommendation.reason && (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400">
                💡 {recommendation.reason}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Button */}
      <div className="flex items-center justify-center">
        <Dialog open={showComparison} onOpenChange={setShowComparison}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600/30 text-amber-400 hover:bg-amber-500/10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Which mode should I use?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Design Mode Comparison</DialogTitle>
              <DialogDescription>
                Choose the right tool for your design needs
              </DialogDescription>
            </DialogHeader>
            <DesignModeComparison />
          </DialogContent>
        </Dialog>
      </div>

      {/* Unified Canvas Area */}
      <div className="flex-1 min-h-0 border border-amber-600/30 rounded-lg overflow-hidden bg-slate-950">
        <div className="w-full h-full">
          {mode === 'smartdraw' ? (
            <div className="w-full h-full">
              {smartDrawCanvas || (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-sm">SmartDraw canvas will render here</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full">
              {draftingWorkbench || (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Ruler className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-sm">Drafting workbench will render here</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

