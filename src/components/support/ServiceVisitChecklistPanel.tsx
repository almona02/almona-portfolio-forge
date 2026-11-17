import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getVisitChecklistWorkspace,
  isChecklistStaleRevision,
  recordVisitChecklistAnswer,
  type VisitChecklistWorkspace,
} from '@/lib/serviceVisitChecklistApi'
import { toast } from 'sonner'

interface ServiceVisitChecklistPanelProps {
  visitId: string
  viewerRole: string
}

function itemKeyFor(
  section: { id?: string },
  item: Record<string, unknown>,
  index: number,
): string {
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  if (id) return id
  return `${section.id ?? '_'}/${index}`
}

export const ServiceVisitChecklistPanel: React.FC<ServiceVisitChecklistPanelProps> = ({
  visitId,
  viewerRole,
}) => {
  const queryClient = useQueryClient()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})

  const wsQuery = useQuery({
    queryKey: ['visit-checklist', visitId],
    queryFn: () => getVisitChecklistWorkspace(visitId),
    enabled: viewerRole === 'admin' || viewerRole === 'support' || viewerRole === 'technician',
  })

  const ws = wsQuery.data as VisitChecklistWorkspace | undefined

  if (wsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist…
      </div>
    )
  }

  if (wsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {(wsQuery.error as Error)?.message ?? 'Checklist unavailable'}
      </p>
    )
  }

  if (!ws?.has_active_pin) {
    return (
      <p className="text-sm text-muted-foreground">
        No active job routine pin — checklist capture is unavailable for this visit.
      </p>
    )
  }

  const canWrite = Boolean(ws.can_write)
  const sections = ws.payload?.sections ?? []

  const record = async (
    key: string,
    outcome: 'passed' | 'failed' | 'not_applicable',
    extra?: { value?: number; unit?: string },
  ) => {
    setBusyKey(key)
    try {
      await recordVisitChecklistAnswer({
        visitId,
        itemKey: key,
        outcome,
        expectedChecklistRevision: Number(ws.checklist_revision ?? 0),
        value: extra?.value ?? null,
        unit: extra?.unit ?? null,
      })
      toast.success('Checklist item saved')
      await queryClient.invalidateQueries({ queryKey: ['visit-checklist', visitId] })
    } catch (e) {
      if (isChecklistStaleRevision(e)) {
        toast.error('Checklist was updated elsewhere — reload and retry')
        await queryClient.invalidateQueries({ queryKey: ['visit-checklist', visitId] })
      } else {
        toast.error((e as Error)?.message ?? 'Save failed')
      }
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div
      className="space-y-4 border rounded-md p-3"
      data-testid={`service-visit-checklist-${visitId}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">
            {ws.routine_name_en ?? 'Routine checklist'}
            {ws.version_ordinal != null ? ` · v${ws.version_ordinal}` : ''}
          </h4>
          <p className="text-xs text-muted-foreground font-mono">
            {ws.routine_version_id}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          revision {ws.checklist_revision}
          {!canWrite ? ' · read-only' : ''}
        </span>
      </div>

      {sections.map((section) => (
        <div key={section.id ?? section.title} className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title ?? section.kind ?? 'Section'}
          </h5>
          {(section.items ?? []).map((item, idx) => {
            const key = itemKeyFor(section, item, idx)
            const type = String(item.type ?? '')
            const unit = typeof item.unit === 'string' ? item.unit : undefined
            const busy = busyKey === key
            return (
              <div key={key} className="rounded border p-2 space-y-2">
                <div className="text-sm">
                  {String(item.instruction ?? item.title ?? key)}
                  <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                    {type} · {String(item.requirement_class ?? '')}
                  </span>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    {type === 'measurement' && (
                      <>
                        <Input
                          className="h-8 w-24"
                          value={values[key] ?? ''}
                          onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                          placeholder={unit ?? 'value'}
                        />
                        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            const n = Number(values[key])
                            if (Number.isNaN(n) || !unit) {
                              toast.error('Enter a numeric value')
                              return
                            }
                            void record(key, 'passed', { value: n, unit })
                          }}
                        >
                          Record
                        </Button>
                      </>
                    )}
                    {type !== 'measurement' && (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => void record(key, 'passed')}>
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void record(key, 'failed')}
                        >
                          Fail
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
