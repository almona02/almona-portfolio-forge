/**
 * @file PersonaGate.tsx
 * @description Conditional rendering component with permission checks.
 * Hides/disables features based on persona permissions.
 */

import { useAuth } from '@/context/AuthContext';
import { useOperationMode } from '@/hooks/useOperationMode';
import { usePersona } from '@/hooks/usePersona';
import { logPersonaAction } from '@/lib/persona/personaAudit';
import React from 'react';

interface PersonaGateProps {
  permission: keyof ReturnType<typeof usePersona>['permissions'];
  mode?: 'sandbox' | 'production' | 'certified';
  fallback?: React.ReactNode;
  children: React.ReactNode;
  action?: string;
  className?: string;
}

export const PersonaGate: React.FC<PersonaGateProps> = ({
  permission,
  mode,
  fallback,
  children,
  action = 'access',
  className,
}) => {
  const { persona, permissions, isLoading } = usePersona();
  const { mode: currentMode } = useOperationMode();
  const { user } = useAuth();

  if (isLoading) {
    return null;
  }

  // Check permission
  const hasPermission = permissions[permission];

  // Check mode requirement
  const modeAllowed = !mode || currentMode === mode || currentMode === 'certified';

  const allowed = hasPermission && modeAllowed;

  // Log access attempt
  if (user?.id) {
    logPersonaAction(
      user.id,
      persona,
      currentMode,
      action,
      allowed,
      { permission, modeRequired: mode, modeCurrent: currentMode }
    );
  }

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <div className={className}>{children}</div>;
};












