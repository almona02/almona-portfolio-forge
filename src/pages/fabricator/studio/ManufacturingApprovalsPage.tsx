/**
 * Admin-only manufacturing approval queue.
 * Approve / reject pending requests; one-click vendor catalogue approve; revoke.
 * AICS-001: deterministic admin gate — no ML in the approval path.
 * Server RPC is the authority for admin access (client role may hydrate late).
 */

import { useAuth } from '@/context/AuthContext';
import {
  VENDOR_CATALOGUE_PACKS,
  buildVendorAuthorityPayload,
} from '@/lib/fabricator/manufacturing/vendorCataloguePacks';
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

type ActiveAuthority = {
  approval_id: string;
  system_pack_id: string;
  system_pack_revision: number;
  provenance: string;
  approved_at: string;
};

type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};
const rpc = supabase as unknown as RpcClient;

function buildRequestPayload(packId: string, approvalId: string): Record<string, unknown> {
  const pack = VENDOR_CATALOGUE_PACKS.find((p) => p.id === packId);
  if (pack) {
    return buildVendorAuthorityPayload(pack, approvalId, 1);
  }
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

function isAdminDenied(message: string | undefined): boolean {
  if (!message) return false;
  return /admin role required|authentication required/i.test(message);
}

export default function ManufacturingApprovalsPage() {
  const { user, loading } = useAuth();
  const [adminGate, setAdminGate] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ApprovalRequest[]>([]);
  const [active, setActive] = useState<ActiveAuthority[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async (opts?: { clearStatus?: boolean }) => {
    const [pendingRes, activeRes] = await Promise.all([
      rpc.rpc('admin_list_manufacturing_approval_requests', { p_status: 'pending' }),
      rpc.rpc('admin_list_active_manufacturing_authority'),
    ]);

    if (isAdminDenied(pendingRes.error?.message) || isAdminDenied(activeRes.error?.message)) {
      setAdminGate(false);
      setRows([]);
      setActive([]);
      return;
    }

    setAdminGate(true);
    if (pendingRes.error) {
      setMessage(pendingRes.error.message);
      setRows([]);
    } else {
      setRows(Array.isArray(pendingRes.data) ? (pendingRes.data as ApprovalRequest[]) : []);
    }
    if (activeRes.error) {
      setMessage((prev) => prev || activeRes.error!.message);
      setActive([]);
    } else {
      setActive(Array.isArray(activeRes.data) ? (activeRes.data as ActiveAuthority[]) : []);
      if (opts?.clearStatus && !pendingRes.error) setMessage('');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAdminGate(false);
      return;
    }
    void refresh();
  }, [user, loading, refresh]);

  if (loading || adminGate === null) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="manufacturing-approvals-loading">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!adminGate) {
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
      const { error } = await rpc.rpc('admin_reject_fabricator_manufacturing_approval', {
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
      const payload = buildRequestPayload(row.system_pack_id, placeholderApproval);
      const { data, error } = await rpc.rpc('admin_approve_fabricator_manufacturing_approval', {
        p_request_id: row.id,
        p_authority_payload: payload,
      });
      if (error) throw new Error(error.message);
      if (!z.string().uuid().safeParse(data).success) throw new Error('No approval id returned');
      setMessage(`Approved request → ${String(data)}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const approveVendor = async (packId: string) => {
    setBusyId(`vendor:${packId}`);
    try {
      const { data, error } = await rpc.rpc('admin_approve_vendor_catalogue', {
        p_system_pack_id: packId,
      });
      if (error) throw new Error(error.message);
      if (!z.string().uuid().safeParse(data).success) throw new Error('No approval id returned');
      setMessage(`Vendor catalogue approved for ${packId} → ${String(data)}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vendor approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (approvalId: string) => {
    setBusyId(approvalId);
    try {
      const { error } = await rpc.rpc('admin_revoke_fabricator_manufacturing_authority', {
        p_approval_id: approvalId,
        p_reason: 'Revoked by admin from Approvals UI',
      });
      if (error) throw new Error(error.message);
      setMessage(`Revoked ${approvalId}`);
      await refresh();
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
          Pending request review, one-click vendor catalogue approval (provenance=vendor), and revoke.
          Packs are never blanket-seeded by migration.
        </p>
      </header>

      <section
        className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3"
        data-testid="vendor-catalogue-section"
      >
        <h2 className="font-semibold text-amber-100">Approve vendor catalogue</h2>
        <p className="text-xs text-slate-400">
          One-click approval for built-in packs. Writes provenance=vendor, an audit row, and supersedes
          any prior active revision. Revoke anytime below.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {VENDOR_CATALOGUE_PACKS.map((pack) => (
            <li
              key={pack.id}
              className="flex items-center justify-between gap-2 rounded border border-slate-700 px-3 py-2 text-sm"
            >
              <span className="text-slate-200">
                <span className="text-amber-200 font-medium">{pack.label}</span>
                <span className="block text-xs text-slate-500">{pack.id}</span>
              </span>
              <Button
                size="sm"
                disabled={busyId === `vendor:${pack.id}`}
                onClick={() => void approveVendor(pack.id)}
                className="bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                data-testid={`approve-vendor-${pack.id}`}
              >
                Approve vendor catalogue
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
        <h2 className="font-semibold text-amber-100">Pending requests</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400" data-testid="pending-requests-empty">
            No pending manufacturing approval requests.
          </p>
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
                    data-testid={`approve-request-${row.id}`}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3"
        data-testid="active-authority-section"
      >
        <h2 className="font-semibold text-amber-100">Active authority (revoke)</h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">No active manufacturing authority revisions.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((row) => (
              <li
                key={row.approval_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 px-3 py-2 text-sm"
                data-testid={`active-authority-${row.system_pack_id}`}
              >
                <div className="text-slate-200">
                  <span className="text-amber-200 font-medium">{row.system_pack_id}</span>
                  <span className="text-slate-400"> · r{row.system_pack_revision}</span>
                  <span className="text-slate-500"> · {row.provenance}</span>
                  <span className="block text-xs text-slate-500 break-all">{row.approval_id}</span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === row.approval_id}
                  onClick={() => void revoke(row.approval_id)}
                  data-testid={`revoke-${row.approval_id}`}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && (
        <p role="status" className="text-sm text-amber-200 break-words" data-testid="approvals-status">
          {message}
        </p>
      )}
    </div>
  );
}
