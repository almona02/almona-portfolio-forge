import React from 'react';
import type { DraftingTool, Point, Viewport } from '../types/drafting';

interface ToolPreviewOverlayProps {
    tool: DraftingTool;
    mousePosition: Point | null;
    startPoint: Point | null; // NEW: Start point of drawing
    currentPoint: Point | null; // NEW: Current point of drawing (same as mousePosition usually, but explicit)
    isDrawing: boolean; // NEW: Are we currently drawing?
    viewport: Viewport;
    snapSpacing?: number;
}

export const ToolPreviewOverlay: React.FC<ToolPreviewOverlayProps> = ({
    tool,
    mousePosition,
    startPoint,
    currentPoint,
    isDrawing,
    viewport,
    // snapSpacing = 5 // Removed unused prop to fix lint
}) => {
    // 1. Tool-Specific Cursor/Guides (Idle State)
    if (!mousePosition) return null;

    // Transform world coordinates to screen coordinates
    const toScreen = (p: Point) => ({
        x: (p.x - viewport.centerX) * viewport.zoom + viewport.width / 2,
        y: (p.y - viewport.centerY) * viewport.zoom + viewport.height / 2
    });

    const screenCursor = toScreen(mousePosition);

    // Defaulting to aluminum profile specs (50mm width)
    const profileWidth = 50 * viewport.zoom;

    const renderGhost = () => {
        if (tool === 'mullion') {
            return (
                <div
                    className="absolute bg-green-500/30 border-x border-green-500/50"
                    style={{
                        left: screenCursor.x - profileWidth / 2,
                        top: 0,
                        width: profileWidth,
                        height: '100%',
                    }}
                >
                    <div className="absolute top-4 left-full ml-2 bg-green-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                        Mullion (50mm)
                    </div>
                </div>
            );
        }
        if (tool === 'transom') {
            return (
                <div
                    className="absolute bg-green-500/30 border-y border-green-500/50"
                    style={{
                        left: 0,
                        top: screenCursor.y - profileWidth / 2,
                        width: '100%',
                        height: profileWidth,
                    }}
                >
                    <div className="absolute left-4 top-full mt-2 bg-green-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                        Transom (50mm)
                    </div>
                </div>
            );
        }
        return null;
    };

    // 2. In-Progress Drawing Preview (Active State)
    const renderDrawingPreview = () => {
        if (!isDrawing || !startPoint || !currentPoint) return null;

        const startScreen = toScreen(startPoint);
        const currentScreen = toScreen(currentPoint);

        const width = Math.abs(currentScreen.x - startScreen.x);
        const height = Math.abs(currentScreen.y - startScreen.y);
        const left = Math.min(startScreen.x, currentScreen.x);
        const top = Math.min(startScreen.y, currentScreen.y);

        switch (tool) {
            case 'rectangle':
                return (
                    <div
                        className="absolute border-2 border-amber-500 bg-amber-500/10"
                        style={{
                            left,
                            top,
                            width,
                            height,
                        }}
                    >
                        <div className="absolute -top-6 left-0 bg-amber-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                            {Math.round(Math.abs(currentPoint.x - startPoint.x))} x {Math.round(Math.abs(currentPoint.y - startPoint.y))}
                        </div>
                    </div>
                );

            case 'circle':
                // Calculate radius in screen pixels
                const radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
                return (
                    <div
                        className="absolute border-2 border-amber-500 rounded-full bg-amber-500/10"
                        style={{
                            left: startScreen.x - radius,
                            top: startScreen.y - radius,
                            width: radius * 2,
                            height: radius * 2,
                        }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                            R: {Math.round(Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2)))}
                        </div>
                    </div>
                );

            case 'line':
            case 'dimension':
                // For lines we need SVG because DOM divs are rectangles
                return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        <line
                            x1={startScreen.x}
                            y1={startScreen.y}
                            x2={currentScreen.x}
                            y2={currentScreen.y}
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray={tool === 'dimension' ? "4 2" : ""}
                        />
                        <text x={(startScreen.x + currentScreen.x) / 2} y={(startScreen.y + currentScreen.y) / 2 - 10} fill="white" fontSize="12" textAnchor="middle">
                            {Math.round(Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2)))}
                        </text>
                    </svg>
                );

            case 'arc':
                // Arc drawing is 3-point usually, complicated to preview with just 2 points perfectly, 
                // but we can show a line to the second point (End) or a circle guide
                // If we are in step 1 (p1 set, waiting for p2):
                return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        <line
                            x1={startScreen.x}
                            y1={startScreen.y}
                            x2={currentScreen.x}
                            y2={currentScreen.y}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    </svg>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
            style={{ zIndex: 50 }} // Above canvas, below UI controls
        >
            {renderGhost()}
            {renderDrawingPreview()}
        </div>
    );
};
