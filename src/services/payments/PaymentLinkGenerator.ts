import type { PaymentLinkConfig, PaymentLinkResult } from './paymentTypes';

const UNAVAILABLE = 'Online payment links are not configured. Contact the workshop to arrange payment.';

/** Payment links require server-issued provider sessions and verified settlement. */
export class PaymentLinkGenerator {
  static generateLink(_config: PaymentLinkConfig): Promise<PaymentLinkResult> {
    return Promise.reject(new Error(UNAVAILABLE));
  }

  static validateLink(_linkId: string): Promise<{
    valid: boolean; expired: boolean; linkData?: unknown; error?: string;
  }> {
    return Promise.resolve({ valid: false, expired: false, error: UNAVAILABLE });
  }

  static revokeLink(_linkId: string): Promise<void> {
    return Promise.reject(new Error(UNAVAILABLE));
  }

  static getLinkAnalytics(_linkId: string): Promise<{
    views: number; clicks: number; payments: number; conversionRate: number;
  }> {
    return Promise.reject(new Error(UNAVAILABLE));
  }
}
