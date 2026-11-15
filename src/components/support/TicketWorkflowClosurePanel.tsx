import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
} from '@/lib/ticketGovernanceApi'
import type { TicketStatus } from '@/types/tickets'
import { toast } from 'sonner'

interface TicketWorkflowClosurePanelProps {
  ticketId: string
  currentStatus: string
  currentUserId: string
  resolutionSummary?: string | null
}

/**
 * Manager prerequisite / closure surface: named failures, unavailable path,
 * refusal disposition, resolve/close via governed transition.
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
    queryFn: async () => {
      const heads: Array<{ revisionId: string; revisionNumber: number; jobLabel: string }> = []
      for (const job of jobsQuery.data ?? []) {
        const visits = await listServiceVisitsForJob(job.id)
        for (const visit of visits) {
          const bundle = await getServiceReportForVisit(visit.id)
          const issued = [...(bundle.revisions ?? [])].reverse()
          const head = issued[0]
          if (!head) continue
          const ack = await getEffectiveAcknowledgment(head.id)
          const disp = ack?.response === 'refused'
            ? await getEffectiveAcknowledgmentDisposition(head.id)
            : null
          heads.push({
            revisionId: head.id,
            revisionNumber: head.revision_number,
            jobLabel: `Job ${job.job_sequence} (${job.title})`,
          })
          void ack
          void disp
        }
      }
      // De-dupe by revision id (one head per report)
      const seen = new Set<string>()
      return heads.filter((h) => {
        if (seen.has(h.revisionId)) return false
        seen.add(h.revisionId)
        return true
      })
    },
  })

  const failures = prereqQuery.data ?? []
  const refusalPending = failures.some((f) => f.code === 'acknowledgment_refusal_disposition_pending')
  const ackOutstanding = failures.some((f) => f.code === 'acknowledgment_outstanding')

  const refusalHeadId = useMemo(() => {
    const f = failures.find((x) => x.code === 'acknowledgment_refusal_disposition_pending')
    if (!f) return issuedHeadsQuery.data?.[0]?.revisionId
    return issuedHeadsQuery.data?.[0]?.revisionId
  }, [failures, issuedHeadsQuery.data])

  const contactAttempts = (): ContactAttempt[] => {
    const now = new Date()
    const t0 = new Date(now.getTime() - 3 * 86400000).toISOString()
    const t1 = new Date(now.getTime() - 2 * 86400000).toISOString()
    const t2 = new Date(now.getTime() - 1 * 86400000).toISOString()
    return [
      {
        attempted_at: t0,
        channel: 'issue_notification',
        outcome: 'delivered',
        by_actor_id: currentUserId,
      },
      {
        attempted_at: t1,
        channel: 'phone',
        outcome: 'no_answer',
        by_actor_id: currentUserId,
      },
      {
        attempted_at: t2,
        channel: 'email',
        outcome: 'no_reply',
        by_actor_id: currentUserId,
      },
    ]
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ticket-workflow-prerequisites', ticketId] })
    await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    await queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
  }

  const runDisposition = async (disposition: 'accept_refusal_and_proceed' | 'create_follow_up') => {
    if (!refusalHeadId) {
      toast.error('No issued revision available for disposition')
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
    if (!issuedHeadsQuery.data?.[0]) {
      toast.error('No issued revision for unavailable acknowledgment')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordServiceAcknowledgmentUnavailable({
        issuedRevisionId: issuedHeadsQuery.data[0].revisionId,
        contactAttempts: contactAttempts(),
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
              disabled={busy || !dispRationale.trim()}
              onClick={() => void runDisposition('accept_refusal_and_proceed')}
            >
              Accept refusal & proceed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !dispRationale.trim()}
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
          <p className="text-[11px] text-muted-foreground">
            Records attributable contact attempts (notification + two follow-ups). Not acceptance.
          </p>
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
            disabled={busy || !unavailRationale.trim()}
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
