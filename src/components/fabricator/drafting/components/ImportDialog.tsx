// src/components/fabricator/drafting/components/ImportDialog.tsx

/**
 * Import Dialog Component
 * 
 * Gold-tier import dialog for file format selection and import.
 * Supports JSON and DXF formats with professional UI/UX.
 * 
 * Features:
 * - Format selection (JSON, DXF)
 * - File validation and error handling
 * - Progress feedback
 * - Professional design matching market leaders
 */

import { Button } from '@/shared/ui/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { FileText, Upload, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

export type ImportFormat = 'json' | 'dxf' | 'dwg';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, format: ImportFormat) => Promise<void>;
  supportedFormats?: ImportFormat[];
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onOpenChange,
  onImport,
  supportedFormats = ['json', 'dxf']
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>('json');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, ImportFormat> = {
      'json': 'json',
      'dxf': 'dxf',
      'dwg': 'dwg'
    };

    const detectedFormat = extension ? formatMap[extension] : null;
    if (!detectedFormat || !supportedFormats.includes(detectedFormat)) {
      toast.error(`Unsupported file format. Supported formats: ${supportedFormats.join(', ').toUpperCase()}`);
      return;
    }

    setSelectedFile(file);
    setSelectedFormat(detectedFormat);
  }, [supportedFormats]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(selectedFile, selectedFormat);
      toast.success('File imported successfully');
      onOpenChange(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import file';
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, selectedFormat, onImport, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onOpenChange]);

  const getAcceptString = useCallback((): string => {
    const extensions: string[] = [];
    if (supportedFormats.includes('json')) extensions.push('.json');
    if (supportedFormats.includes('dxf')) extensions.push('.dxf');
    if (supportedFormats.includes('dwg')) extensions.push('.dwg');
    return extensions.join(',');
  }, [supportedFormats]);

  const formatDescriptions: Record<ImportFormat, string> = {
    json: 'ALMONA JSON format (recommended)',
    dxf: 'DXF Drawing Exchange Format (CAD compatibility)',
    dwg: 'DWG AutoCAD format (server-side conversion required)'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="text-amber-300 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Drawing
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select a file format and choose a file to import into the drafting workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">File Format</label>
            <div className="flex flex-col gap-2">
              {supportedFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => {
                    setSelectedFormat(format);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedFormat === format
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{format.toUpperCase()}</div>
                      <div className="text-xs text-slate-400">{formatDescriptions[format]}</div>
                    </div>
                  </div>
                  {selectedFormat === format && (
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Select File</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptString()}
                onChange={handleFileSelect}
                className="hidden"
                id="import-file-input"
              />
              <label
                htmlFor="import-file-input"
                className="flex-1 flex items-center justify-center gap-2 p-3 border border-slate-700 rounded-lg bg-slate-800/50 hover:border-amber-500/50 hover:bg-slate-800 cursor-pointer transition-colors text-slate-300"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {selectedFile ? selectedFile.name : 'Choose file...'}
                </span>
              </label>
              {selectedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="h-10 w-10 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <div className="text-xs text-slate-400">
                Size: {(selectedFile.size / 1024).toFixed(2)} KB
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isImporting}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleImport()}
            disabled={!selectedFile || isImporting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ImportDialog.displayName = 'ImportDialog';
