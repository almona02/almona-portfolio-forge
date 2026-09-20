import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentModal from './EnrollmentModal';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), success: vi.fn(), error: vi.fn(), close: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function fillForm() {
  render(<EnrollmentModal open onOpenChange={mocks.close} selectedProgram="basic" material="aluminium" cohorts={[]} />);
  fireEvent.change(screen.getByLabelText('trainingPage.form.name'), { target: { value: 'Test Buyer' } });
  fireEvent.change(screen.getByLabelText('trainingPage.form.email'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'trainingPage.form.submit' }));
}

describe('Training enquiry persistence', () => {
  beforeEach(() => vi.clearAllMocks());
  it('keeps the form open and reports failure when the database rejects an enquiry', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'Database unavailable' } });
    fillForm();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
    expect(screen.getByLabelText('trainingPage.form.name')).toHaveValue('Test Buyer');
  });
  it('allows an empty optional phone and confirms only a saved enquiry', async () => {
    mocks.insert.mockResolvedValue({ error: null });
    fillForm();
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Buyer', phone: '' }));
    expect(mocks.close).toHaveBeenCalledWith(false);
  });
});
