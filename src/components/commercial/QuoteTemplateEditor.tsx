/**
 * QuoteTemplateEditor Component
 * 
 * Commercial Page Enhancement - Quote Template Creation/Editing
 * Create and edit quote document templates with layout configuration.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Switch } from '@/shared/ui/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    FileText,
    Save,
    X,
    Loader2,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    createQuoteTemplate,
    updateQuoteTemplate,
    getQuoteTemplate,
    type QuoteTemplateResponse,
    type QuoteTemplateCategory,
    type QuoteTemplateCreateRequest,
    type QuoteTemplateUpdateRequest,
} from '@/services/quoteTemplatesApi';

/**
 * Template configuration structure
 */
export interface QuoteTemplateConfig {
  header: {
    logo_position: 'left' | 'center' | 'right';
    company_info: boolean;
    show_date: boolean;
  };
  body: {
    sections: string[];
    item_columns: string[];
    show_taxes: boolean;
    show_discounts: boolean;
  };
  footer: {
    notes: string;
    terms_conditions: string;
    payment_terms: boolean;
  };
  styling: {
    primary_color: string;
    font_family: string;
    show_borders: boolean;
  };
}

/**
 * QuoteTemplateEditor props
 */
export interface QuoteTemplateEditorProps {
    templateId?: string;  // If provided, edit mode
    onSave?: (template: QuoteTemplateResponse) => void;
    onCancel?: () => void;
    className?: string;
}

/**
 * QuoteTemplateEditor Component
 */
