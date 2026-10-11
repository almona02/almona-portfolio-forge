import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManufacturingApprovalPanel } from './ManufacturingApprovalPanel';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/store/workflowStore', () => ({ useWorkflowStore: () => ({ currentProject: { systemPackId: 'test-pack' }, workflowIdentity: { positionId: 'test-position', revision: 4 } }) }));

/** Supabase query builder stub: every step returns the same chainable object. */
const requestChain = {
  select: () => requestChain,
  eq: () => requestChain,
  order: () => requestChain,
  limit: () => requestChain,
  maybeSingle: () => mocks.maybeSingle(),
};

beforeEach(() => {
  mocks.from.mockReturnValue(requestChain);
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('manufacturing approval request receipts', () => {
  const submit = () => {
    render(<ManufacturingApprovalPanel />);
    fireEvent.change(screen.getByLabelText('Catalogue document / version'), { target: { value: ' TEST catalogue r1 ' } });
    fireEvent.change(screen.getByLabelText('Cutting rules document / version'), { target: { value: ' TEST cutting r1 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request approval' }));
  };
  const check = () => {
    render(<ManufacturingApprovalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Check approved versions' }));
  };
  const status = () => screen.getByRole('status').textContent ?? '';
  it('submits saved revision and evidence references, leaving approval pending', async () => {
    mocks.rpc.mockResolvedValue({ data: 'd610a309-929c-480e-9f4b-e47c66022f7a', error: null });
    submit();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Manufacturing remains blocked'));
    expect(mocks.rpc).toHaveBeenCalledWith('request_fabricator_manufacturing_approval', { p_position_id: 'test-position', p_expected_revision: 4, p_catalogue_reference: 'TEST catalogue r1', p_rule_reference: 'TEST cutting r1', p_notes: '' });
  });
  it('does not report successful submission without a valid receipt', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    submit();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No valid approval request receipt'));
  });
  it('surfaces server rejection without creating an approval', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'position revision changed' } });
    submit();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('position revision changed'));
  });
  it('explains that a later pose save voided the approval instead of blocking silently', async () => {
    // Resolver finds no authority for the current revision, because the pose was saved again.
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.maybeSingle.mockResolvedValue({
      data: { position_revision: 3, status: 'approved', catalogue_reference: 'catalogue r1', rule_reference: 'rules r1' },
      error: null,
    });
    check();
    await waitFor(() => expect(status()).toContain('One active approved manufacturing authority is required.'));
    expect(status()).toContain('The latest request covers revision 3 (approved)');
    expect(status()).toContain('this pose is now revision 4');
    expect(status()).toContain('every pose save bumps the revision and voids the approval');
    expect(status()).toContain('Submit a new request for revision 4');
  });
  it('reports that no approval request exists for the current revision', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    check();
    await waitFor(() => expect(status()).toContain('No approval request exists for this position yet'));
    expect(status()).toContain('submit one for revision 4');
  });
  it('reports a pending request for the current revision as the remaining blocker', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.maybeSingle.mockResolvedValue({
      data: { position_revision: 4, status: 'pending', catalogue_reference: 'catalogue r1', rule_reference: 'rules r1' },
      error: null,
    });
    check();
    await waitFor(() => expect(status()).toContain('The latest request covers revision 4 and is pending'));
    expect(status()).toContain('Manufacturing stays blocked until an admin approves it');
  });
});
