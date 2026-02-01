/**
 * ReportGenerator Component
 * 
 * Phase 4 Implementation - Report Generation UI
 * Generate reports using templates, track job status, and download results.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Real-time status updates
 */

import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
    FileText,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    generateReport,
    getReportJob,
    downloadReport,
    type ReportGenerationRequest,
    type ReportJobResponse,
    type ReportFormat,
    type ReportJobStatus,
} from '@/services/reportGenerationApi';
import {
    listReportTemplates,
    type ReportTemplateResponse,
} from '@/services/reportTemplatesApi';

/**
 * ReportGenerator props
 */
export interface ReportGeneratorProps {
    templateId?: string;  // Optional: pre-select template
    onReportReady?: (jobId: string) => void;
    className?: string;
}

/**
 * ReportGenerator Component
 */
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    templateId: initialTemplateId,
    onReportReady,
    className,
}) => {
    const [templates, setTemplates] = useState<ReportTemplateResponse[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
        initialTemplateId || ''
    );
    const [reportType, setReportType] = useState('');
    const [format, setFormat] = useState<ReportFormat>('pdf');
    const [reportData, setReportData] = useState('{}');
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeJob, setActiveJob] = useState<ReportJobResponse | null>(null);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    /**
     * Load templates
     */
    useEffect(() => {
        const loadTemplates = async () => {
            setIsLoadingTemplates(true);
            try {
                const response = await listReportTemplates(undefined, undefined, 100);
                setTemplates(response.templates);
                if (initialTemplateId) {
                    setSelectedTemplateId(initialTemplateId);
                }
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load templates'
                );
            } finally {
                setIsLoadingTemplates(false);
            }
        };

        loadTemplates();
    }, [initialTemplateId]);

    /**
     * Poll job status
     */
    useEffect(() => {
        if (!activeJob) {
            return;
        }

        if (
            activeJob.status === 'completed' ||
            activeJob.status === 'failed' ||
            activeJob.status === 'canceled'
        ) {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
            return;
        }

        const interval = setInterval(async () => {
            try {
                const job = await getReportJob(activeJob.id);
                setActiveJob(job);

                if (job.status === 'completed') {
                    toast.success('Report generated successfully');
                    onReportReady?.(job.id);
                } else if (job.status === 'failed') {
                    toast.error(
                        job.error_message || 'Report generation failed'
                    );
                }
            } catch (error) {
                console.error('Failed to poll job status:', error);
            }
        }, 2000);  // Poll every 2 seconds

        setPollingInterval(interval);

        return () => {
            clearInterval(interval);
        };
    }, [activeJob, onReportReady, pollingInterval]);

    /**
     * Handle generate
     */
    const handleGenerate = useCallback(async () => {
        if (!reportType.trim()) {
            toast.error('Report type is required');
            return;
        }

        let data: Record<string, any>;
        try {
            data = JSON.parse(reportData);
        } catch {
            toast.error('Invalid JSON in report data');
            return;
        }

        setIsGenerating(true);
        try {
            const request: ReportGenerationRequest = {
                template_id: selectedTemplateId || undefined,
                report_type: reportType.trim(),
                report_data: data,
                format,
            };

            const job = await generateReport(request);
            setActiveJob(job);
            toast.success('Report generation started');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate report'
            );
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTemplateId, reportType, reportData, format]);

    /**
     * Handle download
     */
    const handleDownload = useCallback(async () => {
        if (!activeJob) {
            return;
        }

        try {
            const url = await downloadReport(activeJob.id);
            window.open(url, '_blank');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to download report'
            );
        }
    }, [activeJob]);

    /**
     * Get status icon
     */
    const getStatusIcon = (status: ReportJobStatus) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'processing':
            case 'queued':
                return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            default:
                return <FileText className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Generation Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Generate Report
                    </CardTitle>
                    <CardDescription>
                        Create a new report using a template or custom configuration
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Template Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="report-template">Template (Optional)</Label>
                        <Select
                            value={selectedTemplateId}
                            onValueChange={setSelectedTemplateId}
                            disabled={isLoadingTemplates}
                        >
                            <SelectTrigger id="report-template">
                                <SelectValue placeholder="Select a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">None (Custom)</SelectItem>
                                {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Report Type */}
                    <div className="space-y-2">
                        <Label htmlFor="report-type">Report Type *</Label>
                        <Input
                            id="report-type"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            placeholder="e.g., revenue_summary"
                            required
                        />
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                        <Label htmlFor="report-format">Format *</Label>
                        <Select
                            value={format}
                            onValueChange={(value) =>
                                setFormat(value as ReportFormat)
                            }
                        >
                            <SelectTrigger id="report-format">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="excel">Excel</SelectItem>
                                <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Report Data */}
                    <div className="space-y-2">
                        <Label htmlFor="report-data">Report Data (JSON)</Label>
                        <textarea
                            id="report-data"
                            value={reportData}
                            onChange={(e) => setReportData(e.target.value)}
                            className="w-full rounded-md border p-3 font-mono text-sm"
                            rows={6}
                            placeholder='{"filters": {}, "options": {}}'
                        />
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !reportType.trim()}
                        className="w-full"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Report
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Job Status */}
            {activeJob && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(activeJob.status)}
                            Report Generation Status
                        </CardTitle>
                        <CardDescription>
                            Job ID: {activeJob.id}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Progress */}
                        {(activeJob.status === 'queued' ||
                            activeJob.status === 'processing') && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Status: {activeJob.status}</span>
                                    <span>Processing...</span>
                                </div>
                                <Progress value={undefined} className="h-2" />
                            </div>
                        )}

                        {/* Completed Status */}
                        {activeJob.status === 'completed' && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Report generated successfully
                                    </p>
                                    {activeJob.generation_time_ms && (
                                        <p className="mt-1 text-xs text-green-600 dark:text-green-300">
                                            Generated in{' '}
                                            {(activeJob.generation_time_ms / 1000).toFixed(1)}s
                                        </p>
                                    )}
                                </div>

                                {activeJob.download_url && (
                                    <Button
                                        onClick={handleDownload}
                                        className="w-full"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Report
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Failed Status */}
                        {activeJob.status === 'failed' && (
                            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Generation failed
                                </p>
                                {activeJob.error_message && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                                        {activeJob.error_message}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
