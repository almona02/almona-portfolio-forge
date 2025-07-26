import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { AiEquipmentAdvisor } from './AiEquipmentAdvisor';

// Mock the SparePartsService functions
vi.mock('@/lib/ai/SparePartsService', () => ({
  identifyPartFromImage: vi.fn().mockResolvedValue({
    partInfo: 'YILMAZ-BLADE-2024',
    localSuppliers: [
      { name: 'Cairo Machine Parts', location: 'Cairo' }
    ],
    priceRange: {
      genuine: '500-2000 EGP',
      local: '300-1500 EGP'
    }
  }),
  findPartByDescription: vi.fn().mockResolvedValue('Part identified: Cutting Blade Assembly'),
  predictPartDemand: vi.fn().mockResolvedValue('Top parts needed: Blades, Bearings, Belts')
}));

describe('AiEquipmentAdvisor', () => {
  const mockOnOpenChange = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with default tab', () => {
    render(<AiEquipmentAdvisor open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('AI Spare Parts Finder')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the part/i)).toBeInTheDocument();
  });

  it('can click on different tabs', async () => {
    render(<AiEquipmentAdvisor open={true} onOpenChange={mockOnOpenChange} />);
    
    // Click on Image tab
    fireEvent.click(screen.getByText('Image'));
    await waitFor(() => {
      expect(screen.getByText('Identify Part')).toBeInTheDocument();
    });

    // Click on Symptoms tab
    fireEvent.click(screen.getByText('Symptoms'));
    await waitFor(() => {
      expect(screen.getByText('Identify Part')).toBeInTheDocument();
    });
  });

  it('handles text description search', async () => {
    render(<AiEquipmentAdvisor open={true} onOpenChange={mockOnOpenChange} />);
    
    fireEvent.change(
      screen.getByPlaceholderText(/Describe the part/i), 
      { target: { value: 'cutting blade' } }
    );
    fireEvent.click(screen.getByText('Identify Part'));

    await waitFor(() => {
      expect(screen.getByText(/Cutting Blade Assembly/i)).toBeInTheDocument();
    });
  });

  it('shows error when no input provided', () => {
    render(<AiEquipmentAdvisor open={true} onOpenChange={mockOnOpenChange} />);
    
    const button = screen.getByText('Identify Part');
    expect(button).toHaveAttribute('disabled');

    fireEvent.change(
      screen.getByPlaceholderText(/Describe the part/i), 
      { target: { value: 'test' } }
    );
    expect(button).not.toHaveAttribute('disabled');
  });
});
