import { useState } from 'react';
import type { Database } from '@/types/database';
import { z } from 'zod';
import { useWorkflowStore } from '@/store/workflowStore';
import { supabase } from '@/lib/supabase';
import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import { Button } from '@/shared/ui/ui/button';

// Legacy database tables omit Relationships; keep the RPC boundary narrowly typed.
const approvalClient = supabase as unknown as {
  rpc(name: 'request_fabricator_manufacturing_approval', args: Database['public']['Functions']['request_fabricator_manufacturing_approval']['Args']): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

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
        setMessage(`Review request ${String(data)} submitted. Manufacturing remains blocked until reviewer approval.`);
      } else {
        const authority = await resolveManufacturingAuthority(identity.positionId, identity.revision);
        setMessage(`Approved ${authority.systemPack.id} catalogue revision ${authority.systemPack.revision}. Cutting rules: ${authority.cuttingRules.map(rule => `${rule.ruleId} r${rule.revision}`).join(', ')}. Regenerate the BOM to use this evidence.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval request failed.');
    } finally { setBusy(false); }
  };
  return <section className="rounded-lg border border-amber-600/30 bg-slate-900 p-4 space-y-3" aria-label="Catalogue and manufacturing approval">
    <h3 className="font-semibold text-amber-200">Catalogue & manufacturing rules</h3>
    <p className="text-sm text-slate-300">{currentProject?.systemPackId ?? 'Select a system'} · saved revision {workflowIdentity?.revision ?? 'required'}. Submit the catalogue and rule document references for authorized review.</p>
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
