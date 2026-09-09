import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { cn } from '@/lib/utils';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

const GROUPS = [
  {
    id: 'system',
    labelKey: 'industrial.master.system',
    defaultLabel: 'System library',
    items: [
      { to: fabricatorRoutes.studioData(), label: 'Systems' },
      { to: fabricatorRoutes.studioData('profiles'), label: 'Profiles' },
      { to: fabricatorRoutes.studioData('tuning'), label: 'Operation templates' },
      { to: fabricatorRoutes.studioData('patterns'), label: 'Patterns' },
    ],
  },
  {
    id: 'factory',
    labelKey: 'industrial.master.factory',
    defaultLabel: 'Factory',
    items: [
      { to: fabricatorRoutes.studioDataStock(), label: 'Stock / remnants' },
    ],
  },
  {
    id: 'commercial',
    labelKey: 'industrial.master.commercial',
    defaultLabel: 'Commercial',
    items: [
      { to: fabricatorRoutes.studioData('customers'), label: 'Customers' },
      { to: fabricatorRoutes.studioProductionOrders(), label: 'Orders' },
    ],
  },
  {
    id: 'integrations',
    labelKey: 'industrial.master.integrations',
    defaultLabel: 'Integrations',
    items: [
      { to: fabricatorRoutes.studioDataIntegrations(), label: 'Yilmaz / ERP' },
    ],
  },
] as const;

export const MasterDataWorkspace: React.FC = () => {
  const { t } = useTranslation('fabricator');

  return (
    <div className="h-full min-h-0 flex" data-testid="master-data-workspace">
      <nav
        className="w-52 flex-shrink-0 border-e border-amber-600/20 overflow-y-auto bg-[#0c0c0c]"
        aria-label={t('industrial.master.nav', 'Master data')}
      >
        {GROUPS.map((g) => (
          <div key={g.id} className="py-2">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-widest text-amber-700">
              {t(g.labelKey, g.defaultLabel)}
            </div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-xs text-slate-400 hover:text-amber-200',
                    isActive && 'text-amber-100 bg-amber-500/10 border-s-2 border-s-amber-400',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="flex-1 min-w-0 min-h-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
