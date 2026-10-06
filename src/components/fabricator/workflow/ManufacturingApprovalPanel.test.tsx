import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManufacturingApprovalPanel } from './ManufacturingApprovalPanel';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/store/workflowStore', () => ({ useWorkflowStore: () => ({ currentProject: { systemPackId: 'test-pack' }, workflowIdentity: { positionId: 'test-position', revision: 4 } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('manufacturing approval request receipts', () => {
  const submit = () => {
    render(<ManufacturingApprovalPanel />);
    fireEvent.change(screen.getByLabelText('Catalogue document / version'), { target: { value: ' TEST catalogue r1 ' } });
    fireEvent.change(screen.getByLabelText('Cutting rules document / version'), { target: { value: ' TEST cutting r1 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request approval' }));
  };
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
});
