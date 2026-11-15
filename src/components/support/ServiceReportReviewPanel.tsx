import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createReportEvidenceSignedUrl,
  getServiceReportForVisit,
  reviewServiceReportRevision,
  type ServiceReportRevisionRow,
} from '@/lib/ticketGovernanceApi'
import { toast } from 'sonner'

interface ServiceReportReviewPanelProps {
  visitId: string
  /** Current viewer may decide reviews (admin/support, not author). */
  canReview: boolean
  currentUserId?: string | null
}

export const ServiceReportReviewPanel: React.FC<ServiceReportReviewPanelProps> = ({
  visitId,
  canReview,
  currentUserId,
}) => {
  const queryClient = useQueryClient()
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportQuery = useQuery({
    queryKey: ['service-report', visitId],
    queryFn: () => getServiceReportForVisit(visitId),
  })

  const head: ServiceReportRevisionRow | null = (() => {
    const revs = reportQuery.data?.revisions ?? []
    if (revs.length === 0) return null
    return revs[revs.length - 1]
  })()

  const isAuthor = !!head && !!currentUserId && head.submitted_by === currentUserId
  const allowDecide = canReview && !!head && !isAuthor

  const run = async (decision: 'approved_issued' | 'returned') => {
    if (!head) return
    setBusy(true)
    setError(null)
    try {
      await reviewServiceReportRevision({
        revisionId: head.id,
        decision,
        comments: comments.trim() || undefined,
      })
      toast.success(decision === 'approved_issued' ? 'Report approved and issued' : 'Report returned')
      setComments('')
      await queryClient.invalidateQueries({ queryKey: ['service-report', visitId] })
      await queryClient.invalidateQueries({ queryKey: ['service-jobs'] })
      await queryClient.invalidateQueries({ queryKey: ['service-visits'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Review failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const download = async (path: string) => {
    try {
      const url = await createReportEvidenceSignedUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    }
  }

  if (reportQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading report for review…
      </div>
    )
  }

  if (!head) {
    return (
      <p className="text-xs text-muted-foreground">No submitted revision awaiting manager review.</p>
    )
  }

  return (
    <div className="space-y-3 rounded border border-border/70 p-3" data-testid="service-report-review-panel">
      <div>
        <p className="text-sm font-medium">Manager review — revision {head.revision_number}</p>
        <p className="text-xs text-muted-foreground">
          Verification: {head.verification_outcome}
          {head.verification_reason ? ` — ${head.verification_reason}` : ''}
        </p>
      </div>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-xs text-muted-foreground">Findings</span>
          <br />
          {head.findings}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Work performed</span>
          <br />
          {head.work_performed}
        </p>
      </div>
      {(head.evidence_paths ?? []).length > 0 && (
        <ul className="space-y-1">
          {(head.evidence_paths ?? []).map((p) => (
            <li key={p}>
              <Button type="button" size="sm" variant="ghost" onClick={() => void download(p)}>
                Download evidence
              </Button>
              <span className="ml-2 text-xs text-muted-foreground break-all">{p}</span>
            </li>
          ))}
        </ul>
      )}
      {isAuthor && (
        <p className="text-xs text-destructive">You authored this revision; self-review is not allowed.</p>
      )}
      {allowDecide && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Comments (required to return)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void run('approved_issued')}>
              Approve &amp; issue
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || !comments.trim()}
              onClick={() => void run('returned')}
            >
              Return for correction
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Approval is not a return-to-service decision. Jobs with further_work_required stay open.
            Acknowledgment and ticket closure are B6.
          </p>
        </div>
      )}
    </div>
  )
}

export default ServiceReportReviewPanel
