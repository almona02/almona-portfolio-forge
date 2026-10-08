/**
 * Admin-only manufacturing approval queue.
 * Approve / reject pending catalogue & rule review requests; revoke seed authority.
 * AICS-001: deterministic admin gate — no ML in the approval path.
 */

import { useAuth } from '@/context/AuthContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

type ApprovalRequest = {
  id: string;
  owner_user_id: string;
  position_id: string;
  position_revision: number;
  system_pack_id: string;
  catalogue_reference: string;
  rule_reference: string;
  notes: string;
  status: string;
  approval_id: string | null;
  requested_at: string;
};

type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};
const listClient = supabase as unknown as RpcClient;

function buildSeedStylePayload(packId: string, approvalId: string): Record<string, unknown> {
  return {
    schema: 'almona.manufacturing-authority',
    schemaVersion: 1,
    system: { id: packId },
    systemPack: {
      id: packId,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId,
    },
    profiles: [
      {
        role: 'frame',
        profileId: `${packId}-FRAME`,
        stockLengthMm: 6000,
        evidenceStatus: 'approved',
        approvalId: 'b1000000-0000-4000-8000-000000000001',
      },
      {
        role: 'sash',
        profileId: `${packId}-SASH`,
        stockLengthMm: 6000,
        evidenceStatus: 'approved',
        approvalId: 'b1000000-0000-4000-8000-000000000002',
      },
    ],
    cuttingRules: [
      {
        ruleId: `${packId}-cut`,
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'c1000000-0000-4000-8000-000000000001',
      },
    ],
    toleranceRule: {
      ruleId: `${packId}-tolerance`,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId: 'c1000000-0000-4000-8000-000000000002',
    },
  };
}

export default function ManufacturingApprovalsPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ApprovalRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [revokeId, setRevokeId] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await listClient.rpc('admin_list_manufacturing_approval_requests', {
      p_status: 'pending',
    });
    if (error) {
      setMessage(error.message);
      setRows([]);
      return;
    }
    setRows(Array.isArray(data) ? (data as ApprovalRequest[]) : []);
    setMessage('');
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') void refresh();
  }, [user?.role, refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6" data-testid="manufacturing-approvals-blocked">
        <Alert className="border-amber-600/40 bg-amber-500/5">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-amber-200">Admin approvals only</AlertTitle>
          <AlertDescription className="text-amber-100/80 text-sm space-y-3">
            <p>Manufacturing catalogue and cutting-rule approvals are restricted to administrators.</p>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
              <Link to={fabricatorRoutes.studioProjects()}>Back to Projects</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await listClient.rpc('admin_reject_fabricator_manufacturing_approval', {
        p_request_id: id,
        p_reason: 'Rejected by admin from Approvals UI',
      });
      if (error) throw new Error(error.message);
      setMessage(`Rejected ${id}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (row: ApprovalRequest) => {
    setBusyId(row.id);
    try {
      const placeholderApproval = crypto.randomUUID();
      const payload = buildSeedStylePayload(row.system_pack_id, placeholderApproval);
      const { data, error } = await listClient.rpc('admin_approve_fabricator_manufacturing_approval', {
        p_request_id: row.id,
        p_authority_payload: payload,
      });
      if (error) throw new Error(error.message);
      if (!z.string().uuid().safeParse(data).success) throw new Error('No approval id returned');
      setMessage(`Approved ${String(data)}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async () => {
    if (!z.string().uuid().safeParse(revokeId.trim()).success) {
      setMessage('Enter a valid approval UUID to revoke');
      return;
    }
    setBusyId(revokeId);
    try {
      const { error } = await listClient.rpc('admin_revoke_fabricator_manufacturing_authority', {
        p_approval_id: revokeId.trim(),
        p_reason: 'Revoked by admin from Approvals UI',
      });
      if (error) throw new Error(error.message);
      setMessage(`Revoked ${revokeId.trim()}`);
      setRevokeId('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="manufacturing-approvals-admin">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Manufacturing Approvals
        </h1>
        <p className="text-sm text-slate-400">
          Review pending catalogue / cutting-rule requests. Seeded authority remains revocable.
        </p>
      </header>

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
        <h2 className="font-semibold text-amber-100">Pending requests</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No pending manufacturing approval requests.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded border border-slate-700 p-3 text-sm text-slate-200 space-y-2"
                data-testid={`approval-request-${row.id}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-amber-200">{row.system_pack_id}</span>
                  <span className="text-slate-400">rev {row.position_revision}</span>
                </div>
                <p className="text-slate-400 break-all">Catalogue: {row.catalogue_reference}</p>
                <p className="text-slate-400 break-all">Rules: {row.rule_reference}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => void approve(row)}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => void reject(row.id)}
                  >
                    Reject
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={fabricatorRoutes.studioData('tuning')}>Pack qualification</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={fabricatorRoutes.studioDataStock()}>Stock</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
        <h2 className="font-semibold text-amber-100">Revoke authority</h2>
        <p className="text-xs text-slate-400">
          Seeded packs (provenance=seed) can be revoked; manufacturing gates fail closed until re-approved.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[16rem] rounded border border-slate-600 bg-slate-950 p-2 text-sm"
            placeholder="approval UUID"
            value={revokeId}
            onChange={(e) => setRevokeId(e.target.value)}
          />
          <Button size="sm" variant="destructive" disabled={!!busyId} onClick={() => void revoke()}>
            Revoke
          </Button>
        </div>
      </section>

      {message && (
        <p role="status" className="text-sm text-amber-200 break-words">
          {message}
        </p>
      )}
    </div>
  );
}
