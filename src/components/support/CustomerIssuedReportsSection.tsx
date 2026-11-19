import React, { useEffect, useMemo, useRef } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { listServiceJobsForTicket, listServiceVisitsForJob } from '@/lib/ticketGovernanceApi'
import { CustomerIssuedReportView } from '@/components/support/CustomerIssuedReportView'

interface CustomerIssuedReportsSectionProps {
  ticketId: string
  focusVisitId?: string | null
  focusRevisionId?: string | null
  focusRevisionNumber?: number | null
}

/**
 * Owner-facing issued-report mounts on the real ticket route.
 * Uses the authorized getter only — no staff assignment/review controls.
 */
export const CustomerIssuedReportsSection: React.FC<CustomerIssuedReportsSectionProps> = ({
  ticketId,
  focusVisitId = null,
  focusRevisionId = null,
  focusRevisionNumber = null,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const didScrollFocus = useRef(false)

  const jobsQuery = useQuery({
    queryKey: ['service-jobs', ticketId],
    queryFn: () => listServiceJobsForTicket(ticketId),
  })

  const jobs = jobsQuery.data ?? []
  const visitQueries = useQueries({
    queries: jobs.map((job) => ({
      queryKey: ['service-visits', job.id],
      queryFn: () => listServiceVisitsForJob(job.id),
      enabled: jobs.length > 0,
    })),
  })

  const loading = jobsQuery.isLoading || visitQueries.some((q) => q.isLoading)
  const completedVisits = useMemo(
    () =>
      visitQueries.flatMap((q, i) => {
        const job = jobs[i]
        return (q.data ?? [])
          .filter((v) => v.state === 'completed')
          .map((v) => ({ visit: v, jobTitle: job?.title ?? `Job ${job?.job_sequence ?? i + 1}` }))
      }),
    [visitQueries, jobs],
  )

  useEffect(() => {
    didScrollFocus.current = false
  }, [focusVisitId, focusRevisionId, focusRevisionNumber])

  useEffect(() => {
    if (loading || jobsQuery.isError) return
    if (didScrollFocus.current) return
    if (!focusVisitId && focusRevisionId == null && focusRevisionNumber == null) return
    if (completedVisits.length === 0) return

    const preferAck =
      focusRevisionId != null || focusRevisionNumber != null
        ? document.querySelector('[data-testid="customer-ack-panel"]')
        : null
    const preferRev =
      focusRevisionNumber != null
        ? document.querySelector(`[data-testid="customer-issued-revision-${focusRevisionNumber}"]`)
        : null
    const preferVisit = focusVisitId
      ? document.querySelector(`[data-testid="customer-issued-visit-${focusVisitId}"]`)
      : null
    const target =
      (preferAck as HTMLElement | null) ??
      (preferRev as HTMLElement | null) ??
      (preferVisit as HTMLElement | null) ??
      sectionRef.current
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    didScrollFocus.current = true
  }, [
    loading,
    jobsQuery.isError,
    completedVisits,
    focusVisitId,
    focusRevisionId,
    focusRevisionNumber,
  ])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading issued reports…
      </div>
    )
  }

  if (jobsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {(jobsQuery.error as Error).message}
      </p>
    )
  }

  if (completedVisits.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="customer-issued-section-empty">
        No completed visits with reports on this ticket yet.
      </p>
    )
  }

  return (
    <div ref={sectionRef} className="space-y-4" data-testid="customer-issued-reports-section">
      {completedVisits.map(({ visit, jobTitle }) => {
        const visitFocused = Boolean(focusVisitId && focusVisitId === visit.id)
        return (
          <div
            key={visit.id}
            className="space-y-1"
            data-testid={`customer-issued-visit-${visit.id}`}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {jobTitle} · visit {visit.visit_sequence}
            </p>
            <CustomerIssuedReportView
              visitId={visit.id}
              focusRevisionId={visitFocused || !focusVisitId ? focusRevisionId : null}
              focusRevisionNumber={visitFocused || !focusVisitId ? focusRevisionNumber : null}
            />
          </div>
        )
      })}
    </div>
  )
}

export default CustomerIssuedReportsSection
