import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TutorialSlides } from './TutorialSlides';
import { readGuidedContent } from './guidedContent';
import { FaultIntake } from './FaultIntake';

vi.mock('@/hooks/usePublicCopy', () => ({ usePublicCopy: () => (text: string) => text }));
const modules = [
  { title: 'Safety', steps: [{ title: 'Guards', points: ['Review guards with your trainer.'], reference: 'Manual section 10' }] },
  { title: 'Program', steps: [{ title: 'Review program', points: ['Check the approved revision.'] }] },
];

describe('guided learning', () => {
  it('requires review of every screen and a correct checkpoint, rather than marking completion on arrival', () => {
    render(<TutorialSlides modules={modules} personaTitle="Operation learning path" />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.getByText(/Review the boundary/)).toBeInTheDocument();
    expect(screen.queryByText(/Guide reviewed\./)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
    expect(screen.queryByText(/Guide reviewed\./)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
    expect(screen.getByText(/Guide reviewed\./)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Restart guide' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByText(/Guide reviewed\./)).not.toBeInTheDocument();
  });

  it('supports Arabic direction, topic navigation, and a question about the selected screen', () => {
    const ask = vi.fn();
    render(<TutorialSlides modules={modules} language="ar" personaTitle="Guide" onAsk={ask} />);
    expect(screen.getByRole('region', { name: 'Guide' })).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByRole('button', { name: 'Program' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ask about this screen' }));
    expect(ask).toHaveBeenCalledWith('Review program');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('falls back from malformed or unsupported structured payloads', () => {
    const guide = { version: 1, kind: 'operation', language: 'en', title: 'Guide', notice: 'Review only', modules };
    expect(readGuidedContent(guide)?.modules).toEqual(modules);
    for (const invalid of [null, {}, { ...guide, version: 2 }, { ...guide, modules: [] }, { ...guide, modules: [{ title: 'Bad', steps: [{}] }] }]) {
      expect(readGuidedContent(invalid)).toBeUndefined();
    }
  });

  it('collects real symptoms before requesting fault guidance', () => {
    const submit = vi.fn();
    render(<FaultIntake onSubmit={submit} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Review fault' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Symptom'), { target: { value: 'Spindle stopped during machining' } });
    fireEvent.change(screen.getByLabelText(/Alarm code/), { target: { value: '1010' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review fault' }));
    expect(submit).toHaveBeenCalledWith('Symptom: Spindle stopped during machining\nAlarm code: 1010');
  });
});
