/**
 * Invoice Upload Dialog
 * UI for uploading and parsing supplier invoices
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { invoiceParser, type ParsedInvoice, type InvoiceItem } from '@/lib/inventory/InvoiceParser';
import type { Profile } from '@/types/fabricator';

interface InvoiceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: InvoiceItem[], parsedInvoice: ParsedInvoice) => void;
  availableProfiles: Profile[];
}

export const InvoiceUploadDialog: React.FC<InvoiceUploadDialogProps> = ({
  open,
  onOpenChange,
  availableProfiles,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [mappedItems, setMappedItems] = useState<
    Array<InvoiceItem & { matchedProfileId?: string; matchConfidence: 'high' | 'medium' | 'low' }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setLoading(true);

      try {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
          const text = await selectedFile.text();
          const parsed = await invoiceParser.parseCSV(text, {
            supplier,
            invoiceNumber,
          });

          setParsedInvoice(parsed);

          // Auto-map to profiles
          const mapped = invoiceParser.mapItemsToProfiles(parsed.items, availableProfiles);
          setMappedItems(mapped);
        } else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
          // PDF parsing not yet implemented
          setError('PDF parsing not yet implemented. Please upload a CSV file.');
          setFile(null);
        } else {
          setError('Unsupported file type. Please upload a CSV file.');
          setFile(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse invoice');
        setFile(null);
      } finally {
        setLoading(false);
      }
    },
    [supplier, invoiceNumber, availableProfiles]
  );

  const handleImport = () => {
    if (parsedInvoice && mappedItems.length > 0) {
      onImport(mappedItems, parsedInvoice);
      // Reset state
      setFile(null);
      setParsedInvoice(null);
      setMappedItems([]);
      setSupplier('');
      setInvoiceNumber('');
      onOpenChange(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        void handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-warning" />
            Upload Supplier Invoice
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a CSV invoice file to automatically import stock items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier Name</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Caluminium"
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2024-001"
                className="bg-card border-border"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Invoice File (CSV)</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-dashed border-border rounded-lg p-8 text-center /50 transition-colors cursor-pointer card-premium"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-warning" />
                  <p className="text-sm text-muted-foreground">Parsing invoice...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">CSV format only</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        void handleFileSelect(selectedFile);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Mapped Items */}
          {mappedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({mappedItems.length} items)</Label>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {mappedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      item.matchConfidence === 'high'
                        ? 'bg-green-500/10 border border-green-500/30'
                        : item.matchConfidence === 'medium'
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.profileCode}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} {item.unit}
                        {item.matchedProfileId && (
                          <span className="ml-2 text-success">✓ Matched</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedInvoice || mappedItems.length === 0}
            className="btn-primary"
          >
            Import {mappedItems.length > 0 ? `${mappedItems.length} ` : ''}Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

