import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Define section IDs for type safety
export type SectionId = 
  | 'fabrication' 
  | 'drafting' 
  | 'commercial' 
  | 'reports' 
  | 'projects' 
  | 'inventory' 
  | 'admin'
  | 'navigation';

export type Theme = 'dark' | 'light';
export type ZoomPreset = 'fit' | '1:1' | '200%' | 'custom';
export type ToolbarPosition = 'top' | 'right' | 'bottom' | 'left' | 'floating' | 'bottom-right';
export type Status = 'normal' | 'warning' | 'error' | 'success';

interface PanelState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  leftWidthExpanded: number;  // Default: 240
  rightWidthExpanded: number; // Default: 320
}

interface FabricatorUIState {
  // Global state
  theme: Theme;
  
  // Quick access toolbar
  quickAccessToolbarVisible: boolean;
  quickAccessToolbarPinned: boolean;
  quickAccessToolbarPosition: ToolbarPosition;
  
  // Panel states per section
  panelStates: Record<SectionId, PanelState>;
  
  // Zoom levels per workspace type
  zoomLevels: Record<string, number>;
  zoomPresets: Record<string, ZoomPreset>;
  
  // UI modes
  minimalistMode: boolean;
  focusMode: boolean;
  
  // Actions
  togglePanel: (sectionId: SectionId, panel: 'left' | 'right') => void;
  setPanelState: (sectionId: SectionId, leftCollapsed: boolean, rightCollapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
  setQuickAccessToolbarVisible: (visible: boolean) => void;
  setQuickAccessToolbarPinned: (pinned: boolean) => void;
  setQuickAccessToolbarPosition: (position: ToolbarPosition) => void;
  setZoomLevel: (workspaceType: string, level: number) => void;
  setZoomPreset: (workspaceType: string, preset: ZoomPreset) => void;
  toggleMinimalistMode: () => void;
  toggleFocusMode: () => void;
  resetSectionPreferences: (sectionId: SectionId) => void;
  resetAllPreferences: () => void;
}

const DEFAULT_PANEL_STATE: PanelState = {
  leftCollapsed: false,
  rightCollapsed: false,
  leftWidthExpanded: 240,
  rightWidthExpanded: 320,
};

const DEFAULT_SECTION_STATES: Record<SectionId, PanelState> = {
  fabrication: { ...DEFAULT_PANEL_STATE },
  drafting: { ...DEFAULT_PANEL_STATE, leftCollapsed: true },
  commercial: { ...DEFAULT_PANEL_STATE, rightCollapsed: true },
  reports: { ...DEFAULT_PANEL_STATE },
  projects: { ...DEFAULT_PANEL_STATE },
  inventory: { ...DEFAULT_PANEL_STATE },
  admin: { ...DEFAULT_PANEL_STATE, leftCollapsed: true, rightCollapsed: true },
  navigation: { ...DEFAULT_PANEL_STATE, leftCollapsed: false },
};

export const useFabricatorUIStore = create<FabricatorUIState>()(
  persist(
    (set) => ({
      // Initial state
      theme: 'dark',
      quickAccessToolbarVisible: true,
      quickAccessToolbarPinned: false,
      quickAccessToolbarPosition: 'bottom-right',
      panelStates: DEFAULT_SECTION_STATES,
      zoomLevels: {},
      zoomPresets: {},
      minimalistMode: false,
      focusMode: false,
      
      // Actions
      togglePanel: (sectionId, panel) => set((state) => ({
        panelStates: {
          ...state.panelStates,
          [sectionId]: {
            ...state.panelStates[sectionId],
            [panel === 'left' ? 'leftCollapsed' : 'rightCollapsed']: 
              !state.panelStates[sectionId][panel === 'left' ? 'leftCollapsed' : 'rightCollapsed'],
          },
        },
      })),
      
      setPanelState: (sectionId, leftCollapsed, rightCollapsed) => set((state) => ({
        panelStates: {
          ...state.panelStates,
          [sectionId]: {
            ...state.panelStates[sectionId],
            leftCollapsed,
            rightCollapsed,
          },
        },
      })),
      
      setTheme: (theme) => set({ theme }),
      
      setQuickAccessToolbarVisible: (visible) => set({ quickAccessToolbarVisible: visible }),
      
      setQuickAccessToolbarPinned: (pinned) => set({ quickAccessToolbarPinned: pinned }),
      
      setQuickAccessToolbarPosition: (position) => set({ quickAccessToolbarPosition: position }),
      
      setZoomLevel: (workspaceType, level) => set((state) => ({
        zoomLevels: {
          ...state.zoomLevels,
          [workspaceType]: level,
        },
      })),
      
      setZoomPreset: (workspaceType, preset) => set((state) => ({
        zoomPresets: {
          ...state.zoomPresets,
          [workspaceType]: preset,
        },
      })),
      
      toggleMinimalistMode: () => set((state) => ({ minimalistMode: !state.minimalistMode })),
      
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      
      resetSectionPreferences: (sectionId) => set((state) => ({
        panelStates: {
          ...state.panelStates,
          [sectionId]: DEFAULT_PANEL_STATE,
        },
      })),
      
      resetAllPreferences: () => set({
        panelStates: DEFAULT_SECTION_STATES,
        theme: 'dark',
        quickAccessToolbarVisible: true,
        quickAccessToolbarPinned: false,
        quickAccessToolbarPosition: 'bottom-right',
      }),
    }),
    {
      name: 'almona_fabricator_ui_preferences',
      storage: createJSONStorage(() => localStorage),
      // Partialize: only save certain fields to localStorage
      partialize: (state) => ({
        theme: state.theme,
        quickAccessToolbarVisible: state.quickAccessToolbarVisible,
        quickAccessToolbarPinned: state.quickAccessToolbarPinned,
        quickAccessToolbarPosition: state.quickAccessToolbarPosition,
        panelStates: state.panelStates,
        zoomLevels: state.zoomLevels,
        zoomPresets: state.zoomPresets,
        minimalistMode: state.minimalistMode,
        focusMode: state.focusMode,
      }),
    }
  )
);

// Export hooks for convenience
export const useTheme = () => useFabricatorUIStore((state) => state.theme);
export const useSetTheme = () => useFabricatorUIStore((state) => state.setTheme);
export const usePanelState = (sectionId: SectionId) => 
  useFabricatorUIStore((state) => state.panelStates[sectionId]);
export const useTogglePanel = () => useFabricatorUIStore((state) => state.togglePanel);
