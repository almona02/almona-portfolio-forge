import { AssemblyReview } from "@/components/assembly/AssemblyReview";
import { confirmAssembly, scanAssembly } from "@/services/smartScanApi";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/ui/alert";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import type { AssemblyComponent, AssemblyResponse } from "@/types/assembly";
import { Loader2, Scan, Upload } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SmartScanAssembly: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const [file, setFile] = useState<File | null>(null);
  const [assemblyData, setAssemblyData] = useState<AssemblyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const isValidType = validTypes.includes(selected.type) || selected.name.toLowerCase().endsWith('.pdf');
      const isValidSize = selected.size <= 50 * 1024 * 1024; // 50MB max

      if (!isValidType) {
        toast.error("Invalid file type. Please upload JPG, PNG, or PDF files.");
        return;
      }
      if (!isValidSize) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }
    }
    setFile(selected || null);
    setAssemblyData(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!file) {
      toast.warning("Please select a file first");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await scanAssembly(file);
      setAssemblyData(result);
      toast.success("Assembly scan completed successfully");
    } catch (err: any) {
      const errorMessage = err?.message || t('smart_scan_assembly.scan_failed', 'Assembly scan failed');
      setError(errorMessage);
      console.error("Assembly scan error:", err);
      toast.error(`Scan failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (confirmed: AssemblyComponent[]) => {
    if (!assemblyData) return;
    setIsLoading(true);
    try {
      await confirmAssembly(assemblyData.assembly_id, confirmed);
      setAssemblyData(null);
      setFile(null);
      toast.success("Assembly confirmed successfully");
    } catch (err: any) {
      const errorMessage = err?.message || t('smart_scan_assembly.failed_to_confirm', 'Failed to confirm assembly');
      setError(errorMessage);
      console.error("Assembly confirmation error:", err);
      toast.error(`Confirmation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24 bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8 pb-6 border-b border-amber-500/20">
          <h1 className="typography-h1 text-white font-bold tracking-wide uppercase mb-2">
            {t('smart_scan_assembly.title', 'Smart Assembly Scan')}
          </h1>
          <p className="text-zinc-400 text-sm">
            {t('smart_scan_assembly.description', 'Upload shop drawings to detect assembly structure and confirm component roles.')}
          </p>
        </div>

        <Card className="bg-slate-900/60 backdrop-blur-sm border-amber-500/20 shadow-lg shadow-amber-500/5">
          <CardHeader>
            <CardTitle className="text-white font-semibold tracking-wide uppercase flex items-center gap-2">
              <Scan className="h-5 w-5 text-amber-400" />
              {t('smart_scan_assembly.upload_drawing', 'Upload Drawing')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="bg-slate-800/50 border-amber-500/20 text-white file:bg-amber-500/10 file:text-amber-400 file:border-amber-500/30 file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:border-amber-500/40"
              />
              <Button
                onClick={handleScan}
                disabled={!file || isLoading}
                className="gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Upload className="h-4 w-4" />
                {t('smart_scan_assembly.analyze_assembly', 'Analyze Assembly')}
              </Button>
            </div>
            {file && (
              <div className="text-sm text-zinc-300 p-3 bg-slate-800/50 rounded-lg border border-amber-500/10">
                <span className="text-zinc-400">{t('smart_scan_assembly.selected', 'Selected')}:</span>{" "}
                <span className="font-medium text-white">{file.name}</span>
                <span className="text-zinc-500 ml-2">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                <AlertTitle className="text-red-400">{t('smart_scan_assembly.scan_failed', 'Scan failed')}</AlertTitle>
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {assemblyData && (
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-amber-500/20 shadow-lg shadow-amber-500/5 p-6">
            <AssemblyReview
              assemblyData={assemblyData}
              onConfirm={handleConfirm}
              onCancel={() => setAssemblyData(null)}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartScanAssembly;

