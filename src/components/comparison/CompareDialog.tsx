import React, { useState } from "react";
import { Machine } from "@/constants/productsData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import CompareTable from "./CompareTable";
import { Download, Share2, Printer } from "lucide-react";
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
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    alert("PDF export feature coming soon");
  };

  const handleShare = () => {
    alert("Share feature coming soon");
  };

  const handleRequestQuote = () => {
    onOpenChange(false);
    setShowQuoteDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
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
                  PDF
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
          
          <div className="py-4">
            <CompareTable machines={machines} />
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
