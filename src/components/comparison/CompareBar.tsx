import React from "react";
import { Machine } from "@/constants/productsData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, BarChart2, Share2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CompareBarProps {
  machines: Machine[];
  onRemove: (machineId: string) => void;
  onCompare: () => void;
  onClear: () => void;
  onExport?: () => void;
  onShare?: () => void;
}

const CompareBar: React.FC<CompareBarProps> = ({ 
  machines,
  onRemove,
  onCompare,
  onClear,
  onExport = () => alert("Export feature coming soon"),
  onShare = () => alert("Share feature coming soon")
}) => {
  if (machines.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-xl p-4 z-50 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {machines.map((machine) => (
            <Badge 
              key={machine.id}
              variant="outline"
              className="flex items-center gap-2 py-1 px-3 flex-shrink-0"
            >
              <span className="truncate max-w-[120px]">{machine.name}</span>
              <button 
                onClick={() => onRemove(machine.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove ${machine.name} from comparison`}
              >
                <X size={16} />
              </button>
            </Badge>
          ))}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                onClick={onShare}
                disabled={machines.length < 2}
              >
                <Share2 size={16} className="mr-1" />
                Share
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share this comparison</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                onClick={onExport}
                disabled={machines.length < 2}
              >
                <Download size={16} className="mr-1" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export as PDF or Excel</TooltipContent>
          </Tooltip>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={onClear}
          >
            Clear All
          </Button>
          
          <Button 
            size="sm"
            onClick={onCompare}
            disabled={machines.length < 2}
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