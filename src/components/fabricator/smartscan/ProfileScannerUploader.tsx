import { scanProfileImage } from "@/services/scanApi";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/shared/ui/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/ui/alert";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Progress } from "@/shared/ui/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/ui/ui/tooltip";
import type {
    ProfileScanResult,
    ScaleDetectionResult,
} from "@/types/scan";
import {
    AlertTriangle,
    CheckCircle,
    Download,
    Eye,
    Info,
    RefreshCw,
    ScanSearch,
    UploadCloud,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function DescGrid({
  items,
  cols = 1,
}: {
  items: { label: string; value: React.ReactNode }[];
  cols?: 1 | 2;
}) {
  return (
    <dl className={`grid gap-2 text-sm ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ScaleSuggestionModalProps {
  visible: boolean;
  scaleDetection: ScaleDetectionResult;
  onConfirm: (scale: number) => void;
  onManual: () => void;
  onCancel: () => void;
}

const ScaleSuggestionModal: React.FC<ScaleSuggestionModalProps> = ({
  visible,
  scaleDetection,
  onConfirm,
  onManual,
  onCancel,
}) => {
  const { t } = useTranslation('fabricator');
  const { scale_mm_per_px, confidence, detected_label, suggestion_text, debug_info } =
    scaleDetection;

  const isHighConfidence = (confidence || 0) > 0.8;
  const isMediumConfidence = (confidence || 0) >= 0.6 && (confidence || 0) <= 0.8;

  const getConfidenceText = () => {
    const conf = (confidence || 0) * 100;
    if (isHighConfidence) return t('profile_scanner_uploader.scale_modal.confidence_high', { percent: conf.toFixed(0), defaultValue: `High (${conf.toFixed(0)}%)` });
    if (isMediumConfidence) return t('profile_scanner_uploader.scale_modal.confidence_medium', { percent: conf.toFixed(0), defaultValue: `Medium (${conf.toFixed(0)}%)` });
    return t('profile_scanner_uploader.scale_modal.confidence_low', { percent: conf.toFixed(0), defaultValue: `Low (${conf.toFixed(0)}%)` });
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isHighConfidence ? (
              <CheckCircle style={{ color: "#52c41a" }} />
            ) : isMediumConfidence ? (
              <AlertTriangle style={{ color: "#faad14" }} />
            ) : (
              <AlertTriangle style={{ color: "#ff4d4f" }} />
            )}
            {t('profile_scanner_uploader.scale_modal.title', 'Scale Detection Result')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <DescGrid
                items={[
                  {
                    label: t('profile_scanner_uploader.scale_modal.detected_scale', 'Detected Scale'),
                    value: (
                      <span className="flex items-center gap-2">
                        <span className="text-base font-semibold">{scale_mm_per_px?.toFixed(6)} mm/px</span>
                        <Badge variant={isHighConfidence ? "default" : isMediumConfidence ? "secondary" : "destructive"}>
                          {getConfidenceText()}
                        </Badge>
                      </span>
                    ),
                  },
                  ...(detected_label
                    ? [{ label: t('profile_scanner_uploader.scale_modal.reference_label', 'Reference Label'), value: <Badge variant="secondary">{detected_label} mm</Badge> }]
                    : []),
                  {
                    label: t('profile_scanner_uploader.scale_modal.suggestion', 'Suggestion'),
                    value: (
                      <span className={isHighConfidence ? "text-green-600" : isMediumConfidence ? "text-amber-600" : "text-destructive"}>
                        {suggestion_text || t('profile_scanner_uploader.scale_modal.no_suggestion', 'No suggestion available')}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Alert variant={isHighConfidence ? "default" : "destructive"} className={isHighConfidence ? "border-green-500 bg-green-500/10" : isMediumConfidence ? "border-amber-500 bg-amber-500/10" : ""}>
            <AlertTitle>{t('profile_scanner_uploader.scale_modal.what_this_means', 'What this means:')}</AlertTitle>
            <AlertDescription>
              {isHighConfidence
                ? t('profile_scanner_uploader.scale_modal.high_confidence_desc', 'The AI detected a scale with high confidence. You can safely apply it automatically.')
                : isMediumConfidence
                ? t('profile_scanner_uploader.scale_modal.medium_confidence_desc', 'The AI detected a scale with moderate confidence. Please verify the detected value before applying.')
                : t('profile_scanner_uploader.scale_modal.low_confidence_desc', 'The AI detected a scale with low confidence. Manual verification is recommended.')}
            </AlertDescription>
          </Alert>

          {debug_info && (
            <Accordion type="single" collapsible>
              <AccordionItem value="debug">
                <AccordionTrigger>{t('profile_scanner_uploader.scale_modal.advanced_details', 'Advanced Details')}</AccordionTrigger>
                <AccordionContent>
                  <DescGrid
                    items={[
                      { label: t('profile_scanner_uploader.scale_modal.samples', 'Samples'), value: String(debug_info.samples || 0) },
                      { label: t('profile_scanner_uploader.scale_modal.detected_dimensions', 'Detected Dimensions'), value: String(debug_info.dimensions || 0) },
                      { label: t('profile_scanner_uploader.scale_modal.lines', 'Lines'), value: String(debug_info.lines || 0) },
                      { label: t('profile_scanner_uploader.scale_modal.associations', 'Associations'), value: String(debug_info.associations || 0) },
                      ...(debug_info.method ? [{ label: t('profile_scanner_uploader.scale_modal.method', 'Method'), value: String(debug_info.method) }] : []),
                    ]}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onManual}>
            {t('profile_scanner_uploader.scale_modal.enter_manually', 'Enter Scale Manually')}
          </Button>
          <Button onClick={() => scale_mm_per_px && onConfirm(scale_mm_per_px)}>
            {isHighConfidence ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            {isHighConfidence ? t('profile_scanner_uploader.scale_modal.apply_auto', 'Apply Auto-Detected Scale') : t('profile_scanner_uploader.scale_modal.use_detected', 'Use Detected Scale')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ProfileScannerUploaderProps {
  authToken?: string;
  baseUrl?: string;
  onScanSuccess?: (result: ProfileScanResult) => void;
  includeDebugOverlay?: boolean;
}

export function ProfileScannerUploader({
  authToken,
  baseUrl,
  onScanSuccess,
  includeDebugOverlay = true,
}: ProfileScannerUploaderProps) {
  const { t } = useTranslation('fabricator');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number | null>(0.1);
  const [autoDetectScale, setAutoDetectScale] = useState(true);
  const [result, setResult] = useState<ProfileScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showScaleSuggestion, setShowScaleSuggestion] = useState(false);
  const [scaleSuggestion, setScaleSuggestion] = useState<ScaleDetectionResult | null>(
    null,
  );
  const [manualScaleMode, setManualScaleMode] = useState(false);

  useEffect(() => {
    setResult(null);
    setError(null);
    setProgress(0);
    setScaleSuggestion(null);
    setShowScaleSuggestion(false);
    setManualScaleMode(false);
  }, [file]);

  const handleHighConfidenceDetection = useCallback((detection: ScaleDetectionResult) => {
    if (detection.scale_mm_per_px) {
      setScaleFactor(detection.scale_mm_per_px);
      toast.success(t('profile_scanner_uploader.scale_modal.auto_detected', 'Scale Auto-Detected'), {
        description: t('profile_scanner_uploader.scale_modal.auto_detected_desc', {
          scale: detection.scale_mm_per_px.toFixed(6),
          defaultValue: `High confidence scale applied: ${detection.scale_mm_per_px.toFixed(6)} mm/px`
        }),
      });
    }
  }, [t]);

  useEffect(() => {
    if (result?.scaleDetection && autoDetectScale) {
      const detection = result.scaleDetection;
      if (detection.detected) {
        const confidence = detection.confidence || 0;
        if (confidence > 0.8) {
          handleHighConfidenceDetection(detection);
        } else if (confidence >= 0.6) {
          setScaleSuggestion(detection);
          setShowScaleSuggestion(true);
        } else {
          toast.warning(t('profile_scanner_uploader.errors.low_confidence_title', 'Low Confidence Detection'), {
            description:
              detection.suggestion_text ||
              t('profile_scanner_uploader.errors.low_confidence_desc', 'AI detected a scale with low confidence. Please enter scale manually.'),
          });
          setManualScaleMode(true);
        }
      } else {
        toast.info(t('profile_scanner_uploader.errors.no_scale_title', 'No Scale Detected'), {
          description: t('profile_scanner_uploader.errors.no_scale_desc', 'AI could not detect a scale. Please enter scale manually.'),
        });
        setManualScaleMode(true);
      }
    }
  }, [result, autoDetectScale, handleHighConfidenceDetection, t]);

  const handleFileSelect = (incoming: File) => {
    if (!incoming.type.startsWith("image/")) {
      toast.error(t('profile_scanner_uploader.errors.invalid_file', 'Invalid File'), {
        description: t('profile_scanner_uploader.errors.invalid_file_desc', 'Please upload an image file (JPG, PNG, etc.)'),
      });
      return false;
    }
    setFile(incoming);
    return true;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted[0]) handleFileSelect(accepted[0]);
    },
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleScan = async () => {
    if (!file) {
      toast.error(t('profile_scanner_uploader.errors.no_file', 'No File Selected'), {
        description: t('profile_scanner_uploader.errors.no_file_desc', 'Please select an image file first'),
      });
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formProgress = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(formProgress);
            return prev;
          }
          return prev + 10;
        });
      }, 250);

      const scanResult = await scanProfileImage(file, {
        authToken,
        baseUrl,
        autoDetectScale,
        includeDebugOverlay,
        scaleFactor:
          (!autoDetectScale || manualScaleMode) && scaleFactor ? scaleFactor : undefined,
      });

      clearInterval(formProgress);
      setProgress(100);
      setResult(scanResult);
      onScanSuccess?.(scanResult);
      setTimeout(() => setProgress(0), 500);
    } catch (err: any) {
      setError(err.message);
      toast.error(t('profile_scanner_uploader.errors.scan_failed', 'Scan Failed'), {
        description: err.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleScaleSuggestionConfirm = (scale: number) => {
    setScaleFactor(scale);
    setShowScaleSuggestion(false);
    setScaleSuggestion(null);
    toast.success(t('profile_scanner_uploader.scale_modal.scale_applied', 'Scale Applied'), {
      description: t('profile_scanner_uploader.scale_modal.scale_applied_desc', {
        scale: scale.toFixed(6),
        defaultValue: `Using detected scale: ${scale.toFixed(6)} mm/px`
      }),
    });
    setManualScaleMode(false);
  };

  const handleScaleSuggestionManual = () => {
    setShowScaleSuggestion(false);
    setManualScaleMode(true);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setScaleFactor(0.1);
    setAutoDetectScale(true);
    setManualScaleMode(false);
  };

  const handleDownloadSVG = () => {
    const url =
      result?.storageUrls?.svg_url ||
      result?.storage?.svg_url ||
      result?.storage?.original_url;
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.warning(t('profile_scanner_uploader.errors.svg_not_available', 'SVG Not Available'), {
        description: t('profile_scanner_uploader.errors.svg_not_available_desc', 'SVG file URL not found in results'),
      });
    }
  };

  const handleViewDebug = () => {
    const url = result?.storageUrls?.debug_overlay_url || result?.storage?.debug_overlay_url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Card className="max-w-[900px] mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ScanSearch className="w-5 h-5" />
          {t('profile_scanner_uploader.title', 'AI-Assisted Engineering Drawing Scanner')}
          <Badge variant="secondary">{t('profile_scanner_uploader.beta', 'BETA')}</Badge>
        </CardTitle>
        {result && (
          <div className="flex items-center gap-2">
            {result.storageUrls?.svg_url && (
              <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
                <Download className="w-4 h-4 mr-2" />
                {t('profile_scanner_uploader.actions.download_svg', 'Download SVG')}
              </Button>
            )}
            {result.storageUrls?.debug_overlay_url && (
              <Button variant="outline" size="sm" onClick={handleViewDebug}>
                <Eye className="w-4 h-4 mr-2" />
                {t('profile_scanner_uploader.actions.view_debug', 'View Debug')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('profile_scanner_uploader.actions.new_scan', 'New Scan')}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!file ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile_scanner_uploader.steps.select', '1. Select Image')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary"}`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">{t('profile_scanner_uploader.upload.title', 'Click or drag image to upload')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('profile_scanner_uploader.upload.formats', 'Supported formats: JPG, PNG, BMP (export PDF/DWG/DXF to image)')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('profile_scanner_uploader.upload.max_size', 'Max size: 10MB; one drawing at a time')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile_scanner_uploader.upload.selected_file', 'Selected File')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground text-sm">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <Button variant="outline" size="sm" onClick={() => setFile(null)}>{t('profile_scanner_uploader.upload.change', 'Change')}</Button>
            </CardContent>
          </Card>
        )}

        {file && !result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile_scanner_uploader.steps.scale', '2. Scale Configuration')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoDetectScale"
                  checked={autoDetectScale}
                  onChange={(e) => {
                    setAutoDetectScale(e.target.checked);
                    setManualScaleMode(false);
                  }}
                  disabled={uploading}
                  className="rounded"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label htmlFor="autoDetectScale" className="font-medium flex items-center gap-1 cursor-pointer">
                        {t('profile_scanner_uploader.scale.auto_detect', 'Auto-detect scale from drawing')}
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('profile_scanner_uploader.scale.auto_detect_tooltip', 'AI will attempt to detect scale from dimension labels in the image')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {(!autoDetectScale || manualScaleMode) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('profile_scanner_uploader.scale.manual_scale', 'Manual Scale Factor:')}</span>
                    <span className="text-muted-foreground text-sm">{t('profile_scanner_uploader.scale.manual_scale_unit', '(mm per pixel)')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={scaleFactor ?? ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setScaleFactor(isNaN(v) ? null : v);
                      }}
                      min={0.001}
                      max={1}
                      step={0.01}
                      disabled={uploading}
                      className="w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">mm/px</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('profile_scanner_uploader.scale.manual_scale_example', 'Example: 0.1 means 1 pixel = 0.1 mm (common for engineering drawings)')}</p>
                </div>
              )}

              {autoDetectScale && !manualScaleMode && (
                <Alert>
                  <AlertTitle>{t('profile_scanner_uploader.scale.ai_active', 'AI Scale Detection Active')}</AlertTitle>
                  <AlertDescription>{t('profile_scanner_uploader.scale.ai_active_desc', 'The system will attempt to detect scale from dimension labels. If successful, you\'ll be prompted to confirm.')}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {uploading && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="font-medium">{t('profile_scanner_uploader.processing.title', 'Processing...')}</p>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progress < 30 && t('profile_scanner_uploader.processing.uploading', 'Uploading image...')}
                {progress >= 30 && progress < 60 && t('profile_scanner_uploader.processing.ocr', 'Running OCR...')}
                {progress >= 60 && progress < 90 && t('profile_scanner_uploader.processing.detecting', 'Detecting scale...')}
                {progress >= 90 && t('profile_scanner_uploader.processing.vectorizing', 'Vectorizing profile...')}
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="relative">
            <AlertTitle>{t('profile_scanner_uploader.errors.scan_error', 'Scan Error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => setError(null)}>×</Button>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile_scanner_uploader.steps.results', '3. Scan Results')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{t('profile_scanner_uploader.results.scale_applied', 'Scale Applied')}</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{result.dimensions.scale_used?.toFixed(6) ?? "N/A"} mm/px</p>
                    <p className="text-sm text-muted-foreground">{result.scaleDetection?.detected ? t('profile_scanner_uploader.results.detected_by_ai', 'Detected by AI') : t('profile_scanner_uploader.results.manually_specified', 'Manually specified')}</p>
                  </div>
                </AlertDescription>
              </Alert>

              {result.qualityFlags && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('profile_scanner_uploader.results.quality_assessment', 'Quality Assessment')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DescGrid
                      cols={2}
                      items={[
                        { label: t('profile_scanner_uploader.results.auto_scale_detected', 'Auto-scale detected'), value: result.qualityFlags.auto_scale_detected ? <Badge variant="default">{t('profile_scanner_uploader.results.yes', 'Yes')}</Badge> : <Badge variant="destructive">{t('profile_scanner_uploader.results.no', 'No')}</Badge> },
                        { label: t('profile_scanner_uploader.results.properly_scaled', 'Properly scaled'), value: result.qualityFlags.is_properly_scaled ? <Badge variant="default">{t('profile_scanner_uploader.results.yes', 'Yes')}</Badge> : <Badge variant="destructive">{t('profile_scanner_uploader.results.no', 'No')}</Badge> },
                        { label: t('profile_scanner_uploader.results.dimension_labels', 'Dimension labels'), value: result.qualityFlags.has_dimension_labels ? <Badge variant="default">{t('profile_scanner_uploader.results.present', 'Present')}</Badge> : <Badge variant="destructive">{t('profile_scanner_uploader.results.missing', 'Missing')}</Badge> },
                        { label: t('profile_scanner_uploader.results.image_quality', 'Image quality'), value: result.qualityFlags.is_high_contrast ? <Badge variant="default">{t('profile_scanner_uploader.results.good', 'Good')}</Badge> : <Badge variant="secondary">{t('profile_scanner_uploader.results.fair', 'Fair')}</Badge> },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {result.dimensions.mm && Object.keys(result.dimensions.mm).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('profile_scanner_uploader.results.extracted_dimensions', 'Extracted Dimensions (mm)')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.dimensions.mm).map(([key, value]) => (
                        <Badge key={key} variant="secondary">{key}: {Number(value).toFixed(2)}mm</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('profile_scanner_uploader.results.performance', 'Performance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DescGrid cols={2} items={[
                    { label: t('profile_scanner_uploader.results.processing_time', 'Processing Time'), value: `${result.processing_time_ms ?? "N/A"} ms` },
                    { label: t('profile_scanner_uploader.results.timestamp', 'Timestamp'), value: result.timestamp ? new Date(result.timestamp).toLocaleString() : "N/A" },
                  ]} />
                </CardContent>
              </Card>

              <Accordion type="single" collapsible>
                <AccordionItem value="raw">
                  <AccordionTrigger>{t('profile_scanner_uploader.results.view_raw', 'View Raw API Response')}</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs max-h-[300px] overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {file && !uploading && !result && (
          <div className="flex justify-center">
            <Button onClick={handleScan} disabled={uploading} size="lg" className="min-w-[200px]">
              <ScanSearch className="w-4 h-4 mr-2" />
              {autoDetectScale ? t('profile_scanner_uploader.actions.scan_ai', 'Scan with AI Detection') : t('profile_scanner_uploader.actions.scan_manual', 'Scan with Manual Scale')}
            </Button>
          </div>
        )}

        {result && (
          <div className="flex justify-center">
            <Button onClick={handleReset} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('profile_scanner_uploader.actions.scan_another', 'Scan Another Drawing')}
            </Button>
          </div>
        )}
      </CardContent>

      {scaleSuggestion && (
        <ScaleSuggestionModal
          visible={showScaleSuggestion}
          scaleDetection={scaleSuggestion}
          onConfirm={handleScaleSuggestionConfirm}
          onManual={handleScaleSuggestionManual}
          onCancel={() => {
            setShowScaleSuggestion(false);
            setManualScaleMode(true);
          }}
        />
      )}
    </Card>
  );
}

export default ProfileScannerUploader;

