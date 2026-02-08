import { CutListItem, OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Maximize2, Ruler, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useMemo, useState } from 'react';

const DEFAULT_SAW_KERF_MM = 10;

interface VisualCuttingPlanProps {
    cutList: OptimizedCutList;
    barLengthMm?: number;
    /** Saw kerf (mm) used for bar packing — used so "Used" and waste % match the report. */
    sawKerfMm?: number;
}

interface VisualSegment extends CutListItem {
    id: string;
}

const VisualCuttingPlanInner: React.FC<VisualCuttingPlanProps> = ({
    cutList,
    barLengthMm = 6500,
    sawKerfMm = DEFAULT_SAW_KERF_MM,
}) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

    // Group cuts by bar number
    const barGroups = useMemo(() => {
        const groups: Record<number, VisualSegment[]> = {};
        cutList.items.forEach((item) => {
            for (let i = 0; i < item.quantity; i++) {
                const barNum = item.barNumber;
                if (!groups[barNum]) groups[barNum] = [];
                groups[barNum].push({
                    ...item,
                    id: `${barNum}-${item.profileId}-${item.cutLengthMm}-${item.cuttingAngle}-${i}`,
                });
            }
        });

        // Sort cuts on each bar by position; recalc positions if they overlap (condensed data)
        Object.keys(groups).forEach((key) => {
            const k = parseInt(key, 10);
            groups[k].sort((a, b) => a.positionOnBarMm - b.positionOnBarMm);
            let currentPos = 0;
            groups[k].forEach((cut, idx) => {
                if (idx === 0 && cut.positionOnBarMm > 0) currentPos = cut.positionOnBarMm;
                if (cut.positionOnBarMm < currentPos) {
                    cut.positionOnBarMm = currentPos;
                }
                currentPos = cut.positionOnBarMm + cut.cutLengthMm + sawKerfMm;
            });
        });

        return groups;
    }, [cutList.items, sawKerfMm]);

    const BAR_HEIGHT = 160; // Doubled for clearer visibility
    const VIEW_HEIGHT = 240; // Extra space for labels and hover dimension

    return (
        <Card
            className="w-full border-2 border-slate-100 dark:border-slate-800 shadow-sm"
            aria-label="Visual cutting plan with bar layout and segment lengths"
        >
            <CardHeader className="pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden />
                            Visual Cutting Plan
                        </CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Scroll to pan, zoom to inspect. Hover a segment for length.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.2))}
                            disabled={zoomLevel <= 0.2}
                            aria-label="Zoom out"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-mono font-semibold w-16 text-center select-none text-slate-700 dark:text-slate-300 tabular-nums">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.2))}
                            disabled={zoomLevel >= 4}
                            aria-label="Zoom in"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" aria-hidden />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => setZoomLevel(1)}
                            title="Reset zoom to 100%"
                            aria-label="Reset zoom"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-8 p-6">
                {Object.entries(barGroups)
                    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                    .map(([barNum, cuts]) => {
                        const _barNumber = parseInt(barNum, 10);
                        const totalUsed =
                            cuts.reduce((sum, c) => sum + c.cutLengthMm, 0) + cuts.length * sawKerfMm;
                        const wasteMm = barLengthMm - totalUsed;
                        const _wastePercent = barLengthMm > 0 ? (wasteMm / barLengthMm) * 100 : 0;
                        const visualEndUsed = cuts.reduce(
                            (acc, c) => Math.max(acc, c.positionOnBarMm + c.cutLengthMm),
                            0
                        );
                        const wasteRectWidth = barLengthMm - visualEndUsed;

                        // Layout calculations
                        const viewWidth = barLengthMm;

                        // Generate a "Part ID" for the visual (e.g. W1-F1)
                        // We don't have the strict window map here, so we'll simulate it based on role
                        // In a real app, this comes from the window unit ID.

                        return (
                            <div key={barNum} className="flex items-center gap-4 py-2 border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                                {/* Quantity */}
                                <div className="w-12 font-mono text-lg font-bold text-slate-700 dark:text-slate-300 text-center shrink-0">
                                    1 x
                                </div>

                                {/* Profile Icon (Placeholder SVG) */}
                                <div className="w-8 shrink-0 opacity-70" title={cuts[0]?.profileName}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-slate-500">
                                        <rect x="4" y="4" width="16" height="16" rx="2" />
                                        <path d="M9 4v16M15 4v16" />
                                    </svg>
                                </div>

                                {/* Bar Visualization */}
                                <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar">
                                    <div
                                        style={{
                                            width: `${Math.max(100, zoomLevel * 100)}%`,
                                            minWidth: '100%'
                                        }}
                                        className="relative py-2"
                                    >
                                        <svg
                                            viewBox={`-50 -30 ${viewWidth + 100} ${VIEW_HEIGHT + 30}`}
                                            className="w-full h-auto select-none"
                                            preserveAspectRatio="xMidYMid meet"
                                            aria-hidden
                                        >
                                            <defs>
                                                <pattern id="stripe-pattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                                    <rect width="4" height="8" fill="#94a3b8" fillOpacity="0.2" />
                                                </pattern>
                                                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" floodColor="black" />
                                                </filter>
                                                <linearGradient id="alum-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#e2e8f0" stopOpacity="1" />
                                                    <stop offset="50%" stopColor="#cbd5e1" stopOpacity="1" />
                                                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
                                                </linearGradient>
                                                <linearGradient id="alum-fill-hover" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#bfdbfe" stopOpacity="1" />
                                                    <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
                                                </linearGradient>
                                            </defs>

                                            {/* Bar Background Ghost */}
                                            <rect
                                                x="0" y="0"
                                                width={barLengthMm} height={BAR_HEIGHT}
                                                fill="none"
                                                stroke="#e2e8f0"
                                                strokeWidth="1"
                                                rx="2"
                                            />

                                            {/* Render Cuts */}
                                            {cuts.map((cut, idx) => {
                                                const isHovered = hoveredSegment === `${barNum}-${idx}`;
                                                const h = BAR_HEIGHT;
                                                const x = cut.positionOnBarMm;
                                                const w = cut.cutLengthMm;
                                                const angle = cut.cuttingAngle ?? 45;

                                                // Visual slope for 45 deg cuts
                                                const slope = angle === 90 ? 0 : Math.min(h, w / 2);

                                                // Determine path based on angle type
                                                // 45 = /  (bottom-left to top-right)
                                                // 135 = \ (top-left to bottom-right)
                                                // Standard frame cut usually: /____\ (Left=45, Right=45? No, Right=135 in geometric terms)
                                                // In machine terms: 45-45 means both ends mitered. 
                                                // We will draw /____\ for visual simplicity if angle is 45.

                                                let path: string;
                                                // Assume standard: Left is / (45), Right is \ (135) for a typical "45-45" cut
                                                // If the data says "45", we assume standard miter on both ends for the visual
                                                if (angle === 45) {
                                                    path = `M ${x} ${h} L ${x + slope} 0 L ${x + w - slope} 0 L ${x + w} ${h} Z`;
                                                } else if (angle === 90) {
                                                    path = `M ${x} ${h} L ${x} 0 L ${x + w} 0 L ${x + w} ${h} Z`;
                                                } else {
                                                    path = `M ${x} ${h} L ${x + slope} 0 L ${x + w - slope} 0 L ${x + w} ${h} Z`;
                                                }

                                                // Mock Part ID: e.g. W01-1 (Simulated)
                                                const partId = `W01-${idx + 1}`;

                                                return (
                                                    <g
                                                        key={cut.id}
                                                        onMouseEnter={() => setHoveredSegment(`${barNum}-${idx}`)}
                                                        onMouseLeave={() => setHoveredSegment(null)}
                                                        className="cursor-pointer group"
                                                    >
                                                        {/* The Cut Segment Area */}
                                                        <path
                                                            d={path}
                                                            fill={isHovered ? 'url(#alum-fill-hover)' : 'url(#alum-fill)'}
                                                            strokeWidth="0"
                                                            className="transition-all duration-200"
                                                        />

                                                        {/* Explicit Visual Lines for "Cutting Shape" (Rectangular containment + Diagonals) */}
                                                        {/* Top and Bottom containment lines */}
                                                        <line x1={angle === 135 ? x + slope : x} y1={0} x2={angle === 45 ? x + w - slope : x + w} y2={0} stroke="#334155" strokeWidth="1.5" />
                                                        <line x1={angle === 45 ? x + slope : x} y1={h} x2={angle === 135 ? x + w - slope : x + w} y2={h} stroke="#334155" strokeWidth="1.5" />

                                                        {/* The Cut Lines (Diagonals/Verticals) - giving the "Rectangle" effect of the bar being sliced */}
                                                        {/* Left Cut */}
                                                        {angle === 45 ? (
                                                            <line x1={x + slope} y1={0} x2={x} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        ) : angle === 135 ? (
                                                            <line x1={x} y1={0} x2={x + slope} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        ) : (
                                                            <line x1={x} y1={0} x2={x} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        )}

                                                        {/* Right Cut */}
                                                        {angle === 45 ? (
                                                            <line x1={x + w - slope} y1={0} x2={x + w} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        ) : angle === 135 ? (
                                                            <line x1={x + w} y1={0} x2={x + w - slope} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        ) : (
                                                            <line x1={x + w} y1={0} x2={x + w} y2={h} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                                                        )}

                                                        {/* Labels - Only if segment is wide enough */}
                                                        {w > 150 && (
                                                            <g>
                                                                {/* Part ID (Top Left ish) */}
                                                                <text
                                                                    x={x + slope + 20}
                                                                    y="35"
                                                                    fontSize="28"
                                                                    fontWeight="600"
                                                                    fill="#334155"
                                                                    style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                                                                >
                                                                    {partId}
                                                                </text>

                                                                {/* Length (Bottom Center) */}
                                                                <text
                                                                    x={x + w / 2}
                                                                    y={h - 30}
                                                                    textAnchor="middle"
                                                                    fontSize="36"
                                                                    fontWeight="bold"
                                                                    fill="#0f172a"
                                                                    style={{ fontFamily: 'ui-monospace, monospace' }}
                                                                >
                                                                    {Math.round(w)}
                                                                </text>

                                                                {/* Revision/Detail (Small next to length) */}
                                                                <text
                                                                    x={x + w / 2 + 80}
                                                                    y={h - 30}
                                                                    fontSize="24"
                                                                    fill="#64748b"
                                                                >
                                                                    (1)
                                                                </text>
                                                            </g>
                                                        )}

                                                        {/* Angles (Below the corners) */}
                                                        {angle === 45 && (
                                                            <>
                                                                <text x={x} y={h + 35} fontSize="24" fill="#334155" textAnchor="start">45</text>
                                                                <text x={x + w} y={h + 35} fontSize="24" fill="#334155" textAnchor="end">45</text>
                                                            </>
                                                        )}
                                                    </g>
                                                );
                                            })}

                                            {/* Waste / Remnant */}
                                            {wasteRectWidth > 0 && (
                                                <g>
                                                    <rect
                                                        x={visualEndUsed} y="0"
                                                        width={wasteRectWidth} height={BAR_HEIGHT}
                                                        fill="url(#stripe-pattern)"
                                                        stroke="#cbd5e1"
                                                    />
                                                    {wasteRectWidth > 400 && (
                                                        <text
                                                            x={visualEndUsed + 20}
                                                            y={BAR_HEIGHT / 2 + 10}
                                                            fill="#94a3b8"
                                                            fontSize="24"
                                                            fontWeight="600"
                                                            className="uppercase tracking-widest"
                                                        >
                                                            Waste: {Math.round(wasteRectWidth)}mm
                                                        </text>
                                                    )}
                                                </g>
                                            )}
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </CardContent>
        </Card>
    );
};

export const VisualCuttingPlan = React.memo(VisualCuttingPlanInner);
VisualCuttingPlan.displayName = 'VisualCuttingPlan';
