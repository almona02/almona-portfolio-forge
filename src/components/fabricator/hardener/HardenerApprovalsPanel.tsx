/**
 * Admin hardener verification queue: approve / reject / override / revoke.
 * Server RPCs are authoritative; client only displays checks and missing evidence.
 */

import {
  adminOverrideHardener,
  adminReviewHardener,
  adminRevokeHardener,
  listHardenerProposals,
} from '@/lib/fabricator/hardener/hardenerAdminApi';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { useCallback, useEffect, useState } from 'react';

type ProposalRow = {
  id: string;
  position_id: string;
  position_revision: number;
  system_pack_id: string;
  proposed_hardener_code: string;
  opening_type: string | null;
  material: string | null;
  glass_thickness_mm: number | null;
  sash_width_mm: number | null;
  sash_height_mm: number | null;
  sash_weight_kg: number | null;
  compatibility_checks: Array<{ check?: string; passed?: boolean; detail?: string }>;
  missing_evidence: string[] | null;
  status: string;
  engineering_evidence: Record<string, unknown> | null;
};

function asProposal(row: Record<string, unknown>): ProposalRow {
  const checks = row.compatibility_checks;
  return {
    id: String(row.id),
    position_id: String(row.position_id),
    position_revision: Number(row.position_revision),
    system_pack_id: String(row.system_pack_id),
    proposed_hardener_code: String(row.proposed_hardener_code),
    opening_type: (row.opening_type as string | null) ?? null,
    material: (row.material as string | null) ?? null,
    glass_thickness_mm: row.glass_thickness_mm == null ? null : Number(row.glass_thickness_mm),
    sash_width_mm: row.sash_width_mm == null ? null : Number(row.sash_width_mm),
    sash_height_mm: row.sash_height_mm == null ? null : Number(row.sash_height_mm),
    sash_weight_kg: row.sash_weight_kg == null ? null : Number(row.sash_weight_kg),
    compatibility_checks: Array.isArray(checks)
      ? (checks as ProposalRow['compatibility_checks'])
      : [],
    missing_evidence: Array.isArray(row.missing_evidence)
      ? (row.missing_evidence as string[])
      : [],
    status: String(row.status),
    engineering_evidence:
      row.engineering_evidence && typeof row.engineering_evidence === 'object'
        ? (row.engineering_evidence as Record<string, unknown>)
        : null,
  };
}

export function HardenerApprovalsPanel() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [overrideEvidence, setOverrideEvidence] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const pending = await listHardenerProposals('pending');
    if (!pending.ok) {
      setMessage(pending.error);
      return;
    }
    setRows(pending.rows.map(asProposal));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (id: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(id);
    setMessage('');
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error || 'Action failed');
      return;
    }
    setMessage('Hardener action recorded.');
    await refresh();
  };

  return (
    <section className="space-y-3" data-testid="hardener-approvals-panel">
      <header>
        <h2 className="text-lg font-semibold text-amber-200">Hardener verification</h2>
        <p className="text-sm text-slate-400">
          Manufacturing stays stopped until verification or a permitted, audited override.
          Failed compatibility checks and missing evidence are shown below.
        </p>
      </header>

      {message && (
        <p role="status" className="text-sm text-amber-200 break-words">
          {message}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No pending hardener proposals.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const failed = row.compatibility_checks.filter((c) => c.passed !== true);
            const missing = row.missing_evidence ?? [];
            return (
              <li
                key={row.id}
                className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-4 space-y-3"
                data-testid={`hardener-proposal-${row.id}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-mono text-amber-100">{row.proposed_hardener_code}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {row.system_pack_id} · pose {row.position_id.slice(0, 8)}… · rev{' '}
                      {row.position_revision}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5 text-right">
                    <div>opening: {row.opening_type || '—'}</div>
                    <div>material: {row.material || '—'}</div>
                    <div>glass: {row.glass_thickness_mm ?? '—'} mm</div>
                    <div>
                      sash: {row.sash_width_mm ?? '—'}×{row.sash_height_mm ?? '—'} mm ·{' '}
                      {row.sash_weight_kg ?? '—'} kg
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-slate-400">Compatibility checks</div>
                  {row.compatibility_checks.length === 0 ? (
                    <p className="text-yellow-200/80">No checks submitted (missing evidence).</p>
                  ) : (
                    row.compatibility_checks.map((c, idx) => (
                      <div
                        key={`${c.check}-${idx}`}
                        className={c.passed ? 'text-emerald-300/90' : 'text-red-300'}
                      >
                        {c.passed ? 'PASS' : 'FAIL'} · {c.check || 'check'}
                        {c.detail ? ` — ${c.detail}` : ''}
                      </div>
                    ))
                  )}
                  {missing.length > 0 && (
                    <p className="text-yellow-200/90">Missing evidence: {missing.join(', ')}</p>
                  )}
                  {failed.length > 0 && (
                    <p className="text-red-300/90">
                      {failed.length} failed check(s) — approve blocked; override permitted with
                      audit.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === row.id || failed.length > 0 || missing.length > 0}
                    onClick={() =>
                      void run(row.id, () => adminReviewHardener(row.id, 'approve', 'checks pass'))
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() =>
                      void run(row.id, () =>
                        adminReviewHardener(row.id, 'reject', 'rejected by admin'),
                      )
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() =>
                      void run(row.id, () => adminRevokeHardener(row.id, 'revoked by admin'))
                    }
                  >
                    Revoke
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="text-xs text-slate-400">Scoped override (audited)</div>
                  <Input
                    placeholder="Reason (min 8 chars)"
                    value={overrideReason[row.id] ?? ''}
                    onChange={(e) =>
                      setOverrideReason((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Supporting evidence ref"
                    value={overrideEvidence[row.id] ?? ''}
                    onChange={(e) =>
                      setOverrideEvidence((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    disabled={busyId === row.id || (overrideReason[row.id] ?? '').trim().length < 8}
                    onClick={() =>
                      void run(row.id, () =>
                        adminOverrideHardener({
                          proposalId: row.id,
                          hardenerCode: row.proposed_hardener_code,
                          reason: (overrideReason[row.id] ?? '').trim(),
                          supportingEvidence: {
                            reference: (overrideEvidence[row.id] ?? '').trim() || 'unspecified',
                          },
                          scope: 'position',
                        }),
                      )
                    }
                  >
                    Approve with override
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
