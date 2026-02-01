
import { Maximize, Minimize, Ruler, ScanLine } from 'lucide-react';
import React from 'react';

export type MeasureMode = 'outer' | 'inner' | 'glass';

interface SmartMeasureToolProps {
    onModeChange: (mode: MeasureMode) => void;
    activeMode: MeasureMode;
}

export const SmartMeasureTool: React.FC<SmartMeasureToolProps> = ({
    onModeChange,
    activeMode
}) => {
    return (
        <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center gap-2">
                <Ruler size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                    Smart Measure
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => onModeChange('outer')}
                    className={`flex flex-col items-center justify-center p-2 rounded text-xs border ${activeMode === 'outer'
                            ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
                            : 'bg-white border-blue-200 text-slate-600 hover:bg-blue-50'
                        }`}
                >
                    <Maximize size={16} className="mb-1" />
                    Masonry
                </button>

                <button
                    onClick={() => onModeChange('inner')}
                    className={`flex flex-col items-center justify-center p-2 rounded text-xs border ${activeMode === 'inner'
                            ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
                            : 'bg-white border-blue-200 text-slate-600 hover:bg-blue-50'
                        }`}
                >
                    <Minimize size={16} className="mb-1" />
                    Clear Op.
                </button>

                <button
                    onClick={() => onModeChange('glass')}
                    className={`flex flex-col items-center justify-center p-2 rounded text-xs border ${activeMode === 'glass'
                            ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
                            : 'bg-white border-blue-200 text-slate-600 hover:bg-blue-50'
                        }`}
                >
                    <ScanLine size={16} className="mb-1" />
                    Glass
                </button>
            </div>

            <div className="text-xs text-blue-700 bg-blue-100/50 p-2 rounded">
                {activeMode === 'outer' && "Snaps to Masonry Opening (Wall-to-Wall)"}
                {activeMode === 'inner' && "Snaps to Frame Inner Edge (Daylight)"}
                {activeMode === 'glass' && "Snaps to Glazing Pocket (Order Size)"}
            </div>
        </div>
    );
};
