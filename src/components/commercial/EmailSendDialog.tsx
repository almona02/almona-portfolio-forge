/**
 * Email Send Dialog Component
 * 
 * Gold-tier dialog component for sending quotes/invoices via email.
 * Provides email composition, template preview, and send functionality.
 * 
 * Features:
 * - Email composition form
 * - Template preview
 * - Recipient management (to, cc, bcc)
 * - Send functionality
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <EmailSendDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   type="quote"
 *   templateData={quoteData}
 *   onSent={() => console.log('Email sent')}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { EmailService } from '@/services/email/EmailService';
import { getEmailTemplate } from '@/services/email/emailTemplates';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  Mail,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailSendDialogProps {
  /** Dialog open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Email type */
  type: 'quote' | 'invoice' | 'payment_reminder' | 'payment_confirmation';
  /** Template data */
  templateData: Record<string, any>;
  /** Default recipient email */
  defaultTo?: string;
  /** Sent callback */
  onSent?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Email Send Dialog Component
 */
export const EmailSendDialog: React.FC<EmailSendDialogProps> = ({
  isOpen,
  onClose,
  type,
  templateData,
  defaultTo,
  onSent,
  className,
}) => {
  const [to, setTo] = useState<string>(defaultTo || '');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Load template when dialog opens
  useEffect(() => {
    if (isOpen && templateData) {
      const template = getEmailTemplate(type, templateData);
      setSubject(template.subject);
      
      // Set default recipient from template data if available
      if (!defaultTo && templateData.customerEmail) {
        setTo(templateData.customerEmail);
      }
    }
  }, [isOpen, type, templateData, defaultTo]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }

    setSending(true);
    try {
      const result = await EmailService.sendEmail({
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
        bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
        template: type,
        templateData: {
          ...templateData,
          customMessage: customMessage || undefined,
        },
        subject,
      });

      if (result.success) {
        toast.success('Email sent successfully');
        onSent?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const template = getEmailTemplate(type, templateData);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0f0f0f]/95 border-amber-600/30', className)}>
        <DialogHeader>
          <DialogTitle className="text-xl text-amber-200 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send {type === 'quote' ? 'Quote' : type === 'invoice' ? 'Invoice' : 'Email'}
          </DialogTitle>
          <DialogDescription className="text-sm text-amber-600/70">
            Send {type === 'quote' ? 'quote' : type === 'invoice' ? 'invoice' : 'email'} via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Recipients */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="to" className="text-amber-300/70 text-sm">
                To <span className="text-red-400">*</span>
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
                disabled={sending}
              />
              <p className="text-xs text-amber-600/50 mt-1">
                Separate multiple emails with commas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cc" className="text-amber-300/70 text-sm">
                  CC
                </Label>
                <Input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
                  disabled={sending}
                />
              </div>

              <div>
                <Label htmlFor="bcc" className="text-amber-300/70 text-sm">
                  BCC
                </Label>
                <Input
                  id="bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
                  disabled={sending}
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject" className="text-amber-300/70 text-sm">
              Subject <span className="text-red-400">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              disabled={sending}
            />
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="customMessage" className="text-amber-300/70 text-sm">
              Custom Message (Optional)
            </Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to the email..."
              rows={3}
              className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
              disabled={sending}
            />
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-amber-300/70 text-sm">Preview</Label>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'html' | 'text')}>
                <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 h-8">
                  <TabsTrigger value="html" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
                    Text
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="bg-[#0f0f0f]/60 border border-amber-600/30 rounded-md p-4 max-h-64 overflow-y-auto">
              {previewMode === 'html' ? (
                <div
                  dangerouslySetInnerHTML={{ __html: template.htmlBody }}
                  className="prose prose-invert max-w-none"
                  style={{
                    color: '#e5e7eb',
                  }}
                />
              ) : (
                <pre className="text-xs text-amber-300/70 whitespace-pre-wrap font-mono">
                  {template.textBody}
                </pre>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-amber-600/20">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !to.trim() || !subject.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

