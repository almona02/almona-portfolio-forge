import React from 'react';
import type { DraftingTool, Point, Viewport } from '../types/drafting';

interface ToolPreviewOverlayProps {
    tool: DraftingTool;
    mousePosition: Point | null;
    viewport: Viewport;
    snapSpacing?: number;
}

export const ToolPreviewOverlay: React.FC<ToolPreviewOverlayProps> = ({
    tool,
    mousePosition,
    viewport,
    // snapSpacing = 5 // Removed unused prop to fix lint
}) => {
    if (!mousePosition || !['mullion', 'transom'].includes(tool)) return null;

    // Transform world coordinates to screen coordinates
    const screenX = (mousePosition.x - viewport.centerX) * viewport.zoom + viewport.width / 2;
    const screenY = (mousePosition.y - viewport.centerY) * viewport.zoom + viewport.height / 2;

    // Determine preview dimensions based on tool
    // Defaulting to aluminum profile specs (50mm width)
    const profileWidth = 50 * viewport.zoom;

    // Render infinite guide line or localized ghost? 
    // Let's do a localized ghost that spans the viewport for now (like a crosshair) 
    // or just a ghost bar.

    // For mullion: Vertical bar
    // For transom: Horizontal bar

    const isMullion = tool === 'mullion';

    return (
        <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
            style={{ zIndex: 50 }} // Above canvas, below UI controls
        >
            {isMullion ? (
                // Mullion Ghost
                <div
                    className="absolute bg-green-500/30 border-x border-green-500/50"
                    style={{
                        left: screenX - profileWidth / 2,
                        top: 0,
                        width: profileWidth,
                        height: '100%',
                    }}
                >
                    {/* Label */}
                    <div className="absolute top-4 left-full ml-2 bg-green-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                        Mullion (50mm)
                    </div>
                </div>
            ) : (
                // Transom Ghost
                <div
                    className="absolute bg-green-500/30 border-y border-green-500/50"
                    style={{
                        left: 0,
                        top: screenY - profileWidth / 2,
                        width: '100%',
                        height: profileWidth,
                    }}
                >
                    {/* Label */}
                    <div className="absolute left-4 top-full mt-2 bg-green-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                        Transom (50mm)
                    </div>
                </div>
            )}
        </div>
    );
};
