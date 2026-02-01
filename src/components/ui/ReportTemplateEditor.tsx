/**
 * ReportTemplateEditor Component
 * 
 * Phase 4 Implementation - Report Template Creation/Editing
 * Create and edit report templates with schema editing, category selection,
 * and template metadata management.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Form validation and error handling
 */

import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Switch } from '@/shared/ui/ui/switch';
import {
    FileText,
    Save,
    X,
    Loader2,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    createReportTemplate,
    updateReportTemplate,
    getReportTemplate,
    type ReportTemplateResponse,
    type ReportTemplateCategory,
    type ReportTemplateCreateRequest,
    type ReportTemplateUpdateRequest,
} from '@/services/reportTemplatesApi';

/**
 * ReportTemplateEditor props
 */
export interface ReportTemplateEditorProps {
    templateId?: string;  // If provided, edit mode
    onSave?: (template: ReportTemplateResponse) => void;
    onCancel?: () => void;
    className?: string;
}

/**
 * ReportTemplateEditor Component
 */
export const ReportTemplateEditor: React.FC<ReportTemplateEditorProps> = ({
    templateId,
    onSave,
    onCancel,
    className,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ReportTemplateCategory>('custom');
    const [templateSchema, setTemplateSchema] = useState('{}');
    const [isPublic, setIsPublic] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);

    /**
     * Load template if in edit mode
     */
    useEffect(() => {
        if (!templateId) {
            return;
        }

        const loadTemplate = async () => {
            setIsLoading(true);
            try {
                const template = await getReportTemplate(templateId);
                setName(template.name);
                setDescription(template.description || '');
                setCategory(template.category);
                setTemplateSchema(JSON.stringify(template.template_schema, null, 2));
                setIsPublic(template.is_public);
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load template'
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadTemplate();
    }, [templateId]);

    /**
     * Validate JSON schema
     */
    const validateSchema = useCallback((schemaText: string): boolean => {
        try {
            JSON.parse(schemaText);
            setSchemaError(null);
            return true;
        } catch (error) {
            setSchemaError(
                error instanceof Error ? error.message : 'Invalid JSON'
            );
            return false;
        }
    }, []);

    /**
     * Handle schema change
     */
    const handleSchemaChange = useCallback(
        (value: string) => {
            setTemplateSchema(value);
            validateSchema(value);
        },
        [validateSchema]
    );

    /**
     * Handle save
     */
    const handleSave = useCallback(async () => {
        // Validate schema
        if (!validateSchema(templateSchema)) {
            toast.error('Please fix JSON schema errors');
            return;
        }

        if (!name.trim()) {
            toast.error('Template name is required');
            return;
        }

        setIsSaving(true);
        try {
            const schema = JSON.parse(templateSchema);

            if (templateId) {
                // Update existing template
                const updateRequest: ReportTemplateUpdateRequest = {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    category,
                    template_schema: schema,
                    is_public: isPublic,
                };

                const updated = await updateReportTemplate(
                    templateId,
                    updateRequest
                );
                toast.success('Template updated successfully');
                onSave?.(updated);
            } else {
                // Create new template
                const createRequest: ReportTemplateCreateRequest = {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    category,
                    template_schema: schema,
                    is_public: isPublic,
                };

                const created = await createReportTemplate(createRequest);
                toast.success('Template created successfully');
                onSave?.(created);
            }
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to save template'
            );
        } finally {
            setIsSaving(false);
        }
    }, [
        templateId,
        name,
        description,
        category,
        templateSchema,
        isPublic,
        validateSchema,
        onSave,
    ]);

    if (isLoading) {
        return (
            <Card className={cn('w-full', className)}>
                <CardContent className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {templateId ? 'Edit Report Template' : 'Create Report Template'}
                </CardTitle>
                <CardDescription>
                    {templateId
                        ? 'Update template metadata and schema'
                        : 'Create a new report template with custom schema'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                        id="template-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Monthly Revenue Report"
                        required
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                        id="template-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this template generates..."
                        rows={3}
                    />
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label htmlFor="template-category">Category *</Label>
                    <Select
                        value={category}
                        onValueChange={(value) =>
                            setCategory(value as ReportTemplateCategory)
                        }
                    >
                        <SelectTrigger id="template-category">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="conversion">Conversion</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="profitability">
                                Profitability
                            </SelectItem>
                            <SelectItem value="pipeline">Pipeline</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Public/Private */}
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label htmlFor="template-public">Public Template</Label>
                        <p className="text-sm text-muted-foreground">
                            Allow other users to use this template
                        </p>
                    </div>
                    <Switch
                        id="template-public"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                    />
                </div>

                {/* Template Schema */}
                <div className="space-y-2">
                    <Label htmlFor="template-schema">Template Schema (JSON) *</Label>
                    <ScrollArea className="h-64 w-full rounded-md border">
                        <textarea
                            id="template-schema"
                            value={templateSchema}
                            onChange={(e) => handleSchemaChange(e.target.value)}
                            className="w-full p-4 font-mono text-sm focus:outline-none"
                            placeholder='{"sections": [], "fields": []}'
                        />
                    </ScrollArea>
                    {schemaError && (
                        <p className="text-sm text-destructive">{schemaError}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {templateId ? 'Update' : 'Create'} Template
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
