/**
 * Admin-only manufacturing approval queue.
 * Approve / reject pending requests; one-click vendor catalogue approve; revoke.
 * AICS-001: deterministic admin gate — no ML in the approval path.
 * Server RPC is the authority for admin access (client role may hydrate late).
 *
 * Scroll: studio shell clips the outlet (`overflow-hidden`); this page owns
 * `h-full overflow-y-auto` so every approve/reject/revoke control stays reachable
 * on phone → desktop viewports (same pattern as Stock / Operator Help).
 * Jump offsets use the measured sticky nav (+ status) height — not a fixed Tailwind slot.
 */

import { HardenerApprovalsPanel } from '@/components/fabricator/hardener/HardenerApprovalsPanel';
import { useAuth } from '@/context/AuthContext';
import {
  REACHABILITY_VENDOR_EXTRA,
  buildReachabilityActive,
  buildReachabilityPending,
  isApprovalsReachabilityFixtureActive,
} from '@/lib/fabricator/approvals/approvalsReachabilityFixture';
import {
  APPROVAL_SETTING_KEYS,
  APPROVAL_SETTING_LIMITS,
  DEFAULT_APPROVAL_SETTINGS,
  approvalSettingsFromTuning,
  buildRequestAuthorityPayload,
  draftFromSettings,
  resolveApprovalSettings,
  validateApprovalSettings,
  type ApprovalSettingKey,
  type ApprovalSettingsDraft,
  type ApprovalSettingsSource,
} from '@/lib/fabricator/approvals/approvalSettings';
import {
  VENDOR_AUTHORITY_DEFAULT_SETTINGS,
  VENDOR_CATALOGUE_PACKS,
} from '@/lib/fabricator/manufacturing/vendorCataloguePacks';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { fabricatorConfigApi } from '@/lib/fabricatorConfigApi';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
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

type VendorRow = { id: string; label: string };

type RequestSettingsState = {
  draft: ApprovalSettingsDraft;
  source: Record<ApprovalSettingKey, ApprovalSettingsSource>;
};

const PLATFORM_SETTINGS_STATE: RequestSettingsState = {
  draft: draftFromSettings(DEFAULT_APPROVAL_SETTINGS),
  source: { sawKerfMm: 'platform', trimCutMm: 'platform', stockLengthMm: 'platform' },
};

/**
 * Per-request manufacturing settings the admin confirms before approval.
 * Pre-filled from the requesting workshop's tuning defaults when present,
 * otherwise platform defaults; always validated client-side and again by the
 * server (fail-closed) before becoming authority.
 */
