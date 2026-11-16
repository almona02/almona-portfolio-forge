import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  defaultRoutinePayload,
  serviceRoutinesApi,
  type RoutineListRow,
  type RoutinePayload,
  type RoutineVersionRow,
} from '@/lib/serviceRoutinesApi'
import { Eye, Loader2, Plus, RefreshCw } from 'lucide-react'

/**
 * Lane A authoring UI: draft → review → publish → retire + applicability + read-only preview.
 * No assignment overrides, coverage pinning, recurrence, or technician results.
 */
export const ServiceRoutinesAuthoringPanel: React.FC = () => {
  const { toast } = useToast()
  const [rows, setRows] = useState<RoutineListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RoutineListRow | null>(null)
  const [versions, setVersions] = useState<RoutineVersionRow[]>([])
  const [creating, setCreating] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)

  const [code, setCode] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [families, setFamilies] = useState('saw')
  const [payloadJson, setPayloadJson] = useState(() => JSON.stringify(defaultRoutinePayload(), null, 2))
  const [applicabilityKind, setApplicabilityKind] = useState<'family' | 'manufacturer' | 'catalog_model'>('family')
  const [applicabilityValue, setApplicabilityValue] = useState('')
  const [applicabilityFamily, setApplicabilityFamily] = useState('')
  const [reviewRationale, setReviewRationale] = useState('Operationally feasible')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await serviceRoutinesApi.listRoutines())
    } catch (e) {
      toast({ title: 'Load failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadVersions = useCallback(
    async (routine: RoutineListRow) => {
      try {
        setVersions(await serviceRoutinesApi.listVersions(routine.id))
      } catch (e) {
        toast({ title: 'Versions failed', description: (e as Error).message, variant: 'destructive' })
      }
    },
    [toast],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (selected) void loadVersions(selected)
  }, [selected, loadVersions])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      toast({ title: label })
      await refresh()
      if (selected) await loadVersions(selected)
    } catch (e) {
      toast({ title: `${label} failed`, description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const createDraft = async () => {
    let payload: RoutinePayload
    try {
      payload = JSON.parse(payloadJson) as RoutinePayload
    } catch {
      toast({ title: 'Invalid payload JSON', variant: 'destructive' })
      return
    }
    await run('Draft created', async () => {
      const created = await serviceRoutinesApi.createDraft({
        code: code.trim(),
        nameEn: nameEn.trim(),
        payload,
        families: families.split(',').map((f) => f.trim()).filter(Boolean),
      })
      setCreating(false)
      setCode('')
      setNameEn('')
      const list = await serviceRoutinesApi.listRoutines()
      setRows(list)
      const match = list.find((r) => r.id === String(created.routine_id))
      if (match) setSelected(match)
    })
  }

  const activeDraft = versions.find((v) => v.status === 'draft' || v.status === 'in_review')
  const published = versions.find((v) => v.status === 'published')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Service Routines</CardTitle>
            <CardDescription>
              Lane A authoring → independent review → immutable publication → retirement. Read-only preview only — no technician results.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> New draft
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Code</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Status</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2 font-mono">{r.code}</td>
                      <td className="p-2">{r.name_en}</td>
                      <td className="p-2 capitalize">{r.status.replace(/_/g, ' ')}</td>
                      <td className="p-2">
                        <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-muted-foreground">
                        No routines yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">{selected.code}</CardTitle>
            <CardDescription>
              {selected.name_en} · library status {selected.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {activeDraft?.status === 'draft' && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void run('Submitted for review', () => serviceRoutinesApi.submitForReview(activeDraft.id))}
                >
                  Submit for review
                </Button>
              )}
              {activeDraft?.status === 'in_review' && (
                <>
                  <Input
                    className="max-w-xs"
                    value={reviewRationale}
                    onChange={(e) => setReviewRationale(e.target.value)}
                    aria-label="Review rationale"
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run('Review recorded', () =>
                        serviceRoutinesApi.recordReview(activeDraft.id, reviewRationale.trim()),
                      )
                    }
                  >
                    Record review
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void run('Published', () => serviceRoutinesApi.publish(activeDraft.id))}
                  >
                    Publish
                  </Button>
                </>
              )}
              {published && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void run('Retired', () => serviceRoutinesApi.retire(published.id))}
                >
                  Retire published
                </Button>
              )}
              {!activeDraft && (selected.status === 'published' || selected.status === 'retired') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run('Next draft created', () => serviceRoutinesApi.createNextDraft(selected.id))}
                >
                  Create next draft
                </Button>
              )}
            </div>

            {activeDraft?.status === 'draft' && (
              <div className="space-y-2">
                <Label htmlFor="draft-payload">Draft payload (optimistic concurrency via draft_revision)</Label>
                <Textarea
                  id="draft-payload"
                  className="min-h-[160px] font-mono text-xs"
                  value={JSON.stringify(activeDraft.payload, null, 2)}
                  onChange={(e) => {
                    try {
                      const next = JSON.parse(e.target.value) as RoutinePayload
                      setVersions((prev) =>
                        prev.map((v) => (v.id === activeDraft.id ? { ...v, payload: next } : v)),
                      )
                    } catch {
                      /* keep typing */
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run('Draft updated', () =>
                      serviceRoutinesApi.updateDraft({
                        versionId: activeDraft.id,
                        expectedDraftRevision: activeDraft.draft_revision,
                        payload: activeDraft.payload,
                      }),
                    )
                  }
                >
                  Save draft
                </Button>
              </div>
            )}

            <div className="space-y-2 rounded border p-3">
              <div className="text-sm font-medium">Applicability metadata</div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded border bg-background px-2 text-sm"
                  value={applicabilityKind}
                  onChange={(e) => setApplicabilityKind(e.target.value as typeof applicabilityKind)}
                  aria-label="Applicability kind"
                >
                  <option value="family">family</option>
                  <option value="manufacturer">manufacturer</option>
                  <option value="catalog_model">catalog_model</option>
                </select>
                <Input
                  className="max-w-[140px]"
                  placeholder="value"
                  value={applicabilityValue}
                  onChange={(e) => setApplicabilityValue(e.target.value)}
                />
                {applicabilityKind !== 'family' && (
                  <Input
                    className="max-w-[140px]"
                    placeholder="value_family"
                    value={applicabilityFamily}
                    onChange={(e) => setApplicabilityFamily(e.target.value)}
                  />
                )}
                <Button
                  size="sm"
                  disabled={busy || !applicabilityValue.trim()}
                  onClick={() =>
                    void run('Applicability set', () =>
                      serviceRoutinesApi.setApplicability({
                        routineId: selected.id,
                        kind: applicabilityKind,
                        value: applicabilityValue.trim(),
                        valueFamily: applicabilityFamily.trim() || undefined,
                      }),
                    )
                  }
                >
                  Add link
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Version</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Revision</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="p-2 font-mono">{v.version_ordinal ?? '—'}</td>
                      <td className="p-2">{v.status}</td>
                      <td className="p-2 font-mono text-xs">{v.draft_revision.slice(0, 12)}…</td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void run('Preview', async () => {
                              setPreview(await serviceRoutinesApi.preview(v.id))
                            })
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" /> Preview
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create routine draft</DialogTitle>
            <DialogDescription>Admin-only. Codes are unique forever, including after retirement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ra-code">Code</Label>
              <Input id="ra-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ra-name">Name (EN)</Label>
              <Input id="ra-name" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ra-families">Families (comma-separated)</Label>
              <Input id="ra-families" value={families} onChange={(e) => setFamilies(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ra-payload">Payload JSON</Label>
              <Textarea
                id="ra-payload"
                className="min-h-[180px] font-mono text-xs"
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
              />
            </div>
            <Button disabled={busy || !code.trim() || !nameEn.trim()} onClick={() => void createDraft()}>
              {busy ? 'Creating…' : 'Create draft'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Read-only preview</DialogTitle>
            <DialogDescription>
              Technician-style view — no result capture in Lane A.
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
            {preview ? JSON.stringify(preview, null, 2) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ServiceRoutinesAuthoringPanel
