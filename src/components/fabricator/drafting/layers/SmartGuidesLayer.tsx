import React, { useMemo } from 'react';
import type { Geometry2D, Point } from '../types/drafting';

interface SmartGuidesLayerProps {
    cursorPoint: Point | null;
    geometry: Geometry2D;
    snapThreshold: number;
    zoom: number;
}

export const SmartGuidesLayer: React.FC<SmartGuidesLayerProps> = ({ 
    cursorPoint, 
    geometry, 
    snapThreshold,
    zoom
}) => {
    // Memoize guides to avoid recalculation on every render frame unless cursor moves drastically
    // Actually for smoothness we need to recalc per frame, but it should be fast.
    
    const guides = useMemo(() => {
        if (!cursorPoint) return [];
        
        // Collect all significant points (corners, centers)
        // Optimization: limit to visible geometry in viewport (handled by parent usually, but here we take all)
        // Optimization: Limit total points checked
        const points: { x: number, y: number }[] = [];
        
        geometry.rectangles.forEach(r => {
            points.push({ x: r.x, y: r.y });
            points.push({ x: r.x + r.width, y: r.y });
            points.push({ x: r.x, y: r.y + r.height });
            points.push({ x: r.x + r.width, y: r.y + r.height });
            points.push({ x: r.x + r.width/2, y: r.y + r.height/2 });
        });
        
        // Add lines, circles, etc...
        geometry.lines.forEach(l => {
             points.push(l.start);
             points.push(l.end);
        });

        // Threshold in WORLD units depends on zoom if we want constant screen pixel threshold
        // Or if inputs are world units, threshold is world.
        // snapThreshold is usually ~5-10 screen pixels converted to world units
        const threshold = snapThreshold / zoom; 
        
        const activeGuides: { type: 'horizontal' | 'vertical', pos: number, match: Point }[] = [];
        
        // Find X matches (Vertical Guide)
        for (const p of points) {
            if (Math.abs(p.x - cursorPoint.x) < threshold) {
                 activeGuides.push({ type: 'vertical', pos: p.x, match: p });
                 // Only take one per axis to avoid clutter? or closest?
                 break; 
            }
        }
        
        // Find Y matches (Horizontal Guide)
        for (const p of points) {
            if (Math.abs(p.y - cursorPoint.y) < threshold) {
                 activeGuides.push({ type: 'horizontal', pos: p.y, match: p });
                 break;
            }
        }
        
        return activeGuides;
        
    }, [cursorPoint, geometry, snapThreshold, zoom]);

    if (!cursorPoint || guides.length === 0) return null;

    return (
        <g className="smart-guides">
             {guides.map((g, i) => {
                 if (g.type === 'vertical') {
                     return (
                         <line 
                            key={i}
                            x1={g.pos} y1={-100000} // Infinite(ish)
                            x2={g.pos} y2={100000}
                            stroke="#ef4444" // red-500
                            strokeWidth={1 / zoom}
                            strokeDasharray={`${4/zoom},${4/zoom}`}
                            opacity={0.8}
                         />
                     );
                 } else {
                     return (
                         <line 
                            key={i}
                            x1={-100000} y1={g.pos}
                            x2={100000} y2={g.pos}
                            stroke="#ef4444"
                            strokeWidth={1 / zoom}
                            strokeDasharray={`${4/zoom},${4/zoom}`}
                            opacity={0.8}
                         />
                     );
                 }
             })}
        </g>
    );
};