export const QuoteTemplateEditor: React.FC<QuoteTemplateEditorProps> = ({
    templateId,
    onSave,
    onCancel,
    className,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<QuoteTemplateCategory>('custom');
    const [isPublic, setIsPublic] = useState(false);
    const [isDefault, setIsDefault] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Template configuration state
    const [config, setConfig] = useState<QuoteTemplateConfig>({
        header: {
            logo_position: 'left',
            company_info: true,
            show_date: true,
        },
        body: {
            sections: ['customer_info', 'items', 'summary'],
            item_columns: ['description', 'quantity', 'price', 'total'],
            show_taxes: true,
            show_discounts: true,
        },
        footer: {
            notes: '',
            terms_conditions: '',
            payment_terms: true,
        },
        styling: {
            primary_color: '#1a1a1a',
            font_family: 'Inter',
            show_borders: true,
        },
    });

    /**
     * Load template if editing
     */
    useEffect(() => {
        if (!templateId) return;

        const loadTemplate = async () => {
            setIsLoading(true);
            try {
                const template = await getQuoteTemplate(templateId);
                setName(template.name);
                setDescription(template.description || '');
                setCategory(template.category);
                setIsPublic(template.is_public);
                setIsDefault(template.is_default);
                
                if (template.template_config && typeof template.template_config === 'object') {
                    setConfig(template.template_config as QuoteTemplateConfig);
                }
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
     * Handle save
     */
    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            toast.error('Template name is required');
            return;
        }

        setIsSaving(true);
        try {
            const request: QuoteTemplateCreateRequest | QuoteTemplateUpdateRequest = {
                name: name.trim(),
                description: description.trim() || undefined,
                category,
                template_config: config,
                is_public: isPublic,
                is_default: isDefault,
            };

            let result: QuoteTemplateResponse;
            if (templateId) {
                result = await updateQuoteTemplate(templateId, request);
                toast.success('Template updated successfully');
            } else {
                result = await createQuoteTemplate(request);
                toast.success('Template created successfully');
            }

            onSave?.(result);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : `Failed to ${templateId ? 'update' : 'create'} template`
            );
        } finally {
            setIsSaving(false);
        }
    }, [name, description, category, config, isPublic, isDefault, templateId, onSave]);

    if (isLoading) {
        return (
            <Card className={cn(className)}>
                <CardContent className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn(className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {templateId ? 'Edit Quote Template' : 'Create Quote Template'}
                </CardTitle>
                <CardDescription>
                    Configure the layout and styling for quote documents
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Template Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Standard Quote Template"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={category}
                                    onValueChange={(value) => setCategory(value as QuoteTemplateCategory)}
                                >
                                    <SelectTrigger id="category" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                        <SelectItem value="regional">Regional</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="isPublic"
                                    checked={isPublic}
                                    onCheckedChange={setIsPublic}
                                />
                                <Label htmlFor="isPublic">Public Template</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="isDefault"
                                    checked={isDefault}
                                    onCheckedChange={setIsDefault}
                                />
                                <Label htmlFor="isDefault">Set as Default</Label>
                            </div>
                        </div>
                    </div>

                    {/* Template Configuration */}
                    <Tabs defaultValue="header" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="header">Header</TabsTrigger>
                            <TabsTrigger value="body">Body</TabsTrigger>
                            <TabsTrigger value="footer">Footer</TabsTrigger>
                            <TabsTrigger value="styling">Styling</TabsTrigger>
                        </TabsList>

                        {/* Header Configuration */}
                        <TabsContent value="header" className="space-y-4 mt-4">
                            <div>
                                <Label>Logo Position</Label>
                                <Select
                                    value={config.header.logo_position}
                                    onValueChange={(value) =>
                                        setConfig({
                                            ...config,
                                            header: {
                                                ...config.header,
                                                logo_position: value as 'left' | 'center' | 'right',
                                            },
                                        })
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="companyInfo"
                                    checked={config.header.company_info}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            header: {
                                                ...config.header,
                                                company_info: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="companyInfo">Show Company Info</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="showDate"
                                    checked={config.header.show_date}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            header: {
                                                ...config.header,
                                                show_date: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="showDate">Show Date</Label>
                            </div>
                        </TabsContent>

                        {/* Body Configuration */}
                        <TabsContent value="body" className="space-y-4 mt-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="showTaxes"
                                    checked={config.body.show_taxes}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            body: {
                                                ...config.body,
                                                show_taxes: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="showTaxes">Show Taxes</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="showDiscounts"
                                    checked={config.body.show_discounts}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            body: {
                                                ...config.body,
                                                show_discounts: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="showDiscounts">Show Discounts</Label>
                            </div>
                        </TabsContent>

                        {/* Footer Configuration */}
                        <TabsContent value="footer" className="space-y-4 mt-4">
                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={config.footer.notes}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            footer: {
                                                ...config.footer,
                                                notes: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="Default notes text"
                                    rows={3}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="terms">Terms & Conditions</Label>
                                <Textarea
                                    id="terms"
                                    value={config.footer.terms_conditions}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            footer: {
                                                ...config.footer,
                                                terms_conditions: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="Default terms and conditions"
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="paymentTerms"
                                    checked={config.footer.payment_terms}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            footer: {
                                                ...config.footer,
                                                payment_terms: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="paymentTerms">Show Payment Terms</Label>
                            </div>
                        </TabsContent>

                        {/* Styling Configuration */}
                        <TabsContent value="styling" className="space-y-4 mt-4">
                            <div>
                                <Label htmlFor="primaryColor">Primary Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id="primaryColor"
                                        type="color"
                                        value={config.styling.primary_color}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                styling: {
                                                    ...config.styling,
                                                    primary_color: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-20 h-10"
                                    />
                                    <Input
                                        value={config.styling.primary_color}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                styling: {
                                                    ...config.styling,
                                                    primary_color: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="#1a1a1a"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="fontFamily">Font Family</Label>
                                <Select
                                    value={config.styling.font_family}
                                    onValueChange={(value) =>
                                        setConfig({
                                            ...config,
                                            styling: {
                                                ...config.styling,
                                                font_family: value,
                                            },
                                        })
                                    }
                                >
                                    <SelectTrigger id="fontFamily" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Inter">Inter</SelectItem>
                                        <SelectItem value="Roboto">Roboto</SelectItem>
                                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                                        <SelectItem value="Arial">Arial</SelectItem>
                                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="showBorders"
                                    checked={config.styling.show_borders}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            styling: {
                                                ...config.styling,
                                                show_borders: checked,
                                            },
                                        })
                                    }
                                />
                                <Label htmlFor="showBorders">Show Borders</Label>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        {onCancel && (
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSaving}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {templateId ? 'Update Template' : 'Create Template'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
