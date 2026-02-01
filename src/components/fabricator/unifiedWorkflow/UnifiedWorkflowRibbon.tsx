/**
 * Unified Workflow Ribbon Component
 * 
 * Adapts BosphorusWorkflowRibbon to support unified 4-stage workflow.
 * Maintains backward compatibility with legacy 7-tab workflow.
 * 
 * Constitutional: Deterministic workflow navigation, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { Progress } from '@/shared/ui/ui/progress';
import { LazyMotionButton, LazyMotionDiv } from '@/utils/lazyMotion';
import { ChevronDown } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { UNIFIED_STAGES, isUnifiedWorkflowEnabled } from './unifiedStages';
import type { WorkflowStep } from '../BosphorusWorkflowRibbon';

interface UnifiedWorkflowRibbonProps {
  /** Current active stage ID (unified mode) or step ID (legacy mode) */
  activeId: string;
  /** Callback when stage/step changes */
  onStageChange: (id: string) => void;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional: Force unified mode */
  unifiedMode?: boolean;
  /** Optional: Legacy steps (for backward compatibility) */
  legacySteps?: WorkflowStep[];
  /** Optional: Current type label */
  currentTypeLabel?: string;
  /** Optional: Efficiency percentage */
  efficiency?: number;
  /** Optional: Waste percentage */
  wastePercentage?: number;
}

