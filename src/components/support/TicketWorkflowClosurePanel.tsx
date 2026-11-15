import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  evaluateTicketWorkflowPrerequisites,
  getEffectiveAcknowledgment,
  getEffectiveAcknowledgmentDisposition,
  getServiceReportForVisit,
  governTicketTransition,
  listServiceJobsForTicket,
  listServiceVisitsForJob,
  recordAcknowledgmentDisposition,
  recordServiceAcknowledgmentUnavailable,
  type ContactAttempt,
  type WorkflowPrerequisiteFailure,
} from '@/lib/ticketGovernanceApi'
import type { TicketStatus } from '@/types/tickets'
import { toast } from 'sonner'

interface TicketWorkflowClosurePanelProps {
  ticketId: string
  currentStatus: string
  currentUserId: string
  resolutionSummary?: string | null
}

type IssuedHead = {
  revisionId: string
  revisionNumber: number
  jobSequence: number
  jobLabel: string
  effectiveResponse: string | null
}

/**
 * Structured target only (`entity_id`). Never fall back to "first issued head"
 * or prose parsing — missing/stale target fails closed.
 */
export function targetRevisionIdForCode(
  failures: WorkflowPrerequisiteFailure[],
  code: string,
  _heads?: IssuedHead[],
): string | null {
  const match = failures.find((f) => f.code === code)
  const id = match?.entity_id?.trim()
  return id || null
}

type AttemptDraft = {
  attempted_at: string
  channel: string
  outcome: string
}

const emptyAttempt = (): AttemptDraft => ({
  attempted_at: '',
  channel: '',
  outcome: '',
})

/**
 * Manager prerequisite / closure surface: named failures, unavailable path,
 * refusal disposition, resolve/close via governed transition.
 * Contact attempts are staff-entered (never fabricated).
 */
