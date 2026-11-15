import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getEffectiveAcknowledgment,
  recordServiceAcknowledgment,
} from '@/lib/ticketGovernanceApi'
import { toast } from 'sonner'

interface CustomerReportAcknowledgmentPanelProps {
  issuedRevisionId: string
  revisionNumber: number
  /** When false, show effective state only (e.g. closed ticket still readable). */
  canRespond?: boolean
}

/**
 * Customer acknowledgment of an exact issued revision.
 * Does not clear safety restrictions or imply return-to-service.
 */
export const CustomerReportAcknowledgmentPanel: React.FC<CustomerReportAcknowledgmentPanelProps> = ({
  issuedRevisionId,
  revisionNumber,
  canRespond = true,
}) => {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ackQuery = useQuery({
    queryKey: ['service-acknowledgment', issuedRevisionId],
    queryFn: () => getEffectiveAcknowledgment(issuedRevisionId),
  })

  const effective = ackQuery.data

  const run = async (response: 'accepted' | 'refused') => {
    setBusy(true)
    setError(null)
    try {
      await recordServiceAcknowledgment({
        issuedRevisionId,
        response,
        comment: comment.trim() || undefined,
      })
      toast.success(response === 'accepted' ? 'Report accepted' : 'Refusal recorded')
      setComment('')
      await queryClient.invalidateQueries({ queryKey: ['service-acknowledgment', issuedRevisionId] })
      await queryClient.invalidateQueries({ queryKey: ['ticket-workflow-prerequisites'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Acknowledgment failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  if (ackQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading acknowledgment…
      </div>
    )
  }

  return (
    <div className="space-y-2 border-t border-border/60 pt-2" data-testid="customer-ack-panel">
      <p className="text-xs font-medium">Acknowledgment — revision {revisionNumber}</p>
      {effective ? (
        <p className="text-xs text-muted-foreground" data-testid="customer-ack-effective">
          Effective response: <span className="font-medium text-foreground">{effective.response}</span>
          {effective.comment ? ` — ${effective.comment}` : ''}
          {effective.response === 'unavailable'
            ? ' (staff-recorded; not acceptance)'
            : ''}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No acknowledgment yet for this issued revision.</p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Applies only to this issued revision. Does not clear machine safety restrictions or approve
        return-to-service.
      </p>
      {canRespond && (
        <div className="space-y-2">
          <div>
            <Label htmlFor={`ack-comment-${issuedRevisionId}`} className="text-xs">
              Comment (required to refuse)
            </Label>
            <Textarea
              id={`ack-comment-${issuedRevisionId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1 text-sm"
              data-testid="customer-ack-comment"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive" data-testid="customer-ack-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              data-testid="customer-ack-accept"
              onClick={() => void run('accepted')}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept report'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              data-testid="customer-ack-refuse"
              onClick={() => void run('refused')}
            >
              Refuse
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerReportAcknowledgmentPanel
