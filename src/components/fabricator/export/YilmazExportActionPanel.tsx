/**
 * Compact operator entry point for Yilmaz CNC export inside the fabricator workflow.
 * Reuses useYilmazExport (WorkflowStore → pipeline → downloadable .cnc/.csv/.mdb).
 */

import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { useYilmazExport } from '@/hooks/useYilmazExport';
import type { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import type { ExportFormat } from '@/services/export/YilmazExportPipeline';
import { Download, ExternalLink, Loader2, Shield } from 'lucide-react';
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export interface YilmazExportActionPanelProps {
  positionId?: string | null;
  className?: string;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  all: 'All (.cnc + .csv + .mdb)',
  gcode: 'CNC program (.cnc)',
  csv: 'Cut list (.csv)',
  mdb: 'MDB cut list (.mdb)',
};

export const YilmazExportActionPanel: React.FC<YilmazExportActionPanelProps> = ({
  positionId = null,
  className,
}) => {
  const {
    isReady,
    isExporting,
    machineModel,
    format,
    setMachineModel,
    setFormat,
    availableModels,
    runExport,
    downloadAll,
    error,
  } = useYilmazExport({ positionId });

  const handleExport = useCallback(async () => {
    const result = await runExport();
    if (!result) {
      toast.error(error ?? 'Yilmaz export failed');
      return;
    }
    if (!result.success) {
      toast.error('Pre-flight validation failed. Open the full export page for details.');
      return;
    }
    downloadAll();
    toast.success('Yilmaz export ready — downloading .cnc / .csv / .mdb');
  }, [downloadAll, error, runExport]);

  return (
    <div
      className={className}
      data-testid="yilmaz-export-action-panel"
      aria-label="Export to Yilmaz CNC"
    >
      <div className="flex flex-wrap items-end gap-3 rounded border border-amber-800/50 bg-amber-950/20 p-3">
        <div className="space-y-1 min-w-[10rem]">
          <label className="text-xs text-amber-200/80" htmlFor="yilmaz-machine-model">
            Yilmaz machine
          </label>
          <Select
            value={machineModel}
            onValueChange={(v) => setMachineModel(v as YilmazMachineModel)}
            disabled={isExporting}
          >
            <SelectTrigger id="yilmaz-machine-model" className="h-9 bg-black/40 border-amber-800/60 text-amber-50">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(({ model, specs }) => (
                <SelectItem key={model} value={model}>
                  {model} · {specs.axes}-axis
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 min-w-[12rem]">
          <label className="text-xs text-amber-200/80" htmlFor="yilmaz-export-format">
            Format
          </label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as ExportFormat)}
            disabled={isExporting}
          >
            <SelectTrigger id="yilmaz-export-format" className="h-9 bg-black/40 border-amber-800/60 text-amber-50">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {FORMAT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={() => void handleExport()}
          disabled={!isReady || isExporting}
          className="bg-amber-700 hover:bg-amber-600 text-white"
          data-testid="yilmaz-export-button"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'Exporting…' : 'Export to Yilmaz'}
        </Button>

        <Button type="button" variant="outline" className="border-amber-700/60 text-amber-100" asChild>
          <Link to="/yilmaz-export">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Full export desk
          </Link>
        </Button>

        <p className="basis-full text-[11px] text-amber-200/70 flex items-center gap-1.5">
          <Shield className="h-3 w-3 shrink-0" />
          Tier 3 deterministic export — human validation required before machine load. Not live-machine verified.
        </p>
      </div>
    </div>
  );
};

export default YilmazExportActionPanel;
