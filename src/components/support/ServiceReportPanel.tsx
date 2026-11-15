import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getServiceReportForVisit,
  listServiceReportReviewsForRevisions,
  submitServiceReportRevision,
  uploadReportEvidence,
  type ServiceReportRevisionRow,
  type ServiceReportReviewRow,
} from '@/lib/ticketGovernanceApi'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const DECLARATION =
  'I declare that the findings, work performed, labour (or no-labour declaration), verification outcome, and attached evidence accurately reflect this visit.'

type VerificationOutcome =
  | 'verified_fixed'
  | 'not_reproduced'
  | 'further_work_required'
  | 'not_verified'

interface ServiceReportPanelProps {
  visitId: string
  ticketId: string
  canSubmit: boolean
}

function submittedStorageKey(visitId: string) {
  return `b4-submitted:${visitId}`
}

function draftStorageKey(visitId: string) {
  return `b4-draft:${visitId}`
}

function readStoredSubmission(visitId: string): {
  revision: ServiceReportRevisionRow
  clientSubmissionId: string
} | null {
  try {
    const raw = sessionStorage.getItem(submittedStorageKey(visitId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      revision?: ServiceReportRevisionRow
      clientSubmissionId?: string
    }
    if (!parsed.revision?.id || !parsed.clientSubmissionId) return null
    return {
      revision: parsed.revision,
      clientSubmissionId: parsed.clientSubmissionId,
    }
  } catch {
    return null
  }
}

function readDraftClientSubmissionId(visitId: string): string | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(visitId))
    if (!raw) return null
    const draft = JSON.parse(raw) as { clientSubmissionId?: string }
    return draft.clientSubmissionId ?? null
  } catch {
    return null
  }
}

function reviewFor(
  revisionId: string | undefined,
  reviews: ServiceReportReviewRow[],
): ServiceReportReviewRow | null {
  if (!revisionId) return null
  return reviews.find((r) => r.revision_id === revisionId) ?? null
}

