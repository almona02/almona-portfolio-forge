/**
 * YilmazExportPage — Gold-Tier CNC Export Interface
 *
 * @tier Tier 2 (Advisory Presentation)
 * @constitutional_compliance AICS-001 §7 (Presentation layer)
 *
 * Professional production export workflow inspired by LogiKal/Klaes export UX:
 *   1. Machine Selection → 2. Pre-Flight Validation → 3. Export & Download
 *
 * Features:
 * - Machine model selector with specs preview
 * - Pre-flight validation with bilingual error/warning display
 * - Real-time progress indicator
 * - One-click download for G-Code, CSV, and manifest
 * - Constitutional compliance badge
 */

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Separator } from '@/shared/ui/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Play,
  RefreshCw,
  Shield,
  XCircle,
  Cpu,
  Gauge,
  Ruler,
  Clock,
  FileCode,
  Table2,
  FileJson,
  ArrowLeft,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useYilmazExport } from '@/hooks/useYilmazExport';
import { YilmazFileFormats } from '@/services/export/YilmazFileFormats';
import type { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import type { ExportFormat, ValidationIssue } from '@/services/export/YilmazExportPipeline';
import type { ExportFile } from '@/services/export/YilmazFileFormats';

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Severity icon for validation issues */
const SeverityIcon: React.FC<{ severity: ValidationIssue['severity'] }> = ({ severity }) => {
  switch (severity) {
    case 'error':
      return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    case 'info':
      return <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  }
};

/** Single file download card */
const FileCard: React.FC<{
  file: ExportFile | null;
  label: string;
  icon: React.ReactNode;
  onDownload: (file: ExportFile) => void;
}> = ({ file, label, icon, onDownload }) => {
  if (!file) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {file.filename} · {YilmazFileFormats.formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => onDownload(file)}>
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Download
      </Button>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const YilmazExportPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isReady,
    isExporting,
    progress,
    result,
    preFlight,
    error,
    machineModel,
    format,
    setMachineModel,
    setFormat,
    runPreFlight,
    runExport,
    downloadAll,
    downloadFile,
    reset,
    availableModels,
  } = useYilmazExport();

  const [activeStep, setActiveStep] = useState<'configure' | 'validate' | 'export'>('configure');
  const [hasValidated, setHasValidated] = useState(false);

  // Auto-validate when machine model changes
  useEffect(() => {
    setHasValidated(false);
    reset();
  }, [machineModel, reset]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    const result = runPreFlight();
    if (result) {
      setHasValidated(true);
      setActiveStep('validate');
      if (result.valid) {
        toast.success('Pre-flight validation passed', {
          description: `${result.summary.totalCuts} cuts across ${result.summary.totalProfiles} profiles`,
        });
      } else {
        const errorCount = result.issues.filter((i) => i.severity === 'error').length;
        toast.error(`Validation failed: ${errorCount} error(s)`, {
          description: 'Fix errors before exporting',
        });
      }
    }
  }, [runPreFlight]);

  const handleExport = useCallback(async () => {
    setActiveStep('export');
    const exportResult = await runExport();
    if (exportResult?.success) {
      toast.success('Export complete', {
        description: `Checksum: ${exportResult.checksum}`,
      });
    } else {
      toast.error('Export failed', {
        description: error || 'Check validation results',
      });
    }
  }, [runExport, error]);

  const handleDownloadAll = useCallback(() => {
    downloadAll();
    toast.success('Downloading all files…');
  }, [downloadAll]);

  const handleDownloadFile = useCallback(
    (file: ExportFile) => {
      downloadFile(file);
      toast.success(`Downloading ${file.filename}`);
    },
    [downloadFile]
  );

  // ─── Derived State ─────────────────────────────────────────────────────

  const selectedSpecs = availableModels.find((m) => m.model === machineModel)?.specs;
  const errorCount = preFlight?.issues.filter((i) => i.severity === 'error').length ?? 0;
  const warningCount = preFlight?.issues.filter((i) => i.severity === 'warning').length ?? 0;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" />
              Yilmaz CNC Export
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Design → BOM → Optimization → Machine-Ready Files
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Shield className="w-3.5 h-3.5" />
            Constitutional Tier 3
          </Badge>
        </div>

        {/* Not Ready State */}
        {!isReady && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Optimization Data</AlertTitle>
            <AlertDescription>
              Complete the design and optimization workflow first. The export pipeline requires
              a project with optimization results (cutting plans).
            </AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-card border">
          {(['configure', 'validate', 'export'] as const).map((step, idx) => (
            <React.Fragment key={step}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <button
                onClick={() => setActiveStep(step)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeStep === step
                    ? 'bg-primary text-primary-foreground'
                    : step === 'validate' && hasValidated
                      ? preFlight?.valid
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : step === 'export' && result?.success
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
                {step === 'configure' ? 'Machine' : step === 'validate' ? 'Validate' : 'Export'}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Machine Configuration */}
            {activeStep === 'configure' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Cpu className="w-5 h-5" />
                    Machine Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Machine Model Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Yilmaz Machine Model</label>
                    <Select
                      value={machineModel}
                      onValueChange={(v) => setMachineModel(v as YilmazMachineModel)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select machine model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(({ model, specs }) => (
                          <SelectItem key={model} value={model}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model}</span>
                              <span className="text-xs text-muted-foreground">
                                {specs.axes}-axis · {specs.maxCutLength}mm
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Machine Specs Preview */}
                  {selectedSpecs && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <Ruler className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-semibold">{selectedSpecs.maxCutLength}mm</p>
                        <p className="text-xs text-muted-foreground">Max Cut Length</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <Gauge className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-semibold">{selectedSpecs.axes}-axis</p>
                        <p className="text-xs text-muted-foreground">CNC Axes</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <Cpu className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-semibold">±{selectedSpecs.precision}mm</p>
                        <p className="text-xs text-muted-foreground">Precision</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-semibold">{selectedSpecs.maxFeedRate}</p>
                        <p className="text-xs text-muted-foreground">Feed Rate mm/min</p>
                      </div>
                    </div>
                  )}

                  {/* Export Format */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Export Format</label>
                    <Tabs
                      value={format}
                      onValueChange={(v) => setFormat(v as ExportFormat)}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All Files</TabsTrigger>
                        <TabsTrigger value="gcode">G-Code Only</TabsTrigger>
                        <TabsTrigger value="csv">CSV Only</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all" className="mt-3">
                        <p className="text-sm text-muted-foreground">
                          Exports G-Code (.nc), CSV cut list, and JSON manifest with checksums.
                        </p>
                      </TabsContent>
                      <TabsContent value="gcode" className="mt-3">
                        <p className="text-sm text-muted-foreground">
                          Machine-ready G-Code program (.nc) for direct CNC upload.
                        </p>
                      </TabsContent>
                      <TabsContent value="csv" className="mt-3">
                        <p className="text-sm text-muted-foreground">
                          CSV cut list compatible with Yilmaz DC and CNC series software.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Supported Angles */}
                  {selectedSpecs && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Supported Angles</label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSpecs.supportedAngles.map((angle) => (
                          <Badge key={angle} variant="secondary" className="text-xs">
                            {angle}°
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleValidate} disabled={!isReady} size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      Run Pre-Flight Check
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Validation Results */}
            {activeStep === 'validate' && preFlight && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {preFlight.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    Pre-Flight Validation
                    <Badge variant={preFlight.valid ? 'default' : 'destructive'} className="ml-auto">
                      {preFlight.valid ? 'PASSED' : 'FAILED'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{preFlight.summary.totalCuts}</p>
                      <p className="text-xs text-muted-foreground">Total Cuts</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{preFlight.summary.totalProfiles}</p>
                      <p className="text-xs text-muted-foreground">Profiles</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{preFlight.summary.maxCutLength}mm</p>
                      <p className="text-xs text-muted-foreground">Max Cut</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{preFlight.summary.estimatedDuration}</p>
                      <p className="text-xs text-muted-foreground">Est. Duration</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Issues List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      {errorCount > 0 && (
                        <Badge variant="destructive">{errorCount} Error{errorCount > 1 ? 's' : ''}</Badge>
                      )}
                      {warningCount > 0 && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          {warningCount} Warning{warningCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {errorCount === 0 && warningCount === 0 && (
                        <Badge variant="default">All checks passed</Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {preFlight.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 p-2.5 rounded-md text-sm ${
                            issue.severity === 'error'
                              ? 'bg-destructive/10'
                              : issue.severity === 'warning'
                                ? 'bg-amber-500/10'
                                : 'bg-blue-500/10'
                          }`}
                        >
                          <SeverityIcon severity={issue.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-arabic" dir="rtl">
                              {issue.messageAr}
                            </p>
                            {issue.field && (
                              <code className="text-xs text-muted-foreground mt-1 block">
                                {issue.field}
                              </code>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {issue.code}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setActiveStep('configure')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Reconfigure
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleValidate}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-validate
                      </Button>
                      <Button
                        onClick={handleExport}
                        disabled={!preFlight.valid || isExporting}
                        size="lg"
                      >
                        {isExporting ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {isExporting ? 'Exporting…' : 'Export to Yilmaz'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Export Results */}
            {activeStep === 'export' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="w-5 h-5" />
                    Export Results
                    {result?.success && (
                      <Badge variant="default" className="ml-auto bg-green-600">
                        SUCCESS
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{progress.message}</span>
                        <span className="font-medium">{progress.percent}%</span>
                      </div>
                      <Progress value={progress.percent} className="h-2" />
                      <p className="text-xs text-muted-foreground font-arabic" dir="rtl">
                        {progress.messageAr}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {error && !isExporting && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Export Failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success: File Downloads */}
                  {result?.success && (
                    <>
                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            {result.metadata.totalCuts}
                          </p>
                          <p className="text-xs text-muted-foreground">Cuts Exported</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            {result.metadata.gcodeLinesCount}
                          </p>
                          <p className="text-xs text-muted-foreground">G-Code Lines</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            {result.metadata.machineModel}
                          </p>
                          <p className="text-xs text-muted-foreground">Target Machine</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                          <p className="text-sm font-mono font-bold text-green-700 dark:text-green-400">
                            {result.checksum}
                          </p>
                          <p className="text-xs text-muted-foreground">Checksum</p>
                        </div>
                      </div>

                      <Separator />

                      {/* File Cards */}
                      <div className="space-y-2">
                        <FileCard
                          file={result.files.gcode}
                          label="G-Code Program"
                          icon={<FileCode className="w-5 h-5 text-blue-600" />}
                          onDownload={handleDownloadFile}
                        />
                        <FileCard
                          file={result.files.csv}
                          label="CSV Cut List"
                          icon={<Table2 className="w-5 h-5 text-green-600" />}
                          onDownload={handleDownloadFile}
                        />
                        <FileCard
                          file={result.files.manifest}
                          label="Export Manifest"
                          icon={<FileJson className="w-5 h-5 text-amber-600" />}
                          onDownload={handleDownloadFile}
                        />
                      </div>

                      {/* Download All */}
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={reset}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          New Export
                        </Button>
                        <Button onClick={handleDownloadAll} size="lg">
                          <Download className="w-4 h-4 mr-2" />
                          Download All Files
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Waiting state */}
                  {!isExporting && !result && !error && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Run pre-flight validation first, then export.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Info Panel */}
          <div className="space-y-4">
            {/* Machine Info Card */}
            {selectedSpecs && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Selected Machine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center pb-3">
                    <p className="text-2xl font-bold">{machineModel}</p>
                    <p className="text-sm text-muted-foreground">Yilmaz CNC Series</p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Length</span>
                      <span className="font-medium">{selectedSpecs.maxLength}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Width</span>
                      <span className="font-medium">{selectedSpecs.maxWidth}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Cut</span>
                      <span className="font-medium">{selectedSpecs.minCutLength}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spindle Speed</span>
                      <span className="font-medium">{selectedSpecs.maxSpindleSpeed} RPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tool Magazine</span>
                      <span className="font-medium">
                        {selectedSpecs.toolMagazine
                          ? `${selectedSpecs.toolMagazineCapacity} slots`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Angles</span>
                      <span className="font-medium">{selectedSpecs.supportedAngles.length} positions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Constitutional Compliance */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <p className="font-semibold text-sm">Constitutional Compliance</p>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    All exports are generated under <strong>Tier 3 Protected Determinism</strong>.
                    Every G-code program is checksummed and traceable.
                  </p>
                  <p>
                    Accuracy framework: <strong>99.8%</strong>
                  </p>
                  <p className="font-arabic" dir="rtl">
                    جميع الصادرات تخضع للحتمية المحمية من المستوى الثالث. كل برنامج G-code يتم التحقق منه وتتبعه.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/yilmaz-maintenance')}
                >
                  <Gauge className="w-4 h-4 mr-2" />
                  Machine Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/yilmaz-analytics')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YilmazExportPage;
