import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { Badge } from '@/shared/ui/ui/badge';
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Integration registry UI. Does not implement SAP/Odoo. Native Yilmaz export exists elsewhere.
 */
export const StudioIntegrationsPage: React.FC = () => {
  const { t } = useTranslation('fabricator');

  const rows = [
    {
      domain: 'Customer',
      record: 'Native',
      note: t('industrial.erp.customers_native', 'Fabricator customers workspace'),
    },
    {
      domain: 'Quote',
      record: 'Native',
      note: t('industrial.erp.quote_native', 'Pose commercial step'),
    },
    {
      domain: 'Order',
      record: 'Native',
      note: t('industrial.erp.orders_native', 'Studio orders'),
    },
    {
      domain: 'Stock',
      record: 'Native',
      note: t('industrial.erp.stock_native', 'Inventory dashboard'),
    },
    {
      domain: 'Production',
      record: 'Native',
      note: t('industrial.erp.yilmaz', 'Yilmaz CNC / G-code / MDB / CSV'),
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
    },
    {
      domain: 'SAP',
      record: 'External',
      note: t('industrial.erp.planned', 'Not available / planned'),
    },
    {
      domain: 'Odoo',
      record: 'External',
      note: t('industrial.erp.planned', 'Not available / planned'),
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
          'System-of-record labels only. SAP and Odoo are not implemented in this task.',
        )}
      </p>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase text-amber-700">
          <tr>
            <th className="text-start py-1">Domain</th>
            <th className="text-start py-1">System of record</th>
            <th className="text-start py-1">Notes</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudioIntegrationsPage;
