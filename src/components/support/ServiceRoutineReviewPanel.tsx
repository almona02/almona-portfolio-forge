import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { serviceRoutinesApi, type RoutineVersionRow } from '@/lib/serviceRoutinesApi'
import { Eye, Loader2, RefreshCw } from 'lucide-react'

type ReviewRow = RoutineVersionRow & { routine_code?: string; routine_name?: string }

/**
 * Support-accessible Lane A review surface (F-01).
 * Does not grant Admin dashboard access — review + read-only preview only.
 */
export const ServiceRoutineReviewPanel: React.FC = () => {
  const { toast } = useToast()
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rationale, setRationale] = useState('Operationally feasible')
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await serviceRoutinesApi.listVersionsInReview())
    } catch (e) {
      toast({ title: 'Load failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const record = async (versionId: string) => {
    setBusy(true)
    try {
      await serviceRoutinesApi.recordReview(versionId, rationale.trim())
      toast({ title: 'Review recorded' })
      setPreview(null)
      await refresh()
    } catch (e) {
      toast({ title: 'Review failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card data-testid="service-routine-review-panel">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Routine reviews</CardTitle>
          <CardDescription>
            Independent operational feasibility review for in-review drafts. No authoring, publish, or Admin access.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="support-review-rationale">
            Rationale
          </label>
          <Input
            id="support-review-rationale"
            className="max-w-md"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions awaiting review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Revision</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2 font-mono">{row.routine_code ?? '—'}</td>
                    <td className="p-2">{row.routine_name ?? '—'}</td>
                    <td className="p-2 font-mono text-xs">{row.draft_revision.slice(0, 12)}…</td>
                    <td className="p-2 space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void (async () => {
                            try {
                              setPreview(await serviceRoutinesApi.preview(row.id))
                            } catch (e) {
                              toast({
                                title: 'Preview failed',
                                description: (e as Error).message,
                                variant: 'destructive',
                              })
                            }
                          })()
                        }
                      >
                        <Eye className="mr-1 h-4 w-4" /> Preview
                      </Button>
                      <Button size="sm" disabled={busy} onClick={() => void record(row.id)}>
                        Record review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {preview && (
          <pre
            data-testid="routine-review-preview"
            className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs"
          >
            {JSON.stringify(preview, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

export default ServiceRoutineReviewPanel
