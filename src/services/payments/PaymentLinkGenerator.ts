import type { PaymentLinkConfig, PaymentLinkResult } from './paymentTypes';

const UNAVAILABLE = 'Online payment links are not configured. Contact the workshop to arrange payment.';

/** Payment links require server-issued provider sessions and verified settlement. */
export class PaymentLinkGenerator {
  static async generateLink(_config: PaymentLinkConfig): Promise<PaymentLinkResult> {
    throw new Error(UNAVAILABLE);
  }

  static async validateLink(_linkId: string): Promise<{
    valid: boolean; expired: boolean; linkData?: unknown; error?: string;
  }> {
    return { valid: false, expired: false, error: UNAVAILABLE };
  }

  static async revokeLink(_linkId: string): Promise<void> {
    throw new Error(UNAVAILABLE);
  }

  static async getLinkAnalytics(_linkId: string): Promise<{
    views: number; clicks: number; payments: number; conversionRate: number;
  }> {
    throw new Error(UNAVAILABLE);
  }
}
