import { describe, it, expect } from 'vitest';
import { canCreateServiceTicket, SERVICE_TICKET_CREATOR_ROLES } from './tickets';

describe('canCreateServiceTicket', () => {
  it('denies when role is null/undefined', () => {
    expect(canCreateServiceTicket(null)).toBe(false);
  expect(canCreateServiceTicket(undefined as unknown as never)).toBe(false);
  });

  it('allows all whitelisted roles', () => {
    SERVICE_TICKET_CREATOR_ROLES.forEach(r => {
      expect(canCreateServiceTicket(r)).toBe(true);
    });
  });

  it('denies non-whitelisted roles', () => {
    // Provide a fake role not in union using casting for negative test
  // Cast through unknown to satisfy lint rules while simulating invalid role
  expect(canCreateServiceTicket('fake-role' as unknown as never)).toBe(false);
  });
});
