/**
 * @file PersonaBadge.tsx
 * @description Persona indicator badge.
 */

import { usePersona } from '@/hooks/usePersona';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Briefcase, Eye, Shield, User } from 'lucide-react';
import React from 'react';

const PERSONA_CONFIG = {
  operator: { icon: User, color: 'bg-blue-500/20 text-blue-300 border-blue-500/50', label: 'Operator' },
  supervisor: { icon: Shield, color: 'bg-amber-500/20 text-amber-300 border-amber-500/50', label: 'Supervisor' },
  manager: { icon: Briefcase, color: 'bg-amber-500/20 text-amber-300 border-amber-500/50', label: 'Manager' },
  inspector: { icon: Eye, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', label: 'Inspector' },
};

interface PersonaBadgeProps {
  className?: string;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ className }) => {
  const { persona, isLoading } = usePersona();

  if (isLoading) return null;

  const config = PERSONA_CONFIG[persona];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold px-3 py-1.5 flex items-center gap-2',
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
};












