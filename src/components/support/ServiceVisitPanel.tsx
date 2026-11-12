import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  abortServiceJobVisit,
  B3_MINIMUM_SAFETY_ATTESTATION,
  completeServiceJobVisit,
  listServiceVisitsForJob,
  recordVisitNoAccess,
  recordVisitSafetyCheck,
  rescheduleServiceJobVisit,
  scheduleServiceJobVisit,
  startServiceJobVisit,
  type ServiceVisitRow,
} from '@/lib/ticketGovernanceApi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ServiceReportPanel } from '@/components/support/ServiceReportPanel'
import { toast } from 'sonner'

export type ServiceVisitViewerRole = 'admin' | 'support' | 'technician' | string

interface ServiceVisitPanelProps {
  jobId: string
  viewerRole: ServiceVisitViewerRole
  /** When true, show start/complete/abort/no-access for assigned tech. */
  canExecute?: boolean
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString()
}

export const ServiceVisitPanel: React.FC<ServiceVisitPanelProps> = ({
  jobId,
  viewerRole,
  canExecute = false,
}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const staff = viewerRole === 'admin' || viewerRole === 'support'
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [outcomeReason, setOutcomeReason] = useState<Record<string, string>>({})
  const [safetyAck, setSafetyAck] = useState<Record<string, boolean>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const visitsQuery = useQuery({
    queryKey: ['service-visits', jobId],
    queryFn: () => listServiceVisitsForJob(jobId),
  })

  const jobMetaQuery = useQuery({
    queryKey: ['service-job-meta', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_jobs')
        .select('id, ticket_id, assigned_technician_id, state')
        .eq('id', jobId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as {
        id: string
        ticket_id: string
        assigned_technician_id: string | null
        state: string
      } | null
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-visits', jobId] })
  }

  const run = async (visitId: string | null, fn: () => Promise<unknown>, ok: string) => {
    setActionError(null)
    setBusyId(visitId ?? 'new')
    try {
      await fn()
      toast.success(ok)
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Visit action failed'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setBusyId(null)
    }
  }

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!startAt || !endAt) throw new Error('Start and end are required')
      return scheduleServiceJobVisit({
        jobId,
        scheduledStart: fromLocalInputValue(startAt),
        scheduledEnd: fromLocalInputValue(endAt),
        rationale: 'Scheduled from visit panel',
      })
    },
    onSuccess: async () => {
      setStartAt('')
      setEndAt('')
      setActionError(null)
      toast.success('Visit scheduled')
      await refresh()
    },
    onError: (err: Error) => {
      setActionError(err.message)
      toast.error(err.message)
    },
  })

  return (
    <div className="space-y-3" data-testid="service-visit-panel">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Visits</h4>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={visitsQuery.isFetching}
        >
          {visitsQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Visit completion is not job completion. Reports and closure come later.
      </p>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      <ul className="space-y-3">
        {(visitsQuery.data ?? []).map((v: ServiceVisitRow) => (
          <li key={v.id} className="rounded border border-border/60 p-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                Visit {v.visit_sequence}: {v.state}
              </span>
              <span className="text-xs text-muted-foreground">
                {v.scheduled_start ? new Date(v.scheduled_start).toLocaleString() : 'unwindowed'}
                {v.scheduled_end ? ` → ${new Date(v.scheduled_end).toLocaleString()}` : ''}
              </span>
            </div>
            {v.actual_start && (
              <p className="text-xs text-muted-foreground">
                Actual: {new Date(v.actual_start).toLocaleString()}
                {v.actual_end ? ` → ${new Date(v.actual_end).toLocaleString()}` : ''}
              </p>
            )}
            {v.outcome_reason && <p className="text-xs">Reason: {v.outcome_reason}</p>}

            {staff && v.state === 'scheduled' && (
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <Label className="text-xs">Reschedule start</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={toLocalInputValue(v.scheduled_start)}
                    id={`rs-${v.id}-start`}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={toLocalInputValue(v.scheduled_end)}
                    id={`rs-${v.id}-end`}
                    className="h-8"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === v.id}
                  onClick={() => {
                    const s = (document.getElementById(`rs-${v.id}-start`) as HTMLInputElement)?.value
                    const e = (document.getElementById(`rs-${v.id}-end`) as HTMLInputElement)?.value
                    void run(
                      v.id,
                      () =>
                        rescheduleServiceJobVisit({
                          visitId: v.id,
                          scheduledStart: fromLocalInputValue(s),
                          scheduledEnd: fromLocalInputValue(e),
                          rationale: 'Rescheduled from visit panel',
                        }),
                      'Visit rescheduled',
                    )
                  }}
                >
                  Reschedule
                </Button>
              </div>
            )}

            {canExecute && (v.state === 'scheduled' || v.state === 'in_progress') && (
              <div className="flex flex-wrap gap-2">
                {v.state === 'scheduled' && (
                  <div className="w-full space-y-2">
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={!!safetyAck[v.id]}
                        onChange={(e) =>
                          setSafetyAck((prev) => ({ ...prev, [v.id]: e.target.checked }))
                        }
                      />
                      <span>{B3_MINIMUM_SAFETY_ATTESTATION}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === v.id || !safetyAck[v.id]}
                        onClick={() =>
                          void run(
                            v.id,
                            () =>
                              startServiceJobVisit({
                                visitId: v.id,
                                safetyAttestation: B3_MINIMUM_SAFETY_ATTESTATION,
                              }),
                            'Visit started',
                          )
                        }
                      >
                        Start
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busyId === v.id}
                        onClick={() =>
                          void run(
                            v.id,
                            () =>
                              recordVisitSafetyCheck({
                                visitId: v.id,
                                result: 'failed',
                                notes: (outcomeReason[v.id] ?? '').trim() || 'safety failed',
                              }),
                            'Safety check failed (work start blocked)',
                          )
                        }
                      >
                        Record failed safety
                      </Button>
                    </div>
                  </div>
                )}
                {v.state === 'in_progress' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === v.id}
                    onClick={() => void run(v.id, () => completeServiceJobVisit(v.id), 'Visit completed')}
                  >
                    Complete visit
                  </Button>
                )}
                <div className="w-full space-y-1">
                  <Label className="text-xs">Outcome reason (abort / no-access)</Label>
                  <Textarea
                    value={outcomeReason[v.id] ?? ''}
                    onChange={(e) => setOutcomeReason((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    rows={2}
                    placeholder="Required for abort or no-access"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === v.id}
                      onClick={() => {
                        const reason = (outcomeReason[v.id] ?? '').trim()
                        if (!reason) {
                          const msg = 'A reason is required for this visit outcome.'
                          setActionError(msg)
                          toast.error(msg)
                          return
                        }
                        void run(
                          v.id,
                          () => abortServiceJobVisit({ visitId: v.id, reason }),
                          'Visit aborted',
                        )
                      }}
                    >
                      Abort
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === v.id}
                      onClick={() => {
                        const reason = (outcomeReason[v.id] ?? '').trim()
                        if (!reason) {
                          const msg = 'A reason is required for this visit outcome.'
                          setActionError(msg)
                          toast.error(msg)
                          return
                        }
                        void run(
                          v.id,
                          () => recordVisitNoAccess({ visitId: v.id, reason }),
                          'No-access recorded',
                        )
                      }}
                    >
                      No access
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* B4: report form is for completed visits — not gated by start/complete controls.
                Submission authority is historical attending_technician_id, not current job assignee. */}
            {v.state === 'completed' &&
              jobMetaQuery.data?.ticket_id &&
              (staff ||
                (viewerRole === 'technician' &&
                  !!user?.id &&
                  v.attending_technician_id === user.id)) && (
                <div className="w-full" data-testid={`service-report-mount-${v.id}`}>
                  <ServiceReportPanel
                    visitId={v.id}
                    ticketId={jobMetaQuery.data.ticket_id}
                    canSubmit={
                      viewerRole === 'technician' &&
                      !!user?.id &&
                      v.attending_technician_id === user.id
                    }
                  />
                </div>
              )}
          </li>
        ))}
      </ul>

      {staff && (
        <div className="space-y-2 rounded border border-dashed border-border/70 p-3">
          <p className="text-xs font-medium">Schedule additional visit</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={scheduleMutation.isPending || !startAt || !endAt}
            onClick={() => scheduleMutation.mutate()}
          >
            {scheduleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Schedule visit
          </Button>
        </div>
      )}
    </div>
  )
}

export default ServiceVisitPanel
