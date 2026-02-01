/**
 * Email Templates
 * 
 * Gold-tier email template definitions for commercial communications.
 * Provides template rendering with variable substitution.
 * 
 * Templates:
 * - Quote email
 * - Invoice email
 * - Payment reminder
 * - Payment confirmation
 */

/**
 * Email template data
 */
export interface EmailTemplateData {
  [key: string]: any;
}

/**
 * Email template
 */
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
}

/**
 * Quote email template
 */
export const getQuoteEmailTemplate = (data: EmailTemplateData): EmailTemplate => {
  const quoteNumber = data.quoteNumber || 'N/A';
  const customerName = data.customerName || 'Valued Customer';
  const totalAmount = data.totalAmount || '0.00';
  const currency = data.currency || 'USD';
  const validUntil = data.validUntil || 'N/A';
  const quoteLink = data.quoteLink || '#';

  return {
    subject: `Quote #${quoteNumber} - ${customerName}`,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote #${quoteNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">ALMONA Portfolio Forge</h1>
    <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 14px;">Professional Quote</p>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #0f172a; margin-top: 0;">Quote #${quoteNumber}</h2>
    <p>Dear ${customerName},</p>
    <p>Thank you for your interest in our services. We are pleased to provide you with the following quote:</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">Total Amount: ${currency} ${totalAmount}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Valid until: ${validUntil}</p>
    </div>
    <p>You can view the complete quote details by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${quoteLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Quote</a>
    </div>
    <p>If you have any questions or would like to discuss this quote, please don't hesitate to contact us.</p>
    <p>Best regards,<br>ALMONA Portfolio Forge Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
    <p>This is an automated email. Please do not reply directly to this message.</p>
  </div>
</body>
</html>
    `,
    textBody: `
Quote #${quoteNumber}

Dear ${customerName},

Thank you for your interest in our services. We are pleased to provide you with the following quote:

Total Amount: ${currency} ${totalAmount}
Valid until: ${validUntil}

View the complete quote: ${quoteLink}

If you have any questions or would like to discuss this quote, please don't hesitate to contact us.

Best regards,
ALMONA Portfolio Forge Team
    `,
    variables: ['quoteNumber', 'customerName', 'totalAmount', 'currency', 'validUntil', 'quoteLink'],
  };
};

/**
 * Invoice email template
 */
export const getInvoiceEmailTemplate = (data: EmailTemplateData): EmailTemplate => {
  const invoiceNumber = data.invoiceNumber || 'N/A';
  const customerName = data.customerName || 'Valued Customer';
  const totalAmount = data.totalAmount || '0.00';
  const currency = data.currency || 'USD';
  const dueDate = data.dueDate || 'N/A';
  const invoiceLink = data.invoiceLink || '#';
  const paymentLink = data.paymentLink || '#';

  return {
    subject: `Invoice #${invoiceNumber} - Payment Due`,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">ALMONA Portfolio Forge</h1>
    <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 14px;">Invoice for Payment</p>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #0f172a; margin-top: 0;">Invoice #${invoiceNumber}</h2>
    <p>Dear ${customerName},</p>
    <p>Please find attached your invoice for the following amount:</p>
    <div style="background: #fef3c7; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">Amount Due: ${currency} ${totalAmount}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Due Date: ${dueDate}</p>
    </div>
    <p>You can view and pay this invoice online:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 10px;">Pay Now</a>
      <a href="${invoiceLink}" style="display: inline-block; background: #64748b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Invoice</a>
    </div>
    <p>If you have already paid, please disregard this email.</p>
    <p>Best regards,<br>ALMONA Portfolio Forge Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
    <p>This is an automated email. Please do not reply directly to this message.</p>
  </div>
</body>
</html>
    `,
    textBody: `
Invoice #${invoiceNumber}

Dear ${customerName},

Please find attached your invoice for the following amount:

Amount Due: ${currency} ${totalAmount}
Due Date: ${dueDate}

Pay online: ${paymentLink}
View invoice: ${invoiceLink}

If you have already paid, please disregard this email.

Best regards,
ALMONA Portfolio Forge Team
    `,
    variables: ['invoiceNumber', 'customerName', 'totalAmount', 'currency', 'dueDate', 'invoiceLink', 'paymentLink'],
  };
};

/**
 * Payment reminder template
 */
export const getPaymentReminderTemplate = (data: EmailTemplateData): EmailTemplate => {
  const invoiceNumber = data.invoiceNumber || 'N/A';
  const customerName = data.customerName || 'Valued Customer';
  const totalAmount = data.totalAmount || '0.00';
  const currency = data.currency || 'USD';
  const daysOverdue = data.daysOverdue || 0;
  const paymentLink = data.paymentLink || '#';

  return {
    subject: `Payment Reminder - Invoice #${invoiceNumber}`,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #0f172a; margin-top: 0;">Invoice #${invoiceNumber}</h2>
    <p>Dear ${customerName},</p>
    <p>This is a friendly reminder that your invoice is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'due soon'}.</p>
    <div style="background: #fee2e2; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">Amount Due: ${currency} ${totalAmount}</p>
    </div>
    <p>Please make payment at your earliest convenience:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentLink}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Pay Now</a>
    </div>
    <p>If you have already paid, please disregard this email.</p>
    <p>Best regards,<br>ALMONA Portfolio Forge Team</p>
  </div>
</body>
</html>
    `,
    textBody: `
Payment Reminder - Invoice #${invoiceNumber}

Dear ${customerName},

This is a friendly reminder that your invoice is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'due soon'}.

