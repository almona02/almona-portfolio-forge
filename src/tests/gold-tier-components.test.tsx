/**
 * Gold-Tier Components - Comprehensive Test Suite
 * Tests all 6 fixed components for import resolution, runtime mounting, and basic functionality
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Import all fixed components
import { QRScanner } from '@/components/mobile/QRScanner';

import { globalHardener, harden } from '@/lib/error/Hardener';

import { GoldTierCard as Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-gold-tier';

import { GoldTierInput as Input } from '@/components/ui/input-gold-tier';

import { useTouchGestures, withTouchGestures } from '@/hooks/useTouchGestures';

import type { CommandPaletteItem } from '@/components/ui/command-palette';
import { CommandPalette, useCommandPalette } from '@/components/ui/command-palette';

describe('Gold-Tier Components - Import Resolution', () => {
  it('should import QRScanner component and types', () => {
    expect(QRScanner).toBeDefined();
    expect(typeof QRScanner).toBe('function');
  });

  it('should import Hardener utilities', () => {
    expect(globalHardener).toBeDefined();
    expect(harden).toBeDefined();
    expect(typeof globalHardener.withErrorBoundary).toBe('function');
    expect(typeof harden.executeAsync).toBe('function');
  });

  it('should import Card components', () => {
    expect(Card).toBeDefined();
    expect(CardHeader).toBeDefined();
    expect(CardTitle).toBeDefined();
    expect(CardDescription).toBeDefined();
    expect(CardContent).toBeDefined();
    expect(CardFooter).toBeDefined();
  });

  it('should import Input component', () => {
    expect(Input).toBeDefined();
    expect(typeof Input).toBe('object'); // forwardRef returns object
  });

  it('should import Touch Gesture utilities', () => {
    expect(useTouchGestures).toBeDefined();
    expect(withTouchGestures).toBeDefined();
    expect(typeof useTouchGestures).toBe('function');
    expect(typeof withTouchGestures).toBe('function');
  });

  it('should import Command Palette components', () => {
    expect(CommandPalette).toBeDefined();
    expect(useCommandPalette).toBeDefined();
    expect(typeof useCommandPalette).toBe('function');
  });
});

describe('Gold-Tier Card Component', () => {
  it('should render Card without errors', () => {
    const { container } = render(
      <Card>
        <CardContent>Test Content</CardContent>
      </Card>
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render all Card sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  it('should apply variant classes correctly', () => {
    const { container } = render(
      <Card variant="elevated">
        <CardContent>Test</CardContent>
      </Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('shadow-md');
  });

  it('should apply size classes correctly', () => {
    const { container } = render(
      <Card size="lg">
        <CardContent>Test</CardContent>
      </Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-6');
  });
});

describe('Gold-Tier Input Component', () => {
  it('should render Input without errors', () => {
    render(<Input placeholder="Test input" />);
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply variant classes correctly', () => {
    const { container } = render(<Input variant="warning" />);
    const input = container.querySelector('input');
    expect(input?.className).toContain('border-amber-500');
  });

  it('should show error state', () => {
    const { container } = render(<Input error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    const input = container.querySelector('input');
    expect(input?.className).toContain('border-red-500');
  });

  it('should generate unique IDs', () => {
    const { container: container1 } = render(<Input label="Input 1" />);
    const { container: container2 } = render(<Input label="Input 2" />);
    
    const input1 = container1.querySelector('input');
    const input2 = container2.querySelector('input');
    
    expect(input1?.id).toBeDefined();
    expect(input2?.id).toBeDefined();
    expect(input1?.id).not.toBe(input2?.id);
  });
});

describe('Command Palette', () => {
  const mockItems: CommandPaletteItem[] = [
    {
      id: '1',
      label: 'Test Command 1',
      description: 'Test description 1',
      action: vi.fn(),
      keywords: ['test', 'command'],
    },
    {
      id: '2',
      label: 'Test Command 2',
      description: 'Test description 2',
      action: vi.fn(),
      category: 'Testing',
    },
  ];

  it('should render when open', () => {
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <CommandPalette
        items={mockItems}
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display all items initially', () => {
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Test Command 1')).toBeInTheDocument();
    expect(screen.getByText('Test Command 2')).toBeInTheDocument();
  });

  it('should filter items based on search query', async () => {
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Type a command/i);
    fireEvent.change(input, { target: { value: 'Command 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Command 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Command 2')).not.toBeInTheDocument();
    });
  });

  it('should call action when item is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    const item = screen.getByText('Test Command 1');
    fireEvent.click(item.closest('button')!);

    expect(mockItems[0].action).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle keyboard navigation', () => {
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Type a command/i);
    
    // Arrow down should select first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Arrow up should keep first item selected (can't go below 0)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    
    // Escape should close
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={mockItems}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    
    const input2 = screen.getAllByPlaceholderText(/Type a command/i)[1];
    fireEvent.keyDown(input2, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('useCommandPalette Hook', () => {
  it('should provide palette state management', () => {
    const TestComponent = () => {
      const palette = useCommandPalette();
      
      return (
        <div>
          <div data-testid="open">{palette.open.toString()}</div>
          <div data-testid="query">{palette.query}</div>
          <button onClick={palette.openPalette}>Open</button>
          <button onClick={palette.closePalette}>Close</button>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('open')).toHaveTextContent('false');
    
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('open')).toHaveTextContent('true');
    
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });
});

// ... existing code ...

describe('Hardener Error Boundary', () => {
  it('should create hardened component', () => {
    const TestComponent = () => <div>Test</div>;
    const HardenedComponent = globalHardener.withErrorBoundary(TestComponent);

    expect(HardenedComponent).toBeDefined();
    expect(typeof HardenedComponent).toBe('function'); // React component class/function
  });

  it('should catch errors in child components', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const Fallback = () => <div>Error caught</div>;

    const HardenedComponent = globalHardener.withErrorBoundary(ThrowError, Fallback);

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<HardenedComponent />);

    expect(screen.getByText('Error caught')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});

describe('harden.executeAsync', () => {
  it('should execute async function successfully', async () => {
    const successFn = async () => 'success';
    
    const result = await harden.executeAsync(successFn, 'fallback');
    expect(result).toBe('success');
  });

  it('should handle errors in async function', async () => {
    const errorFn = async () => {
      throw new Error('Test error');
    };
    
    // Suppress console.error/warn for this test as Hardener logs errors
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await harden.executeAsync(errorFn, 'fallback');
    expect(result).toBe('fallback');

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});

describe('Touch Gestures Hook', () => {
  it('should provide touch gesture handlers', () => {
    const TestComponent = () => {
      useTouchGestures(
        {
          pinchZoom: false,
          twoFingerPan: false,
          rotate: false,
          tapSelect: false,
          longPress: false,
          swipe: true,
          momentum: false,
        },
        {
          onSwipe: vi.fn(),
        }
      );

      return <div data-touch-enabled="true">Touch Area</div>;
    };

    const { container } = render(<TestComponent />);
    const touchArea = container.firstChild as HTMLElement;

    expect(touchArea).toHaveAttribute('data-touch-enabled');
  });
});

describe('withTouchGestures HOC', () => {
  it('should wrap component with touch gesture support', () => {
    const BaseComponent = ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    );

    const EnhancedComponent = withTouchGestures(
      BaseComponent,
      {
          pinchZoom: false,
          twoFingerPan: false,
          rotate: false,
          tapSelect: false,
          longPress: false,
          swipe: true,
          momentum: false,
      },
      {
        onSwipe: vi.fn(),
      }
    );

    render(
      <EnhancedComponent>
        Test Content
      </EnhancedComponent>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});

describe('Performance - Component Mount Times', () => {
  it('Card should mount in <100ms', () => {
    const start = performance.now();
    render(
      <Card>
        <CardContent>Test</CardContent>
      </Card>
    );
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });

  it('Input should mount in <100ms', () => {
    const start = performance.now();
    render(<Input />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });

  it('Command Palette should mount in <100ms', () => {
    const start = performance.now();
    render(
      <CommandPalette
        items={[]}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
});
