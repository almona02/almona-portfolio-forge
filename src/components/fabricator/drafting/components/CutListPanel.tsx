
import { FileDown, Printer, Scissors } from 'lucide-react';
import React, { useMemo } from 'react';
import { CutListGenerator } from '../services/CutListGenerator';
import { MachineExportService } from '../services/MachineExportService';
import type { Rectangle } from '../types/drafting';

interface CutListPanelProps {
    rectangles: Rectangle[];
    systemId: string;
}

export const CutListPanel: React.FC<CutListPanelProps> = ({
    rectangles,
    systemId
}) => {

    const cutItems = useMemo(() => {
        if (!rectangles || rectangles.length === 0) return [];
        return CutListGenerator.generate(rectangles, systemId);
    }, [rectangles, systemId]);

    const handleExportYilmaz = () => {
        const csv = MachineExportService.generateYilmazCSV(cutItems);
        MachineExportService.downloadCSV(csv, `yilmaz_job_${Date.now()}.csv`);
    };

    const handlePrint = () => {
        window.print();
    };

    if (cutItems.length === 0) {
        return (
            <div className="p-4 text-center text-slate-500 text-xs italic">
                Draw to generate cut list.
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Scissors size={16} className="text-amber-500" />
                    <h3 className="text-sm font-medium text-slate-100">Workshop Cut List</h3>
                </div>

                <div className="flex gap-1 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 flex items-center gap-1 border border-slate-600"
                        title="Print for Workshop"
                    >
                        <Printer size={12} />
                        Print
                    </button>
                    <button
                        onClick={handleExportYilmaz}
                        className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 flex items-center gap-1 border border-slate-600"
                        title="Export for Yilmaz DC 421/550"
                    >
                        <FileDown size={12} />
                        Yilmaz CSV
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-900/50 rounded border border-slate-700/50 print:bg-white print:border-0 print:overflow-visible">
                {/* Print Only Header */}
                <div className="hidden print:block mb-4">
                    <h1 className="text-2xl font-bold text-black border-b-2 border-black pb-2">Workshop Cut List</h1>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>Job: {systemId}</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="divide-y divide-slate-700/50 print:divide-gray-300">
                    {cutItems.map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-slate-800/50 flex items-center justify-between group print:break-inside-avoid print:bg-white">
                            <div>
                                <div className="text-xs text-slate-400 mb-0.5 print:text-black print:font-bold print:text-sm">{item.profileName}</div>
                                <div className="text-[10px] font-mono text-slate-500 bg-slate-900/80 inline-block px-1 rounded print:bg-gray-100 print:text-gray-800 print:text-xs print:border print:border-gray-300">
                                    {item.profileCode}
                                </div>
                            </div>

                            {/* Visual Angle & Length Display (Egyptian Dummy Friendly) */}
                            <div className="flex items-center gap-3">
                                {/* Length - BIG FONT */}
                                <div className="text-right">
                                    <span className="text-lg font-bold text-amber-400 font-mono tracking-tight print:text-black print:text-xl">
                                        {item.lengthMm.toFixed(0)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-0.5 print:text-gray-600">mm</span>
                                </div>

                                {/* Quantity */}
                                <div className="bg-slate-700 text-slate-200 text-xs font-bold px-2 py-1 rounded print:bg-transparent print:text-black print:border print:border-black print:text-sm">
                                    x{item.quantity}
                                </div>

                                {/* Visual Angles */}
                                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 print:text-black">
                                    <VisualAngle angle={item.angles.left} side="left" />
                                    <VisualAngle angle={item.angles.right} side="right" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-500/80 text-center print:hidden">
                ⚠️ Verify all lengths with profile allowance before cutting.
            </div>
        </div>
    );
};

// Helper for Visual Angles
const VisualAngle: React.FC<{ angle: number, side: 'left' | 'right' }> = ({ angle, side }) => {
    // 45 degrees looks like / or \
    // 90 degrees looks like |

    let icon = '|';
    if (angle === 45) {
        icon = side === 'left' ? '/' : '\\';
    }

    return (
        <div className="flex items-center gap-1 w-8 justify-end">
            <span className="font-mono">{icon}</span>
            <span>{angle}°</span>
        </div>
    );
};
