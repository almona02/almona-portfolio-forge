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
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white/90 border border-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/90 rounded-lg shadow-2xl p-4 z-50 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {machines.map((machine) => (
            <Badge 
              key={machine.id}
              variant="outline"
              className="flex items-center gap-2 py-1 px-3 flex-shrink-0 bg-white/5 border-white/20 text-white"
            >
              <span className="truncate max-w-[120px]">{machine.name}</span>
              <button 
                onClick={() => onRemove(machine.id)}
                className="text-white/60 hover:text-white transition-colors"
                aria-label={`Remove ${machine.name} from comparison`}
              >
                <X size={16} />
              </button>
            </Badge>
          ))}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button 
            variant="outline"
            size="sm"
            onClick={onClear}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            Clear All
          </Button>
          
          <Button 
            size="sm"
            onClick={onCompare}
            disabled={machines.length < 2}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-400 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-600"
          >
            <BarChart2 size={16} className="mr-1" />
            Compare ({machines.length})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;