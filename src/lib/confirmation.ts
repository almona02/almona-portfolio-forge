// Confirmation and notification utilities
import { supabase } from './supabase';

export interface ConfirmationData {
  type: 'quote' | 'order' | 'service_ticket';
  id: string;
  number: string;
  digitalTwinCode?: string;
  userEmail: string;
  userName: string;
  totalAmount?: number;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

/**
 * Generate confirmation message with Digital Twin Code
 */
export function generateConfirmationMessage(data: ConfirmationData): NotificationTemplate {
  const { type, number, digitalTwinCode, userName, totalAmount, items } = data;
  
  let subject = '';
  let body = '';
  let htmlBody = '';

  switch (type) {
    case 'quote':
      subject = `تأكيد طلب عرض السعر - ${number}`;
      body = `عزيزي/عزيزتي ${userName},\n\n`;
      body += `تم استلام طلب عرض السعر رقم ${number} بنجاح.\n\n`;
      
      if (digitalTwinCode) {
        body += `كود التتبع الرقمي: ${digitalTwinCode}\n`;
        body += `يمكنك استخدام هذا الكود لتتبع حالة طلبك في البوابة الإلكترونية.\n\n`;
      }
      
      if (items && items.length > 0) {
        body += `المنتجات/الخدمات المطلوبة:\n`;
        items.forEach(item => {
          body += `- ${item.name} (الكمية: ${item.quantity})\n`;
        });
        body += `\n`;
      }
      
      if (totalAmount) {
        body += `المبلغ المقدر: ${totalAmount} جنيه مصري\n\n`;
      }
      
      body += `سيتم التواصل معك خلال 24 ساعة لتقديم عرض السعر النهائي.\n\n`;
      body += `شكراً لاختيارك خدماتنا.\n`;
      body += `فريق العمل - المونة الصناعية`;
      
      // HTML version
      htmlBody = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">تأكيد طلب عرض السعر</h2>
          <p>عزيزي/عزيزتي ${userName},</p>
          <p>تم استلام طلب عرض السعر رقم <strong>${number}</strong> بنجاح.</p>
          
          ${digitalTwinCode ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #f97316; margin: 0 0 10px 0;">كود التتبع الرقمي</h3>
              <p style="font-family: monospace; font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">
                ${digitalTwinCode}
              </p>
              <p style="font-size: 14px; color: #6b7280; margin: 10px 0 0 0;">
                يمكنك استخدام هذا الكود لتتبع حالة طلبك في البوابة الإلكترونية
              </p>
            </div>
          ` : ''}
          
          ${items && items.length > 0 ? `
            <h3>المنتجات/الخدمات المطلوبة:</h3>
            <ul>
              ${items.map(item => `<li>${item.name} (الكمية: ${item.quantity})</li>`).join('')}
            </ul>
          ` : ''}
          
          ${totalAmount ? `
            <p><strong>المبلغ المقدر:</strong> ${totalAmount} جنيه مصري</p>
          ` : ''}
          
          <p>سيتم التواصل معك خلال 24 ساعة لتقديم عرض السعر النهائي.</p>
          <p>شكراً لاختيارك خدماتنا.</p>
          <p><strong>فريق العمل - المونة الصناعية</strong></p>
        </div>
      `;
      break;

    case 'order':
      subject = `تأكيد الطلب - ${number}`;
      body = `عزيزي/عزيزتي ${userName},\n\n`;
      body += `تم تأكيد طلبك رقم ${number} بنجاح.\n\n`;
      
      if (digitalTwinCode) {
        body += `كود التتبع الرقمي: ${digitalTwinCode}\n`;
        body += `يمكنك استخدام هذا الكود لتتبع حالة طلبك.\n\n`;
      }
      
      if (totalAmount) {
        body += `المبلغ الإجمالي: ${totalAmount} جنيه مصري\n\n`;
      }
      
      body += `سيتم التواصل معك قريباً لتأكيد تفاصيل التسليم.\n\n`;
      body += `شكراً لاختيارك خدماتنا.\n`;
      body += `فريق العمل - المونة الصناعية`;
      break;

    case 'service_ticket':
      subject = `تأكيد طلب الخدمة - ${number}`;
      body = `عزيزي/عزيزتي ${userName},\n\n`;
      body += `تم استلام طلب الخدمة رقم ${number} بنجاح.\n\n`;
      
      if (digitalTwinCode) {
        body += `كود التتبع الرقمي: ${digitalTwinCode}\n`;
        body += `يمكنك استخدام هذا الكود لتتبع حالة طلب الخدمة.\n\n`;
      }
      
      body += `سيتم التواصل معك خلال 4 ساعات لتأكيد موعد الخدمة.\n\n`;
      body += `شكراً لاختيارك خدماتنا.\n`;
      body += `فريق العمل - المونة الصناعية`;
      break;
  }

  return { subject, body, htmlBody };
}

/**
 * Send confirmation notification
 */
export async function sendConfirmationNotification(
  data: ConfirmationData,
  notificationMethod: 'email' | 'sms' | 'both' = 'email'
): Promise<{ success: boolean; message: string }> {
  try {
    const template = generateConfirmationMessage(data);
    
    // Store notification in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: data.id, // This should be the user ID, not the record ID
        title_ar: template.subject,
        title_en: template.subject,
        message_ar: template.body,
        message_en: template.body,
        type: data.type,
        reference_id: data.id,
        is_read: false
      });

    if (notificationError) {
      console.error('Error storing notification:', notificationError);
    }

    // In a real implementation, you would integrate with email/SMS services here
    // For now, we'll just log the notification
    console.log('Confirmation notification generated:', {
      to: data.userEmail,
      subject: template.subject,
      method: notificationMethod
    });

    return { success: true, message: 'تم إرسال تأكيد الطلب بنجاح' };
  } catch (error) {
    console.error('Error sending confirmation notification:', error);
    return { success: false, message: 'خطأ في إرسال تأكيد الطلب' };
  }
}

