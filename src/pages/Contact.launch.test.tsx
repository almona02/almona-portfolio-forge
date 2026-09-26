import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Contact from './Contact';

vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/hocs/withErrorBoundary', () => ({ withErrorBoundary: (component: unknown) => component }));

describe('Contact enquiry handoff', () => {
  it('prepares an encoded draft without claiming delivery, and invalidates it after edits', async () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Launch Test' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '+201000000000' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Parts & service?' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please confirm stock & delivery.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare Email' }));
    const link = await screen.findByRole('link', { name: 'Open email draft' });
    const href = link.getAttribute('href')!;
    expect(href).toContain('mailto:almona02@yahoo.com?subject=Parts%20%26%20service%3F');
    expect(decodeURIComponent(href)).toContain('Please confirm stock & delivery.');
    expect(screen.getByRole('status')).toHaveTextContent('Your message has not been sent');
    expect(screen.queryByText('Your message has been sent successfully!')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Changed enquiry contents' } });
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument());
  });

  it('does not create a draft for invalid contact information', async () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare Email' }));
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument();
  });
});
