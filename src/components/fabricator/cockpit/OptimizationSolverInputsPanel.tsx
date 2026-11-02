/**
 * Supported Tier-3 solver controls (Batch 2). Everything shown here changes the
 * solver input or reports an approved/acknowledged fact; nothing is estimated.
 * AICS-001: deterministic algorithm choice only; stock lengths are approved
 * authority values; readiness issues are the operator's acknowledgement state.
 */
import type {
  OptimizationMode,
  SolverInputIssue,
  StockReadiness,
} from '@/lib/fabricator/optimization/solverInputs';
import React from 'react';

export interface OptimizationSolverInputsPanelProps {
  mode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  /** Approved stock lengths per design profile (empty array = not approved). */
  stockOptionsByProfile: Record<string, number[]>;
  stockSelectionByProfile: Record<string, number>;
  onStockSelectionChange: (profileId: string, stockLengthMm: number) => void;
  /** Approved kerf/trim bound to this revision, when the authority resolved. */
  machining: { kerfMm: number; trimMm: number } | null;
  authorityError: string | null;
  inputIssues: SolverInputIssue[];
  readiness: StockReadiness | null;
  /** Actual bars consumed per profile from the last solved plan (not an estimate). */
  actualBarsByProfile: Record<string, { bars: number; stockLengthMm: number }> | null;
  disabled?: boolean;
}

export const OptimizationSolverInputsPanel: React.FC<OptimizationSolverInputsPanelProps> = ({
  mode, onModeChange,
  stockOptionsByProfile, stockSelectionByProfile, onStockSelectionChange,
  machining, authorityError, inputIssues, readiness, actualBarsByProfile, disabled,
}) => {
  const profileIds = Object.keys(stockOptionsByProfile).sort();
  return (
    <section data-testid="solver-inputs-panel" className="mx-4 mb-4 rounded border border-amber-600/20 bg-background p-3 text-xs text-primary-foreground space-y-3">
      <header className="text-[10px] uppercase tracking-widest text-warning">Solver inputs (approved · revision-bound)</header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Run mode</span>
          <select
            aria-label="Optimization run mode"
            value={mode}
            disabled={disabled}
            onChange={(event) => onModeChange(event.target.value as OptimizationMode)}
            className="rounded border border-border bg-background px-2 py-1 text-foreground"
          >
            <option value="production">Production run (approved stock · acknowledged inventory · records evidence)</option>
            <option value="simulation">Inventory-free simulation (no evidence · cannot unlock production)</option>
          </select>
        </label>
        <div className="flex flex-col gap-1" data-testid="algorithm-note">
          <span className="text-muted-foreground">Algorithm</span>
          <span className="rounded border border-border bg-background px-2 py-1 text-foreground">
            Rule-based Tier-3 selection (greedy / linear) — not operator-tunable (AICS-001 / FP-016). Strategy weights do not change it.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4" data-testid="approved-machining">
        <span>Saw kerf: <strong className="text-warning">{machining ? `${machining.kerfMm} mm` : 'not approved'}</strong></span>
        <span>Bar-end trim: <strong className="text-warning">{machining ? `${machining.trimMm} mm` : 'not approved'}</strong></span>
      </div>
      {authorityError && (
        <p role="alert" className="rounded border border-red-500/40 bg-red-950/40 p-2 text-red-200">{authorityError}</p>
      )}

      {profileIds.length > 0 && (
        <table className="w-full text-xs" data-testid="approved-stock-table">
          <thead className="text-[10px] uppercase text-amber-700">
            <tr>
              <th className="text-start px-2 py-1 font-medium">Profile</th>
              <th className="text-start px-2 py-1 font-medium">Approved stock length</th>
              <th className="text-end px-2 py-1 font-medium">Bars in last plan</th>
            </tr>
          </thead>
          <tbody>
            {profileIds.map((profileId) => {
              const options = stockOptionsByProfile[profileId] ?? [];
              const selected = stockSelectionByProfile[profileId] ?? (options.length === 1 ? options[0] : undefined);
              const actual = actualBarsByProfile?.[profileId];
              return (
                <tr key={profileId} className="border-t border-amber-900/20">
                  <td className="px-2 py-1 font-mono text-warning" dir="ltr">{profileId}</td>
                  <td className="px-2 py-1" dir="ltr">
                    {options.length === 0 ? (
                      <span className="text-destructive">not approved</span>
                    ) : options.length === 1 ? (
                      <span className="font-mono">{options[0]} mm</span>
                    ) : (
                      <select
                        aria-label={`Approved stock length for ${profileId}`}
                        value={selected ?? ''}
                        disabled={disabled}
                        onChange={(event) => onStockSelectionChange(profileId, Number(event.target.value))}
                        className="rounded border border-border bg-background px-2 py-0.5 text-foreground"
                      >
                        <option value="" disabled>choose…</option>
                        {options.map((mm) => <option key={mm} value={mm}>{mm} mm</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {actual ? `${actual.bars} × ${actual.stockLengthMm} mm` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {inputIssues.length > 0 && (
        <ul data-testid="solver-input-issues" className="list-disc space-y-1 ps-5 text-warning">
          {inputIssues.map((issue, index) => <li key={`${issue.code}-${issue.profileId ?? index}`}>{issue.message}</li>)}
        </ul>
      )}

      {readiness && (
        <div data-testid="stock-readiness" className={readiness.ready ? 'text-success' : 'text-warning'}>
          {readiness.ready ? (
            <p>Owned stock acknowledged for this revision and BOM (soft availability check).</p>
          ) : (
            <ul className="list-disc space-y-1 ps-5">
              {readiness.issues.map((issue) => <li key={issue.code} data-issue={issue.code}>{issue.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
