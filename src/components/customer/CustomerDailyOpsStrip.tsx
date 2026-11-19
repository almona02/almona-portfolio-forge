import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCustomerDailyOpsWorkspace,
  type CustomerDailyOpsQueueKey,
  type CustomerDailyOpsRpcError,
  type CustomerDailyOpsWorkspace,
} from '@/lib/customerDailyOpsApi'

type ChipDef = {
  key: CustomerDailyOpsQueueKey
  label: string
  emptyCopy: string
}

const CHIPS: ChipDef[] = [
  {
    key: 'active_tickets',
    label: 'My active tickets',
    emptyCopy: 'No active service tickets.',
  },
  {
    key: 'issued_reports',
    label: 'Issued reports',
    emptyCopy: 'No issued reports available to read.',
  },
  {
    key: 'awaiting_acknowledgment',
    label: 'Awaiting acknowledgment',
    emptyCopy: 'No reports awaiting your acknowledgment.',
  },
  {
    key: 'upcoming_service',
    label: 'Upcoming service',
    emptyCopy: 'No upcoming or due service on your machines.',
  },
]

function queueCount(data: CustomerDailyOpsWorkspace | undefined, key: CustomerDailyOpsQueueKey): number | null {
  if (!data) return null
  return data[key].count
}

function rowTitle(key: CustomerDailyOpsQueueKey, item: Record<string, unknown>): string {
  if (key === 'active_tickets') {
    const title = String(item.title ?? 'Ticket')
    const status = String(item.status ?? '')
    const num = String(item.ticket_number ?? '')
    const head = num ? `${num} · ${title}` : title
    return status ? `${head} · ${status}` : head
  }
  if (key === 'upcoming_service') {
    const due = String(item.planned_due_date ?? '')
    const bucket = String(item.bucket ?? '')
    const covStatus = String(item.coverage_status ?? '')
    const parts = [due, bucket, covStatus].filter(Boolean)
    return parts.join(' · ') || 'Schedule row'
  }
  const ticket = String(item.ticket_number ?? item.ticket_title ?? 'Ticket')
  const job = String(item.job_title ?? 'Job')
  const rev = item.revision_number != null ? `rev ${String(item.revision_number)}` : ''
  return [ticket, job, rev].filter(Boolean).join(' · ')
}

function rowHref(item: Record<string, unknown>): string | null {
  const href = item.href
  if (href == null || href === '') return null
  return String(href)
}

export const CustomerDailyOpsStrip: React.FC = () => {
  const [active, setActive] = useState<CustomerDailyOpsQueueKey | null>(null)

  const query = useQuery({
    queryKey: ['customer-daily-ops-workspace'],
    queryFn: () => getCustomerDailyOpsWorkspace(),
    retry: false,
  })

  const data = query.data
  const rpcError = query.error as CustomerDailyOpsRpcError | null
  const activeChip = CHIPS.find((c) => c.key === active) ?? null
  const activeQueue = data && active ? data[active] : null

  return (
    <section
      className="space-y-3 rounded-lg border border-border/30 bg-background/40 p-4"
      data-testid="customer-daily-ops-strip"
      aria-labelledby="customer-daily-ops-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="customer-daily-ops-heading" className="text-sm font-medium tracking-tight">
            Daily operations
          </h2>
          <p className="text-xs text-muted-foreground">
            Your active tickets, issued reports, acknowledgments, and upcoming service. Read-only
            counts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          data-testid="customer-daily-ops-refresh"
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {query.isLoading ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="customer-daily-ops-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queues…
        </div>
      ) : null}

      {query.isError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="customer-daily-ops-error">
          Queues unavailable
          {rpcError?.detailCode ? ` (${rpcError.detailCode})` : ''}
          {rpcError?.status === 403 ? ' — not permitted' : ''}. Refresh to retry.
        </p>
      ) : null}

      {!query.isLoading && !query.isError && data ? (
        <div className="flex flex-wrap gap-2" data-testid="customer-daily-ops-chips">
          {CHIPS.map((chip) => {
            const count = queueCount(data, chip.key)
            const selected = active === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                data-testid={`customer-daily-ops-chip-${chip.key}`}
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
                  data-testid={`customer-daily-ops-count-${chip.key}`}
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
          data-testid={`customer-daily-ops-queue-${activeChip.key}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{activeChip.label}</h3>
            <span
              className="text-xs text-muted-foreground tabular-nums"
              data-testid="customer-daily-ops-queue-count"
            >
              {activeQueue?.count ?? 0}
            </span>
          </div>
          {activeQueue && activeQueue.count === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="customer-daily-ops-empty">
              {activeChip.emptyCopy}
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="customer-daily-ops-queue-items">
              {(activeQueue?.items ?? []).map((raw, idx) => {
                const item = raw as unknown as Record<string, unknown>
                const id = String(
                  item.revision_id ??
                    item.ticket_id ??
                    item.coverage_id ??
                    `${idx}-${String(item.sequence ?? '')}`,
                )
                const href = rowHref(item)
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    data-testid="customer-daily-ops-row"
                    data-revision-id={item.revision_id ? String(item.revision_id) : undefined}
                    data-ticket-id={item.ticket_id ? String(item.ticket_id) : undefined}
                  >
                    <span className="min-w-0 truncate">{rowTitle(activeChip.key, item)}</span>
                    {href ? (
                      <Link
                        to={href}
                        className="shrink-0 text-primary underline-offset-4 hover:underline"
                        data-testid="customer-daily-ops-next-action"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">Summary only</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {data.as_of ? (
            <p className="text-[11px] text-muted-foreground" data-testid="customer-daily-ops-as-of">
              As of (Africa/Cairo): {data.as_of}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default CustomerDailyOpsStrip
