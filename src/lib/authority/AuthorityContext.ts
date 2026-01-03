/**
 * @file AuthorityContext.ts
 * @description Single source of truth for system authority state.
 * Prevents authority signal drift across components.
 */

import { createContext, useContext } from 'react';

export type OperationMode = 'sandbox' | 'production' | 'certified';

export interface AuthorityState {
  mode: OperationMode;
  workshopId?: string;
  isLocked: boolean; // True if mode === 'certified'
  policies: readonly string[];
}

export const DEFAULT_AUTHORITY_STATE: Readonly<AuthorityState> = Object.freeze({
  mode: 'production',
  isLocked: false,
  policies: Object.freeze(['basic_validation'])
});

export const AuthorityContext = createContext<AuthorityState>(DEFAULT_AUTHORITY_STATE);

export const useAuthority = () => useContext(AuthorityContext);

