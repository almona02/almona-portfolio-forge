/**
 * FP-024 / F01 — Direct machine-send availability.
 *
 * No machine transport exists in this codebase: there is no network client,
 * no controller acknowledgement, and no send protocol implementation. Any UI
 * or handler that reports a sent/transmitted/accepted state without one is a
 * false-success path. This module is the single source of truth so the
 * disabled control, the blocked action, and the regression test cannot drift.
 */

export interface MachineSendAvailability {
  available: false;
  /** Operator-facing reason. Localised copy lives with the caller. */
  reason: string;
}

export const MACHINE_SEND_STATUS: MachineSendAvailability = {
  available: false,
  reason:
    'Direct machine send is not connected. Download the G-code or ALM 6510 file and import it at the controller.',
};

/** Fail-closed guard for the machine-send action. Always throws until a real transport supplies an acknowledgement. */
export function assertMachineSendAvailable(): void {
  throw new Error(MACHINE_SEND_STATUS.reason);
}
