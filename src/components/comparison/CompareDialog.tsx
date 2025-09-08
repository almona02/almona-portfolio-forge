import React, { useState } from "react";
import { Machine } from "@/constants/productsData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import CompareTable from "./CompareTable";
import { Download, Share2, Printer } from "lucide-react";
import { generateComparisonPDF, type ComparisonMachine } from "@/lib/reports/comparisonPdf";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: Machine[];
}

const CompareDialog: React.FC<CompareDialogProps> = ({ 
  open, 
  onOpenChange,
  machines 
}) => {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [powerUnit, setPowerUnit] = useState<'kW' | 'HP'>('kW');
  const [airUnit, setAirUnit] = useState<'L/min' | 'm³/h'>('L/min');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showBothUnits, setShowBothUnits] = useState(true);
  const [condensed, setCondensed] = useState(false);
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      if (!machines.length) return;
      // Attempt to load logo from public path
      let logoDataUrl: string | undefined;
      try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
      } catch (e) {
        // logo optional
      }
      const pdfBytes = await generateComparisonPDF(
        machines as ComparisonMachine[], 
        logoDataUrl,
        { powerUnit, airUnit, showBothUnits, orientation, condensed }
      );
  const bytes = new Uint8Array(pdfBytes); // ensure proper ArrayBuffer instance
  const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      a.download = `almona-comparison-${ts}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Failed to export PDF');
    }
  };

  const handleShare = () => {
    alert("Share feature coming soon");
  };

  const handleRequestQuote = () => {
    onOpenChange(false);
    setShowQuoteDialog(true);
  };

  // Aggregations (power & air) using local typed helpers
  const numeric = (val?: string) => {
    if (!val) return 0;
    const m = val.match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };
  const typedMachines = machines as ComparisonMachine[];
  const totalPowerKw = typedMachines.reduce((s, m) => s + numeric(m.powerSpec?.consumption), 0);
  const totalAir = typedMachines.reduce((s, m) => s + numeric(m.airSpec?.consumption), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-full max-w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">
                  Machine Comparison ({machines.length})
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Side-by-side comparison of selected machines
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 size={16} className="mr-1" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <Download size={16} className="mr-1" />
                  PDF (Full)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      if (!machines.length) return;
                      let logoDataUrl: string | undefined;
                      try {
                        const res = await fetch('/logo.png');
                        const blob = await res.blob();
                        logoDataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = () => reject(reader.error);
                          reader.readAsDataURL(blob);
                        });
                      } catch { /* logo optional */ }
                      const pdfBytes = await generateComparisonPDF(
                        machines as ComparisonMachine[],
                        logoDataUrl,
                        { powerUnit, airUnit, showBothUnits, orientation: 'portrait', condensed: true }
                      );
                      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
                      a.href = url;
                      a.download = `almona-comparison-condensed-${ts}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error(e);
                      alert('Condensed PDF export failed');
                    }
                  }}
                >
                  <Download size={16} className="mr-1" />
                  PDF (Mobile)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer size={16} className="mr-1" />
                  Print
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="flex flex-wrap gap-3 items-center border rounded-md p-3 bg-muted/40 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <label className="font-medium">Power Unit:</label>
                <select value={powerUnit} onChange={e => setPowerUnit(e.target.value as 'kW' | 'HP')} className="bg-background border rounded px-2 py-1">
                  <option value="kW">kW</option>
                  <option value="HP">HP</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="font-medium">Air Unit:</label>
                <select value={airUnit} onChange={e => setAirUnit(e.target.value as 'L/min' | 'm³/h')} className="bg-background border rounded px-2 py-1">
                  <option value="L/min">L/min</option>
                  <option value="m³/h">m³/h</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="font-medium">Orientation:</label>
                <select value={orientation} onChange={e => setOrientation(e.target.value as 'landscape' | 'portrait')} className="bg-background border rounded px-2 py-1">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showBothUnits} onChange={e => setShowBothUnits(e.target.checked)} />
                <span>Show both units</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={condensed} onChange={e => setCondensed(e.target.checked)} />
                <span>Condensed</span>
              </label>
            </div>
            <div className="-mx-4 sm:mx-0">
              <CompareTable machines={machines} />
            </div>
      <div className="border rounded-lg p-4 bg-muted/30 text-sm grid gap-4 sm:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-1">Total Power Required</h4>
        <p>{totalPowerKw.toFixed(2)} kW</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Total Air Consumption</h4>
        <p>{totalAir.toFixed(2)} L/min</p>
              </div>
              <div className="sm:col-span-1">
                <h4 className="font-semibold mb-1">Notes</h4>
                <p className="text-muted-foreground">Ensure facility electrical & pneumatic capacity exceeds totals with safety margin (recommend 20%).</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button 
              onClick={handleRequestQuote}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              Request Quote for All ({machines.length}) Machines
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuoteRequestDialog
        open={showQuoteDialog}
        onOpenChange={setShowQuoteDialog}
        initialData={{
          products: machines,
          services: [],
          contactInfo: {}
        }}
      />
    </>
  );
};

export default CompareDialog;
