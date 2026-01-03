/**
 * @file PersonaContextLayer.tsx
 * @description Wrapper component for persona-specific UI around existing workflow.
 * Adds persona-specific UI without replacing the core workflow.
 */

import { usePersona } from '@/hooks/usePersona';
import React from 'react';
import { ApprovalQueueSidebar } from './ApprovalQueueSidebar';
import { InspectorOverlay } from './InspectorOverlay';
import { PersonaBadge } from './PersonaBadge';
import { WorkshopSwitcherSidebar } from './WorkshopSwitcherSidebar';

interface PersonaContextLayerProps {
  children: React.ReactNode;
}

export const PersonaContextLayer: React.FC<PersonaContextLayerProps> = ({ children }) => {
  const { persona, isLoading } = usePersona();

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Persona Badge - Fixed position top-left */}
      <div className="fixed top-4 left-4 z-40">
        <PersonaBadge />
      </div>

      {/* Supervisor Sidebar - Approval Queue */}
      {persona === 'supervisor' && (
        <ApprovalQueueSidebar />
      )}

      {/* Manager Sidebar - Workshop Switcher */}
      {persona === 'manager' && (
        <WorkshopSwitcherSidebar />
      )}

      {/* Inspector Overlay - Read-only banner */}
      {persona === 'inspector' && (
        <InspectorOverlay />
      )}

      {/* Existing workflow content - NO CHANGES */}
      {children}
    </div>
  );
};












