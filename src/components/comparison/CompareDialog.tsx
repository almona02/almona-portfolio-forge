import React, { useState } from "react";
import { Machine } from "@/constants/productsData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import CompareTable from "./CompareTable";
import { Download, Share2 } from "lucide-react";
import type { ComparisonMachine } from "@/lib/reports/comparisonPdf";
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
  // Removed unit/orientation controls for simplified UI: infer orientation by machine count
  const inferredOrientation: 'landscape' | 'portrait' = machines.length > 3 ? 'landscape' : 'portrait';

  const handleExportPDF = async () => {
    try {
      if (!machines.length) return;
      
      // Show loading state
      const button = document.querySelector('[data-pdf-export]') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = 'Generating PDF...';
      }
      
      // Dynamically import PDF generation to reduce initial bundle size
      const { generateComparisonPDF } = await import("@/lib/reports/comparisonPdf");
      
        // Attempt to load background-removed logo from public path
        let logoDataUrl: string | undefined;
        try {
          // Try to load the background-removed logo first, fallback to regular logo
          let logoPath = '/logo-bg-removed.png';
          try {
            const res = await fetch(logoPath);
            if (!res.ok) throw new Error('Background-removed logo not found');
            const blob = await res.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          } catch {
            // Fallback to regular logo
            const res = await fetch('/logo.png');
            const blob = await res.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // logo optional
        }
      
      const pdfBytes = await generateComparisonPDF(
        machines as unknown as ComparisonMachine[], 
        logoDataUrl,
        { orientation: inferredOrientation }
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
    } finally {
      // Reset button state
      const button = document.querySelector('[data-pdf-export]') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.innerHTML = '<Download size={16} className="mr-1" />PDF';
      }
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
  const typedMachines = machines as unknown as ComparisonMachine[];
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
                <DialogDescription className="text-sm text-muted-foreground">
                  Side-by-side comparison of selected machines with detailed specifications and performance metrics
                </DialogDescription>
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
                  data-pdf-export
                >
                  <Download size={16} className="mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
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
