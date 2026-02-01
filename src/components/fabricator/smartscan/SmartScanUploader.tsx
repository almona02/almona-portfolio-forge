import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import { trackError } from "@/lib/performance-monitoring";
import {
  BatchScanResponse,
  ScanResultData,
  SmartScanResult,
  enhancedSmartScan,
  getSupportedFormats,
  scanBatchProfiles,
  scanSingleProfile,
} from "@/services/smartScanApi";
import { Alert, AlertDescription } from "@/shared/ui/ui/alert";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Dialog as UIDialog,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Progress } from "@/shared/ui/ui/progress";
import { Switch } from "@/shared/ui/ui/switch";
import { useProfileTuningStore } from "@/stores/profileTuningStore";
import { saveScannedProfile } from "@/utils/profileImport";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Loader2,
  Settings,
  Upload,
  X,
} from "lucide-react";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ImportWizard } from "./ImportWizard";

type JobStatus = "pending" | "processing" | "success" | "error";

interface ScanJob {
  id: string;
  file: File;
  status: JobStatus;
  progress?: number;
  result?: SmartScanResult["data"];
  error?: string;
}

interface SupportedFormats {
  supported: string[];
  notes: Record<string, string>;
}

export const SmartScanUploader: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [supportedFormats, setSupportedFormats] = useState<SupportedFormats | null>(null);
  const [knownWidthMm, setKnownWidthMm] = useState<string>("");
  const [useEnhancedScan, setUseEnhancedScan] = useState(false);
  const [enableOCR, setEnableOCR] = useState(true);
  const [requireValidation, setRequireValidation] = useState(true);
  const _fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const tuningStore = useProfileTuningStore();
  const [importWizardData, setImportWizardData] = useState<{
    isOpen: boolean;
    jobId?: string;
    scanData?: ScanResultData;
    filename?: string;
  }>({ isOpen: false });

  React.useEffect(() => {
    getSupportedFormats().then(setSupportedFormats).catch(() => null);
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    // Validate file types and sizes before adding
    const validFiles = accepted.filter((file) => {
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB max
      const isValidType = file.type.startsWith("image/") || 
                         file.type === "application/pdf" ||
                         file.name.toLowerCase().endsWith(".dxf");
      return isValidSize && isValidType;
    });

    if (validFiles.length < accepted.length) {
      toast.warning(
        `${accepted.length - validFiles.length} file(s) skipped: invalid type or size > 50MB`
      );
    }

    const next: ScanJob[] = validFiles.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "pending",
    }));
    setJobs((prev) => [...prev, ...next]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tiff", ".tif"],
      "application/pdf": [".pdf"],
      "image/vnd.dxf": [".dxf"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const pendingJobs = useMemo(() => jobs.filter((j) => j.status === "pending"), [jobs]);
  const [batchSessionId, setBatchSessionId] = useState<string | null>(null);
  const [useBatchMode, setUseBatchMode] = useState(true); // Default to batch mode for better performance

  // Load session from localStorage on mount
  React.useEffect(() => {
    const savedSession = localStorage.getItem("smartscan_batch_session");
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.sessionId && sessionData.timestamp) {
          const age = Date.now() - sessionData.timestamp;
          // Keep session if less than 1 hour old
          if (age < 3600000) {
            setBatchSessionId(sessionData.sessionId);
          } else {
            localStorage.removeItem("smartscan_batch_session");
          }
        }
      } catch {
        localStorage.removeItem("smartscan_batch_session");
      }
    }
  }, []);

  const processQueue = async () => {
    if (jobs.length === 0 || pendingJobs.length === 0) return;
    setIsProcessing(true);
    setOverallProgress(0);

    // Mark all pending jobs as processing
    setJobs((prev) =>
      prev.map((j) => (j.status === "pending" ? { ...j, status: "processing", progress: 10 } : j)),
    );

    try {
      if (useBatchMode && pendingJobs.length > 1) {
        // Use true batch API for multiple files
        const width = knownWidthMm ? parseFloat(knownWidthMm) : undefined;
        const files = pendingJobs.map((j) => j.file);
        
        setOverallProgress(15);

        const batchResponse: BatchScanResponse = await scanBatchProfiles(
          files,
          width,
          batchSessionId || undefined,
          (processed, total) => {
            const progress = Math.round((processed / total) * 90 + 15);
            setOverallProgress(progress);
          },
        );

        // Save session ID for potential recovery
        if (batchResponse.session_id) {
          setBatchSessionId(batchResponse.session_id);
          localStorage.setItem(
            "smartscan_batch_session",
            JSON.stringify({
              sessionId: batchResponse.session_id,
              timestamp: Date.now(),
            }),
          );
        }

        // Map batch results to jobs
        setJobs((prev) =>
          prev.map((j) => {
            if (j.status !== "processing") return j;
            const result = batchResponse.results.find((r) => r.filename === j.file.name);
            if (!result) return j;

            if (result.success && result.data) {
              return {
                ...j,
                status: "success",
                result: result.data,
                progress: 100,
              };
            } else {
              return {
                ...j,
                status: "error",
                error: result.error || "Batch scan failed",
                progress: 100,
              };
            }
          }),
        );

        setOverallProgress(100);
      } else {
        // Fallback to sequential processing for single files or when batch mode is disabled
        for (let i = 0; i < pendingJobs.length; i += 1) {
          const job = pendingJobs[i];
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, status: "processing", progress: 10 } : j,
            ),
          );

          try {
            const width = knownWidthMm ? parseFloat(knownWidthMm) : undefined;
            const result = useEnhancedScan
              ? await enhancedSmartScan(job.file, width, {
                  enableOCR,
                  requireValidation,
                })
              : await scanSingleProfile(job.file, width);

            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? { ...j, status: "success", result: result.data, progress: 100 }
                  : j,
              ),
            );
          } catch (err: any) {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? { ...j, status: "error", error: err?.message || "Scan failed", progress: 100 }
                  : j,
              ),
            );
          }

          const processedCount =
            jobs.filter((j) => j.status === "success" || j.status === "error").length + 1;
          setOverallProgress(Math.round((processedCount / jobs.length) * 100));
        }
      }
    } catch (err: unknown) {
      // Global error handling for batch mode
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = error.message || "Batch processing failed";
      
      // Track error for monitoring
      trackError("SmartScan", "batch_processing", errorMessage);
      
      toast.error(`Batch processing failed: ${errorMessage}`);
      setJobs((prev) =>
        prev.map((j) =>
          j.status === "processing"
            ? { ...j, status: "error", error: errorMessage, progress: 100 }
            : j,
        ),
      );
    } finally {
      setIsProcessing(false);
      // Clean up session if all jobs are done
      setJobs((currentJobs) => {
        const allDone = currentJobs.every((j) => j.status === "success" || j.status === "error");
        if (allDone && batchSessionId) {
          localStorage.removeItem("smartscan_batch_session");
          setBatchSessionId(null);
        }
        return currentJobs;
      });
    }
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAll = () => {
    setJobs([]);
    setOverallProgress(0);
    setBatchSessionId(null);
    localStorage.removeItem("smartscan_batch_session");
  };

  const retryFailedJobs = () => {
    setJobs((prev) =>
      prev.map((j) => (j.status === "error" ? { ...j, status: "pending", error: undefined } : j)),
    );
  };

  const failedJobsCount = useMemo(() => jobs.filter((j) => j.status === "error").length, [jobs]);

  const downloadSVG = (job: ScanJob) => {
    if (!job.result) return;
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${job.result.dimensions.width_mm}mm"
     height="${job.result.dimensions.height_mm}mm"
     viewBox="${job.result.view_box}"
     xmlns="http://www.w3.org/2000/svg">
  <title>${job.file.name}</title>
  <path d="${job.result.svg_path}" fill="#333333" stroke="none"/>
</svg>`;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, "")}_scan.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadEnhancedReport = (job: ScanJob) => {
    if (!job.result) return;
    const payload = {
      filename: job.file.name,
      size_mb: job.file.size / 1024 / 1024,
      scanned_at: new Date().toISOString(),
      result: job.result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, "")}_smartscan_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openImportWizard = (job: ScanJob) => {
    if (!job.result) return;
    setImportWizardData({
      isOpen: true,
      jobId: job.id,
      scanData: job.result,
      filename: job.file.name,
    });
  };

  const handleImport = async (profileData: Partial<any>): Promise<string> => {
    if (!importWizardData.jobId || !importWizardData.scanData) {
      toast.error("Missing scan data. Please try scanning again.");
      return "";
    }
    if (!user?.id) {
      toast.error("You must be signed in to import profiles.");
      return "";
    }
    try {
      const specs = profileData.specifications || {};
      const geom = specs.geometry_config || {};
      const payload = {
        name: profileData.name || importWizardData.filename || "Scanned Profile",
        role: (profileData as any).role || "frame",
        material: (profileData as any).material || "aluminum",
        specifications: {
          ...specs,
          geometry_config: {
            ...geom,
            svg_path: geom.svg_path ?? importWizardData.scanData.svg_path,
            view_box: geom.view_box ?? importWizardData.scanData.view_box,
            scale_mm_per_px:
              geom.scale_mm_per_px ?? importWizardData.scanData.dimensions.scale_mm_per_px,
          },
        },
      };
      
      // Validate payload before sending
      if (!payload.specifications.geometry_config.svg_path) {
        throw new Error("Missing SVG path in scan data");
      }
      if (!payload.specifications.geometry_config.view_box) {
        throw new Error("Missing view box in scan data");
      }

      const newId = await saveScannedProfile(payload, user.id);
      
      if (!newId) {
        throw new Error("Failed to save profile - no ID returned");
      }

      toast.success(`Profile imported successfully (ID: ${newId})`);
      tuningStore.setCurrentProfileId(newId);
      tuningStore.setActiveTab("geometry");
      navigate(`/fabricator/profiles/${newId}/tune`, {
        state: { profileId: newId, highlightGeometry: true, source: "smartscan" },
      });
      setImportWizardData({ isOpen: false });
      setJobs((prev) => prev.filter((j) => j.id !== importWizardData.jobId));
      return newId;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = error.message || "Import failed";
      
      // Track error for monitoring
      trackError("SmartScan", "profile_import", errorMessage);
      
      toast.error(`Import failed: ${errorMessage}`);
      return "";
    }
  };

  const StatusIcon: React.FC<{ status: JobStatus }> = useCallback(({ status }) => {
    switch (status) {
      case "pending":
        return <FileText className="w-5 h-5 text-zinc-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <FileText className="w-5 h-5 text-zinc-500" />;
    }
  }, []);

  return (
    <div className="space-y-6 p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="typography-h2 text-xl font-semibold text-white tracking-wide uppercase">
            AI-Assisted Engineering Drawing Scanner
          </h2>
          <p className="text-sm text-zinc-400">
            Convert catalog pages to vector profiles with automatic dimension detection
          </p>
        </div>
        {supportedFormats && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Supported Formats
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supported File Formats</DialogTitle>
                <DialogDescription>
                  Files are automatically converted to vector profiles
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <h4 className="typography-h4 font-medium mb-2">Direct Support:</h4>
                  <div className="flex flex-wrap gap-2">
                    {supportedFormats.supported.map((fmt) => (
                      <Badge key={fmt} variant="secondary">
                        {fmt}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-zinc-500 space-y-2">
                  {Object.entries(supportedFormats.notes).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{k}:</strong> {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                : "border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Upload className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="typography-h3 text-lg font-medium text-zinc-200">
                  {isDragActive ? "Drop files here" : "Drag & drop catalog pages"}
                </h3>
                <p className="text-sm text-zinc-500">Or click to browse · Max 50MB per file</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="knownWidth" className="typography-label text-sm text-zinc-400">
              Known Width (mm) - Optional
            </Label>
            <Input
              id="knownWidth"
              type="number"
              step="0.1"
              placeholder="e.g., 100"
              value={knownWidthMm}
              onChange={(e) => setKnownWidthMm(e.target.value)}
              className="bg-zinc-900 border-zinc-700"
            />
            <p className="text-xs text-zinc-500 mt-1">Leave empty for auto-detection</p>
          </div>

          <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="typography-label text-sm font-medium text-zinc-300">Batch Processing</Label>
                <p className="text-xs text-zinc-500">
                  Process multiple files simultaneously (faster)
                </p>
              </div>
              <Switch
                checked={useBatchMode}
                onCheckedChange={setUseBatchMode}
                className="data-[state=checked]:bg-amber-500"
                disabled={pendingJobs.length <= 1}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="typography-label text-sm font-medium text-zinc-300">Enhanced SmartScan</Label>
                <p className="text-xs text-zinc-500">
                  Better accuracy with OCR and scale detection
                </p>
              </div>
              <Switch
                checked={useEnhancedScan}
                onCheckedChange={setUseEnhancedScan}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            {useEnhancedScan && (
              <div className="space-y-2 pl-1 border-l-2 border-amber-500/30 ml-1">
                <div className="flex items-center justify-between">
                  <Label className="typography-label text-xs text-zinc-400">Extract text (OCR)</Label>
                  <Switch
                    checked={enableOCR}
                    onCheckedChange={setEnableOCR}
                    className="scale-90 origin-right data-[state=checked]:bg-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="typography-label text-xs text-zinc-400">Strict validation</Label>
                  <Switch
                    checked={requireValidation}
                    onCheckedChange={setRequireValidation}
                    className="scale-90 origin-right data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={processQueue}
              disabled={isProcessing || pendingJobs.length === 0}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-500/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start SmartScan {useBatchMode && pendingJobs.length > 1 ? `(${pendingJobs.length} files)` : ""}
                </>
              )}
            </Button>
            {failedJobsCount > 0 && (
              <Button
                onClick={retryFailedJobs}
                variant="outline"
                className="border-amber-500/30 hover:bg-amber-500/10 text-amber-400"
                size="sm"
              >
                Retry Failed ({failedJobsCount})
              </Button>
            )}
            {jobs.length > 0 && (
              <Button
                onClick={clearAll}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Processing batch...</span>
            <span className="text-white font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      )}

      {jobs.length > 0 && (
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-amber-500/10 shadow-md">
            <div className="text-2xl font-bold text-white">{jobs.length}</div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Files</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-emerald-500/20 shadow-md">
            <div className="text-2xl font-bold text-emerald-400">
              {jobs.filter((j) => j.status === "success").length}
            </div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Successful</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-amber-500/20 shadow-md">
            <div className="text-2xl font-bold text-amber-400">
              {jobs.filter((j) => j.status === "pending").length}
            </div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Pending</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-red-500/20 shadow-md">
            <div className="text-2xl font-bold text-red-400">
              {jobs.filter((j) => j.status === "error").length}
            </div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Failed</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 flex gap-4 items-start"
          >
            <div className="mt-1">
              <StatusIcon status={job.status} />
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200 truncate">{job.file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(job.file.size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Last modified: {new Date(job.file.lastModified).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === "success" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadSVG(job)}
                        className="h-8 text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        SVG
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openImportWizard(job)}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Tune & Import
                      </Button>
                    </>
                  )}
                  <button
                    onClick={() => removeJob(job.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {job.status === "processing" && job.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Vectorizing...</span>
                    <span className="text-white">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-1.5" />
                </div>
              )}

              {job.status === "error" && job.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">{job.error}</AlertDescription>
                </Alert>
              )}

              {job.status === "success" && job.result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-800">
                  <div className="space-y-2">
                    <h4 className="typography-h4 text-sm font-medium text-zinc-400">Vector Preview</h4>
                    <div className="bg-white rounded p-2 border border-zinc-700">
                      <svg viewBox={job.result.view_box} className="w-full h-32">
                        <path d={job.result.svg_path} fill="#333333" stroke="none" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="typography-h4 text-sm font-medium text-zinc-400 mb-2">Detected Dimensions</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Width:</span>
                          <span className="font-mono text-white">
                            {job.result.dimensions.width_mm.toFixed(1)} mm
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Height:</span>
                          <span className="font-mono text-white">
                            {job.result.dimensions.height_mm.toFixed(1)} mm
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-zinc-400">Scale Source:</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {(job.result.dimensions.scale_source || "auto").replace("_", " ")}
                          </Badge>
                        </div>

                        {job.result.dimensions.enhanced_scale && (
                          <div className="pt-2 border-t border-zinc-800 space-y-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs text-zinc-500">Scale method:</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {job.result.dimensions.enhanced_scale.method || "heuristic"}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs text-zinc-500">Scale confidence:</span>
                              <Progress
                                value={
                                  (job.result.dimensions.scale_confidence ||
                                    job.result.dimensions.enhanced_scale.confidence ||
                                    0.5) * 100
                                }
                                className="w-24 h-1.5"
                              />
                              <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                                {(
                                  (job.result.dimensions.scale_confidence ||
                                    job.result.dimensions.enhanced_scale.confidence ||
                                    0.5) * 100
                                ).toFixed(0)}
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {job.result.technical_data && (
                      <div className="space-y-2">
                        <h4 className="typography-h4 text-sm font-medium text-zinc-400">OCR Extracted</h4>
                        <div className="space-y-2">
                          {job.result.technical_data.profile_name && (
                            <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                                >
                                  Profile Name
                                </Badge>
                                <span className="text-xs text-zinc-500">
                                  Confidence: {(job.result.technical_data.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm font-medium text-white truncate">
                                {job.result.technical_data.profile_name}
                              </p>
                            </div>
                          )}

                          {job.result.technical_data.material_hints?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-zinc-500">Materials:</span>
                              {job.result.technical_data.material_hints.map((material, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs capitalize">
                                  {material}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {Array.isArray(job.result.technical_data.detected_brands) && job.result.technical_data.detected_brands.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-zinc-500">Brands:</span>
                              {job.result.technical_data.detected_brands.map((brand: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                  {brand}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {job.result.technical_data.thermal_break_mentions && (
                            <div className="flex items-center gap-2 p-1.5 bg-yellow-500/10 rounded border border-yellow-500/20">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                              <span className="text-xs text-yellow-400">Thermal break detected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="typography-h4 text-sm font-medium text-zinc-400 mb-2">Quality Assessment</h4>
                      <div className="space-y-3">
                        {job.result.quality?.accuracy_tier && (
                          <div
                            className={`p-3 rounded-lg border ${
                              job.result.quality.accuracy_tier === "production"
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : job.result.quality.accuracy_tier === "verified_required"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-red-500/10 border-red-500/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {job.result.quality.accuracy_tier === "production" && (
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                )}
                                {job.result.quality.accuracy_tier === "verified_required" && (
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                )}
                                {job.result.quality.accuracy_tier === "review_required" && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="font-medium text-sm">
                                  {job.result.quality.accuracy_tier === "production" && "✅ Production Ready"}
                                  {job.result.quality.accuracy_tier === "verified_required" &&
                                    "⚠️ Verification Recommended"}
                                  {job.result.quality.accuracy_tier === "review_required" &&
                                    "🔍 Manual Review Required"}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  job.result.quality.accuracy_tier === "production"
                                    ? "text-emerald-400 border-emerald-400/30"
                                    : job.result.quality.accuracy_tier === "verified_required"
                                    ? "text-amber-400 border-amber-400/30"
                                    : "text-red-400 border-red-400/30"
                                }`}
                              >
                                Tier: {job.result.quality.accuracy_tier}
                              </Badge>
                            </div>

                            <Progress value={job.result.quality.confidence_score * 100} className="h-2 mb-1" />
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Confidence</span>
                              <span className="font-mono text-white">
                                {(job.result.quality.confidence_score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}

                        {job.result.suggestions?.egyptian_standard_match && (
                          <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-emerald-400">EG</span>
                              </div>
                              <span className="font-medium text-sm text-emerald-400">Egyptian Standard Match</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500">Profile:</span>
                                <span className="text-sm font-medium text-white">
                                  {(job.result.suggestions.egyptian_standard_match as any)?.name || 'Unknown'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500">Match score:</span>
                                <Progress
                                  value={((job.result.suggestions.egyptian_standard_match as any)?.match_score || 0) * 100}
                                  className="w-16 h-1.5"
                                />
                                <span className="text-xs font-mono text-white w-8 text-right">
                                  {(((job.result.suggestions.egyptian_standard_match as any)?.match_score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                              {(job.result.suggestions.egyptian_standard_match as any)?.deviation_mm && (
                                <div className="text-xs text-zinc-500 mt-1">
                                  Deviation:{" "}
                                  {((job.result.suggestions.egyptian_standard_match as any).deviation_mm.width || 0).toFixed(1)}mm width,{" "}
                                  {((job.result.suggestions.egyptian_standard_match as any).deviation_mm.height || 0).toFixed(1)}mm height
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {job.result.suggestions && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-zinc-400">Suggestions</h5>
                            <div className="space-y-1.5">
                              {job.result.suggestions.profile_name && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Suggested name
                                  </Badge>
                                  <span className="text-xs text-white truncate">
                                    {job.result.suggestions.profile_name}
                                  </span>
                                </div>
                              )}
                              {job.result.suggestions.likely_material && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Likely material
                                  </Badge>
                                  <span className="text-xs text-white capitalize">
                                    {job.result.suggestions.likely_material}
                                  </span>
                                </div>
                              )}
                              {job.result.suggestions.likely_role && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Suggested role
                                  </Badge>
                                  <span className="text-xs text-white capitalize">
                                    {job.result.suggestions.likely_role}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {job.result.quality?.verification_notes?.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="text-xs font-medium text-zinc-400">Verification Notes</h5>
                            <div className="space-y-1">
                              {job.result.quality.verification_notes.map((note: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-yellow-400">{note}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {job.result?.suggestions?.egyptian_standard_match && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const standard = job.result?.suggestions?.egyptian_standard_match as any;
                            if (!standard) return;
                            toast.info(`Applied ${standard?.name || 'Egyptian standard'} standard dimensions`);
                          }}
                          className="h-7 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Apply Egyptian Standard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadEnhancedReport(job)}
                          className="h-7 text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Export Full Report
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {jobs.length === 0 && !isProcessing && (
        <div className="text-center py-12 text-zinc-400">
          <div className="mb-4">
            <Upload className="w-12 h-12 mx-auto opacity-50 text-amber-500/30" />
          </div>
          <h3 className="typography-h3 text-lg font-medium mb-2 text-white tracking-wide uppercase">
            No files uploaded
          </h3>
          <p className="text-sm max-w-md mx-auto text-zinc-400">
            Drag & drop catalog pages or browse to start converting engineering drawings to vector
            profiles
          </p>
        </div>
      )}

      <UIDialog
        open={importWizardData.isOpen}
        onOpenChange={(open) => !open && setImportWizardData({ isOpen: false })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {importWizardData.scanData && (
            <ImportWizard
              scanData={importWizardData.scanData}
              filename={importWizardData.filename || "Scanned Profile"}
              onImport={handleImport}
              onCancel={() => setImportWizardData({ isOpen: false })}
              onImportSuccess={(profileId) => {
                if (importWizardData.jobId) {
                  removeJob(importWizardData.jobId);
                }
                setImportWizardData({ isOpen: false });
                toast.success("Profile imported and ready for tuning", {
                  description: "Opening tuning studio for geometry adjustments",
                });
                navigate(`/fabricator/profiles?tuning=studio&profileId=${profileId}`, {
                  state: { highlightGeometry: true, source: "smartscan" },
                });
              }}
            />
          )}
        </DialogContent>
      </UIDialog>
    </div>
  );
};

// Memoize component for performance optimization
const SmartScanUploaderMemo = memo(SmartScanUploader);
SmartScanUploaderMemo.displayName = "SmartScanUploader";

// Wrap with error boundary for production hardening
const SmartScanUploaderWithErrorBoundary: React.FC = () => (
  <ErrorBoundary level="component">
    <SmartScanUploaderMemo />
  </ErrorBoundary>
);

export default SmartScanUploaderWithErrorBoundary;

