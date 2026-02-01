import React from "react";
import { Machine } from "@/constants/productsData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, BarChart2 } from "lucide-react";

interface CompareBarProps {
  machines: Machine[];
  onRemove: (machineId: string) => void;
  onCompare: () => void;
  onClear: () => void;
}

const CompareBar: React.FC<CompareBarProps> = ({ 
  machines,
  onRemove,
  onCompare,
  onClear
}) => {
  if (machines.length === 0) return null;

  return (
    <div
      className="fixed left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 top-[4.5rem] sm:top-[5.5rem] md:top-[6.25rem] lg:top-[6.5rem] bg-black/90 text-white/90 border border-white/10 backdrop-blur rounded-xl shadow-2xl p-3 sm:p-4 z-50 w-auto max-w-full sm:max-w-3xl animate-in fade-in slide-in-from-top-4 transition-all duration-200 opacity-20 hover:opacity-100 sm:opacity-40 sm:hover:opacity-100"
      aria-label="Comparison bar (hover or tap to expand)"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {machines.map((machine) => (
            <Badge 
              key={machine.id}
              variant="outline"
              className="flex items-center gap-2 py-1 px-3 flex-shrink-0 bg-white/5 border-white/20 text-white text-xs"
            >
              <span className="truncate max-w-[120px]">{machine.name}</span>
              <button 
                onClick={() => onRemove(machine.id)}
                className="text-white/70 hover:text-white transition-colors"
                aria-label={`Remove ${machine.name} from comparison`}
              >
                <X size={14} />
              </button>
            </Badge>
          ))}
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            size="sm"
            onClick={onClear}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 w-full"
          >
            Clear
          </Button>
          
          <Button 
            size="sm"
            onClick={onCompare}
            disabled={machines.length < 2}
            aria-label="Open machine comparison"
            className="w-full text-base sm:text-sm py-3 sm:py-2 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 text-white hover:from-amber-400 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-600 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/60 hover:ring-amber-300/70 transition-all active:translate-y-[1px]"
          >
            <BarChart2 size={14} className="mr-1" />
            Compare ({machines.length})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;