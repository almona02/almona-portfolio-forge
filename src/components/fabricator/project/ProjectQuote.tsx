import { Button } from '@/shared/ui/ui/button';
import { WindowUnit } from '@/types/fabricator';
import {
    Building2,
    Calendar,
    Download,
    FileText,
    Hash,
    Printer,
    Send,
    User
} from 'lucide-react';
import React from 'react';
import { SmartDrawCanvas } from '../SmartDrawCanvas';

interface ProjectQuoteProps {
    project: {
        id: string;
        clientName: string;
        reference: string;
        units: WindowUnit[];
    };
    results: {
        projectSummary: any;
        unitResults: Map<string, { financials: { totalCost: number } }>;
    } | null;
}

export const ProjectQuote: React.FC<ProjectQuoteProps> = ({ project, results }) => {
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Calculate pricing (mock markup logic for "Commercial" verification)
    const MARKUP_MULTIPLIER = 1.4; // 40% margin

    const calculateUnitPrice = (unitId: string) => {
        if (!results) return 0;
        const res = results.unitResults.get(unitId);
        if (!res) return 0;
        return res.financials.totalCost * MARKUP_MULTIPLIER;
    };

    const totalProjectValue = project.units.reduce((acc, unit) => {
        return acc + (calculateUnitPrice(unit.id) * (unit.quantity || 1));
    }, 0);

    return (
        <div className="h-full flex flex-col bg-gray-100 text-gray-900 font-sans overflow-hidden">

            {/* Toolbar */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0 z-10">
                <div className="flex items-center gap-2 text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Quotation Preview</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" /> PDF
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        <Send className="h-4 w-4 mr-2" /> Send to Client
                    </Button>
                </div>
            </div>

            {/* Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-200/50 flex justify-center">
                <div className="bg-white shadow-xl w-[210mm] min-h-[297mm] p-[15mm] flex flex-col relative print:shadow-none print:w-full">

                    {/* Header */}
                    <header className="flex justify-between items-start border-b-2 border-orange-500 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">QUOTATION</h1>
                            <div className="text-gray-500 text-sm font-medium">{project.reference}</div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-orange-600">ALMONA</h2>
                            <div className="text-xs text-gray-400">Fabrication Studio</div>
                            <div className="text-sm text-gray-600 mt-2">
                                Cairo Industrial Zone<br />
                                Egypt
                            </div>
                        </div>
                    </header>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">Client Details</h3>
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold">{project.clientName}</span>
                            </div>
                            <div className="ml-6 text-sm text-gray-500">
                                client@example.com<br />
                                +20 123 456 7890
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">Project Details</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Calendar className="h-3 w-3" /> Date:
                                </div>
                                <div className="font-medium">{currentDate}</div>

                                <div className="flex items-center gap-2 text-gray-500">
                                    <Hash className="h-3 w-3" /> Breakdown:
                                </div>
                                <div className="font-medium">{project.units.length} Unique Units</div>

                                <div className="flex items-center gap-2 text-gray-500">
                                    <Building2 className="h-3 w-3" /> System:
                                </div>
                                <div className="font-medium">ALMONA Gold Tier</div>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b-2 border-gray-800 text-left">
                                <th className="py-2 font-bold text-sm bg-gray-50 pl-2">Item</th>
                                <th className="py-2 font-bold text-sm bg-gray-50">Specification</th>
                                <th className="py-2 font-bold text-sm bg-gray-50 text-center">Preview</th>
                                <th className="py-2 font-bold text-sm bg-gray-50 text-center">Qty</th>
                                <th className="py-2 font-bold text-sm bg-gray-50 text-right">Unit Price</th>
                                <th className="py-2 font-bold text-sm bg-gray-50 text-right pr-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {project.units.map((unit, idx) => {
                                const unitPrice = results ? calculateUnitPrice(unit.id) : 0;
                                const lineTotal = unitPrice * (unit.quantity || 1);

                                return (
                                    <tr key={unit.id} className="text-sm">
                                        <td className="py-4 pl-2 font-medium align-top">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded">{idx + 1}</span>
                                                {unit.posNumber}
                                            </div>
                                        </td>
                                        <td className="py-4 align-top text-gray-600">
                                            <div className="space-y-1">
                                                <div><strong>Dimensions:</strong> {unit.overallWidth}mm x {unit.overallHeight}mm</div>
                                                <div><strong>System:</strong> {unit.systemPackId}</div>
                                                <div><strong>Glazing:</strong> Double Clear 6/12/6</div>
                                                <div className="text-xs text-gray-400 mt-1">Ref: {unit.id.split('-')[1]}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 align-middle text-center">
                                            {/* Mini 2D Preview */}
                                            <div className="h-24 w-24 mx-auto border border-gray-200 bg-white relative">
                                                <SmartDrawCanvas
                                                    width={unit.overallWidth}
                                                    height={unit.overallHeight}
                                                    grid={unit.grid || { rows: 1, cols: 1, cells: [] }}
                                                    readOnly={true}
                                                    showToolbar={false}
                                                    onGridChange={() => { }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 align-top text-center font-medium">{unit.quantity || 1}</td>
                                        <td className="py-4 align-top text-right text-gray-600">
                                            {results ? `$${unitPrice.toFixed(2)}` : '---'}
                                        </td>
                                        <td className="py-4 align-top text-right font-bold pr-2">
                                            {results ? `$${lineTotal.toFixed(2)}` : '---'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="ml-auto w-1/3 border-t border-gray-800 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span>{results ? `$${totalProjectValue.toFixed(2)}` : '---'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax (14% VAT)</span>
                            <span>{results ? `$${(totalProjectValue * 0.14).toFixed(2)}` : '---'}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                            <span>Total</span>
                            <span className="text-green-600">{results ? `$${(totalProjectValue * 1.14).toFixed(2)}` : 'Calculated upon optimization'}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="mt-auto pt-8 border-t border-gray-200 text-xs text-center text-gray-400">
                        <p>Terms & Conditions Apply. Valid for 14 days.</p>
                        <p>Generated by Almona Portfolio Forge - Gold Tier</p>
                    </footer>

                </div>
            </div>
        </div>
    );
};