function ApprovalSettingsFields({
  requestId,
  state,
  disabled,
  onChange,
}: {
  requestId: string;
  state: RequestSettingsState;
  disabled: boolean;
  onChange: (key: ApprovalSettingKey, value: string) => void;
}) {
  const validation = validateApprovalSettings(state.draft);
  return (
    <fieldset
      className="rounded border border-amber-600/30 bg-amber-500/5 p-2 space-y-2"
      data-testid={`approval-settings-${requestId}`}
      disabled={disabled}
    >
      <legend className="px-1 text-xs font-medium text-amber-200">Manufacturing settings for this approval</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {APPROVAL_SETTING_KEYS.map((key) => {
          const limit = APPROVAL_SETTING_LIMITS[key];
          const id = `approval-${requestId}-${key}`;
          const error = validation.errors[key];
          return (
            <label key={key} htmlFor={id} className="flex flex-col gap-1 text-xs text-slate-300">
              <span>
                {limit.label} ({limit.unit})
                <span className="ml-1 text-slate-500">· {state.source[key] === 'workshop' ? 'workshop default' : 'platform default'}</span>
              </span>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                min={limit.min}
                max={limit.max}
                value={state.draft[key]}
                onChange={(e) => onChange(key, e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                data-testid={`${id}-input`}
              />
              {error ? (
                <span id={`${id}-error`} className="text-red-400">{error}</span>
              ) : (
                <span className="text-slate-500">{limit.min}–{limit.max} {limit.unit}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
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
  const [requestSettings, setRequestSettings] = useState<Record<string, RequestSettingsState>>({});
  const [stickyOffsetPx, setStickyOffsetPx] = useState(56);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickyChromeRef = useRef<HTMLDivElement>(null);
  const fixture = import.meta.env.DEV && isApprovalsReachabilityFixtureActive();

  const vendorRows: VendorRow[] = fixture
    ? [
        ...VENDOR_CATALOGUE_PACKS.map((p) => ({ id: p.id, label: p.label })),
        ...REACHABILITY_VENDOR_EXTRA,
      ]
    : VENDOR_CATALOGUE_PACKS.map((p) => ({ id: p.id, label: p.label }));

  const measureStickyChrome = useCallback(() => {
    const el = stickyChromeRef.current;
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().height);
    setStickyOffsetPx((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    measureStickyChrome();
    const el = stickyChromeRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureStickyChrome());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureStickyChrome, message, adminGate, rows.length, active.length]);

  const scrollToSection = useCallback((id: string) => {
    const scroller = scrollerRef.current;
    const target = document.getElementById(id);
    if (!scroller || !target) return;
    // Live height (ResizeObserver/state can lag CSS zoom / status text wrap).
    const liveOffset = Math.ceil(
      stickyChromeRef.current?.getBoundingClientRect().height ?? stickyOffsetPx,
    );
    setStickyOffsetPx((prev) => (prev === liveOffset ? prev : liveOffset));
    const zoom =
      parseFloat(String(getComputedStyle(document.documentElement).zoom || '1')) || 1;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // getBoundingClientRect is zoom-scaled; scrollTop is layout pixels.
    const deltaLayout =
      (targetRect.top - scrollerRect.top - liveOffset - 8) / zoom;
    scroller.scrollTo({
      top: Math.max(0, scroller.scrollTop + deltaLayout),
      behavior: 'smooth',
    });
  }, [stickyOffsetPx]);

  const refresh = useCallback(async (opts?: { clearStatus?: boolean }) => {
    if (import.meta.env.DEV && isApprovalsReachabilityFixtureActive()) {
      setAdminGate(true);
      setRows(buildReachabilityPending(6));
      setActive(buildReachabilityActive(6));
      if (opts?.clearStatus) setMessage('');
      return;
    }

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

  // Depend on the user id, not the user object: a context that re-creates the
  // user object per render would otherwise re-run refresh() on every render.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setAdminGate(false);
      return;
    }
    void refresh();
  }, [userId, loading, refresh]);

  // Pre-fill approval settings per pending request from the requesting
  // workshop's tuning defaults (admin RLS can read them). Never overwrite a
  // draft the admin has already started editing.
  useEffect(() => {
    let cancelled = false;
    const missing = rows.filter((r) => !requestSettings[r.id]);
    if (missing.length === 0) return;
    if (fixture) {
      setRequestSettings((prev) => {
        const next = { ...prev };
        for (const r of missing) if (!next[r.id]) next[r.id] = PLATFORM_SETTINGS_STATE;
        return next;
      });
      return;
    }
    const owners = [...new Set(missing.map((r) => r.owner_user_id))];
    void Promise.all(
      owners.map(async (ownerId) => {
        try {
          const tuning = await fabricatorConfigApi.listTuningForOwner(ownerId);
          return [ownerId, resolveApprovalSettings(approvalSettingsFromTuning(tuning))] as const;
        } catch {
          return [ownerId, resolveApprovalSettings({})] as const;
        }
      }),
    ).then((resolved) => {
      if (cancelled) return;
      const byOwner = new Map(resolved);
      setRequestSettings((prev) => {
        const next = { ...prev };
        for (const r of missing) {
          if (next[r.id]) continue;
          const res = byOwner.get(r.owner_user_id);
          next[r.id] = res
            ? { draft: draftFromSettings(res.settings), source: res.source }
            : PLATFORM_SETTINGS_STATE;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [rows, requestSettings, fixture]);

  const updateRequestSetting = useCallback((requestId: string, key: ApprovalSettingKey, value: string) => {
    setRequestSettings((prev) => {
      const current = prev[requestId] ?? PLATFORM_SETTINGS_STATE;
      return { ...prev, [requestId]: { ...current, draft: { ...current.draft, [key]: value } } };
    });
  }, []);

  if (loading || adminGate === null) {
    return (
      <div
        className="flex h-full min-h-0 items-center justify-center overflow-y-auto"
        data-testid="manufacturing-approvals-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!adminGate) {
    return (
      <div
        className="h-full min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6"
        data-testid="manufacturing-approvals-blocked"
      >
        <Alert className="border-amber-600/40 bg-amber-500/5 max-w-5xl mx-auto">
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
    if (fixture) {
      setMessage(`Rejected ${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      return;
    }
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
    const settingsState = requestSettings[row.id] ?? PLATFORM_SETTINGS_STATE;
    const validation = validateApprovalSettings(settingsState.draft);
    if (!validation.ok) {
      setMessage(`Fix manufacturing settings before approving: ${Object.values(validation.errors).join(' ')}`);
      return;
    }
    if (fixture) {
      setMessage(`Approved request → fixture:${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    setBusyId(row.id);
    try {
      const placeholderApproval = crypto.randomUUID();
      const payload = buildRequestAuthorityPayload(row.system_pack_id, placeholderApproval, validation.value);
      const { data, error } = await rpc.rpc('admin_approve_fabricator_manufacturing_approval', {
        p_request_id: row.id,
        p_authority_payload: payload,
      });
      if (error) throw new Error(error.message);
      if (!z.string().uuid().safeParse(data).success) throw new Error('No approval id returned');
      setMessage(
        `Approved request → ${String(data)} (kerf ${validation.value.sawKerfMm} mm · trim ${validation.value.trimCutMm} mm · stock ${validation.value.stockLengthMm} mm)`,
      );
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const approveVendor = async (packId: string) => {
    if (fixture) {
      setMessage(`Vendor catalogue approved for ${packId} → fixture`);
      return;
    }
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
    if (fixture) {
      setMessage(`Revoked ${approvalId}`);
      setActive((prev) => prev.filter((r) => r.approval_id !== approvalId));
      return;
    }
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

  const jumpLinks = [
    { id: 'approvals-vendor', label: 'Vendor', count: vendorRows.length },
    { id: 'approvals-pending', label: 'Pending', count: rows.length },
    { id: 'approvals-active', label: 'Revoke', count: active.length },
    { id: 'approvals-hardener', label: 'Hardener', count: null as number | null },
  ];

  const sectionStyle = { scrollMarginTop: stickyOffsetPx + 8 };

  return (
    <div
      ref={scrollerRef}
      className="h-full min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth [scroll-padding-bottom:7rem]"
      data-testid="manufacturing-approvals-admin"
      data-sticky-offset={stickyOffsetPx}
      style={
        {
          '--approvals-sticky-offset': `${stickyOffsetPx}px`,
        } as CSSProperties
      }
    >
      {/* pb clears manufacturing status bar + production FABs (chat / feedback) */}
      <div className="mx-auto max-w-5xl space-y-4 px-3 pb-44 pt-3 sm:space-y-6 sm:px-6 sm:pb-48 sm:pt-6">
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-amber-200 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            Manufacturing Approvals
          </h1>
          <p className="text-sm text-slate-400">
            Pending request review, one-click vendor catalogue approval (provenance=vendor), and revoke.
            Packs are never blanket-seeded by migration.
          </p>
        </header>

        <div
          ref={stickyChromeRef}
          className="sticky top-0 z-30 -mx-3 px-3 sm:-mx-6 sm:px-6 bg-[#0a0a0a]/95 backdrop-blur border-b border-amber-600/20"
          data-testid="approvals-sticky-chrome"
        >
          <nav
            className="py-2"
            aria-label="Jump to approval section"
            data-testid="approvals-jump-nav"
          >
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {jumpLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-amber-600/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                data-testid={`approvals-jump-${link.id}`}
              >
                  {link.label}
                  {link.count !== null && (
                    <span className="font-mono text-amber-400/90 tabular-nums">{link.count}</span>
                  )}
                </button>
              ))}
            </div>
          </nav>
          {message && (
            <p
              role="status"
              className="pb-2 text-sm text-amber-100 break-words"
              data-testid="approvals-status"
            >
              {message}
            </p>
          )}
        </div>

        <section
          id="approvals-vendor"
          style={sectionStyle}
          className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 sm:p-4 space-y-3"
          data-testid="vendor-catalogue-section"
        >
          <h2 className="font-semibold text-amber-100">Approve vendor catalogue</h2>
          <p className="text-xs text-slate-400">
            One-click approval for built-in packs. Writes provenance=vendor, an audit row, and supersedes
            any prior active revision. Revoke anytime below.
          </p>
          <p className="text-xs text-slate-500" data-testid="vendor-catalogue-settings-note">
            Vendor payloads are built server-side with fixed settings (kerf {VENDOR_AUTHORITY_DEFAULT_SETTINGS.sawKerfMm} mm ·
            trim {VENDOR_AUTHORITY_DEFAULT_SETTINGS.trimCutMm} mm · stock {VENDOR_AUTHORITY_DEFAULT_SETTINGS.stockLengthMm} mm).
            To approve different values, review a pending request below.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {vendorRows.map((pack) => (
              <li
                key={pack.id}
                className="flex flex-col gap-2 rounded border border-slate-700 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-slate-200 min-w-0">
                  <span className="text-amber-200 font-medium">{pack.label}</span>
                  <span className="block text-xs text-slate-500 truncate">{pack.id}</span>
                </span>
                <Button
                  size="sm"
                  disabled={busyId === `vendor:${pack.id}`}
                  onClick={() => void approveVendor(pack.id)}
                  className="bg-amber-500 hover:bg-amber-600 text-black w-full sm:w-auto shrink-0 min-h-9"
                  data-testid={`approve-vendor-${pack.id}`}
                >
                  Approve vendor catalogue
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="approvals-pending"
          style={sectionStyle}
          className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 sm:p-4 space-y-3"
        >
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
                  <ApprovalSettingsFields
                    requestId={row.id}
                    state={requestSettings[row.id] ?? PLATFORM_SETTINGS_STATE}
                    disabled={busyId === row.id}
                    onChange={(key, value) => updateRequestSetting(row.id, key, value)}
                  />
                  <div className="sticky bottom-20 z-10 -mx-1 flex flex-wrap gap-2 rounded-md border border-amber-600/30 bg-[#0f0f0f]/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-[#0f0f0f]/80 sm:bottom-16">
                    <Button
                      size="sm"
                      disabled={busyId === row.id || !validateApprovalSettings((requestSettings[row.id] ?? PLATFORM_SETTINGS_STATE).draft).ok}
                      onClick={() => void approve(row)}
                      className="bg-amber-500 hover:bg-amber-600 text-black flex-1 sm:flex-none min-h-9"
                      data-testid={`approve-request-${row.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void reject(row.id)}
                      className="flex-1 sm:flex-none min-h-9"
                      data-testid={`reject-request-${row.id}`}
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
          id="approvals-active"
          style={sectionStyle}
          className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 sm:p-4 space-y-3"
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
                  className="flex flex-col gap-2 rounded border border-slate-700 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`active-authority-${row.system_pack_id}`}
                >
                  <div className="text-slate-200 min-w-0">
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
                    className="w-full sm:w-auto shrink-0 min-h-9"
                    data-testid={`revoke-${row.approval_id}`}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div
          id="approvals-hardener"
          style={sectionStyle}
          className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 sm:p-4"
        >
          <HardenerApprovalsPanel />
        </div>
      </div>
    </div>
  );
}
