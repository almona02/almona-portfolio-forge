import { useAuth } from '@/context/AuthContext';
import {
  approveQualityControl,
  getAuthoritativeQcRevision,
  getLatestQualityApproval,
  QUALITY_CHECK_IDS,
  type QualityCheckId,
  type QualityControlContext,
  type QualityEvidence,
} from '@/lib/fabricator/qualityApproval';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore, type QualityApprovalAcknowledgement } from '@/store/workflowStore';
import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LABELS: Record<QualityCheckId, string> = {
  measurements: 'Measurements verified and within tolerance',
  design: 'Design specifications match requirements',
  model: '3D model reviewed and approved',
  optimization: 'Optimization plan reviewed',
  materials: 'Materials available in inventory',
  commands: 'Production commands validated',
  documents: 'All documentation complete',
};
const initialChecks = (): Record<QualityCheckId, boolean> =>
  Object.fromEntries(QUALITY_CHECK_IDS.map((id) => [id, false])) as Record<QualityCheckId, boolean>;

export const QualityControlPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('projectId');
  const requestedPoseId = searchParams.get('poseId');
  const { user } = useAuth();
  const {
    completeStep,
    currentProject,
    clearWorkflow,
    setQualityApproval,
    qualityApproval,
    workflowIdentity,
  } = useWorkflowStore();
  const [checks, setChecks] = useState(initialChecks);
  const [actualWidth, setActualWidth] = useState('');
  const [actualHeight, setActualHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [authority, setAuthority] = useState<QualityControlContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [forceNewInspection, setForceNewInspection] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const contextRef = useRef<string | null>(null);

  // UP-19: load context + existing approval. Do not clear ack on every entry.
  useEffect(() => {
    let active = true;
    setError(null);
    setAuthority(null);
    setIsLoading(true);
    contextRef.current = null;

    if (
      (requestedProjectId && requestedProjectId !== workflowIdentity?.projectId) ||
      (requestedPoseId && requestedPoseId !== currentProject?.id)
    ) {
      setError('The requested position is not loaded. Open its production record before inspecting.');
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    if (!user?.id || !currentProject?.id) {
      setError('Authenticated inspector and authoritative position are required.');
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const value = await getAuthoritativeQcRevision(currentProject.id);
        if (!active) return;
        contextRef.current = `${user.id}:${value.projectId}:${value.positionId}:${value.source}:${value.revision}`;
        setAuthority(value);

        const existing = await getLatestQualityApproval(value.positionId, value.revision);
        if (!active) return;
        if (existing && !forceNewInspection) {
          setQualityApproval(existing);
        } else if (
          qualityApproval &&
          (qualityApproval.positionId !== value.positionId ||
            qualityApproval.revision !== value.revision)
        ) {
          setQualityApproval(null);
        }
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Revision verification failed.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload on identity/request, not on every qualityApproval mutation
  }, [
    currentProject?.id,
    user?.id,
    workflowIdentity?.revision,
    workflowIdentity?.projectId,
    requestedProjectId,
    requestedPoseId,
    forceNewInspection,
    setQualityApproval,
  ]);

  const existingAck: QualityApprovalAcknowledgement | null =
    !forceNewInspection &&
    qualityApproval &&
    authority &&
    qualityApproval.positionId === authority.positionId &&
    qualityApproval.revision === authority.revision
      ? qualityApproval
      : null;

  const evidence = useMemo<QualityEvidence>(
    () => ({
      checks,
      measurements: {
        width: { actualMm: Number(actualWidth) },
        height: { actualMm: Number(actualHeight) },
      },
      notes: notes.trim(),
    }),
    [checks, actualHeight, actualWidth, notes],
  );

  const contextMatches = Boolean(
    authority &&
      workflowIdentity &&
      user?.id === workflowIdentity.ownerUserId &&
      authority.projectId === workflowIdentity.projectId &&
      authority.positionId === workflowIdentity.positionId &&
      authority.source === workflowIdentity.source &&
      authority.revision === workflowIdentity.revision,
  );
  const evidenceValid =
    contextMatches &&
    QUALITY_CHECK_IDS.every((id) => checks[id]) &&
    evidence.notes.length >= 3 &&
    Boolean(authority) &&
    Number.isFinite(authority?.toleranceMm) &&
    Math.abs(evidence.measurements.width.actualMm - (authority?.targetWidthMm ?? 0)) <=
      (authority?.toleranceMm ?? -1) &&
    Math.abs(evidence.measurements.height.actualMm - (authority?.targetHeightMm ?? 0)) <=
      (authority?.toleranceMm ?? -1);

  const handleQualityApproved = async () => {
    if (isApproving || !user?.id || !currentProject?.id || !authority || !evidenceValid) return;
    setIsApproving(true);
    setError(null);
    const requestContext = `${user.id}:${authority.projectId}:${authority.positionId}:${authority.source}:${authority.revision}`;
    const requestKey = idempotencyKey.current;
    try {
      const acknowledgement = await approveQualityControl(
        currentProject.id,
        authority.revision,
        evidence,
        requestKey,
      );
      if (contextRef.current !== requestContext) return;
      if (
        acknowledgement.inspectorId !== user.id ||
        acknowledgement.projectId !== authority.projectId ||
        acknowledgement.positionId !== authority.positionId ||
        acknowledgement.revision !== authority.revision
      ) {
        throw new Error('Approval acknowledgement does not match the inspection context.');
      }
      setQualityApproval(acknowledgement);
      setForceNewInspection(false);
      if (!completeStep('quality-control')) {
        throw new Error('Workflow completion guard rejected the approval.');
      }
      void navigate(
        fabricatorRoutes.studioProductionDelivery() +
          `?${new URLSearchParams({ projectId: authority.projectId, poseId: authority.positionId })}`,
      );
    } catch (reason) {
      if (contextRef.current !== requestContext) return;
      setError(reason instanceof Error ? reason.message : 'Quality approval failed.');
    } finally {
      if (contextRef.current === requestContext) setIsApproving(false);
    }
  };

  const handleNewInspection = () => {
    setForceNewInspection(true);
    setChecks(initialChecks());
    setActualWidth('');
    setActualHeight('');
    setNotes('');
    idempotencyKey.current = crypto.randomUUID();
    setQualityApproval(null);
  };

  const handleStartNew = () => {
    if (
      confirm(
        'Leave this inspection and clear the local workflow draft? Save project changes before continuing.',
      )
    ) {
      clearWorkflow();
      void navigate(fabricatorRoutes.studioProjects());
    }
  };

  const deliveryHref = authority
    ? fabricatorRoutes.studioProductionDelivery() +
      `?${new URLSearchParams({ projectId: authority.projectId, poseId: authority.positionId })}`
    : fabricatorRoutes.studioProductionDelivery();

  return (
    <div className="flex h-full flex-col bg-slate-950 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
          <h2 className="text-2xl font-bold text-amber-200">Quality Control</h2>
        </div>
        <p className="mb-8 text-slate-400">Final inspection and validation before production approval.</p>

        {isLoading ? (
          <div className="mb-6 flex items-center gap-2 text-amber-200/80">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading QC context…
          </div>
        ) : null}

        {existingAck ? (
          <div className="mb-6 rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-6 space-y-3">
            <h3 className="text-lg font-semibold text-emerald-200">Already approved for this revision</h3>
            <p className="text-sm text-emerald-100/80">
              Approval {existingAck.approvalId.slice(0, 8)}… · R{existingAck.revision} ·{' '}
              {new Date(existingAck.approvedAt).toLocaleString()}
            </p>
            <p className="text-xs text-emerald-200/70">
              Reloaded from server. Start a new inspection only if you intend to supersede (same revision
              remains locked server-side).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (!completeStep('quality-control')) {
                    setError('Workflow completion guard rejected the existing approval.');
                    return;
                  }
                  void navigate(deliveryHref);
                }}
              >
                Continue to Delivery
              </Button>
              <Button variant="outline" onClick={handleNewInspection}>
                Start new inspection form
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-amber-200">Inspection Evidence</h3>
            <div className="space-y-3">
              {QUALITY_CHECK_IDS.map((id) => (
                <label
                  key={id}
                  htmlFor={`qc-${id}`}
                  className="flex cursor-pointer items-center gap-3 text-slate-300 hover:text-amber-200"
                >
                  <input
                    id={`qc-${id}`}
                    type="checkbox"
                    checked={checks[id]}
                    onChange={(event) =>
                      setChecks((value) => ({ ...value, [id]: event.target.checked }))
                    }
                    className="h-5 w-5 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span>{LABELS[id]}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="text-sm text-slate-300">
                Measured width (mm)
                <input
                  aria-label="Measured width (mm)"
                  value={actualWidth}
                  onChange={(event) => setActualWidth(event.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2"
                />
              </label>
              <label className="text-sm text-slate-300">
                Measured height (mm)
                <input
                  aria-label="Measured height (mm)"
                  value={actualHeight}
                  onChange={(event) => setActualHeight(event.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2"
                />
              </label>
              <label className="text-sm text-slate-300">
                Approved tolerance ± mm
                <input
                  aria-label="Approved tolerance (mm)"
                  value={authority?.toleranceMm ?? ''}
                  readOnly
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-slate-400"
                />
              </label>
            </div>
            <label className="mt-4 block text-sm text-slate-300">
              Inspection notes
              <textarea
                aria-label="Inspection notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 min-h-20 w-full rounded border border-slate-600 bg-slate-950 p-2"
              />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {!error && authority && (
          <p className="mb-4 text-xs text-slate-500">Verified revision {authority.revision}</p>
        )}

        {currentProject && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-amber-200">Project Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Position ID:</span>
                <span className="ml-2 text-slate-300">{currentProject.id}</span>
              </div>
              <div>
                <span className="text-slate-500">Order:</span>
                <span className="ml-2 text-slate-300">{currentProject.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">Target:</span>
                <span className="ml-2 text-slate-300">
                  {currentProject.overallWidth} × {currentProject.overallHeight} mm
                </span>
              </div>
              <div>
                <span className="text-slate-500">Inspector:</span>
                <span className="ml-2 text-slate-300">{user?.id ?? 'Unavailable'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => {
              void navigate(
                workflowIdentity
                  ? fabricatorRoutes.poseProduction(
                      workflowIdentity.projectId,
                      workflowIdentity.positionId,
                    )
                  : fabricatorRoutes.studioProjects(),
              );
            }}
          >
            ← Back to Production
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleStartNew}>
              Start New Project
            </Button>
            {!existingAck ? (
              <Button
                onClick={() => {
                  void handleQualityApproved();
                }}
                disabled={!authority || !evidenceValid || isApproving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving…
                  </>
                ) : (
                  'Approve & Complete ✓'
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
