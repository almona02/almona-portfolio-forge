import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CompanyTimeline, MILESTONES } from './CompanyTimeline';


// Mock 3D components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  Text: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  useInView: vi.fn(() => [null, true]),
}));


describe('CompanyTimeline Component', () => {
  it('renders the timeline canvas', () => {
    render(<CompanyTimeline />);
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument();
  });

  it('displays initial milestone content', () => {
    render(<CompanyTimeline />);
    expect(screen.getByText(MILESTONES[0].title)).toBeInTheDocument();
    expect(screen.getByText(MILESTONES[0].description)).toBeInTheDocument();
  });

  it('handles media content', () => {
    render(<CompanyTimeline />);
    const mediaItems = screen.getAllByRole('presentation');

    expect(mediaItems.length).toBeGreaterThan(0);
  });

  it('supports keyboard navigation', () => {
    render(<CompanyTimeline />);
    const firstNode = screen.getByText(MILESTONES[0].year.toString());
    fireEvent.keyDown(firstNode, { key: 'Enter' });
    expect(screen.getByText(MILESTONES[0].title)).toBeInTheDocument();
  });

  it('renders comparison slider when available', async () => {
    render(<CompanyTimeline />);
    const comparisonMilestone = MILESTONES.find(m => m.comparison);
    if (comparisonMilestone) {
      const yearNode = screen.getByText(comparisonMilestone.year.toString());
      fireEvent.click(yearNode);
      
      // Wait for slider to appear and verify it's accessible
      const slider = await screen.findByRole('slider', { 
        name: /comparison slider/i,
        hidden: true 
      });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuenow', '50');
    }
  });

});
