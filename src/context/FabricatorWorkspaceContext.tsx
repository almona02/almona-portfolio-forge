import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';

import type {
  Profile,
  WindowUnit,
  MeasurementData,
  DraftQuote,
  DraftInvoice,
} from '@/types/fabricator';

type WorkspaceTabId = 'customers' | 'inventory' | 'projects' | 'commercial';

interface WorkspaceSnapshot {
  id: string;
  label: string;
  description?: string;
  createdAt: string; // ISO string
  state: FabricatorWorkspaceState;
}

export interface FabricatorWorkspaceState {
  // Current active context
  currentProject: WindowUnit | null;
  currentCustomer: any | null;
  currentMeasurement: MeasurementData | null;

  // Draft states
  draftQuotes: DraftQuote[];
  draftInvoices: DraftInvoice[];
  profileEdits: Record<string, Partial<Profile>>;
  inventoryEdits: Record<string, any>;

  // UI state
  activeWorkspaceTab: WorkspaceTabId;
  lastSaved: string | null; // ISO string for persistence

  // Snapshots
  snapshots: WorkspaceSnapshot[];
  currentSnapshotId: string | null;
}

type FabricatorWorkspaceAction =
  | { type: 'SET_CURRENT_PROJECT'; payload: WindowUnit | null }
  | { type: 'SET_CURRENT_CUSTOMER'; payload: any | null }
  | { type: 'SET_MEASUREMENT_DATA'; payload: MeasurementData | null }
  | { type: 'UPDATE_DRAFT_QUOTE'; payload: DraftQuote }
  | { type: 'UPDATE_DRAFT_INVOICE'; payload: DraftInvoice }
  | { type: 'ADD_DRAFT_INVOICE'; payload: DraftInvoice }
  | { type: 'REMOVE_DRAFT_QUOTE'; payload: string }
  | { type: 'REMOVE_DRAFT_INVOICE'; payload: string }
  | { type: 'SET_OPTIMIZATION_RESULT'; payload: any | null }
  | { type: 'UPDATE_PROJECT_COMPONENTS'; payload: any[] }
  | { type: 'UPDATE_PROFILE_EDIT'; payload: { profileId: string; edits: Partial<Profile> } }
  | { type: 'UPDATE_INVENTORY_EDIT'; payload: { key: string; value: any } }
  | { type: 'CLEAR_PROFILE_EDIT'; payload: { profileId: string } }
  | { type: 'CLEAR_PROFILE_EDITS' }
  | { type: 'SAVE_SNAPSHOT'; payload: { label: string; description?: string } }
  | { type: 'RESTORE_SNAPSHOT'; payload: { id: string } }
  | { type: 'DELETE_SNAPSHOT'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: WorkspaceTabId }
  | { type: 'HYDRATE_FROM_STORAGE'; payload: FabricatorWorkspaceState }
  | { type: 'MARK_SAVED'; payload: string };

const initialState: FabricatorWorkspaceState = {
  currentProject: null,
  currentCustomer: null,
  currentMeasurement: null,
  draftQuotes: [],
  draftInvoices: [],
  profileEdits: {},
  inventoryEdits: {},
  activeWorkspaceTab: 'projects',
  lastSaved: null,
  snapshots: [],
  currentSnapshotId: null,
};

const STORAGE_KEY = 'fabricator-workspace-v1';

const FabricatorWorkspaceContext = createContext<{
  state: FabricatorWorkspaceState;
  dispatch: React.Dispatch<FabricatorWorkspaceAction>;
}>({
  state: initialState,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  dispatch: () => {},
});

