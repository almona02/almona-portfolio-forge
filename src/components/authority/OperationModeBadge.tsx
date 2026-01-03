/**
 * @file OperationModeBadge.tsx
 * @description Visual indicator of system operational mode.
 * Always visible, auto-collapses in sandbox mode after 5 seconds.
 * Supports RTL (Arabic) layout.
 */

import type { OperationMode } from '@/lib/authority/AuthorityContext';
import { cn } from '@/lib/utils';
import { FlaskConical, Lock, Shield, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OperationModeBadgeProps {
  mode: OperationMode;
  workshopId?: string;
  className?: string;
}

export const OperationModeBadge: React.FC<OperationModeBadgeProps> = ({ 
  mode, 
  workshopId, 
  className 
}) => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse sandbox only
  useEffect(() => {
    if (mode === 'sandbox') {
      const timer = setTimeout(() => setIsCollapsed(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setIsCollapsed(false); // Always expand Production/Certified
    }
  }, [mode]);

  const config = {
    sandbox: {
      label: 'SANDBOX',
      sub: 'Not Saved',
      icon: FlaskConical,
      style: 'border-slate-600 bg-slate-900/90 text-slate-400',
      desc: 'Testing Mode'
    },
    production: {
      label: 'PRODUCTION',
      sub: 'Logged',
      icon: Shield,
      style: 'border-orange-500/50 bg-orange-950/90 text-orange-400',
      desc: 'Live Operations'
    },
    certified: {
      label: 'CERTIFIED',
      sub: 'Locked',
      icon: Lock,
      style: 'border-yellow-500 bg-yellow-950/95 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
      desc: 'Strict Compliance'
    }
  }[mode];

  const Icon = config.icon;

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          "fixed top-4 z-50 p-2 rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-110",
          isRTL ? "left-4" : "right-4",
          config.style,
          className
        )}
        title={config.desc}
        aria-label={`${config.label} - ${config.desc}`}
      >
        <Icon size={18} />
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed top-4 z-50 flex flex-col border rounded-lg shadow-xl backdrop-blur-md transition-all duration-300",
        isRTL ? "left-4 items-end" : "right-4 items-start",
        config.style,
        className
      )}
      role="status"
      aria-label={`${config.label} - ${config.desc}`}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 px-3 py-2">
        <Icon size={18} className="shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-widest">{config.label}</span>
          <span className="text-[10px] opacity-75 font-mono uppercase">{config.sub}</span>
        </div>
        
        {mode === 'sandbox' && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsCollapsed(true); 
            }}
            className="ml-2 opacity-50 hover:opacity-100 p-1 transition-opacity"
            aria-label="Collapse badge"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Certified Extras */}
      {mode === 'certified' && (
        <div className={cn(
          "w-full px-3 py-1.5 border-t text-[9px] flex items-center gap-1.5 opacity-90",
          "border-yellow-500/30"
        )}>
          <Shield size={10} />
          <span>{isRTL ? 'التدقيق نشط' : 'Audit Active'}</span>
          <span className="mx-1">•</span>
          <Lock size={10} />
          <span>{isRTL ? 'لا تجاوزات' : 'No Overrides'}</span>
        </div>
      )}

      {/* Workshop ID */}
      {workshopId && (
        <div className="px-3 pb-1 text-[9px] opacity-40 font-mono">
          WS: {workshopId.substring(0, 6)}...
        </div>
      )}
    </div>
  );
};

