import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type IntegrationRow = {
  domain: string;
  record: 'Native' | 'Not recorded';
  note: string;
  href?: string;
};

/**
 * UP-23 — Honest integration capability registry.
 * No SAP/Odoo product names until a connector contract exists.
 * Native rows link to existing Studio surfaces.
 */
export const StudioIntegrationsPage: React.FC = () => {
  const { t } = useTranslation('fabricator');

  const rows: IntegrationRow[] = [
    {
      domain: 'Customer',
      record: 'Native',
      note: t('industrial.erp.customers_native', 'Fabricator customers workspace'),
      href: fabricatorRoutes.studioData('customers'),
    },
    {
      domain: 'Quote',
      record: 'Native',
      note: t('industrial.erp.quote_native', 'Pose commercial step — open a project position'),
      href: fabricatorRoutes.studioProjects(),
    },
    {
      domain: 'Order',
      record: 'Native',
      note: t('industrial.erp.orders_native', 'Studio orders (owner-scoped)'),
      href: fabricatorRoutes.studioOrders(),
    },
    {
      domain: 'Stock',
      record: 'Native',
      note: t('industrial.erp.stock_native', 'Owned workshop inventory'),
      href: fabricatorRoutes.studioDataStock(),
    },
    {
      domain: 'Production export',
      record: 'Native',
      note: t('industrial.erp.yilmaz', 'Yilmaz CNC / G-code / MDB / CSV from production docs'),
      href: fabricatorRoutes.studioProduction(),
    },
    {
      domain: 'Invoice',
      record: 'Not recorded',
      note: NOT_RECORDED,
    },
    {
      domain: 'Service',
      record: 'Native',
      note: t('industrial.erp.tickets', 'Existing ticketing'),
      href: '/support',
    },
  ];

  return (
    <div className="p-4" data-testid="studio-integrations-page">
      <h2 className="text-sm font-semibold text-amber-100 mb-1">
        {t('industrial.master.integrations', 'Integrations')}
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        {t(
          'industrial.erp.disclaimer',
          'Capability registry only. Native rows open Studio surfaces that already exist. External ERP connectors are not configured — no SAP/Odoo product is claimed until a connector contract is approved.',
        )}
      </p>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase text-amber-700">
          <tr>
            <th className="text-start py-1">Domain</th>
            <th className="text-start py-1">System of record</th>
            <th className="text-start py-1">Notes</th>
            <th className="text-start py-1">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.domain} className="border-t border-amber-900/30">
              <td className="py-2">{r.domain}</td>
              <td className="py-2">
                <Badge variant="outline" className="text-[10px] border-amber-700/40 text-amber-200">
                  {r.record}
                </Badge>
              </td>
              <td className="py-2 text-slate-400">{r.note}</td>
              <td className="py-2">
                {r.href ? (
                  <Button asChild variant="outline" size="sm" className="h-7 text-[10px]">
                    <Link to={r.href}>Open</Link>
                  </Button>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudioIntegrationsPage;
