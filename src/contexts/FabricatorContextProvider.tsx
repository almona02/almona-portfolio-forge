/**
 * Fabricator Context Provider
 * 
 * Manages contextual tools that appear in the UniversalNavSidebar
 * for each fabricator section. This enables a single sidebar pattern
 * instead of competing dual sidebars.
 */

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ContextTool {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
  badgeType?: 'normal' | 'warning' | 'error' | 'success';
}

interface FabricatorContextValue {
  tools: ContextTool[];
  sectionId: string | null;
  updateTools: (sectionId: string, tools: ContextTool[]) => void;
  clearTools: () => void;
}

export const FabricatorContext = createContext<FabricatorContextValue | undefined>(undefined);

interface FabricatorContextProviderProps {
  children: ReactNode;
}

export const FabricatorContextProvider: React.FC<FabricatorContextProviderProps> = ({
  children,
}) => {
  const [tools, setTools] = useState<ContextTool[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const updateTools = useCallback((newSectionId: string, newTools: ContextTool[]) => {
    setSectionId(newSectionId);
    setTools(newTools);
  }, []);

  const clearTools = useCallback(() => {
    setTools([]);
    setSectionId(null);
  }, []);

  const value: FabricatorContextValue = {
    tools,
    sectionId,
    updateTools,
    clearTools,
  };

  return (
    <FabricatorContext.Provider value={value}>
      {children}
    </FabricatorContext.Provider>
  );
};

export const useFabricatorContext = (): FabricatorContextValue => {
  const context = useContext(FabricatorContext);
  if (!context) {
    throw new Error('useFabricatorContext must be used within FabricatorContextProvider');
  }
  return context;
};
