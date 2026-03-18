/**
 * Email Template Editor
 * 
 * Gold-tier WYSIWYG email template editor with variable substitution,
 * preview, and template management.
 * 
 * Features:
 * - WYSIWYG editor for HTML templates
 * - Variable substitution preview
 * - Template save/load
 * - HTML and text body editing
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <EmailTemplateEditor
 *   templateType="quote"
 *   onSave={(template) => console.log(template)}
 * />
 * ```
 */

import { cn } from '@/lib/utils';
import { getEmailTemplate, type EmailTemplateData } from '@/services/email/emailTemplates';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Textarea } from '@/shared/ui/ui/textarea';
import {
    Eye,
    FileText,
    Mail,
    Save,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface EmailTemplateEditorProps {
  /** Template type */
  templateType: 'quote' | 'invoice' | 'payment_reminder' | 'payment_confirmation';
  /** Initial template data */
  initialTemplate?: Partial<EmailTemplate>;
  /** Save callback */
  onSave?: (template: EmailTemplate) => void;
  /** Additional CSS classes */
  className?: string;
}

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
}

/**
 * Email Template Editor Component
 */
export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  templateType,
  initialTemplate,
  onSave,
  className,
}) => {
  // Load default template if no initial template provided
  const defaultTemplate = getEmailTemplate(templateType, {
    quoteNumber: 'QT-001',
    invoiceNumber: 'INV-001',
    customerName: 'John Doe',
    totalAmount: '1000.00',
    paymentAmount: '1000.00',
    currency: 'USD',
    validUntil: '2026-12-31',
    dueDate: '2026-12-31',
    paymentDate: new Date().toLocaleDateString(),
    daysOverdue: 0,
    transactionId: 'TXN-123',
    quoteLink: '#',
    invoiceLink: '#',
    paymentLink: '#',
  });

  const [subject, setSubject] = useState(initialTemplate?.subject || defaultTemplate.subject);
  const [htmlBody, setHtmlBody] = useState(initialTemplate?.htmlBody || defaultTemplate.htmlBody);
  const [textBody, setTextBody] = useState(initialTemplate?.textBody || defaultTemplate.textBody);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [previewData, setPreviewData] = useState<EmailTemplateData>({
    quoteNumber: 'QT-001',
    invoiceNumber: 'INV-001',
    customerName: 'John Doe',
    totalAmount: '1000.00',
    paymentAmount: '1000.00',
    currency: 'USD',
    validUntil: '2026-12-31',
    dueDate: '2026-12-31',
    paymentDate: new Date().toLocaleDateString(),
    daysOverdue: 0,
    transactionId: 'TXN-123',
    quoteLink: '#',
    invoiceLink: '#',
    paymentLink: '#',
  });

  // Extract variables from template
  const variables = React.useMemo(() => {
    const vars = new Set<string>();
    const regex = /\$\{(\w+)\}/g;
    let match;
    
    // Extract from subject
    while ((match = regex.exec(subject)) !== null) {
      vars.add(match[1]);
    }
    
    // Extract from HTML body
    while ((match = regex.exec(htmlBody)) !== null) {
      vars.add(match[1]);
    }
    
    // Extract from text body
    while ((match = regex.exec(textBody)) !== null) {
      vars.add(match[1]);
    }
    
    return Array.from(vars);
  }, [subject, htmlBody, textBody]);

  // Generate preview
  const previewTemplate = React.useMemo(() => {
    let previewSubject = subject;
    let previewHtml = htmlBody;
    let previewText = textBody;

    // Replace variables with preview data
    variables.forEach(variable => {
      const raw = (previewData as Record<string, unknown>)[variable];
      const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : `[${variable}]`;
      const regex = new RegExp(`\\$\\{${variable}\\}`, 'g');
      previewSubject = previewSubject.replace(regex, String(value));
      previewHtml = previewHtml.replace(regex, String(value));
      previewText = previewText.replace(regex, String(value));
    });

    return {
      subject: previewSubject,
      htmlBody: previewHtml,
      textBody: previewText,
    };
  }, [subject, htmlBody, textBody, previewData, variables]);

  const handleSave = () => {
    const template: EmailTemplate = {
      subject,
      htmlBody,
      textBody,
      variables,
    };

    onSave?.(template);
    toast.success('Template saved successfully');
  };

  const templateTypeLabel = {
    quote: 'Quote',
    invoice: 'Invoice',
    payment_reminder: 'Payment Reminder',
    payment_confirmation: 'Payment Confirmation',
  }[templateType];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {templateTypeLabel} Email Template
              </CardTitle>
              <CardDescription className="text-sm text-amber-600/70 mt-1">
                Edit email template with variable substitution
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardHeader>
              <CardTitle className="text-base text-amber-200">Template Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div>
                <Label className="text-sm text-amber-300/70">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                  placeholder="Email subject with ${variables}"
                />
              </div>

              {/* HTML Body */}
              <div>
                <Label className="text-sm text-amber-300/70">HTML Body</Label>
                <Textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={12}
                  className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 font-mono text-sm"
                  placeholder="HTML email body with ${variables}"
                />
              </div>

              {/* Text Body */}
              <div>
                <Label className="text-sm text-amber-300/70">Text Body</Label>
                <Textarea
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  rows={8}
                  className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 font-mono text-sm"
                  placeholder="Plain text email body with ${variables}"
                />
              </div>

              {/* Variables */}
              {variables.length > 0 && (
                <div>
                  <Label className="text-sm text-amber-300/70">Available Variables</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variables.map(variable => (
                      <code
                        key={variable}
                        className="px-2 py-1 bg-amber-600/20 text-amber-300 rounded text-xs font-mono"
                      >
                        $&#123;{variable}&#125;
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-200">Preview</CardTitle>
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'html' | 'text')}>
                  <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 h-8">
                    <TabsTrigger value="html" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
                      <Eye className="w-3 h-3 mr-1" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger value="text" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
                      <FileText className="w-3 h-3 mr-1" />
                      Text
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Preview Data Editor */}
                <div>
                  <Label className="text-sm text-amber-300/70">Preview Data</Label>
                  <div className="mt-2 space-y-2">
                    {variables.map(variable => (
                      <div key={variable} className="flex items-center gap-2">
                        <Label className="text-xs text-amber-600/70 w-24">{variable}:</Label>
                        <Input
                          value={(() => {
                          const raw = (previewData as Record<string, unknown>)[variable];
                          return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
                        })()}
                          onChange={(e) => setPreviewData({ ...previewData, [variable]: e.target.value } as EmailTemplateData)}
                          className="flex-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs"
                          placeholder={`${variable} value`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Display */}
                <div>
                  <Label className="text-sm text-amber-300/70">Subject</Label>
                  <div className="mt-1 p-2 bg-[#0f0f0f]/60 border border-amber-600/30 rounded text-amber-200 text-sm">
                    {previewTemplate.subject}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-amber-300/70">Body</Label>
                  <div className="mt-1 p-4 bg-[#0f0f0f]/60 border border-amber-600/30 rounded max-h-96 overflow-y-auto">
                    {previewMode === 'html' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: previewTemplate.htmlBody }}
                        className="prose prose-invert max-w-none"
                        style={{ color: '#e5e7eb' }}
                      />
                    ) : (
                      <pre className="text-xs text-amber-300/70 whitespace-pre-wrap font-mono">
                        {previewTemplate.textBody}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