const workspaceReducer = (
  state: FabricatorWorkspaceState,
  action: FabricatorWorkspaceAction,
): FabricatorWorkspaceState => {
  switch (action.type) {
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'SET_CURRENT_CUSTOMER':
      return { ...state, currentCustomer: action.payload };
    case 'SET_MEASUREMENT_DATA':
      return { ...state, currentMeasurement: action.payload };
    case 'UPDATE_DRAFT_QUOTE': {
      const existingIndex = state.draftQuotes.findIndex((q) => q.id === action.payload.id);
      const draftQuotes =
        existingIndex >= 0
          ? state.draftQuotes.map((q, i) => (i === existingIndex ? action.payload : q))
          : [...state.draftQuotes, action.payload];
      return { ...state, draftQuotes };
    }
    case 'UPDATE_DRAFT_INVOICE': {
      const existingIndex = state.draftInvoices.findIndex((q) => q.id === action.payload.id);
      const draftInvoices =
        existingIndex >= 0
          ? state.draftInvoices.map((q, i) => (i === existingIndex ? action.payload : q))
          : [...state.draftInvoices, action.payload];
      return { ...state, draftInvoices };
    }
    case 'ADD_DRAFT_INVOICE':
      return { ...state, draftInvoices: [...state.draftInvoices, action.payload] };
    case 'REMOVE_DRAFT_QUOTE':
      return {
        ...state,
        draftQuotes: state.draftQuotes.filter((q) => q.id !== action.payload),
      };
    case 'REMOVE_DRAFT_INVOICE':
      return {
        ...state,
        draftInvoices: state.draftInvoices.filter((inv) => inv.id !== action.payload),
      };
    case 'SET_OPTIMIZATION_RESULT':
      return state.currentProject
        ? {
            ...state,
            currentProject: {
              ...state.currentProject,
              optimization: action.payload,
            },
          }
        : state;
    case 'UPDATE_PROJECT_COMPONENTS':
      return state.currentProject
        ? {
            ...state,
            currentProject: {
              ...state.currentProject,
              components: action.payload,
              updatedAt: new Date(),
            },
          }
        : state;
    case 'UPDATE_PROFILE_EDIT': {
      const { profileId, edits } = action.payload;
      return {
        ...state,
        profileEdits: {
          ...state.profileEdits,
          [profileId]: {
            ...(state.profileEdits[profileId] || {}),
            ...edits,
          },
        },
      };
    }
    case 'CLEAR_PROFILE_EDIT': {
      const next = { ...state.profileEdits };
      delete next[action.payload.profileId];
      return { ...state, profileEdits: next };
    }
    case 'CLEAR_PROFILE_EDITS':
      return { ...state, profileEdits: {} };
    case 'UPDATE_INVENTORY_EDIT': {
      const { key, value } = action.payload;
      return {
        ...state,
        inventoryEdits: {
          ...state.inventoryEdits,
          [key]: value,
        },
      };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeWorkspaceTab: action.payload };
    case 'HYDRATE_FROM_STORAGE':
      return { ...state, ...action.payload };
    case 'MARK_SAVED':
      return { ...state, lastSaved: action.payload };
    case 'SAVE_SNAPSHOT': {
      const { label, description } = action.payload;
      const snapshotState: FabricatorWorkspaceState = {
        ...state,
        snapshots: [],
        currentSnapshotId: state.currentSnapshotId,
      };
      const snapshot: WorkspaceSnapshot = {
        id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label,
        description,
        createdAt: new Date().toISOString(),
        state: snapshotState,
      };
      const nextSnapshots = [snapshot, ...state.snapshots].slice(0, 10);
      return {
        ...state,
        snapshots: nextSnapshots,
        currentSnapshotId: snapshot.id,
      };
    }
    case 'RESTORE_SNAPSHOT': {
      const snap = state.snapshots.find((s) => s.id === action.payload.id);
      if (!snap) return state;
      // Restore the saved state but keep the snapshots list itself
      return {
        ...snap.state,
        snapshots: state.snapshots,
        currentSnapshotId: snap.id,
      };
    }
    case 'DELETE_SNAPSHOT': {
      const remaining = state.snapshots.filter((s) => s.id !== action.payload.id);
      return {
        ...state,
        snapshots: remaining,
        currentSnapshotId:
          state.currentSnapshotId === action.payload.id ? null : state.currentSnapshotId,
      };
    }
    default:
      return state;
  }
};

export const FabricatorWorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Load workspace from Supabase (with localStorage fallback) on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Lazy import to avoid circular deps at module init time
    void import('@/lib/workspace/WorkspaceSyncService')
      .then(({ WorkspaceSyncService }) => {
        const service = new WorkspaceSyncService(STORAGE_KEY);
        return service.loadWorkspaceSnapshot();
      })
      .then((result) => {
        if (!result || !result.data) return;
        const loaded = result.data;
        const hydrated: FabricatorWorkspaceState = {
          ...initialState,
          ...loaded,
          profileEdits: loaded.profileEdits || {},
          inventoryEdits: loaded.inventoryEdits || {},
          lastSaved: loaded.lastSaved || null,
        };
        dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: hydrated });
      })
      .catch((error) => {
        console.warn('Failed to load fabricator workspace from sync service:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist workspace to Supabase (with localStorage fallback) whenever state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    void import('@/lib/workspace/WorkspaceSyncService')
      .then(({ WorkspaceSyncService }) => {
        const service = new WorkspaceSyncService(STORAGE_KEY);
        return service.saveWorkspaceSnapshot(state);
      })
      .then((result) => {
        // Optional: could surface sync status in UI later; for now just log failures.
        if (!result?.success) {
          // eslint-disable-next-line no-console
          console.warn('Workspace sync reported failure status', result);
        }
      })
      .catch((error) => {
        console.warn('Failed to persist fabricator workspace via sync service:', error);
      });
  }, [state]);

  return (
    <FabricatorWorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </FabricatorWorkspaceContext.Provider>
  );
};

export const useFabricatorWorkspace = () => {
  const ctx = useContext(FabricatorWorkspaceContext);
  if (!ctx) {
    throw new Error('useFabricatorWorkspace must be used within a FabricatorWorkspaceProvider');
  }
  return ctx;
};


