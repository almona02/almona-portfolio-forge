/**
 * Focus Management Utilities
 * 
 * Enterprise-grade focus management for keyboard navigation, accessibility,
 * and professional UX in the Drafting Workbench.
 * 
 * Constitutional: Deterministic focus management, no ML/AI
 * Tier: 3 Protected Determinism
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
    .filter(el => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
}

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
}

/**
 * Restore focus to a previously focused element
 */
let previousFocus: HTMLElement | null = null;

export function saveFocus(): void {
  if (document.activeElement instanceof HTMLElement) {
    previousFocus = document.activeElement;
  }
}

export function restoreFocus(): void {
  if (previousFocus && document.body.contains(previousFocus)) {
    previousFocus.focus();
    previousFocus = null;
  }
}

/**
 * Focus first element in container
 */
export function focusFirst(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Focus last element in container
 */
export function focusLast(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
  }
}

/**
 * Create a skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = label;
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-600 focus:text-white focus:rounded focus:shadow-lg';
  link.setAttribute('aria-label', label);
  return link;
}

/**
 * Setup focus trap for a modal/dialog
 */
export function setupFocusTrap(container: HTMLElement): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    trapFocus(container, e);
  };

  // Save current focus
  saveFocus();

  // Focus first element
  focusFirst(container);

  // Add event listener
  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    restoreFocus();
  };
}

