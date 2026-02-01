import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SectionId } from '@/stores/fabricatorUIStore';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface ToolbarItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}

interface SectionContextValue {
  currentSection: SectionId;
  breadcrumbs: Breadcrumb[];
  sectionTools: ToolbarItem[];
  updateBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  updateSectionTools: (tools: ToolbarItem[]) => void;
  addBreadcrumb: (crumb: Breadcrumb) => void;
  removeLastBreadcrumb: () => void;
}

const FabricatorSectionContext = createContext<SectionContextValue | undefined>(undefined);

interface FabricatorSectionProviderProps {
  sectionId: SectionId;
  children: ReactNode;
  initialBreadcrumbs?: Breadcrumb[];
  initialTools?: ToolbarItem[];
}

export const FabricatorSectionProvider: React.FC<FabricatorSectionProviderProps> = ({
  sectionId,
  children,
  initialBreadcrumbs = [{ label: 'Home', href: '/' }],
  initialTools = [],
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>(initialBreadcrumbs);
  const [sectionTools, setSectionTools] = useState<ToolbarItem[]>(initialTools);
  
  const updateBreadcrumbs = (newBreadcrumbs: Breadcrumb[]) => {
    setBreadcrumbs(newBreadcrumbs);
  };
  
  const updateSectionTools = (tools: ToolbarItem[]) => {
    setSectionTools(tools);
  };
  
  const addBreadcrumb = (crumb: Breadcrumb) => {
    setBreadcrumbs(prev => [...prev, crumb]);
  };
  
  const removeLastBreadcrumb = () => {
    setBreadcrumbs(prev => prev.slice(0, -1));
  };
  
  const value: SectionContextValue = {
    currentSection: sectionId,
    breadcrumbs,
    sectionTools,
    updateBreadcrumbs,
    updateSectionTools,
    addBreadcrumb,
    removeLastBreadcrumb,
  };
  
  return (
    <FabricatorSectionContext.Provider value={value}>
      {children}
    </FabricatorSectionContext.Provider>
  );
};

export const useFabricatorSection = () => {
  const context = useContext(FabricatorSectionContext);
  if (!context) {
    throw new Error('useFabricatorSection must be used within a FabricatorSectionProvider');
  }
  return context;
};
