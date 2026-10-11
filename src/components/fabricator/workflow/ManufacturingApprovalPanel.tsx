import { useState } from 'react';
import type { Database } from '@/types/database';
import { z } from 'zod';
import { useWorkflowStore } from '@/store/workflowStore';
import { supabase } from '@/lib/supabase';
import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import { Button } from '@/shared/ui/ui/button';

type OwnerApprovalRequest = {
  position_revision: number;
  status: string;
  catalogue_reference: string;
  rule_reference: string;
};

// Legacy database tables omit Relationships; keep the RPC boundary narrowly typed.
const approvalClient = supabase as unknown as {
  rpc(name: 'request_fabricator_manufacturing_approval', args: Database['public']['Functions']['request_fabricator_manufacturing_approval']['Args']): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from(table: 'fabricator_manufacturing_approval_requests'): {
    select(columns: string): {
      eq(column: 'position_id', value: string): {
        order(column: 'requested_at', options: { ascending: boolean }): {
          limit(count: number): {
            maybeSingle(): PromiseLike<{ data: OwnerApprovalRequest | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};

/**
 * Saving a pose bumps qc_revision (public.bump_fabricator_qc_revision fires on every
 * update), and a manufacturing authority is bound to the revision it was approved for.
 * An approval therefore stops applying without any visible error, which leaves the
 * Optimize step blocked for reasons the operator cannot see. Report the operator's own
 * latest request so the drift is explicit and actionable.
 */
async function explainAuthorityGap(
  identity: { positionId: string; revision: number },
  error: unknown,
): Promise<string> {
  const base = error instanceof Error && error.message
    ? error.message
    : 'Approved manufacturing authority unavailable.';
  const result = await approvalClient
    .from('fabricator_manufacturing_approval_requests')
    .select('position_revision,status,catalogue_reference,rule_reference')
    .eq('position_id', identity.positionId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(
      value => value,
      () => ({ data: null } as { data: OwnerApprovalRequest | null }),
    );
  const latest = result.data;
  if (!latest) {
    return `${base} No approval request exists for this position yet - submit one for revision ${identity.revision}.`;
  }
  if (latest.position_revision !== identity.revision) {
    return `${base} The latest request covers revision ${latest.position_revision} (${latest.status}) but this pose is now revision ${identity.revision}: every pose save bumps the revision and voids the approval. Submit a new request for revision ${identity.revision}.`;
  }
  return `${base} The latest request covers revision ${latest.position_revision} and is ${latest.status}. Manufacturing stays blocked until an admin approves it.`;
}

/** Requests are evidence for review, never client-side manufacturing approval. */
export function ManufacturingApprovalPanel() {
  const { workflowIdentity, currentProject } = useWorkflowStore();
  const [catalogue, setCatalogue] = useState('');
  const [rules, setRules] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (submit: boolean) => {
    if (!workflowIdentity || !currentProject?.systemPackId) return;
    const identity = workflowIdentity;
    setBusy(true);
    setMessage('');
    try {
      if (submit) {
        const { data, error } = await approvalClient.rpc('request_fabricator_manufacturing_approval', {
          p_position_id: identity.positionId,
          p_expected_revision: identity.revision,
          p_catalogue_reference: catalogue.trim(),
          p_rule_reference: rules.trim(),
          p_notes: notes.trim(),
        });
        if (error) throw new Error(error.message);
        if (!z.string().uuid().safeParse(data).success) throw new Error('No valid approval request receipt was returned.');
        setMessage(`Review request ${String(data)} submitted. Manufacturing remains blocked until admin approval.`);
      } else {
        let authority: Awaited<ReturnType<typeof resolveManufacturingAuthority>>;
        try {
          authority = await resolveManufacturingAuthority(identity.positionId, identity.revision);
        } catch (error) {
          setMessage(await explainAuthorityGap(identity, error));
          return;
        }
        setMessage(`Approved ${authority.systemPack.id} catalogue revision ${authority.systemPack.revision}. Cutting rules: ${authority.cuttingRules.map(rule => `${rule.ruleId} r${rule.revision}`).join(', ')}. Regenerate the BOM to use this evidence.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval request failed.');
    } finally { setBusy(false); }
  };
  return <section className="rounded-lg border border-amber-600/30 bg-slate-900 p-4 space-y-3" aria-label="Catalogue and manufacturing approval">
    <h3 className="font-semibold text-amber-200">Catalogue & manufacturing rules</h3>
    <p className="text-sm text-slate-300">{currentProject?.systemPackId ?? 'Select a system'} · saved revision {workflowIdentity?.revision ?? 'required'}. Submit the catalogue and rule document references for authorized review.</p>
    <p className="text-xs text-slate-400">
      Blocked? Open{' '}
      <a className="text-amber-300 underline" href="/fabricator/studio/approvals">Admin Approvals</a>
      {' · '}
      <a className="text-amber-300 underline" href="/fabricator/studio/data/tuning">Pack qualification</a>
      {' · '}
      <a className="text-amber-300 underline" href="/fabricator/studio/data/stock">Stock</a>
    </p>
    <label className="block text-sm text-slate-300">Catalogue document / version
      <input className="block w-full rounded border border-slate-600 bg-slate-950 p-2" maxLength={1000} value={catalogue} onChange={event => setCatalogue(event.target.value)} />
    </label>
    <label className="block text-sm text-slate-300">Cutting rules document / version
      <input className="block w-full rounded border border-slate-600 bg-slate-950 p-2" maxLength={1000} value={rules} onChange={event => setRules(event.target.value)} />
    </label>
    <label className="block text-sm text-slate-300">Review notes
      <textarea className="block w-full rounded border border-slate-600 bg-slate-950 p-2" maxLength={10000} value={notes} onChange={event => setNotes(event.target.value)} />
    </label>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !workflowIdentity || catalogue.trim().length < 3 || rules.trim().length < 3} onClick={() => void run(true)}>Request approval</Button>
      <Button variant="outline" disabled={busy || !workflowIdentity} onClick={() => void run(false)}>Check approved versions</Button>
    </div>
    {message && <p role="status" className="text-sm text-amber-200 break-words">{message}</p>}
  </section>;
}
