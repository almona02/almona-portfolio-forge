import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getServiceJobRoutinePin,
  listServiceJobRoutinePinHistory,
  pinErrorDetailCode,
  pinServiceJobRoutine,
  replaceServiceJobRoutinePin,
  unpinServiceJobRoutine,
} from '@/lib/serviceJobRoutinePinsApi'
import { toast } from 'sonner'

export type ServiceJobRoutinePinViewerRole = 'admin' | 'support' | 'technician' | 'customer' | string

interface ServiceJobRoutinePinPanelProps {
  jobId: string
  viewerRole: ServiceJobRoutinePinViewerRole
}

function canMutate(role: ServiceJobRoutinePinViewerRole): boolean {
  return role === 'admin' || role === 'support'
}

function canRead(role: ServiceJobRoutinePinViewerRole): boolean {
  return role === 'admin' || role === 'support' || role === 'technician'
}

export const ServiceJobRoutinePinPanel: React.FC<ServiceJobRoutinePinPanelProps> = ({
  jobId,
  viewerRole,
}) => {
  const queryClient = useQueryClient()
  const mutate = canMutate(viewerRole)
  const read = canRead(viewerRole)
  const [versionId, setVersionId] = useState('')
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const pinQuery = useQuery({
    queryKey: ['service-job-routine-pin', jobId],
    queryFn: () => getServiceJobRoutinePin(jobId),
    enabled: read,
  })

  const historyQuery = useQuery({
    queryKey: ['service-job-routine-pin-history', jobId],
    queryFn: () => listServiceJobRoutinePinHistory(jobId),
    enabled: read,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-job-routine-pin', jobId] })
    await queryClient.invalidateQueries({ queryKey: ['service-job-routine-pin-history', jobId] })
  }

  const onRpcError = (err: unknown) => {
    const code = pinErrorDetailCode(err)
    const msg = code || (err instanceof Error ? err.message : 'Pin action failed')
    setActionError(msg)
    toast.error(msg)
  }

  const pinMutation = useMutation({
    mutationFn: async () =>
      pinServiceJobRoutine({
        jobId,
        routineVersionId: versionId.trim(),
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      setActionError(null)
      setReason('')
      toast.success('Routine pinned')
      await refresh()
    },
    onError: onRpcError,
  })

  const replaceMutation = useMutation({
    mutationFn: async () =>
      replaceServiceJobRoutinePin({
        jobId,
        routineVersionId: versionId.trim(),
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      setActionError(null)
      setReason('')
      toast.success('Routine pin replaced')
      await refresh()
    },
    onError: onRpcError,
  })

  const unpinMutation = useMutation({
    mutationFn: async () =>
      unpinServiceJobRoutine({
        jobId,
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      setActionError(null)
      setReason('')
      toast.success('Routine unpinned')
      await refresh()
    },
    onError: onRpcError,
  })

  if (!read) {
    return null
  }

  const active = pinQuery.data?.active ?? null
  const locked = Boolean(pinQuery.data?.pin_locked)
  const busy =
    pinMutation.isPending || replaceMutation.isPending || unpinMutation.isPending

  return (
    <section
      className="space-y-2 rounded-md border border-border p-3"
      aria-label="Job routine pin"
      data-testid={`service-job-routine-pin-${jobId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Routines
          </h4>
          <p className="text-xs text-muted-foreground">
            Job pin only — visits read this reference (no visit write).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={pinQuery.isFetching}
          aria-label="Refresh routine pin"
        >
          <RefreshCw className={`h-4 w-4 ${pinQuery.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive" data-testid="pin-action-error">
          {actionError}
        </p>
      )}

      {pinQuery.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading pin…
        </p>
      ) : pinQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {pinErrorDetailCode(pinQuery.error) || (pinQuery.error as Error).message}
        </p>
      ) : active ? (
        <div className="text-sm space-y-1" data-testid="active-job-routine-pin">
          <div className="font-medium">
            {active.routine_code} — {active.routine_name_en}
            {active.retired_badge ? (
              <span className="ml-2 text-xs text-amber-700" data-testid="retired-badge">
                Retired
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            version {active.version_ordinal ?? '—'} · {active.routine_version_id}
          </div>
          <div className="text-xs text-muted-foreground">Reason: {active.reason}</div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="no-active-pin">
          No active routine pin.
        </p>
      )}

      {locked && (
        <p className="text-xs text-muted-foreground" data-testid="pin-locked-banner">
          Pin changes locked after first work start.
        </p>
      )}

      {mutate && !locked && (
        <div className="space-y-2 border-t pt-2">
          <div className="space-y-1">
            <Label htmlFor={`pin-version-${jobId}`} className="text-xs">
              Published version id
            </Label>
            <Input
              id={`pin-version-${jobId}`}
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              placeholder="routine_version uuid"
              disabled={busy}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`pin-reason-${jobId}`} className="text-xs">
              Reason (required)
            </Label>
            <Textarea
              id={`pin-reason-${jobId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {!active && (
              <Button
                type="button"
                size="sm"
                disabled={busy || !versionId.trim() || !reason.trim()}
                onClick={() => pinMutation.mutate()}
              >
                {pinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Pin
              </Button>
            )}
            {active && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !versionId.trim() || !reason.trim()}
                  onClick={() => replaceMutation.mutate()}
                >
                  {replaceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Replace
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !reason.trim()}
                  onClick={() => unpinMutation.mutate()}
                >
                  {unpinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Unpin
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {(historyQuery.data?.history?.length ?? 0) > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Pin history</summary>
          <ul className="mt-1 space-y-1">
            {historyQuery.data!.history.map((row) => (
              <li key={String(row.pin_id)} className="font-mono">
                {String(row.status)} · {String(row.routine_version_id)} · {String(row.reason)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

export default ServiceJobRoutinePinPanel