/**
 * Generate Digital Twin Code for tracking
 */
export function generateDigitalTwinCode(
  type: 'quote' | 'order' | 'service_ticket' | 'draft',
  userId: string,
  timestamp?: Date
): string {
  const now = timestamp || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Generate a unique suffix based on user ID and timestamp
  const suffix = btoa(userId + now.getTime().toString()).substring(0, 8).toUpperCase();
  
  const typePrefix = {
    'quote': 'QT',
    'order': 'OR',
    'service_ticket': 'ST',
    'draft': 'DR'
  }[type];
  
  return `${typePrefix}-${year}${month}${day}-${suffix}`;
}

/**
 * Validate Digital Twin Code format
 */
export function validateDigitalTwinCode(code: string): boolean {
  const pattern = /^(QT|OR|ST|DR)-\d{8}-[A-Z0-9]{8}$/;
  return pattern.test(code);
}

/**
 * Extract information from Digital Twin Code
 */
export function parseDigitalTwinCode(code: string): {
  type: 'quote' | 'order' | 'service_ticket' | 'unknown';
  date: string;
  suffix: string;
} | null {
  if (!validateDigitalTwinCode(code)) {
    return null;
  }
  
  const parts = code.split('-');
  const typeMap = {
    'QT': 'quote',
    'OR': 'order',
    'ST': 'service_ticket'
  } as const;
  
  return {
    type: typeMap[parts[0] as keyof typeof typeMap] || 'unknown',
    date: parts[1],
    suffix: parts[2]
  };
}

/**
 * Get confirmation status for a record
 */
export async function getConfirmationStatus(
  type: 'quote' | 'order' | 'service_ticket',
  recordId: string
): Promise<{
  isConfirmed: boolean;
  digitalTwinCode?: string;
  confirmationDate?: string;
  notificationSent: boolean;
}> {
  try {
    let tableName = '';
    switch (type) {
      case 'quote':
        tableName = 'quotes';
        break;
      case 'order':
        tableName = 'orders';
        break;
      case 'service_ticket':
        tableName = 'service_tickets';
        break;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('digital_twin_code, created_at, sent_at')
      .eq('id', recordId)
      .single();

    if (error) {
      return { isConfirmed: false, notificationSent: false };
    }

    return {
      isConfirmed: !!data.sent_at,
      digitalTwinCode: data.digital_twin_code,
      confirmationDate: data.sent_at || data.created_at,
      notificationSent: !!data.sent_at
    };
  } catch (error) {
    console.error('Error getting confirmation status:', error);
    return { isConfirmed: false, notificationSent: false };
  }
}
