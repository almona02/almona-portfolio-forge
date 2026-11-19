import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getTechnicianDailyOpsWorkspace,
  type TechnicianDailyOpsQueueKey,
  type TechnicianDailyOpsRpcError,
  type TechnicianDailyOpsWorkspace,
} from '@/lib/technicianDailyOpsApi'

type ChipDef = {
  key: TechnicianDailyOpsQueueKey
  label: string
  emptyCopy: string
}

const CHIPS: ChipDef[] = [
  {
    key: 'assigned_jobs',
    label: 'My assigned jobs',
    emptyCopy: 'No assigned open jobs.',
  },
  {
    key: 'upcoming_visits',
    label: 'Upcoming visits',
    emptyCopy: 'No upcoming visits in the Cairo window.',
  },
  {
    key: 'needs_attention',
    label: 'Needs attention',
    emptyCopy: 'Nothing needs attention.',
  },
]

function queueCount(data: TechnicianDailyOpsWorkspace | undefined, key: TechnicianDailyOpsQueueKey): number | null {
  if (!data) return null
  return data[key].count
}

function rowTitle(key: TechnicianDailyOpsQueueKey, item: Record<string, unknown>): string {
  if (key === 'assigned_jobs') {
    const jobTitle = String(item.job_title ?? 'Job')
    const ticket = String(item.ticket_number ?? item.ticket_title ?? '')
    return ticket ? `${jobTitle} · ${ticket}` : jobTitle
  }
  if (key === 'upcoming_visits') {
    const when = item.scheduled_start ? new Date(String(item.scheduled_start)).toLocaleString() : ''
    const jobTitle = String(item.job_title ?? 'Visit')
    return when ? `${jobTitle} · ${when}` : jobTitle
  }
  const reason = String(item.reason_code ?? 'attention')
  const jobTitle = String(item.job_title ?? 'Visit')
  return `${jobTitle} · ${reason}`
}

function rowHref(item: Record<string, unknown>): string {
  return String(item.href ?? `/support/tickets/${String(item.ticket_id ?? '')}`)
}

export const TechnicianDailyOpsStrip: React.FC = () => {
  const [active, setActive] = useState<TechnicianDailyOpsQueueKey | null>(null)

  const query = useQuery({
    queryKey: ['technician-daily-ops-workspace'],
    queryFn: () => getTechnicianDailyOpsWorkspace(),
    retry: false,
  })

  const data = query.data
  const rpcError = query.error as TechnicianDailyOpsRpcError | null
  const activeChip = CHIPS.find((c) => c.key === active) ?? null
  const activeQueue = data && active ? data[active] : null

  return (
    <section
      className="space-y-3"
      data-testid="technician-daily-ops-strip"
      aria-labelledby="technician-daily-ops-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="technician-daily-ops-heading" className="text-sm font-medium tracking-tight">
            Daily operations
          </h2>
          <p className="text-xs text-muted-foreground">
            Your assigned work, upcoming visits, and items needing attention. Read-only counts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          data-testid="technician-daily-ops-refresh"
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {query.isLoading ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="technician-daily-ops-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queues…
        </div>
      ) : null}

      {query.isError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="technician-daily-ops-error">
          Queues unavailable
          {rpcError?.detailCode ? ` (${rpcError.detailCode})` : ''}
          {rpcError?.status === 403 ? ' — not permitted' : ''}. Refresh to retry.
        </p>
      ) : null}

      {!query.isLoading && !query.isError && data ? (
        <div className="flex flex-wrap gap-2" data-testid="technician-daily-ops-chips">
          {CHIPS.map((chip) => {
            const count = queueCount(data, chip.key)
            const selected = active === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                data-testid={`technician-daily-ops-chip-${chip.key}`}
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
                  data-testid={`technician-daily-ops-count-${chip.key}`}
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
          data-testid={`technician-daily-ops-queue-${activeChip.key}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{activeChip.label}</h3>
            <span
              className="text-xs text-muted-foreground tabular-nums"
              data-testid="technician-daily-ops-queue-count"
            >
              {activeQueue?.count ?? 0}
            </span>
          </div>
          {activeQueue && activeQueue.count === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="technician-daily-ops-empty">
              {activeChip.emptyCopy}
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="technician-daily-ops-queue-items">
              {(activeQueue?.items ?? []).map((raw) => {
                const item = raw as unknown as Record<string, unknown>
                const id = String(item.visit_id ?? item.job_id ?? Math.random())
                const href = rowHref(item)
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    data-testid="technician-daily-ops-row"
                  >
                    <span className="min-w-0 truncate">{rowTitle(activeChip.key, item)}</span>
                    <Link
                      to={href}
                      className="shrink-0 text-primary underline-offset-4 hover:underline"
                      data-testid="technician-daily-ops-next-action"
                    >
                      Open
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {data.as_of ? (
            <p className="text-[11px] text-muted-foreground" data-testid="technician-daily-ops-as-of">
              As of (Africa/Cairo): {data.as_of}
              {data.window_end ? ` · upcoming through ${data.window_end}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default TechnicianDailyOpsStrip