export const UnifiedWorkflowRibbon: React.FC<UnifiedWorkflowRibbonProps> = ({
  activeId: _activeId,
  onStageChange,
  currentStepIndex,
  totalSteps,
  unifiedMode,
  legacySteps,
  currentTypeLabel,
  efficiency = 92.5,
  wastePercentage = 7.5,
}) => {
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const useUnified = unifiedMode ?? isUnifiedWorkflowEnabled();
  
  // Convert unified stages to WorkflowStep format for BosphorusWorkflowRibbon
  const unifiedSteps: WorkflowStep[] = useMemo(() => 
    UNIFIED_STAGES.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      icon: stage.icon,
      empire: stage.empire,
      innovation: undefined
    }))
  , []);

  // Use unified steps or legacy steps
  const steps = useUnified ? unifiedSteps : (legacySteps || []);
  const effectiveTotalSteps = useUnified ? UNIFIED_STAGES.length : totalSteps;
  const progressPercent = effectiveTotalSteps > 0 ? ((currentStepIndex + 1) / effectiveTotalSteps) * 100 : 0;
  const clamped = Math.max(0, Math.min(1, progressPercent / 100));
  const totalWindows = useUnified ? 12 : 18; // 4 stages = 12 windows, 6 steps = 18 windows
  const litWindows = Math.round(totalWindows * clamped);

  const getStatus = (index: number) => {
    if (index < currentStepIndex) return 'completed' as const;
    if (index === currentStepIndex) return 'current' as const;
    return 'upcoming' as const;
  };

  const getEmpireColor = (empire?: string) => {
    switch (empire) {
      case 'ottoman':
        return 'from-amber-600 to-yellow-400';
      case 'egyptian':
        return 'from-yellow-700 to-amber-400';
      case 'modern':
        return 'from-blue-600 to-cyan-400';
      default:
        return 'from-slate-600 to-slate-400';
    }
  };

  const getEmpireBadge = (empire?: string) => {
    switch (empire) {
      case 'ottoman':
        return {
          label: 'Ottoman Craft',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'egyptian':
        return {
          label: 'Egyptian Precision',
          color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        };
      case 'modern':
        return {
          label: 'YILMAZ Tech',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
      default:
        return {
          label: 'Cross-Empire',
          color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        };
    }
  };

  return (
    <LazyMotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Enhanced Header with Cross-Empire Branding */}
      <div className="mb-5 rounded-3xl border border-amber-600/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950/95 p-5 shadow-[0_0_40px_rgba(245,158,11,0.2)] relative overflow-hidden">
        {/* Ancient Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(251,191,36,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-amber-600/70">
                {useUnified ? 'UNIFIED WORKFLOW' : 'CROSS-EMPIRE FABRICATOR BRIDGE'}
              </p>
              {useUnified && (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px]">
                  UNIFIED
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <div className="hidden md:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_0.6rem_rgba(245,158,11,0.9)]" />
              <span>Active Innovation</span>
            </div>
            {currentTypeLabel && (
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-500/20 text-[10px] text-amber-100"
              >
                {currentTypeLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Cross-Empire Efficiency Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 relative z-10">
          <div className="bg-slate-800/40 rounded-lg p-3 border border-amber-600/30 card-dark">
            <div className="text-xs text-slate-400 mb-1">Efficiency</div>
            <div className="text-lg font-bold text-emerald-400">{efficiency}%</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-amber-600/30 card-dark">
            <div className="text-xs text-slate-400 mb-1">Waste</div>
            <div className="text-lg font-bold text-red-400">{wastePercentage}%</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-amber-600/30 card-dark">
            <div className="text-xs text-slate-400 mb-1">Stage Progress</div>
            <div className="text-lg font-bold text-amber-400">{Math.round(progressPercent)}%</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-amber-600/30 card-dark">
            <div className="text-xs text-slate-400 mb-1">Innovation Score</div>
            <div className="text-lg font-bold text-blue-400">94.2</div>
          </div>
        </div>

        {/* Enhanced Bridge deck with empire symbolism */}
        <div className="relative mb-5">
          <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden relative">
            {/* Base bridge structure */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-400 shadow-[0_0_18px_rgba(245,158,11,0.5)] relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Ottoman architectural patterns */}
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(251,191,36,0.1)_50%,transparent_75%)] bg-[length:20px_20px] animate-pulse" />
            </div>

            {/* Egyptian hieroglyphic motifs */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-4 h-4 bg-yellow-400 rounded-sm transform rotate-45" />
              <div className="absolute top-0 left-1/2 w-3 h-3 bg-amber-400 rounded-full" />
              <div className="absolute top-0 left-3/4 w-5 h-2 bg-yellow-300 transform skew-x-12" />
            </div>
          </div>

          {/* Modern YILMAZ tech glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-100%,rgba(59,130,246,0.3),transparent_70%)]" />
        </div>

        {/* Enhanced Towers with Empire Heritage */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 md:overflow-visible md:justify-between relative z-10 scrollbar-thin scrollbar-thumb-amber-600/30 scrollbar-track-transparent">
          {steps.map((step, index) => {
            const status = getStatus(index);
            const isCurrent = status === 'current';
            const isCompleted = status === 'completed';
            const Icon = step.icon;
            const empireBadge = getEmpireBadge(step.empire);

            return (
              <LazyMotionButton
                key={step.id}
                type="button"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStageChange(step.id)}
                className={`group relative min-w-[180px] md:min-w-0 px-4 pt-4 pb-5 rounded-2xl border text-left transition-all duration-300 backdrop-blur-sm ${
                  isCurrent
                    ? 'border-amber-400/90 bg-gradient-to-b from-amber-500/20 via-slate-950/95 to-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.9)]'
                    : isCompleted
                    ? 'border-emerald-400/80 bg-gradient-to-b from-emerald-500/15 via-slate-950/95 to-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.8)]'
                    : 'border-slate-700/80 bg-slate-950/90 hover:border-amber-500/50 hover:bg-slate-900/95'
                }`}
              >
                {/* Empire Heritage Background */}
                {step.empire && (
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${getEmpireColor(
                      step.empire,
                    )} opacity-5 pointer-events-none`}
                  />
                )}

                {/* Step header with empire badge */}
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.95)]'
                        : isCompleted
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.9)]'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    STAGE {index + 1}
                  </div>

                  {step.empire && (
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${empireBadge.color}`}>
                      {empireBadge.label}
                    </Badge>
                  )}
                </div>

                {/* Enhanced Icon node with empire influence */}
                <div className="relative flex items-center justify-center mb-3 z-10">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 relative ${
                      isCurrent
                        ? 'border-amber-300 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                        : isCompleted
                        ? 'border-emerald-300 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isCurrent
                          ? 'text-amber-300'
                          : isCompleted
                          ? 'text-emerald-300'
                          : 'text-slate-400 group-hover:text-amber-400'
                      }`}
                    />

                    {/* Empire influence glow */}
                    {step.empire && (
                      <div
                        className={`absolute inset-0 rounded-full ${
                          step.empire === 'ottoman'
                            ? 'bg-amber-400/10'
                            : step.empire === 'egyptian'
                            ? 'bg-yellow-400/10'
                            : 'bg-blue-400/10'
                        }`}
                      />
                    )}
                  </div>
                </div>

                <h3 className={`typography-h3 font-semibold text-xs md:text-sm mb-1 ${
                    isCurrent
                      ? 'text-amber-50'
                      : isCompleted
                      ? 'text-emerald-50'
                      : 'text-slate-100'
                  }`}>
                  {step.name}
                </h3>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{step.description}</p>

                {/* Innovation heritage */}
                {step.innovation && (
                  <div className="text-[10px] text-slate-500 italic border-t border-slate-700/50 pt-2">
                    {step.innovation}
                  </div>
                )}
              </LazyMotionButton>
            );
          })}
        </div>

        {/* Enhanced Progress with Empire Legacy - Collapsible */}
        <Collapsible open={isProgressOpen} onOpenChange={setIsProgressOpen}>
          <CollapsibleTrigger asChild>
            <div className="mt-4 bg-slate-950/90 rounded-xl p-4 border border-amber-600/30 backdrop-blur-sm cursor-pointer hover:bg-slate-900/90 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-amber-200">
                  {useUnified ? 'Unified Workflow Progress' : 'Cross-Empire Innovation Index'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">
                    Stage {currentStepIndex + 1} of {effectiveTotalSteps}{' '}
                    <span className="ml-1 text-amber-300 font-semibold">
                      {Math.round(progressPercent)}%
                    </span>
                  </span>
                  <ChevronDown 
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isProgressOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-slate-950/90 rounded-xl p-4 border border-amber-600/30 backdrop-blur-sm">
              <Progress value={progressPercent} className="h-2 bg-slate-800 mb-3">
                <div className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-400 rounded-full relative">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.3)_50%,transparent_55%)] bg-[length:20px_100%] animate-pulse" />
                </div>
              </Progress>

              <div className="mt-1 flex justify-between text-[11px] text-slate-500 mb-4">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Ottoman Craft
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  Egyptian Precision
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  YILMAZ Tech
                </span>
              </div>

              {/* Istanbul Skyline SVG - Adjusted for unified stages */}
              <div className="mt-4 rounded-lg border-t border-amber-600/30 pt-4">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>
                    {useUnified 
                      ? 'Unified Workflow – progress through 4 stages from Measure & Design to Quality & Delivery.'
                      : 'Istanbul Skyline – lights react as you progress from Measuring to Quality.'
                    }
                  </span>
                  <span className="font-medium text-amber-300">
                    {Math.round(clamped * 100)}% journey complete
                  </span>
                </div>
                <svg
                  viewBox="0 0 400 80"
                  className="mt-1 h-16 w-full text-slate-700"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="skylineGlow" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="50%" stopColor="#020617" />
                      <stop offset="100%" stopColor="#082f49" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="400" height="80" fill="url(#skylineGlow)" />
                  <rect x="0" y="62" width="400" height="3" fill="#020617" opacity={0.9} />
                  <path
                    d="M10 55 Q 200 40 390 55"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth={1.5}
                    strokeOpacity={0.6 + clamped * 0.3}
                  />
                  <g stroke="#020617" strokeWidth="1">
                    {/* Adjust tower count for unified (4 stages = 4 towers) */}
                    {useUnified ? (
                      <>
                        <rect x="60" y="28" width="14" height="36" fill="#020617" />
                        <rect x="140" y="24" width="16" height="40" fill="#020617" />
                        <rect x="220" y="26" width="14" height="38" fill="#020617" />
                        <rect x="300" y="30" width="12" height="34" fill="#020617" />
                      </>
                    ) : (
                      <>
                        <rect x="40" y="30" width="12" height="32" fill="#020617" />
                        <rect x="120" y="26" width="14" height="36" fill="#020617" />
                        <rect x="190" y="18" width="18" height="44" fill="#020617" />
                        <rect x="260" y="24" width="14" height="38" fill="#020617" />
                        <rect x="330" y="28" width="12" height="34" fill="#020617" />
                      </>
                    )}
                  </g>
                  {Array.from({ length: totalWindows }).map((_, index) => {
                    const lit = index < litWindows;
                    const windowsPerTower = useUnified ? 3 : 3;
                    const towerIndex = Math.floor(index / windowsPerTower);
                    const windowInTower = index % windowsPerTower;
                    const towerX = useUnified 
                      ? [60, 140, 220, 300][towerIndex] || 60
                      : [40, 120, 190, 260, 330][towerIndex] || 40;
                    const windowX = towerX + 3 + windowInTower * 3;
                    const windowY = 35 + towerIndex * 2;
                    return (
                      <rect
                        key={index}
                        x={windowX}
                        y={windowY}
                        width="2"
                        height="3"
                        fill={lit ? '#fbbf24' : '#1e293b'}
                        opacity={lit ? 0.8 + Math.random() * 0.2 : 0.1}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </LazyMotionDiv>
  );
};

export default UnifiedWorkflowRibbon;

