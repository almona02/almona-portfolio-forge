/**
 * Tests for CollapsiblePanel component
 * Tests:
 * 1. Component renders
 * 2. Collapse/expand functionality
 * 3. Keyboard shortcuts (Ctrl+[, Ctrl+])
 * 4. Hover states
 */

import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollapsiblePanel } from '../CollapsiblePanel';

// Mock the store
vi.mock('@/stores/fabricatorUIStore', () => ({
  useFabricatorUIStore: vi.fn(),
}));

describe('CollapsiblePanel', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  const mockStoreState = {
    panelStates: {
      fabrication: {
        leftCollapsed: false,
        rightCollapsed: false,
        leftWidthExpanded: 240,
        rightWidthExpanded: 320,
      },
      drafting: {
        leftCollapsed: true,
        rightCollapsed: false,
        leftWidthExpanded: 240,
        rightWidthExpanded: 320,
      },
    },
    togglePanel: vi.fn(),
  };

  it('should render component with content', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
        icon={<span>⚙️</span>}
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('should show collapsed state correctly', () => {
    const collapsedState = {
      ...mockStoreState,
      panelStates: {
        ...mockStoreState.panelStates,
        fabrication: {
          ...mockStoreState.panelStates.fabrication,
          leftCollapsed: true,
        },
      },
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(collapsedState);
      }
      return collapsedState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    // Content should not be visible when collapsed
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Panel')).not.toBeInTheDocument();
  });

  it('should toggle panel on header click', async () => {
    const togglePanelMock = vi.fn();
    const storeState = {
      ...mockStoreState,
      togglePanel: togglePanelMock,
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(storeState);
      }
      return storeState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    const header = screen.getByRole('button', { name: /collapse test panel panel/i });
    await userEvent.click(header);

    expect(togglePanelMock).toHaveBeenCalledWith('fabrication', 'left');
  });

  it('should toggle panel on Enter key press', async () => {
    const togglePanelMock = vi.fn();
    const storeState = {
      ...mockStoreState,
      togglePanel: togglePanelMock,
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(storeState);
      }
      return storeState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    const header = screen.getByRole('button', { name: /collapse test panel panel/i });
    header.focus();
    await userEvent.keyboard('{Enter}');

    expect(togglePanelMock).toHaveBeenCalledWith('fabrication', 'left');
  });

  it('should trigger keyboard shortcut Ctrl+[ for left panel', async () => {
    const togglePanelMock = vi.fn();
    const storeState = {
      ...mockStoreState,
      togglePanel: togglePanelMock,
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(storeState);
      }
      return storeState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    // Simulate Ctrl+[ keyboard shortcut using fireEvent (more reliable for special keys)
    const keyboardEvent = new KeyboardEvent('keydown', {
      key: '[',
      code: 'BracketLeft',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    
    window.dispatchEvent(keyboardEvent);

    // Wait for the event handler to be called
    await waitFor(() => {
      expect(togglePanelMock).toHaveBeenCalledWith('fabrication', 'left');
    });
  });

  it('should trigger keyboard shortcut Ctrl+] for right panel', async () => {
    const togglePanelMock = vi.fn();
    const storeState = {
      ...mockStoreState,
      togglePanel: togglePanelMock,
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(storeState);
      }
      return storeState;
    });

    render(
      <CollapsiblePanel
        position="right"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Panel Content</div>
      </CollapsiblePanel>
    );

    // Simulate Ctrl+] keyboard shortcut
    await userEvent.keyboard('{Control>}]{/Control}');

    // Wait for the event handler to be called
    await waitFor(() => {
      expect(togglePanelMock).toHaveBeenCalledWith('fabrication', 'right');
    });
  });

  it('should apply correct width styles when collapsed', () => {
    const collapsedState = {
      ...mockStoreState,
      panelStates: {
        ...mockStoreState.panelStates,
        fabrication: {
          ...mockStoreState.panelStates.fabrication,
          leftCollapsed: true,
        },
      },
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(collapsedState);
      }
      return collapsedState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        widthCollapsed={48}
        widthExpanded={240}
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveStyle({ width: '48px' });
  });

  it('should apply correct width styles when expanded', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        widthCollapsed={48}
        widthExpanded={240}
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveStyle({ width: '240px' });
  });

  it('should show icon when collapsed', () => {
    const collapsedState = {
      ...mockStoreState,
      panelStates: {
        ...mockStoreState.panelStates,
        fabrication: {
          ...mockStoreState.panelStates.fabrication,
          leftCollapsed: true,
        },
      },
    };

    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(collapsedState);
      }
      return collapsedState;
    });

    render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        icon={<span data-testid="custom-icon">⚙️</span>}
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should have hover state classes', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
        title="Test Panel"
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const header = container.querySelector('[role="button"]');
    expect(header).toHaveClass('hover:bg-gray-800/50');
    expect(header).toHaveClass('transition-colors');
  });

  it('should use correct border class for left panel', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('border-r');
  });

  it('should use correct border class for right panel', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="right"
        sectionId="fabrication"
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('border-l');
  });

  it('should have transition animation classes', () => {
    (useFabricatorUIStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    const { container } = render(
      <CollapsiblePanel
        position="left"
        sectionId="fabrication"
      >
        <div>Content</div>
      </CollapsiblePanel>
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('transition-all');
    expect(panel).toHaveClass('duration-300');
    expect(panel).toHaveClass('ease-in-out');
  });
});
