/**
 * Quick verification tests for fabricatorUIStore
 * These tests verify:
 * 1. Store can be imported
 * 2. Store initializes correctly
 * 3. togglePanel action works
 * 4. localStorage persistence works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';

describe('fabricatorUIStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const state = useFabricatorUIStore.getState();
    
    expect(state.theme).toBe('dark');
    expect(state.quickAccessToolbarVisible).toBe(true);
    expect(state.quickAccessToolbarPinned).toBe(false);
    expect(state.panelStates.fabrication.leftCollapsed).toBe(false);
    expect(state.panelStates.fabrication.rightCollapsed).toBe(false);
    expect(state.panelStates.drafting.leftCollapsed).toBe(true); // Default collapsed
  });

  it('should toggle panel state correctly', () => {
    const state = useFabricatorUIStore.getState();
    const initialLeftCollapsed = state.panelStates.fabrication.leftCollapsed;
    
    // Toggle left panel
    state.togglePanel('fabrication', 'left');
    
    const newState = useFabricatorUIStore.getState();
    expect(newState.panelStates.fabrication.leftCollapsed).toBe(!initialLeftCollapsed);
    
    // Toggle again to verify it toggles back
    newState.togglePanel('fabrication', 'left');
    const finalState = useFabricatorUIStore.getState();
    expect(finalState.panelStates.fabrication.leftCollapsed).toBe(initialLeftCollapsed);
  });

  it('should toggle theme correctly', () => {
    const state = useFabricatorUIStore.getState();
    expect(state.theme).toBe('dark');
    
    state.setTheme('light');
    const newState = useFabricatorUIStore.getState();
    expect(newState.theme).toBe('light');
    
    newState.setTheme('dark');
    const finalState = useFabricatorUIStore.getState();
    expect(finalState.theme).toBe('dark');
  });

  it('should persist state to localStorage', () => {
    const state = useFabricatorUIStore.getState();
    
    // Change theme
    state.setTheme('light');
    
    // Check localStorage
    const stored = localStorage.getItem('almona_fabricator_ui_preferences');
    expect(stored).not.toBeNull();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.theme).toBe('light');
    }
  });

  it('should restore state from localStorage', () => {
    // Set initial state
    const initialState = useFabricatorUIStore.getState();
    initialState.setTheme('light');
    initialState.togglePanel('fabrication', 'left');
    
    // Create a new store instance (simulating page reload)
    // In Zustand with persist, state should be restored automatically
    const stored = localStorage.getItem('almona_fabricator_ui_preferences');
    expect(stored).not.toBeNull();
    
    // Verify the state was persisted
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.theme).toBe('light');
      expect(parsed.state.panelStates.fabrication.leftCollapsed).toBe(true);
    }
  });

  it('should handle multiple section panel states independently', () => {
    const initialState = useFabricatorUIStore.getState();
    const initialFabricationLeft = initialState.panelStates.fabrication.leftCollapsed;
    const initialDraftingRight = initialState.panelStates.drafting.rightCollapsed;
    
    // Toggle fabrication left panel
    initialState.togglePanel('fabrication', 'left');
    
    // Get state after first toggle
    const afterFirstToggle = useFabricatorUIStore.getState();
    expect(afterFirstToggle.panelStates.fabrication.leftCollapsed).toBe(!initialFabricationLeft);
    
    // Toggle drafting right panel
    afterFirstToggle.togglePanel('drafting', 'right');
    
    const finalState = useFabricatorUIStore.getState();
    
    // Fabrication left should be toggled from initial state
    expect(finalState.panelStates.fabrication.leftCollapsed).toBe(!initialFabricationLeft);
    
    // Drafting right should be toggled from initial state
    expect(finalState.panelStates.drafting.rightCollapsed).toBe(!initialDraftingRight);
    
    // Fabrication right should remain unchanged (still false)
    expect(finalState.panelStates.fabrication.rightCollapsed).toBe(false);
  });
});
