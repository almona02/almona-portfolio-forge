import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStaffDailyOpsWorkspace,
  type StaffDailyOpsQueueKey,
  type StaffDailyOpsRpcError,
  type StaffDailyOpsWorkspace,
} from '@/lib/staffDailyOpsApi'

type ChipDef = {
  key: StaffDailyOpsQueueKey
  label: string
  emptyCopy: string
}

const CHIPS: ChipDef[] = [
  {
    key: 'overdue_occurrences',
    label: 'Overdue service work',
    emptyCopy: 'No overdue generated occurrences.',
  },
  {
    key: 'unassigned_jobs',
    label: 'Unassigned jobs',
    emptyCopy: 'No unassigned jobs on open tickets.',
  },
  {
    key: 'jobs_awaiting_review',
    label: 'Jobs awaiting review',
    emptyCopy: 'No jobs awaiting review.',
  },
  {
    key: 'awaiting_customer',
    label: 'Awaiting customer',
    emptyCopy: 'No tickets awaiting customer response.',
  },
]

function queueCount(data: StaffDailyOpsWorkspace | undefined, key: StaffDailyOpsQueueKey): number | null {
  if (!data) return null
  return data[key].count
}

function rowTitle(key: StaffDailyOpsQueueKey, item: Record<string, unknown>): string {
  if (key === 'overdue_occurrences') {
    const due = String(item.planned_due_date ?? '')
    const title = String(item.ticket_title ?? item.ticket_number ?? 'Occurrence')
    const seq = item.sequence != null ? ` · seq ${item.sequence}` : ''
    return `${title}${seq} · due ${due}`
  }
  if (key === 'unassigned_jobs' || key === 'jobs_awaiting_review') {
    const jobTitle = String(item.job_title ?? 'Job')
    const ticket = String(item.ticket_number ?? item.ticket_title ?? '')
    return ticket ? `${jobTitle} · ${ticket}` : jobTitle
  }
  return String(item.ticket_title ?? item.ticket_number ?? 'Ticket')
}

function rowHref(key: StaffDailyOpsQueueKey, item: Record<string, unknown>): string {
  const ticketId = String(item.ticket_id ?? '')
  return `/support/tickets/${ticketId}`
}

export const StaffDailyOpsStrip: React.FC = () => {
  const [active, setActive] = useState<StaffDailyOpsQueueKey | null>(null)

  const query = useQuery({
    queryKey: ['staff-daily-ops-workspace'],
    queryFn: () => getStaffDailyOpsWorkspace(),
    retry: false,
  })

  const data = query.data
  const rpcError = query.error as StaffDailyOpsRpcError | null
  const activeChip = CHIPS.find((c) => c.key === active) ?? null
  const activeQueue = data && active ? data[active] : null

  return (
    <section className="space-y-3" data-testid="staff-daily-ops-strip" aria-labelledby="staff-daily-ops-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="staff-daily-ops-heading" className="text-sm font-medium tracking-tight">
            Daily operations
          </h2>
          <p className="text-xs text-muted-foreground">
            Admin/Support queues — counts match the linked filter. Read-only; generation stays manual.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          data-testid="staff-daily-ops-refresh"
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {query.isLoading ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="staff-daily-ops-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queues…
        </div>
      ) : null}

      {query.isError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="staff-daily-ops-error">
          Queues unavailable
          {rpcError?.detailCode ? ` (${rpcError.detailCode})` : ''}
          {rpcError?.status === 403 ? ' — staff only' : ''}. Refresh to retry.
        </p>
      ) : null}

      {!query.isLoading && !query.isError && data ? (
        <div className="flex flex-wrap gap-2" data-testid="staff-daily-ops-chips">
          {CHIPS.map((chip) => {
            const count = queueCount(data, chip.key)
            const selected = active === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                data-testid={`staff-daily-ops-chip-${chip.key}`}
                data-count={count ?? undefined}
                aria-pressed={selected}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted/40',
                ].join(' ')}
                onClick={() => setActive((prev) => (prev === chip.key ? null : chip.key))}
              >
                <span>{chip.label}</span>
                <span
                  className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums"
                  data-testid={`staff-daily-ops-count-${chip.key}`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {activeChip && !query.isError && data ? (
        <div
          className="rounded-md border border-border p-3 space-y-2"
          data-testid={`staff-daily-ops-queue-${activeChip.key}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{activeChip.label}</h3>
            <span className="text-xs text-muted-foreground tabular-nums" data-testid="staff-daily-ops-queue-count">
              {activeQueue?.count ?? 0}
            </span>
          </div>
          {activeQueue && activeQueue.count === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="staff-daily-ops-empty">
              {activeChip.emptyCopy}
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="staff-daily-ops-queue-items">
              {(activeQueue?.items ?? []).map((raw) => {
                const item = raw as unknown as Record<string, unknown>
                const id =
                  String(item.occurrence_id ?? item.job_id ?? item.ticket_id ?? Math.random())
                const href = rowHref(activeChip.key, item)
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    data-testid="staff-daily-ops-row"
                  >
                    <span className="min-w-0 truncate">{rowTitle(activeChip.key, item)}</span>
                    <Link
                      to={href}
                      className="shrink-0 text-primary underline-offset-4 hover:underline"
                      data-testid="staff-daily-ops-next-action"
                    >
                      Open ticket
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {data.as_of ? (
            <p className="text-[11px] text-muted-foreground" data-testid="staff-daily-ops-as-of">
              As of (Africa/Cairo): {data.as_of}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default StaffDailyOpsStrip
