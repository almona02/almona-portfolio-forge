/**
 * Constitutional Top Bar Component
 * 
 * Displays position/project information with constitutional status indicators
 * Inspired by industry-leading design systems (Figma, Linear, Vercel)
 * 
 * @tier Tier 0 (Display Only)
 * @constitutional_compliance AICS-001 §9.3
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Badge } from '@/shared/ui/ui/badge';
import type { WindowUnit } from '@/types/fabricator';
import { Circle, MapPin, Shield } from 'lucide-react';
import React from 'react';

export interface ConstitutionalTopBarProps {
    /** Current window unit/pose */
    project: WindowUnit | null;

    /** When set (e.g. from drafting canvas), overrides project size for the Size badge so it stays in sync with current design */
    liveSize?: { width: number; height: number } | null;

    /** When set (e.g. from drafting first defined frame), overrides project.systemPackId for system pack branding display */
    liveSystemPackId?: string | null;

    /** Current design mode */
    mode: 'smartdraw' | 'drafting';

    /** Unsaved changes indicator */
    hasUnsavedChanges?: boolean;

    /** Constitutional compliance status */
    constitutionalStatus?: {
        hash?: string;
        timestamp?: string;
        verified?: boolean;
    };

    /** Additional className */
    className?: string;
}

/**
 * Gold-tier constitutional top bar with position/project info
 * 
 * Design Inspiration:
 * - Figma: Clean hierarchy, subtle indicators
 * - Linear: Status badges, monospace codes
 * - Vercel: Minimalist, high-contrast
 */
export const ConstitutionalTopBar: React.FC<ConstitutionalTopBarProps> = ({
    project,
    liveSize,
    liveSystemPackId,
    mode,
    hasUnsavedChanges = false,
    constitutionalStatus,
    className = ''
}) => {
    if (!project) return null;

    const modeLabel = mode === 'drafting' ? 'Drafting' : 'SmartDraw';
    const widthMm = liveSize?.width ?? project.overallWidth;
    const heightMm = liveSize?.height ?? project.overallHeight;
    const effectivePackId = liveSystemPackId ?? project.systemPackId;
    const systemPack = effectivePackId
      ? SYSTEM_PACKS.find((p) => p.meta?.id === effectivePackId)
      : null;
    const systemPackName = systemPack?.meta?.name ?? null;

    return (
        <div
            className={`
        flex items-center justify-between
        bg-gradient-to-r from-slate-900/50 to-slate-800/50
        border border-slate-700/50
        rounded-lg px-4 py-2.5
        backdrop-blur-sm
        shadow-lg shadow-black/10
        ${className}
      `}
        >
            {/* Left: Position & Project Info */}
            <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Pos</span>
                    <span className="font-mono text-amber-300 font-semibold tracking-tight">
                        #{project.posNumber}
                    </span>
                    {systemPackName && (
                        <span
                            className="ml-1.5 text-amber-400/90 font-medium"
                            title={systemPackName}
                        >
                            — {systemPackName}
                        </span>
                    )}
                    <span className="text-slate-600 mx-1">of</span>
                    <span className="text-slate-400">Project</span>
                    <span className="font-mono text-blue-300 font-semibold tracking-tight">
                        #{project.orderNumber}
                    </span>
                </div>
            </div>

            {/* Center: Mode & Status Badges */}
            <div className="flex items-center gap-2">
                {/* Mode Badge */}
                <Badge
                    variant="outline"
                    className={`
            text-xs font-medium border
            ${mode === 'drafting'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }
          `}
                >
                    {modeLabel} Mode
                </Badge>

                {/* Unsaved Changes Indicator */}
                {hasUnsavedChanges && (
                    <Badge
                        variant="outline"
                        className="
              text-xs font-medium
              bg-orange-500/10 text-orange-300 border-orange-500/30
              animate-pulse
            "
                    >
                        <Circle className="h-2 w-2 fill-current mr-1.5" />
                        Unsaved
                    </Badge>
                )}

                {/* Constitutional Status (if available) */}
                {constitutionalStatus?.verified && (
                    <Badge
                        variant="outline"
                        className="
              text-xs font-medium
              bg-emerald-500/10 text-emerald-300 border-emerald-500/30
            "
                        title={`Hash: ${constitutionalStatus.hash?.substring(0, 8)}...`}
                    >
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                    </Badge>
                )}
            </div>

            {/* Right: Size & Dimensions */}
            <div className="flex items-center gap-2">
                <Badge
                    variant="outline"
                    className="
            text-xs font-mono
            bg-slate-800/50 text-slate-300 border-slate-600/50
          "
                    title="Frame size (width × height)"
                >
                    Size: {Number(widthMm).toFixed(0)} × {Number(heightMm).toFixed(0)} mm
                </Badge>
            </div>
        </div>
    );
};

/**
 * Compact version for smaller contexts
 */
export const ConstitutionalTopBarCompact: React.FC<ConstitutionalTopBarProps> = ({
    project,
    liveSystemPackId,
    hasUnsavedChanges = false,
    className = ''
}) => {
    if (!project) return null;

    const effectivePackId = liveSystemPackId ?? project.systemPackId;
    const systemPack = effectivePackId
      ? SYSTEM_PACKS.find((p) => p.meta?.id === effectivePackId)
      : null;
    const systemPackName = systemPack?.meta?.name ?? null;

    return (
        <div
            className={`
        flex items-center gap-2
        text-xs text-slate-400
        ${className}
      `}
        >
            <MapPin className="h-3 w-3" />
            <span>
                Pos <span className="font-mono text-amber-300">#{project.posNumber}</span>
                {systemPackName && (
                    <span className="text-amber-400/90 font-medium ml-1">— {systemPackName}</span>
                )}
                {' '}of{' '}
                <span className="font-mono text-blue-300">#{project.orderNumber}</span>
            </span>

            {hasUnsavedChanges && (
                <Circle className="h-2 w-2 fill-orange-400 text-orange-400 animate-pulse ml-1" />
            )}
        </div>
    );
};
