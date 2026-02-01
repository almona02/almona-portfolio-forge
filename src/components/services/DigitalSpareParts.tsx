
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-gold-tier';
import { CardContent, CardHeader, CardTitle, GoldTierCard } from '@/components/ui/card-gold-tier';
import { cn } from '@/lib/utils';
import { Info, MousePointer, Plus, ShoppingCart, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface Part {
  id: string;
  name: string;
  sku: string;
  inStock: boolean;
  price: number;
  highlight_coordinates: { x: number; y: number }; // Percentage 0-100
}

interface DigitalSparePartsProps {
    modelName: string;
    parts?: Part[]; // Can be passed seamlessly from parent
}

export function DigitalSpareParts({ modelName, parts = [] }: DigitalSparePartsProps) {
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // Fallback if no parts provided
    const displayParts = parts.length > 0 ? parts : MOCK_PARTS;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
            {/* Interactive Diagram Area */}
            <GoldTierCard className="flex-1 relative overflow-hidden bg-slate-900 border-slate-800 group shadow-inner">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <Badge variant="outline" className="bg-slate-950/80 backdrop-blur border-amber-500/30 text-amber-500">
                        <MousePointer className="w-3 h-3 mr-1" /> Interactive Mode
                    </Badge>
                </div>

                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <Button size="icon" variant="secondary" onClick={() => setZoomLevel(Math.min(zoomLevel + 0.5, 3))}>
                         <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" onClick={() => setZoomLevel(1)}>
                         <span className="text-xs font-bold">1x</span>
                    </Button>
                </div>

                {/* The "Diagram" */}
                <div 
                    className="w-full h-full flex items-center justify-center relative transition-transform duration-300 ease-out cursor-crosshair"
                    style={{ transform: `scale(${zoomLevel})` }}
                    onClick={() => setSelectedPart(null)} // Deselect on bg click
                >
                    {/* Placeholder Technical Drawing Grid */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ 
                            backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }} 
                    />
                    
                    {/* Machine Outline (SVG Representation) - Simplified for functionality */}
                    <svg viewBox="0 0 400 300" className="w-3/4 h-3/4 opacity-80 drop-shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                         <path d="M50 250 L350 250 L350 100 L200 50 L50 100 Z" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" />
                         <rect x="100" y="120" width="200" height="100" fill="none" stroke="#94a3b8" strokeWidth="3" />
                         <circle cx="200" cy="170" r="30" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.5" />
                    </svg>

                    {/* Interactive Hotspots */}
                    {displayParts.map((part) => (
                        <button
                            key={part.id}
                            className={cn(
                                "absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center transition-all duration-300 z-20 shadow-lg",
                                selectedPart?.id === part.id 
                                    ? "bg-amber-500 text-slate-900 scale-125 ring-4 ring-amber-500/20 shadow-amber-500/50" 
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-110 ring-2 ring-slate-950"
                            )}
                            style={{ left: `${part.highlight_coordinates.x}%`, top: `${part.highlight_coordinates.y}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPart(part);
                            }}
                        >
                            <span className="text-[10px] font-bold">{part.id}</span>
                        </button>
                    ))}
                </div>
            </GoldTierCard>

            {/* Part Details Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-4">
                <GoldTierCard className="flex-1 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <Info className="w-4 h-4 text-amber-500" />
                             Part Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {selectedPart ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedPart.name}</h3>
                                    <p className="text-slate-400 font-mono text-sm mt-1">SKU: {selectedPart.sku}</p>
                                </div>
                                
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">Status</span>
                                        <Badge variant="outline" className={cn(selectedPart.inStock ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                                            {selectedPart.inStock ? 'In Stock' : 'Backordered'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                                        <span className="text-slate-400 text-sm">Unit Price</span>
                                        <span className="text-xl font-bold text-white">{selectedPart.price.toLocaleString()} EGP</span>
                                    </div>
                                </div>

                                <Button fullWidth variant="primary" disabled={!selectedPart.inStock} leftIcon={<Plus className="w-4 h-4" />}>
                                    Add to Order
                                </Button>
                                
                                <p className="text-xs text-slate-500 text-center">
                                   Ensure compatibility with model {modelName} before ordering.
                                </p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
                                <MousePointer className="w-12 h-12 stroke-1" />
                                <p className="text-sm">Select a highlighted part on the diagram</p>
                            </div>
                        )}
                    </CardContent>
                </GoldTierCard>
                
                {/* Mini Cart Summary */}
                <GoldTierCard variant="filled" className="bg-slate-800 border-slate-700">
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                             <ShoppingCart className="w-5 h-5" />
                             <span className="font-medium text-sm">Cart Total</span>
                        </div>
                        <span className="font-bold text-white">0.00 EGP</span>
                     </div>
                </GoldTierCard>
            </div>
        </div>
    );
}

// Mock Data for fallback
const MOCK_PARTS: Part[] = [
    { id: '1', name: 'Main Spindle Motor', sku: 'MTR-SP-500', inStock: true, price: 12500, highlight_coordinates: { x: 50, y: 55 } },
    { id: '2', name: 'Teflon Heating Plate', sku: 'HT-PLT-240', inStock: true, price: 3200, highlight_coordinates: { x: 30, y: 40 } },
    { id: '3', name: 'Pneumatic Clamp', sku: 'PN-CL-50', inStock: false, price: 850, highlight_coordinates: { x: 70, y: 30 } },
    { id: '4', name: 'Safety Guard Sensor', sku: 'SENS-GRD-01', inStock: true, price: 450, highlight_coordinates: { x: 25, y: 65 } },
];
