import { useAuth } from '@/context/AuthContext';
import { approveQualityControl, getAuthoritativeQcRevision, QUALITY_CHECK_IDS, type QualityCheckId, type QualityControlContext, type QualityEvidence } from '@/lib/fabricator/qualityApproval';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LABELS: Record<QualityCheckId, string> = {
    measurements: 'Measurements verified and within tolerance', design: 'Design specifications match requirements',
    model: '3D model reviewed and approved', optimization: 'Optimization plan reviewed', materials: 'Materials available in inventory',
    commands: 'Production commands validated', documents: 'All documentation complete',
};
const initialChecks = (): Record<QualityCheckId, boolean> => Object.fromEntries(QUALITY_CHECK_IDS.map(id => [id, false])) as Record<QualityCheckId, boolean>;

export const QualityControlPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { completeStep, currentProject, clearWorkflow, setQualityApproval, invalidateStep, workflowIdentity } = useWorkflowStore();
    const [checks, setChecks] = useState(initialChecks);
    const [actualWidth, setActualWidth] = useState('');
    const [actualHeight, setActualHeight] = useState('');
    const [notes, setNotes] = useState('');
    const [authority, setAuthority] = useState<QualityControlContext | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const idempotencyKey = useRef(crypto.randomUUID());
    const contextRef = useRef<string | null>(null);

    useEffect(() => {
        let active = true;
        invalidateStep('quality-control');
        setChecks(initialChecks());
        setActualWidth('');
        setActualHeight('');
        setNotes('');
        idempotencyKey.current = crypto.randomUUID();
        contextRef.current = null;
        setAuthority(null);
        setError(null);
        if (!user?.id || !currentProject?.id) {
            setError('Authenticated inspector and authoritative position are required.');
            return () => { active = false; };
        }
        getAuthoritativeQcRevision(currentProject.id)
            .then(value => {
                if (!active) return;
                contextRef.current = `${user.id}:${value.projectId}:${value.positionId}:${value.source}:${value.revision}`;
                idempotencyKey.current = crypto.randomUUID();
                setAuthority(value);
            })
            .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Revision verification failed.'); });
        return () => { active = false; };
    }, [currentProject?.id, user?.id, workflowIdentity?.revision, invalidateStep]);

    const evidence = useMemo<QualityEvidence>(() => ({
        checks,
        measurements: {
            width: { actualMm: Number(actualWidth) },
            height: { actualMm: Number(actualHeight) },
        },
        notes: notes.trim(),
    }), [checks, actualHeight, actualWidth, notes]);

    const contextMatches = Boolean(authority && workflowIdentity && user?.id === workflowIdentity.ownerUserId && authority.projectId === workflowIdentity.projectId && authority.positionId === workflowIdentity.positionId && authority.source === workflowIdentity.source && authority.revision === workflowIdentity.revision);
    const evidenceValid = contextMatches && QUALITY_CHECK_IDS.every(id => checks[id]) && evidence.notes.length >= 3 &&
        Boolean(authority) && Number.isFinite(authority?.toleranceMm) &&
        Math.abs(evidence.measurements.width.actualMm - (authority?.targetWidthMm ?? 0)) <= (authority?.toleranceMm ?? -1) &&
        Math.abs(evidence.measurements.height.actualMm - (authority?.targetHeightMm ?? 0)) <= (authority?.toleranceMm ?? -1);

    const handleQualityApproved = async () => {
        if (isApproving || !user?.id || !currentProject?.id || !authority || !evidenceValid) return;
        setIsApproving(true);
        setError(null);
        const requestContext = `${user.id}:${authority.projectId}:${authority.positionId}:${authority.source}:${authority.revision}`;
        const requestKey = idempotencyKey.current;
        try {
            const acknowledgement = await approveQualityControl(currentProject.id, authority.revision, evidence, requestKey);
            if (contextRef.current !== requestContext) return;
            if (acknowledgement.inspectorId !== user.id || acknowledgement.projectId !== authority.projectId) throw new Error('Approval acknowledgement does not match the inspection context.');
            setQualityApproval(acknowledgement);
            if (!completeStep('quality-control')) throw new Error('Workflow completion guard rejected the approval.');
            void navigate(fabricatorRoutes.studioProjects());
        } catch (reason) {
            if (contextRef.current !== requestContext) return;
            setQualityApproval(null);
            setError(reason instanceof Error ? reason.message : 'Quality approval failed.');
        } finally {
            if (contextRef.current === requestContext) setIsApproving(false);
        }
    };

    const handleStartNew = () => {
        if (confirm('Start a new project? Current progress will be saved.')) { clearWorkflow(); void navigate(fabricatorRoutes.studioProjects()); }
    };

    return <div className="flex h-full flex-col bg-slate-950 p-6"><div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-400" /><h2 className="text-2xl font-bold text-amber-200">Quality Control</h2></div>
        <p className="mb-8 text-slate-400">Final inspection and validation before production approval.</p>
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 p-6"><h3 className="mb-4 text-lg font-semibold text-amber-200">Inspection Evidence</h3>
            <div className="space-y-3">{QUALITY_CHECK_IDS.map(id => <label key={id} htmlFor={`qc-${id}`} className="flex cursor-pointer items-center gap-3 text-slate-300 hover:text-amber-200"><input id={`qc-${id}`} type="checkbox" checked={checks[id]} onChange={event => setChecks(value => ({ ...value, [id]: event.target.checked }))} className="h-5 w-5 rounded border-slate-600 text-amber-500 focus:ring-amber-500" /><span>{LABELS[id]}</span></label>)}</div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="text-sm text-slate-300">Measured width (mm)<input aria-label="Measured width (mm)" value={actualWidth} onChange={event => setActualWidth(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
                <label className="text-sm text-slate-300">Measured height (mm)<input aria-label="Measured height (mm)" value={actualHeight} onChange={event => setActualHeight(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
                <label className="text-sm text-slate-300">Approved tolerance ± mm<input aria-label="Approved tolerance (mm)" value={authority?.toleranceMm ?? ''} readOnly className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-slate-400" /></label>
            </div>
            <label className="mt-4 block text-sm text-slate-300">Inspection notes<textarea aria-label="Inspection notes" value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 min-h-20 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
            {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}{!error && authority && <p className="mt-4 text-xs text-slate-500">Verified revision {authority.revision}</p>}
        </div>
        {currentProject && <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 p-6"><h3 className="mb-4 text-lg font-semibold text-amber-200">Project Summary</h3><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-slate-500">Position ID:</span><span className="ml-2 text-slate-300">{currentProject.id}</span></div><div><span className="text-slate-500">Order:</span><span className="ml-2 text-slate-300">{currentProject.orderNumber}</span></div><div><span className="text-slate-500">Target:</span><span className="ml-2 text-slate-300">{currentProject.overallWidth} × {currentProject.overallHeight} mm</span></div><div><span className="text-slate-500">Inspector:</span><span className="ml-2 text-slate-300">{user?.id ?? 'Unavailable'}</span></div></div></div>}
        <div className="flex justify-between gap-4"><Button variant="outline" onClick={() => { void navigate(fabricatorRoutes.studioProduction()); }}>← Back to Production</Button><div className="flex gap-3"><Button variant="outline" onClick={handleStartNew}>Start New Project</Button><Button onClick={() => { void handleQualityApproved(); }} disabled={!authority || !evidenceValid || isApproving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50">{isApproving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving…</> : 'Approve & Complete ✓'}</Button></div></div>
    </div></div>;
};