export const TicketWorkflowClosurePanel: React.FC<TicketWorkflowClosurePanelProps> = ({
  ticketId,
  currentStatus,
  currentUserId,
  resolutionSummary,
}) => {
  const queryClient = useQueryClient()
  const [summary, setSummary] = useState(resolutionSummary ?? '')
  const [dispRationale, setDispRationale] = useState('')
  const [unavailRationale, setUnavailRationale] = useState('')
  const [attempts, setAttempts] = useState<AttemptDraft[]>([
    { attempted_at: '', channel: 'issue_notification', outcome: '' },
    emptyAttempt(),
    emptyAttempt(),
  ])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prereqQuery = useQuery({
    queryKey: ['ticket-workflow-prerequisites', ticketId],
    queryFn: () => evaluateTicketWorkflowPrerequisites(ticketId),
  })

  const jobsQuery = useQuery({
    queryKey: ['service-jobs', ticketId],
    queryFn: () => listServiceJobsForTicket(ticketId),
  })

  const issuedHeadsQuery = useQuery({
    queryKey: ['closure-issued-heads', ticketId, jobsQuery.data?.map((j) => j.id).join(',')],
    enabled: !!jobsQuery.data?.length,
    queryFn: async (): Promise<IssuedHead[]> => {
      const heads: IssuedHead[] = []
      for (const job of jobsQuery.data ?? []) {
        const visits = await listServiceVisitsForJob(job.id)
        for (const visit of visits) {
          const bundle = await getServiceReportForVisit(visit.id)
          const issued = [...(bundle.revisions ?? [])].reverse()
          const head = issued[0]
          if (!head) continue
          const ack = await getEffectiveAcknowledgment(head.id)
          if (ack?.response === 'refused') {
            await getEffectiveAcknowledgmentDisposition(head.id)
          }
          heads.push({
            revisionId: head.id,
            revisionNumber: head.revision_number,
            jobSequence: job.job_sequence,
            jobLabel: `Job ${job.job_sequence} (${job.title})`,
            effectiveResponse: ack?.response ?? null,
          })
        }
      }
      const seen = new Set<string>()
      return heads.filter((h) => {
        if (seen.has(h.revisionId)) return false
        seen.add(h.revisionId)
        return true
      })
    },
  })

  const failures = prereqQuery.data ?? []
  const heads = issuedHeadsQuery.data ?? []
  const refusalPending = failures.some((f) => f.code === 'acknowledgment_refusal_disposition_pending')
  const ackOutstanding = failures.some((f) => f.code === 'acknowledgment_outstanding')

  const refusalHeadId = useMemo(
    () => targetRevisionIdForCode(failures, 'acknowledgment_refusal_disposition_pending', heads),
    [failures, heads],
  )
  const outstandingHeadId = useMemo(
    () => targetRevisionIdForCode(failures, 'acknowledgment_outstanding', heads),
    [failures, heads],
  )

  const refusalHeadLabel = heads.find((h) => h.revisionId === refusalHeadId)?.jobLabel
  const outstandingHeadLabel = heads.find((h) => h.revisionId === outstandingHeadId)?.jobLabel

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ticket-workflow-prerequisites', ticketId] })
    await queryClient.invalidateQueries({ queryKey: ['closure-issued-heads', ticketId] })
    await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    await queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
  }

  const buildContactAttempts = (): ContactAttempt[] | null => {
    const built: ContactAttempt[] = []
    for (const a of attempts) {
      const attempted_at = a.attempted_at.trim()
      const channel = a.channel.trim()
      const outcome = a.outcome.trim()
      if (!attempted_at && !channel && !outcome) continue
      if (!attempted_at || !channel || !outcome) return null
      built.push({
        attempted_at: new Date(attempted_at).toISOString(),
        channel,
        outcome,
        by_actor_id: currentUserId,
      })
    }
    return built.length >= 3 ? built : null
  }

  const runDisposition = async (disposition: 'accept_refusal_and_proceed' | 'create_follow_up') => {
    if (!refusalHeadId) {
      toast.error('No refused issued revision targeted for disposition')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordAcknowledgmentDisposition({
        issuedRevisionId: refusalHeadId,
        disposition,
        rationale: dispRationale.trim(),
      })
      toast.success('Disposition recorded')
      setDispRationale('')
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Disposition failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const runUnavailable = async () => {
    if (!outstandingHeadId) {
      toast.error('No outstanding issued revision targeted for unavailable')
      return
    }
    const contactAttempts = buildContactAttempts()
    if (!contactAttempts) {
      toast.error(
        'Enter real contact attempts: issue notification plus two distinct follow-ups (time, channel, outcome).',
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordServiceAcknowledgmentUnavailable({
        issuedRevisionId: outstandingHeadId,
        contactAttempts,
        rationale: unavailRationale.trim(),
      })
      toast.success('Unavailable acknowledgment recorded')
      setUnavailRationale('')
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unavailable recording failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const transition = async (toStatus: Extract<TicketStatus, 'resolved' | 'closed'>) => {
    setBusy(true)
    setError(null)
    try {
      await governTicketTransition({
        ticketId,
        toStatus,
        rationale: `Workflow ${toStatus} via closure panel`,
        resolutionSummary: summary.trim() || undefined,
      })
      toast.success(`Ticket ${toStatus}`)
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transition failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const updateAttempt = (index: number, patch: Partial<AttemptDraft>) => {
    setAttempts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3" data-testid="ticket-workflow-closure-panel">
      <p className="text-sm font-medium">Workflow closure prerequisites</p>
      <p className="text-[11px] text-muted-foreground">
        Named failures from the trusted backend. Closure does not clear safety restrictions or imply
        return-to-service.
      </p>

      {prereqQuery.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating…
        </div>
      ) : failures.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="closure-prereq-clear">
          No workflow prerequisite failures.
        </p>
      ) : (
        <ul className="space-y-1 text-xs" data-testid="closure-prereq-list">
          {failures.map((f) => (
            <li key={`${f.code}:${f.detail}`} className="text-destructive">
              <span className="font-mono">{f.code}</span>: {f.detail}
            </li>
          ))}
        </ul>
      )}

      <div>
        <Label htmlFor={`res-summary-${ticketId}`} className="text-xs">
          Resolution summary
        </Label>
        <Textarea
          id={`res-summary-${ticketId}`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="mt-1 text-sm"
          data-testid="closure-resolution-summary"
        />
      </div>

      {refusalPending && (
        <div className="space-y-2 rounded border border-border/70 p-2" data-testid="closure-disposition">
          <p className="text-xs font-medium">Refusal disposition</p>
          <p className="text-[11px] text-muted-foreground" data-testid="closure-disposition-target">
            Target: {refusalHeadLabel ?? ' unresolved head'} ({refusalHeadId ?? 'none'})
          </p>
          <Textarea
            value={dispRationale}
            onChange={(e) => setDispRationale(e.target.value)}
            placeholder="Rationale (required)"
            rows={2}
            className="text-sm"
            data-testid="closure-disposition-rationale"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !dispRationale.trim() || !refusalHeadId}
              onClick={() => void runDisposition('accept_refusal_and_proceed')}
            >
              Accept refusal & proceed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !dispRationale.trim() || !refusalHeadId}
              onClick={() => void runDisposition('create_follow_up')}
            >
              Require follow-up
            </Button>
          </div>
        </div>
      )}

      {ackOutstanding && (
        <div className="space-y-2 rounded border border-border/70 p-2" data-testid="closure-unavailable">
          <p className="text-xs font-medium">Customer unavailable</p>
          <p className="text-[11px] text-muted-foreground" data-testid="closure-unavailable-target">
            Target outstanding head: {outstandingHeadLabel ?? '—'} ({outstandingHeadId ?? 'none'}).
            Enter real attributable attempts — nothing is invented.
          </p>
          <div className="space-y-2" data-testid="closure-contact-attempts">
            {attempts.map((row, index) => (
              <div
                key={index}
                className="grid gap-1 sm:grid-cols-3"
                data-testid={`closure-attempt-row-${index}`}
              >
                <Input
                  type="datetime-local"
                  value={row.attempted_at}
                  onChange={(e) => updateAttempt(index, { attempted_at: e.target.value })}
                  data-testid={`closure-attempt-at-${index}`}
                  aria-label={`Attempt ${index + 1} time`}
                />
                <Input
                  value={row.channel}
                  onChange={(e) => updateAttempt(index, { channel: e.target.value })}
                  placeholder={index === 0 ? 'issue_notification' : 'channel'}
                  data-testid={`closure-attempt-channel-${index}`}
                  aria-label={`Attempt ${index + 1} channel`}
                />
                <Input
                  value={row.outcome}
                  onChange={(e) => updateAttempt(index, { outcome: e.target.value })}
                  placeholder="outcome"
                  data-testid={`closure-attempt-outcome-${index}`}
                  aria-label={`Attempt ${index + 1} outcome`}
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="closure-attempt-add"
              onClick={() => setAttempts((prev) => [...prev, emptyAttempt()])}
            >
              Add attempt
            </Button>
          </div>
          <Textarea
            value={unavailRationale}
            onChange={(e) => setUnavailRationale(e.target.value)}
            placeholder="Rationale (required)"
            rows={2}
            className="text-sm"
            data-testid="closure-unavailable-rationale"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !unavailRationale.trim() || !outstandingHeadId}
            data-testid="closure-unavailable-submit"
            onClick={() => void runUnavailable()}
          >
            Record unavailable
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive whitespace-pre-wrap" data-testid="closure-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || currentStatus === 'closed' || currentStatus === 'cancelled'}
          data-testid="closure-resolve"
          onClick={() => void transition('resolved')}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Resolve'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || currentStatus === 'closed' || currentStatus === 'cancelled'}
          data-testid="closure-close"
          onClick={() => void transition('closed')}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

export default TicketWorkflowClosurePanel
