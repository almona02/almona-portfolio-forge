import React, { useState } from "react";
import { Machine } from "@/types/index";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import CompareTable from "./CompareTable";
import { Download, Share2 } from "lucide-react";
import type { ComparisonMachine } from "@/lib/reports/comparisonPdf";
import { QuoteRequestDialog } from "@/components/quotes/QuoteRequestDialog";
import { PDFGenerationProgress } from "@/components/optimized/PDFGenerationProgress";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStage, setPdfStage] = useState('Preparing');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  
  // Removed unit/orientation controls for simplified UI: infer orientation by machine count
  const inferredOrientation: 'landscape' | 'portrait' = machines.length > 3 ? 'landscape' : 'portrait';

  const handleExportPDF = async () => {
    try {
      if (!machines.length) return;
      
      setIsGeneratingPDF(true);
      setPdfProgress(0);
      setPdfStage('Preparing');
      setPdfError(null);
      setGeneratedPdfBlob(null);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setPdfProgress(prev => {
          if (prev < 30) {
            setPdfStage('Preparing');
            return prev + 2;
          } else if (prev < 70) {
            setPdfStage('Processing');
            return prev + 1;
          } else if (prev < 95) {
            setPdfStage('Finalizing');
            return prev + 0.5;
          }
          return prev;
        });
      }, 100);
      
      // Dynamically import PDF generation to reduce initial bundle size
      const { generateComparisonPDF } = await import("@/lib/reports/comparisonPdf");
      
        // Attempt to load background-removed logo from public path
        let logoDataUrl: string | undefined;
        try {
          // Try to load the background-removed logo first, fallback to regular logo
          const logoPath = '/logo-bg-removed.png';
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
      
      // Debug: Log machines being passed to PDF
      console.log('CompareDialog - Machines passed to PDF:', machines.map(m => ({
        name: m.name,
        airSpec: m.airSpec,
        powerSpec: m.powerSpec
      })));
      
      const pdfBytes = await generateComparisonPDF(
        machines as ComparisonMachine[], 
        logoDataUrl,
        { orientation: inferredOrientation }
      );
      
      clearInterval(progressInterval);
      setPdfProgress(100);
      setPdfStage('Complete');
      
      const bytes = new Uint8Array(pdfBytes);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setGeneratedPdfBlob(blob);
      
      // Auto-download the PDF immediately when ready
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      a.download = `almona-comparison-${ts}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Reset state after a brief delay to show completion
      setTimeout(() => {
        setGeneratedPdfBlob(null);
        setPdfProgress(0);
        setIsGeneratingPDF(false);
      }, 1000);
      
    } catch (err) {
      clearInterval(progressInterval);
      console.error('PDF export failed', err);
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF');
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedPdfBlob) return;
    
    const url = URL.createObjectURL(generatedPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
    a.download = `almona-comparison-${ts}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Reset state
    setGeneratedPdfBlob(null);
    setPdfProgress(0);
  };

  const handleCancelPDF = () => {
    setIsGeneratingPDF(false);
    setPdfProgress(0);
    setPdfError(null);
    setGeneratedPdfBlob(null);
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
  const totalPowerKw = machines.reduce((s, m) => s + numeric(m.powerSpec?.consumption), 0);
  const totalAir = machines.reduce((s, m) => s + numeric(m.airSpec?.consumption), 0);
  
  // Debug: Log air consumption data
  console.log('CompareDialog - Machines with air data:', machines.map(m => ({
    name: m.name,
    airSpec: m.airSpec,
    parsed: numeric(m.airSpec?.consumption)
  })));
  console.log('CompareDialog - Total Air:', totalAir);

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
                  disabled={isGeneratingPDF}
                >
                  <Download size={16} className="mr-1" />
                  {isGeneratingPDF ? 'Generating...' : 'PDF'}
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

      <PDFGenerationProgress
        isGenerating={isGeneratingPDF}
        progress={pdfProgress}
        stage={pdfStage}
        onCancel={handleCancelPDF}
        onDownload={handleDownloadPDF}
        fileName={`almona-comparison-${machines.length}-machines.pdf`}
        error={pdfError}
      />
    </>
  );
};

export default CompareDialog;
