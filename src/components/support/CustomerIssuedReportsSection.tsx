import React from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { listServiceJobsForTicket, listServiceVisitsForJob } from '@/lib/ticketGovernanceApi'
import { CustomerIssuedReportView } from '@/components/support/CustomerIssuedReportView'

interface CustomerIssuedReportsSectionProps {
  ticketId: string
}

/**
 * Owner-facing issued-report mounts on the real ticket route.
 * Uses the authorized getter only — no staff assignment/review controls.
 */
export const CustomerIssuedReportsSection: React.FC<CustomerIssuedReportsSectionProps> = ({
  ticketId,
}) => {
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

  if (jobsQuery.isLoading || visitQueries.some((q) => q.isLoading)) {
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

  const completedVisits = visitQueries.flatMap((q, i) => {
    const job = jobs[i]
    return (q.data ?? [])
      .filter((v) => v.state === 'completed')
      .map((v) => ({ visit: v, jobTitle: job?.title ?? `Job ${job?.job_sequence ?? i + 1}` }))
  })

  if (completedVisits.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="customer-issued-section-empty">
        No completed visits with reports on this ticket yet.
      </p>
    )
  }

  return (
    <div className="space-y-4" data-testid="customer-issued-reports-section">
      {completedVisits.map(({ visit, jobTitle }) => (
        <div key={visit.id} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {jobTitle} · visit {visit.visit_sequence}
          </p>
          <CustomerIssuedReportView visitId={visit.id} />
        </div>
      ))}
    </div>
  )
}

export default CustomerIssuedReportsSection
