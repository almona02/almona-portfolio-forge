import { describe, expect, it } from 'vitest';
import { PaymentLinkGenerator } from './PaymentLinkGenerator';

describe('payment links without a provider integration', () => {
  it('does not fabricate a payable URL or accept browser-stored records', async () => {
    localStorage.setItem('payment_links', JSON.stringify([{ link_id: 'forged', expires_at: '2099-01-01' }]));
    await expect(PaymentLinkGenerator.generateLink({ invoiceId: 'invoice', amount: 10, currency: 'USD' }))
      .rejects.toThrow('not configured');
    expect(await PaymentLinkGenerator.validateLink('forged')).toMatchObject({ valid: false });
    localStorage.removeItem('payment_links');
  });
});