Amount Due: ${currency} ${totalAmount}

Pay online: ${paymentLink}

If you have already paid, please disregard this email.

Best regards,
ALMONA Portfolio Forge Team
    `,
    variables: ['invoiceNumber', 'customerName', 'totalAmount', 'currency', 'daysOverdue', 'paymentLink'],
  };
};

/**
 * Payment confirmation template
 */
export const getPaymentConfirmationTemplate = (data: EmailTemplateData): EmailTemplate => {
  const invoiceNumber = data.invoiceNumber || 'N/A';
  const customerName = data.customerName || 'Valued Customer';
  const paymentAmount = data.paymentAmount || '0.00';
  const currency = data.currency || 'USD';
  const transactionId = data.transactionId || 'N/A';
  const paymentDate = data.paymentDate || new Date().toLocaleDateString();

  return {
    subject: `Payment Confirmation - Invoice #${invoiceNumber}`,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Received</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #0f172a; margin-top: 0;">Payment Confirmation</h2>
    <p>Dear ${customerName},</p>
    <p>Thank you for your payment. We have successfully received the following amount:</p>
    <div style="background: #d1fae5; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #059669;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">Payment Amount: ${currency} ${paymentAmount}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Transaction ID: ${transactionId}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Payment Date: ${paymentDate}</p>
    </div>
    <p>This payment has been applied to Invoice #${invoiceNumber}.</p>
    <p>Thank you for your business!</p>
    <p>Best regards,<br>ALMONA Portfolio Forge Team</p>
  </div>
</body>
</html>
    `,
    textBody: `
Payment Confirmation

Dear ${customerName},

Thank you for your payment. We have successfully received the following amount:

Payment Amount: ${currency} ${paymentAmount}
Transaction ID: ${transactionId}
Payment Date: ${paymentDate}

This payment has been applied to Invoice #${invoiceNumber}.

Thank you for your business!

Best regards,
ALMONA Portfolio Forge Team
    `,
    variables: ['invoiceNumber', 'customerName', 'paymentAmount', 'currency', 'transactionId', 'paymentDate'],
  };
};

/**
 * Get email template by type
 */
export const getEmailTemplate = (
  type: 'quote' | 'invoice' | 'payment_reminder' | 'payment_confirmation',
  data: EmailTemplateData
): EmailTemplate => {
  switch (type) {
    case 'quote':
      return getQuoteEmailTemplate(data);
    case 'invoice':
      return getInvoiceEmailTemplate(data);
    case 'payment_reminder':
      return getPaymentReminderTemplate(data);
    case 'payment_confirmation':
      return getPaymentConfirmationTemplate(data);
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
};

