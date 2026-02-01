import React, { useEffect, useRef } from 'react';
import { Viewport } from '../types/drafting';

interface RulerProps {
    orientation: 'horizontal' | 'vertical';
    viewport: Viewport;
    length: number; // Width or Height of the container
    thickness?: number;
}

export const Ruler: React.FC<RulerProps> = ({ 
    orientation, 
    viewport, 
    length, 
    thickness = 24 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        if (orientation === 'horizontal') {
            canvas.width = length * dpr;
            canvas.height = thickness * dpr;
            canvas.style.width = `${length}px`;
            canvas.style.height = `${thickness}px`;
        } else {
            canvas.width = thickness * dpr;
            canvas.height = length * dpr;
            canvas.style.width = `${thickness}px`;
            canvas.style.height = `${length}px`;
        }

        ctx.scale(dpr, dpr);

        // Clear and Set Background
        ctx.clearRect(0, 0, orientation === 'horizontal' ? length : thickness, orientation === 'horizontal' ? thickness : length);
        ctx.fillStyle = '#0f172a'; // slate-950 (darker, more technical)
        if (orientation === 'horizontal') {
            ctx.fillRect(0, 0, length, thickness);
        } else {
            ctx.fillRect(0, 0, thickness, length);
        }
        
        // Settings for "University Grade" Precision
        const zoom = viewport.zoom;
        const basePixelSpacing = 100; // Target pixels between major ticks
        const unitStep = basePixelSpacing / zoom;
        
        // Find nearest nice magnitude (1, 2, 5, 10, etc.)
        const magnitude = Math.pow(10, Math.floor(Math.log10(unitStep)));
        let step = magnitude;
        if (unitStep / magnitude >= 5) step = magnitude * 5;
        else if (unitStep / magnitude >= 2) step = magnitude * 2;
        
        // Subdivisions settings
        const subDivisions = step >= 5 ? 5 : 2; // Split into 5 or 2 depending on scale
        // Logic simplified for clarity
        
        // Colors & Fonts
        const colMajor = '#94a3b8'; // slate-400
        const colMinor = '#475569'; // slate-600
        const colText = '#cbd5e1'; // slate-300
        ctx.font = '10px "Roboto Mono", monospace'; // Monospace for alignment
        ctx.textBaseline = 'top';

        // Calculate visible range
        const startWorld = orientation === 'horizontal' 
            ? (0 - viewport.width / 2) / zoom + viewport.centerX
            : (0 - viewport.height / 2) / zoom + viewport.centerY;
        
        const endWorld = startWorld + length / zoom;

        // Start from a clean multiple before visible area
        const firstMajor = Math.floor(startWorld / step) * step;

        ctx.strokeStyle = colMajor;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Line Styles
        const majorSize = thickness * 0.5;
        // mediumSize removed as unused
        const minorSize = thickness * 0.15;

        // Iterate through potential ticks
        // Optimization: Don't iterate every single minor tick if zoom is crazy small, 
        // but our step calc largely handles this.
        
        const subStep = step / subDivisions;
        
        // Loop through major steps
        for (let major = firstMajor; major <= endWorld + step; major += step) {
            
            // Draw Major Tick
            const majorScreen = Math.round((major - startWorld) * zoom) + 0.5; // +0.5 for crisp lines
            
            if (orientation === 'horizontal') {
                if (majorScreen >= -20 && majorScreen <= length + 20) {
                     ctx.strokeStyle = colMajor;
                     ctx.beginPath();
                     ctx.moveTo(majorScreen, thickness);
                     ctx.lineTo(majorScreen, thickness - majorSize);
                     ctx.stroke();

                     // Text
                     ctx.fillStyle = colText;
                     ctx.textAlign = 'left';
                     ctx.fillText(Math.round(major).toString(), majorScreen + 4, 2);
                }
            } else {
                if (majorScreen >= -20 && majorScreen <= length + 20) {
                     ctx.strokeStyle = colMajor;
                     ctx.beginPath();
                     ctx.moveTo(thickness, majorScreen);
                     ctx.lineTo(thickness - majorSize, majorScreen);
                     ctx.stroke();

                     // Text (Rotated)
                     ctx.save();
                     ctx.translate(thickness - majorSize - 2, majorScreen + 4); 
                     ctx.rotate(-Math.PI / 2);
                     ctx.fillStyle = colText;
                     ctx.textAlign = 'left';
                     ctx.fillText(Math.round(major).toString(), 0, 0); // Align effectively
                     ctx.restore();
                }
            }

            // Draw Minor/Medium Ticks
            for (let s = 1; s < subDivisions; s++) {
                const minorWorld = major + s * subStep;
                if (minorWorld > endWorld) break;
                
                const minorScreen = Math.round((minorWorld - startWorld) * zoom) + 0.5;
                
                // Skip if offscreen
                if (orientation === 'horizontal') {
                    if (minorScreen < -10 || minorScreen > length + 10) continue;
                } else {
                    if (minorScreen < -10 || minorScreen > length + 10) continue;
                }
                
                // Determine size
                // Example: if 10 subdivs, 5th is medium.
                // Our logic: subDivisions usually 2, 5, or 10.
                const size = minorSize;
                // If we want a "medium" tick in the middle of 10? 
                // Currently simplified to just 5 or 2. 
                // If 5, no center medium needed really, or maybe the middle one?
                // Let's keep it simple: just minor ticks for now unless logic expands.
                
                ctx.strokeStyle = colMinor;
                ctx.beginPath();
                if (orientation === 'horizontal') {
                    ctx.moveTo(minorScreen, thickness);
                    ctx.lineTo(minorScreen, thickness - size);
                } else {
                    ctx.moveTo(thickness, minorScreen);
                    ctx.lineTo(thickness - size, minorScreen);
                }
                ctx.stroke();
            }
        }

        // Border Line
        ctx.strokeStyle = '#334155'; // slate-700
        ctx.beginPath();
        if (orientation === 'horizontal') {
             ctx.moveTo(0, thickness - 0.5);
             ctx.lineTo(length, thickness - 0.5);
        } else {
             ctx.moveTo(thickness - 0.5, 0);
             ctx.lineTo(thickness - 0.5, length);
        }
        ctx.stroke();

    }, [orientation, viewport, length, thickness]);

    return (
        <canvas 
            ref={canvasRef} 
            className="block"
        />
    );
};