export const ServiceReportPanel: React.FC<ServiceReportPanelProps> = ({
  visitId,
  ticketId,
  canSubmit,
}) => {
  const queryClient = useQueryClient()
  const stored = useMemo(() => readStoredSubmission(visitId), [visitId])
  const [findings, setFindings] = useState('')
  const [workPerformed, setWorkPerformed] = useState('')
  const [noLabour, setNoLabour] = useState(false)
  const [labourHours, setLabourHours] = useState('1')
  const [labourDescription, setLabourDescription] = useState('')
  const [verificationOutcome, setVerificationOutcome] =
    useState<VerificationOutcome>('verified_fixed')
  const [verificationReason, setVerificationReason] = useState('')
  const [declarationAck, setDeclarationAck] = useState(false)
  const [evidencePaths, setEvidencePaths] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [refetchError, setRefetchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [clientSubmissionId, setClientSubmissionId] = useState(
    () => stored?.clientSubmissionId ?? readDraftClientSubmissionId(visitId) ?? crypto.randomUUID(),
  )
  const [confirmedRevision, setConfirmedRevision] = useState<ServiceReportRevisionRow | null>(
    () => stored?.revision ?? null,
  )

  const reportQuery = useQuery({
    queryKey: ['service-report', visitId],
    queryFn: () => getServiceReportForVisit(visitId),
  })

  const revisionIds = useMemo(
    () => (reportQuery.data?.revisions ?? []).map((r) => r.id),
    [reportQuery.data],
  )

  const reviewsQuery = useQuery({
    queryKey: ['service-report-reviews', visitId, revisionIds.join(',')],
    queryFn: () => listServiceReportReviewsForRevisions(revisionIds),
    enabled: revisionIds.length > 0,
  })

  const reviews = reviewsQuery.data ?? []
  const serverRevisions = reportQuery.data?.revisions ?? []
  const latestServer = serverRevisions.length > 0 ? serverRevisions[serverRevisions.length - 1] : null
  const latestReview = reviewFor(latestServer?.id, reviews)

  // Confirmed local submit wins until server catches up with that revision id.
  const displayRevision = useMemo(() => {
    if (confirmedRevision) {
      const onServer = serverRevisions.find((r) => r.id === confirmedRevision.id)
      return onServer ?? confirmedRevision
    }
    return latestServer
  }, [confirmedRevision, serverRevisions, latestServer])

  const displayReview = reviewFor(displayRevision?.id, reviews)
  const needsRevision =
    !!latestServer && latestReview?.decision === 'returned' && canSubmit

  // When the latest server revision was returned, drop stale submitted cache and
  // mint a new submission identity once (retained across failed retry/remount).
  useEffect(() => {
    if (!needsRevision || !latestServer) return
    const storedNow = readStoredSubmission(visitId)
    if (storedNow?.revision?.id === latestServer.id) {
      sessionStorage.removeItem(submittedStorageKey(visitId))
      setConfirmedRevision(null)
    }
    let draft: {
      clientSubmissionId?: string
      afterReturnOf?: string
      [key: string]: unknown
    } | null = null
    try {
      const raw = sessionStorage.getItem(draftStorageKey(visitId))
      draft = raw ? (JSON.parse(raw) as typeof draft) : null
    } catch {
      draft = null
    }
    // Keep an existing draft id when it belongs to this return (or was written
    // before afterReturnOf was stamped during loading).
    if (
      draft?.clientSubmissionId &&
      (!draft.afterReturnOf || draft.afterReturnOf === latestServer.id)
    ) {
      setClientSubmissionId(draft.clientSubmissionId)
      sessionStorage.setItem(
        draftStorageKey(visitId),
        JSON.stringify({ ...draft, afterReturnOf: latestServer.id }),
      )
      return
    }
    const fresh = crypto.randomUUID()
    setClientSubmissionId(fresh)
    sessionStorage.setItem(
      draftStorageKey(visitId),
      JSON.stringify({ ...(draft ?? {}), clientSubmissionId: fresh, afterReturnOf: latestServer.id }),
    )
  }, [needsRevision, latestServer, visitId])

  useEffect(() => {
    if (displayRevision && !needsRevision) return
    const key = draftStorageKey(visitId)
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        findings?: string
        workPerformed?: string
        noLabour?: boolean
        labourHours?: string
        labourDescription?: string
        verificationOutcome?: VerificationOutcome
        verificationReason?: string
        evidencePaths?: string[]
        clientSubmissionId?: string
      }
      if (draft.findings) setFindings(draft.findings)
      if (draft.workPerformed) setWorkPerformed(draft.workPerformed)
      if (typeof draft.noLabour === 'boolean') setNoLabour(draft.noLabour)
      if (draft.labourHours) setLabourHours(draft.labourHours)
      if (draft.labourDescription) setLabourDescription(draft.labourDescription)
      if (draft.verificationOutcome) setVerificationOutcome(draft.verificationOutcome)
      if (draft.verificationReason) setVerificationReason(draft.verificationReason)
      if (Array.isArray(draft.evidencePaths)) setEvidencePaths(draft.evidencePaths)
      if (draft.clientSubmissionId) setClientSubmissionId(draft.clientSubmissionId)
    } catch {
      /* ignore corrupt draft */
    }
  }, [visitId, displayRevision, needsRevision])

  useEffect(() => {
    if (displayRevision && !needsRevision) return
    sessionStorage.setItem(
      draftStorageKey(visitId),
      JSON.stringify({
        findings,
        workPerformed,
        noLabour,
        labourHours,
        labourDescription,
        verificationOutcome,
        verificationReason,
        evidencePaths,
        clientSubmissionId,
        afterReturnOf: needsRevision ? latestServer?.id : undefined,
      }),
    )
  }, [
    visitId,
    findings,
    workPerformed,
    noLabour,
    labourHours,
    labourDescription,
    verificationOutcome,
    verificationReason,
    evidencePaths,
    clientSubmissionId,
    displayRevision,
    needsRevision,
    latestServer?.id,
  ])

  const onUpload = async (file: File | null) => {
    if (!file) return
    setUploadError(null)
    setBusy(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Sign in required to upload evidence')
      const path = await uploadReportEvidence({
        ticketId,
        visitId,
        file,
        submitterUserId: user.id,
      })
      setEvidencePaths((prev) => [...prev, path])
      toast.success('Evidence uploaded')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Evidence upload failed'
      setUploadError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async () => {
    setSubmitError(null)
    setRefetchError(null)
    if (!declarationAck) {
      const msg = 'Confirm the technician declaration before submit.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }
    setBusy(true)
    try {
      const labour =
        noLabour
          ? []
          : [
              {
                hours: Number(labourHours),
                description: labourDescription.trim(),
              },
            ]
      const revision = await submitServiceReportRevision({
        visitId,
        findings: findings.trim(),
        workPerformed: workPerformed.trim(),
        labour,
        noLabour,
        verificationOutcome,
        verificationReason: verificationReason.trim() || undefined,
        technicianDeclaration: DECLARATION,
        evidencePaths,
        clientSubmissionId,
      })

      setConfirmedRevision(revision)
      sessionStorage.setItem(
        submittedStorageKey(visitId),
        JSON.stringify({ revision, clientSubmissionId }),
      )
      sessionStorage.removeItem(draftStorageKey(visitId))
      toast.success(needsRevision ? 'Revised report submitted' : 'Report submitted')

      try {
        await queryClient.invalidateQueries({ queryKey: ['service-report', visitId] })
        await queryClient.invalidateQueries({ queryKey: ['service-report-reviews', visitId] })
        await queryClient.invalidateQueries({ queryKey: ['service-jobs'] })
        await reportQuery.refetch()
        await reviewsQuery.refetch()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Submitted status refetch failed'
        setRefetchError(msg)
        toast.error('Report submitted; status refresh failed — showing submitted revision')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Report submit failed'
      setSubmitError(msg)
      toast.error(msg)
      // Keep clientSubmissionId so retry stays idempotent.
    } finally {
      setBusy(false)
    }
  }

  if ((reportQuery.isLoading || (revisionIds.length > 0 && reviewsQuery.isLoading)) && !confirmedRevision) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading report status…
      </div>
    )
  }

  const showForm = canSubmit && (!displayRevision || needsRevision)
  const showStatus = !!displayRevision && !needsRevision

  if (showStatus && displayRevision) {
    const statusLabel =
      displayReview?.decision === 'approved_issued'
        ? 'issued'
        : displayReview?.decision === 'returned'
          ? 'returned'
          : 'submitted'
    return (
      <div
        className="space-y-1 rounded border border-border/70 bg-muted/20 p-3 text-sm"
        data-testid="service-report-status"
      >
        <p className="font-medium">Report status: {statusLabel}</p>
        <p className="text-xs text-muted-foreground">
          Revision {displayRevision.revision_number} · {displayRevision.verification_outcome} ·{' '}
          {new Date(displayRevision.submitted_at).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Submission id {displayRevision.client_submission_id ?? clientSubmissionId}
        </p>
        {displayReview?.decision === 'returned' && (
          <div
            className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
            data-testid="service-report-return-readonly"
          >
            <p className="font-medium">Returned for correction</p>
            {displayReview.comments ? (
              <p className="mt-1 whitespace-pre-wrap">{displayReview.comments}</p>
            ) : (
              <p className="mt-1 text-muted-foreground">No comments recorded.</p>
            )}
          </div>
        )}
        {refetchError && (
          <p className="text-xs text-destructive">
            Status refresh failed after submit; showing confirmed revision ({refetchError}).
          </p>
        )}
        <p className="text-xs">
          Submitted content is append-only. Acknowledgment is B6.
        </p>
      </div>
    )
  }

  if (!showForm) {
    return (
      <p className="text-xs text-muted-foreground">
        Report not submitted. Only the attending technician can submit after visit completion.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded border border-border/70 p-3" data-testid="service-report-form">
      {needsRevision && latestServer && latestReview && (
        <div
          className="space-y-1 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
          data-testid="service-report-return-banner"
        >
          <p className="font-medium">
            Revision {latestServer.revision_number} was returned — submit a new revision
          </p>
          {latestReview.comments ? (
            <p className="whitespace-pre-wrap" data-testid="service-report-return-comments">
              {latestReview.comments}
            </p>
          ) : (
            <p className="text-muted-foreground">No comments recorded.</p>
          )}
          <p className="text-muted-foreground">
            The returned revision stays unchanged. New submission id {clientSubmissionId}
          </p>
        </div>
      )}
      <p className="text-sm font-medium">
        {needsRevision ? 'Resubmit visit report' : 'Submit visit report'}
      </p>
      <div className="space-y-1">
        <Label className="text-xs">Findings</Label>
        <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Work performed</Label>
        <Textarea
          value={workPerformed}
          onChange={(e) => setWorkPerformed(e.target.value)}
          rows={2}
        />
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={noLabour}
          onChange={(e) => setNoLabour(e.target.checked)}
        />
        <span>No labour to declare for this visit</span>
      </label>
      {!noLabour && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Labour hours</Label>
            <Input
              type="number"
              min="0.25"
              step="0.25"
              value={labourHours}
              onChange={(e) => setLabourHours(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Labour description</Label>
            <Input
              value={labourDescription}
              onChange={(e) => setLabourDescription(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Verification outcome</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={verificationOutcome}
          onChange={(e) => setVerificationOutcome(e.target.value as VerificationOutcome)}
        >
          <option value="verified_fixed">Verified fixed</option>
          <option value="not_reproduced">Not reproduced</option>
          <option value="further_work_required">Further work required</option>
          <option value="not_verified">Not verified</option>
        </select>
      </div>
      {verificationOutcome !== 'verified_fixed' && (
        <div className="space-y-1">
          <Label className="text-xs">Verification reason</Label>
          <Textarea
            value={verificationReason}
            onChange={(e) => setVerificationReason(e.target.value)}
            rows={2}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Supporting evidence (private)</Label>
        <Input
          type="file"
          disabled={busy}
          onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
        />
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        {evidencePaths.length > 0 && (
          <ul className="text-xs text-muted-foreground">
            {evidencePaths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={declarationAck}
          onChange={(e) => setDeclarationAck(e.target.checked)}
        />
        <span>{DECLARATION}</span>
      </label>
      {submitError && <p className="text-xs text-destructive">{submitError}</p>}
      <Button type="button" size="sm" disabled={busy} onClick={() => void onSubmit()}>
        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
        {needsRevision ? 'Resubmit report' : 'Submit report'}
      </Button>
    </div>
  )
}

export default ServiceReportPanel
