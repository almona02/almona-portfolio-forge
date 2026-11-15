import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createReportEvidenceSignedUrl,
  getServiceReportForVisit,
} from '@/lib/ticketGovernanceApi'
import { CustomerReportAcknowledgmentPanel } from '@/components/support/CustomerReportAcknowledgmentPanel'
import { toast } from 'sonner'

interface CustomerIssuedReportViewProps {
  visitId: string
  /** When false, acknowledgment history is read-only. */
  canAcknowledge?: boolean
}

/**
 * Customer view: getter already omits unissued revisions/evidence and staff comments.
 * Renders every issued revision (history); a pending correction does not replace prior issued.
 */
export const CustomerIssuedReportView: React.FC<CustomerIssuedReportViewProps> = ({
  visitId,
  canAcknowledge = true,
}) => {
  const reportQuery = useQuery({
    queryKey: ['service-report', visitId],
    queryFn: () => getServiceReportForVisit(visitId),
  })

  const issued = reportQuery.data?.revisions ?? []

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
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading issued report…
      </div>
    )
  }

  if (issued.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="customer-issued-report-empty">
        No issued report is available for this visit yet.
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="customer-issued-report">
      {issued.map((rev) => (
        <div
          key={rev.id}
          className="space-y-2 rounded border border-border/70 p-3"
          data-testid={`customer-issued-revision-${rev.revision_number}`}
        >
          <p className="text-sm font-medium">Issued report — revision {rev.revision_number}</p>
          <p className="text-xs text-muted-foreground">
            Issued {new Date(rev.submitted_at).toLocaleString()} · {rev.verification_outcome}
          </p>
          <p className="text-sm whitespace-pre-wrap">{rev.findings}</p>
          <p className="text-sm whitespace-pre-wrap">{rev.work_performed}</p>
          {(rev.evidence_paths ?? []).length > 0 && (
            <ul className="space-y-1">
              {(rev.evidence_paths ?? []).map((p) => (
                <li key={p}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid={`customer-evidence-download-${rev.revision_number}`}
                    onClick={() => void download(p)}
                  >
                    Download evidence
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <CustomerReportAcknowledgmentPanel
            issuedRevisionId={rev.id}
            revisionNumber={rev.revision_number}
            canRespond={canAcknowledge}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Unissued corrections are not shown. Prior issued revisions remain listed. Acknowledgment
        attaches only to the issued revision shown — a newer correction does not inherit a prior
        acceptance.
      </p>
    </div>
  )
}

export default CustomerIssuedReportView
