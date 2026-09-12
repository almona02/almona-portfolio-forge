/**
 * FP-024A — Manufacturing settings provenance inspector.
 *
 * Displays the same resolved object consumed by manufacturing execution.
 * Does not compute kerf, weld, offset, or remnant values locally.
 */
import {
  manufacturingSettingsProvenanceRows,
  type ResolvedManufacturingSettings,
} from '@/lib/fabricator/ManufacturingSettings';

interface ManufacturingSettingsProvenancePanelProps {
  settings: ResolvedManufacturingSettings;
}

export function ManufacturingSettingsProvenancePanel({
  settings,
}: ManufacturingSettingsProvenancePanelProps) {
  const rows = manufacturingSettingsProvenanceRows(settings);
  return (
    <section
      aria-label="Manufacturing settings provenance"
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Manufacturing settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Profile {settings.namedProfileId}
          {settings.machineId ? ` · Machine ${settings.machineId}` : ''}
        </p>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1">Setting</th>
            <th className="py-1">Value (mm)</th>
            <th className="py-1">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-1 font-mono">{row.key}</td>
              <td className="py-1 font-mono">{row.valueMm}</td>
              <td className="py-1">{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
