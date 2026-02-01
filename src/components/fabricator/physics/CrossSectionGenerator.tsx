import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import React, { useMemo } from 'react';

interface CrossSectionProps {
    type: 'frame' | 'sash' | 'mullion';
    width?: number;
    depth?: number;
    glassThickness?: number;
    color?: string;
    className?: string;
}

/**
 * Procedural Cross-Section Generator
 * Renders a technical SVG of the profile based on parameters.
 * Used for "Shop Drawings" and verifying internal reinforcements.
 */
export const CrossSectionGenerator: React.FC<CrossSectionProps> = ({
    type,
    width = 60,
    depth = 60,
    glassThickness: _glassThickness = 24,
    color = '#cbd5e1',
    className
}) => {

    // Scale factor to fit in 200x200 box
    const scale = 2.5;
    const padding = 30;

    const pathData = useMemo(() => {
        const w = width * scale;
        const d = depth * scale;
        const t = 2.5 * scale; // Wall thickness
        const x0 = padding;
        const y0 = padding;

        if (type === 'frame') {
            // High-precision Multi-Chamber Frame
            return {
                outer: `
                    M ${x0} ${y0} 
                    H ${x0 + w} 
                    V ${y0 + d} 
                    H ${x0 + w - 30} 
                    V ${y0 + 35} 
                    H ${x0} 
                    Z
                `,
                chambers: [
                    // Main Chamber
                    `M ${x0 + t} ${y0 + t} H ${x0 + w - t - 30} V ${y0 + 35 - t} H ${x0 + t} Z`,
                    // Side Chamber
                    `M ${x0 + w - 28} ${y0 + 37} H ${x0 + w - t} V ${y0 + d - t} H ${x0 + w - 28} Z`
                ],
                reinforcement: `M ${x0 + 8} ${y0 + 8} H ${x0 + w - 45} V ${y0 + 25} H ${x0 + 8} Z`
            };
        }

        if (type === 'sash') {
            // High-precision Z-Sash with Euro-Groove
            return {
                outer: `
                    M ${x0 + 20} ${y0} 
                    H ${x0 + w + 20} 
                    V ${y0 + 30} 
                    H ${x0 + w} 
                    V ${y0 + d} 
                    H ${x0} 
                    V ${y0 + d - 30}
                    H ${x0 + 20}
                    Z
                `,
                chambers: [
                    `M ${x0 + 20 + t} ${y0 + t} H ${x0 + w + 20 - t} V ${y0 + 30 - t} H ${x0 + 20 + t} Z`,
                    `M ${x0 + t} ${y0 + d - 30 + t} H ${x0 + w - t} V ${y0 + d - t} H ${x0 + t} Z`
                ],
                reinforcement: `M ${x0 + 25} ${y0 + 35} H ${x0 + w - 10} V ${y0 + d - 35} H ${x0 + 25} Z`
            };
        }

        if (type === 'mullion') {
            // Technical Box Mullion with symmetry
            return {
                outer: `
                    M ${x0} ${y0} 
                    H ${x0 + w} 
                    V ${y0 + d} 
                    H ${x0} 
                    Z
                `,
                chambers: [
                    `M ${x0 + t} ${y0 + t} H ${x0 + w / 2 - 2} V ${y0 + d - t} H ${x0 + t} Z`,
                    `M ${x0 + w / 2 + 2} ${y0 + t} H ${x0 + w - t} V ${y0 + d - t} H ${x0 + w / 2 + 2} Z`
                ],
                reinforcement: `M ${x0 + w / 4} ${y0 + 10} H ${x0 + 3 * w / 4} V ${y0 + d - 10} H ${x0 + w / 4} Z`
            };
        }

        return null;
    }, [type, width, depth]);

    if (!pathData) return null;

    return (
        <Card className={`bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                        {type} Analysis
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-mono border-slate-300">
                        {width}x{depth}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex justify-center items-center bg-slate-50 overflow-hidden relative">
                {/* Blueprint Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:10px_10px]"></div>

                <svg width="160" height="160" viewBox="0 0 240 240" className="drop-shadow-sm overflow-visible">
                    {/* Measurement Lines */}
                    <g className="opacity-40">
                        <line x1={padding} y1={padding - 15} x2={padding + width * scale} y2={padding - 15} stroke="#64748b" strokeWidth="1" />
                        <line x1={padding} y1={padding - 20} x2={padding} y2={padding - 10} stroke="#64748b" strokeWidth="1" />
                        <line x1={padding + width * scale} y1={padding - 20} x2={padding + width * scale} y2={padding - 10} stroke="#64748b" strokeWidth="1" />
                        <text x={padding + (width * scale) / 2} y={padding - 25} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="monospace">{width}mm</text>
                    </g>

                    {/* Outer Shell */}
                    <path
                        d={pathData.outer}
                        fill={color}
                        stroke="#334155"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {/* Internal Chambers */}
                    {pathData.chambers.map((chamber, i) => (
                        <path
                            key={i}
                            d={chamber}
                            fill="white"
                            stroke="#475569"
                            strokeWidth="1"
                            opacity="0.9"
                        />
                    ))}

                    {/* Reinforcement (Steel) */}
                    <path
                        d={pathData.reinforcement}
                        fill="#94a3b8"
                        stroke="#475569"
                        strokeWidth="1.5"
                        strokeDasharray="2 1"
                        opacity="0.8"
                    />

                    {/* Glass visual if relevant */}
                    {(type === 'frame' || type === 'sash') && (
                        <g transform={`translate(${width * scale - 10}, 40)`}>
                            <rect
                                x="0"
                                y="0"
                                width="12"
                                height="120"
                                fill="url(#glassGradient)"
                                stroke="#0ea5e9"
                                strokeWidth="1"
                                rx="1"
                            />
                            <defs>
                                <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
                                    <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.8" />
                                </linearGradient>
                            </defs>
                        </g>
                    )}
                </svg>
            </CardContent>
        </Card>
    );
};
