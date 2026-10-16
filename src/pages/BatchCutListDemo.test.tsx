import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BatchCutListDemo from './BatchCutListDemo';

describe('BatchCutListDemo', () => {
  it('renders the actual cut list and controls without a hook exception', () => {
    render(<BatchCutListDemo />);
    expect(screen.getByText(/Cut List Demo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download cut list PDF/i })).toBeInTheDocument();
  });
});
