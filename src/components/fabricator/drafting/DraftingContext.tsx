// src/components/fabricator/drafting/DraftingContext.tsx
import { createContext, useContext } from 'react';
import type { DraftingContextType } from './types/drafting';

export const DraftingContext = createContext<DraftingContextType | null>(null);

export const useDraftingContext = (): DraftingContextType => {
  const context = useContext(DraftingContext);
  if (!context) {
    throw new Error('useDraftingContext must be used within DraftingContext.Provider');
  }
  return context;
};

