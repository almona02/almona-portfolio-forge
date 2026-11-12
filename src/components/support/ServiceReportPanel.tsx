import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getServiceReportForVisit,
  submitServiceReportRevision,
  uploadReportEvidence,
  type ServiceReportRevisionRow,
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
    () => stored?.clientSubmissionId ?? crypto.randomUUID(),
  )
  const [confirmedRevision, setConfirmedRevision] = useState<ServiceReportRevisionRow | null>(
    () => stored?.revision ?? null,
  )

  const reportQuery = useQuery({
    queryKey: ['service-report', visitId],
    queryFn: () => getServiceReportForVisit(visitId),
  })

  const submittedHead = useMemo(() => {
    if (confirmedRevision) return confirmedRevision
    const revs = reportQuery.data?.revisions ?? []
    if (revs.length === 0) return null
    return revs[revs.length - 1]
  }, [confirmedRevision, reportQuery.data])

  useEffect(() => {
    if (submittedHead) return
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
  }, [visitId, submittedHead])

  useEffect(() => {
    if (submittedHead) return
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
    submittedHead,
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

      // Persist submitted identity BEFORE refetch. Never rotate the request key after success.
      setConfirmedRevision(revision)
      sessionStorage.setItem(
        submittedStorageKey(visitId),
        JSON.stringify({ revision, clientSubmissionId }),
      )
      sessionStorage.removeItem(draftStorageKey(visitId))
      toast.success('Report submitted')

      try {
        await queryClient.invalidateQueries({ queryKey: ['service-report', visitId] })
        await queryClient.invalidateQueries({ queryKey: ['service-jobs'] })
        await reportQuery.refetch()
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

  if (reportQuery.isLoading && !confirmedRevision) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading report status…
      </div>
    )
  }

  if (submittedHead) {
    return (
      <div className="space-y-1 rounded border border-border/70 bg-muted/20 p-3 text-sm">
        <p className="font-medium">Report status: submitted</p>
        <p className="text-xs text-muted-foreground">
          Revision {submittedHead.revision_number} · {submittedHead.verification_outcome} ·{' '}
          {new Date(submittedHead.submitted_at).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Submission id {submittedHead.client_submission_id ?? clientSubmissionId}
        </p>
        {refetchError && (
          <p className="text-xs text-destructive">
            Status refresh failed after submit; showing confirmed revision ({refetchError}).
          </p>
        )}
        <p className="text-xs">
          Submitted content is append-only. Manager review/issue is B5; acknowledgment is B6.
        </p>
      </div>
    )
  }

  if (!canSubmit) {
    return (
      <p className="text-xs text-muted-foreground">
        Report not submitted. Only the attending technician can submit after visit completion.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded border border-border/70 p-3">
      <p className="text-sm font-medium">Submit visit report</p>
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
        Submit report
      </Button>
    </div>
  )
}

export default ServiceReportPanel
