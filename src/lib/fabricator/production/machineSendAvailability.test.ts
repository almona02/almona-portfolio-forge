/**
 * FP-024 / F01 — Direct machine send must never report success.
 * No transport exists, so the action stays unavailable and fail-closed.
 */
import { describe, expect, it } from 'vitest';
import { assertMachineSendAvailable, MACHINE_SEND_STATUS } from './machineSendAvailability';

describe('machineSendAvailability', () => {
  it('reports machine send as unavailable', () => {
    expect(MACHINE_SEND_STATUS.available).toBe(false);
    expect(MACHINE_SEND_STATUS.reason).toMatch(/not connected/i);
  });

  it('throws instead of simulating a send', () => {
    expect(() => assertMachineSendAvailable()).toThrow(/not connected/i);
  });
});
