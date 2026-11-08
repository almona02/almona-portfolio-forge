import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { fabricatorRoutes } from '@/lib/fabricator/routes'
import { loadCustomSystemsAsync } from '@/lib/fabricator/customSystemStorage'
import {
  listPackVersionsFromSupabase,
  rollbackSystemPackInSupabase,
  type StoredSystemPack,
} from '@/lib/fabricator/systemPackSupabase'
import { pricingProvenanceService } from '@/lib/pricing/PricingProvenanceService'
import { priceHistoryService, type PriceHistoryEntry } from '@/lib/pricing/PriceHistoryService'
import { trackError } from '@/lib/performance-monitoring'
import { lazyRetry } from '@/utils/lazyImport'
import type { Profile } from '@/types/fabricator'
import {
  CATALOG_VERSIONING_MIGRATION,
  isMissingCatalogDdlError,
  type PackHistoryEntry,
  type PricingProvenance,
} from '@/types/catalogProvenance'
import { ExternalLink, History, Pencil, RotateCcw } from 'lucide-react'

const PricingTuningStudio = lazyRetry(
  () => import('@/components/fabricator/PricingTuningStudio').then((m) => ({ default: m.PricingTuningStudio })),
  'PricingTuningStudio'
)

type CatalogTab = 'pricing' | 'packs'

interface ProfileRow {
  id: string
  systemPackId: string
  displayName: string
  hasPricing: boolean
  provenance: PricingProvenance | null
}

/** First truthy string/number candidate rendered as text; non-scalar values are skipped. */
function firstScalarText(candidates: unknown[], fallback: string): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c
    if (typeof c === 'number' && c) return String(c)
  }
  return fallback
}

function packIdOf(profile: Profile): string {
  const specs = (profile.specifications as Record<string, unknown> | undefined) || {}
  return firstScalarText(
    [specs.window_system, profile.systemBrand, specs.systemPackId],
    'unknown'
  )
}

function profileNameOf(profile: Profile): string {
  const specs = (profile.specifications as Record<string, unknown> | undefined) || {}
  return firstScalarText(
    [
      (profile as unknown as Record<string, unknown>).name,
      specs.profileName,
      specs.code,
      profile.id,
    ],
    'profile'
  )
}

/**
 * Admin → Catalog & Pricing.
 * Own-workshop pricing provenance and versioned supplier packs in one place.
 * Editing reuses the tuning studios (same write path, cache invalidation and
 * history); this panel adds version visibility, history and rollback.
 */
export const CatalogAdminPanel: React.FC = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [tab, setTab] = useState<CatalogTab>('pricing')

  return (
    <div className="space-y-6" data-testid="catalog-admin-panel">
      <div>
        <h2 className="text-lg font-semibold">Catalog &amp; pricing</h2>
        <p className="text-sm text-muted-foreground">
          Workshop prices and supplier packs with version history. Edits go live immediately and every
          save stamps a new version — roll back from history when needed.
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Catalog sections">
        <Button
          size="sm"
          variant={tab === 'pricing' ? 'default' : 'outline'}
          role="tab"
          aria-selected={tab === 'pricing'}
          onClick={() => setTab('pricing')}
        >
          Pricing provenance
        </Button>
        <Button
          size="sm"
          variant={tab === 'packs' ? 'default' : 'outline'}
          role="tab"
          aria-selected={tab === 'packs'}
          onClick={() => setTab('packs')}
        >
          Supplier packs
        </Button>
      </div>

      {tab === 'pricing' ? (
        <PricingSection userId={userId} />
      ) : (
        <PacksSection userId={userId} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

const PricingSection: React.FC<{ userId: string | null }> = ({ userId }) => {
  const { toast } = useToast()
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProfileRow | null>(null)
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const db = supabase as any
      const { data, error } = await db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const mapped: ProfileRow[] = await Promise.all(
        ((data || []) as Profile[]).map(async (profile) => {
          const specs = (profile.specifications as Record<string, unknown> | undefined) || {}
          const hasPricing = Boolean(specs.system_pricing || specs.rock60_pricing)
          const systemPackId = packIdOf(profile)
          const provenance = hasPricing
            ? await pricingProvenanceService
                .resolvePricingProvenance(profile.id, systemPackId)
                .catch(() => null)
            : null
          return {
            id: profile.id,
            systemPackId,
            displayName: profileNameOf(profile),
            hasPricing,
            provenance,
          }
        })
      )
      setRows(mapped)
      setSelected((prev) => (prev ? mapped.find((row) => row.id === prev.id) ?? null : null))
    } catch (error) {
      trackError('CatalogAdminPanel', 'loadPricing', error instanceof Error ? error.message : String(error))
      toast({ title: 'Could not load pricing', description: 'Check the connection and retry.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected || !userId) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    priceHistoryService
      .getPriceHistory({ profileId: selected.id, systemPackId: selected.systemPackId, limit: 20 })
      .then(setHistory)
      .catch((error: unknown) => {
        trackError('CatalogAdminPanel', 'loadPriceHistory', error instanceof Error ? error.message : String(error))
      })
      .finally(() => setHistoryLoading(false))
  }, [selected, userId])

  const grouped = useMemo(() => {
    const map = new Map<string, ProfileRow[]>()
    for (const row of rows) {
      const list = map.get(row.systemPackId) ?? []
      list.push(row)
      map.set(row.systemPackId, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Sign in to manage workshop pricing.</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="catalog-pricing-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workshop profiles</CardTitle>
          <CardDescription>
            {rows.length} profiles · {rows.filter((row) => row.hasPricing).length} with pricing configured
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[480px] space-y-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading profiles…</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workshop profiles yet.</p>
          ) : (
            grouped.map(([packId, packRows]) => (
              <div key={packId} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{packId}</div>
                <ul className="space-y-2">
                  {packRows.map((row) => (
                    <li
                      key={row.id}
                      className={`flex items-center justify-between gap-2 rounded-md border p-2 ${selected?.id === row.id ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelected(row)}
                        data-testid={`pricing-profile-${row.id}`}
                      >
                        <div className="truncate text-sm font-medium">{row.displayName}</div>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {row.hasPricing ? (
                            <Badge variant="outline" className="border-green-500/40 text-green-600">
                              priced{row.provenance ? ` · v${row.provenance.version}` : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline">defaults only</Badge>
                          )}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(row)
                          setStudioOpen(true)
                        }}
                      >
                        <Pencil aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provenance &amp; history</CardTitle>
          <CardDescription>
            {selected ? `${selected.displayName} · ${selected.systemPackId}` : 'Select a profile to inspect its pricing.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected?.provenance ? (
            <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="pricing-provenance">
              <div><dt className="text-muted-foreground">Version</dt><dd className="font-mono">v{selected.provenance.version}</dd></div>
              <div><dt className="text-muted-foreground">Source</dt><dd>{selected.provenance.source.replace('_', ' ')}</dd></div>
              <div><dt className="text-muted-foreground">Updated by</dt><dd className="truncate font-mono text-xs">{selected.provenance.updatedBy ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Updated at</dt><dd>{selected.provenance.updatedAt ? new Date(selected.provenance.updatedAt).toLocaleString() : '—'}</dd></div>
              <div><dt className="text-muted-foreground">Currency</dt><dd>{selected.provenance.currency ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Note</dt><dd>{selected.provenance.note ?? '—'}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selected ? 'No pricing configured — costing falls back to built-in defaults.' : 'Nothing selected.'}
            </p>
          )}

          {selected && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History aria-hidden="true" className="h-4 w-4" /> Version history
              </div>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading history…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history entries yet.</p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-md border p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">v{entry.versionNumber}</Badge>
                        <span className="text-muted-foreground">{entry.changeType.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{entry.createdAt.toLocaleString()}</span>
                      </div>
                      {entry.reason && <div className="pt-1">{entry.reason}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Roll back from the tuning studio&apos;s history tab — it restores a version as a new save.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {studioOpen && selected && userId && (
        <React.Suspense fallback={<div role="status" className="p-6 text-sm text-muted-foreground">Loading pricing studio…</div>}>
          <PricingTuningStudio
            systemPackId={selected.systemPackId}
            profileId={selected.id}
            userId={userId}
            onClose={(saved) => {
              setStudioOpen(false)
              if (saved) void load()
            }}
            onPricingUpdated={() => void load()}
          />
        </React.Suspense>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Supplier packs                                                      */
/* ------------------------------------------------------------------ */

const PacksSection: React.FC<{ userId: string | null }> = ({ userId }) => {
  const { toast } = useToast()
  const [packs, setPacks] = useState<StoredSystemPack[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationMissing, setMigrationMissing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<PackHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [rollbackNote, setRollbackNote] = useState('')
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const selected = packs.find((pack) => pack.meta.id === selectedId) ?? null

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const db = supabase as any
      const { error: probeError } = await db.from('fabricator_system_packs').select('version').limit(1)
      setMigrationMissing(isMissingCatalogDdlError(probeError))
      setPacks(await loadCustomSystemsAsync(userId))
    } catch (error) {
      trackError('CatalogAdminPanel', 'loadPacks', error instanceof Error ? error.message : String(error))
      toast({ title: 'Could not load packs', description: 'Check the connection and retry.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedId) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    void listPackVersionsFromSupabase(selectedId, userId)
      .then(setHistory)
      .finally(() => setHistoryLoading(false))
  }, [selectedId, userId])

  const rollback = useCallback(
    async (version: number) => {
      if (!selectedId || !userId) return
      setSaving(true)
      try {
        const ok = await rollbackSystemPackInSupabase(selectedId, version, userId, rollbackNote || null)
        if (!ok) throw new Error('Rollback did not complete.')
        toast({ title: `Rolled back to v${version}`, description: 'Saved as a new version with full history.' })
        setConfirmVersion(null)
        setRollbackNote('')
        await load()
        setHistory(await listPackVersionsFromSupabase(selectedId, userId))
      } catch (error) {
        trackError('CatalogAdminPanel', 'rollbackPack', error instanceof Error ? error.message : String(error))
        toast({ title: 'Rollback failed', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [selectedId, userId, rollbackNote, load, toast]
  )

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Sign in to manage workshop packs.</p>
  }

  return (
    <div className="space-y-4" data-testid="catalog-packs-section">
      {migrationMissing && (
        <Card className="border-amber-500/40" data-testid="catalog-migration-banner">
          <CardContent className="pt-4 text-sm">
            Pack versioning is not enabled on this database yet — saves keep working unversioned. Apply{' '}
            <code className="font-mono text-xs">{CATALOG_VERSIONING_MIGRATION}</code> with{' '}
            <code className="font-mono text-xs">supabase db push</code> to enable versions and rollback.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workshop packs</CardTitle>
            <CardDescription>{packs.length} custom packs · code-bundled vendor packs are read-only</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[480px] space-y-2 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading packs…</p>
            ) : packs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom packs yet — tune one from the studio data section.</p>
            ) : (
              <ul className="space-y-2">
                {packs.map((pack) => (
                  <li
                    key={pack.meta.id}
                    className={`flex items-center justify-between gap-2 rounded-md border p-2 ${selectedId === pack.meta.id ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedId(pack.meta.id)
                        setConfirmVersion(null)
                      }}
                      data-testid={`pack-${pack.meta.id}`}
                    >
                      <div className="truncate text-sm font-medium">{pack.meta.name || pack.meta.id}</div>
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {typeof pack.version === 'number' ? (
                          <Badge variant="outline" className="font-mono">v{pack.version}</Badge>
                        ) : (
                          <Badge variant="outline">unversioned</Badge>
                        )}
                        {pack.provenance?.changeNote && (
                          <span className="truncate text-xs text-muted-foreground">{pack.provenance.changeNote}</span>
                        )}
                      </div>
                    </button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`${fabricatorRoutes.studioData('tuning')}?systemPackId=${encodeURIComponent(pack.meta.id)}`}>
                        Edit <ExternalLink aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version history</CardTitle>
            <CardDescription>
              {selected ? `${selected.meta.name || selected.meta.id}` : 'Select a pack to inspect its versions.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected?.provenance && (
              <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="pack-provenance">
                <div><dt className="text-muted-foreground">Live version</dt><dd className="font-mono">v{selected.provenance.version}</dd></div>
                <div><dt className="text-muted-foreground">Updated by</dt><dd className="truncate font-mono text-xs">{selected.provenance.updatedBy ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Updated at</dt><dd>{selected.provenance.updatedAt ? new Date(selected.provenance.updatedAt).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-muted-foreground">Note</dt><dd>{selected.provenance.changeNote ?? '—'}</dd></div>
              </dl>
            )}
            {selected && (
              <>
                <label className="block text-xs text-muted-foreground">
                  Rollback note (optional)
                  <input
                    type="text"
                    value={rollbackNote}
                    onChange={(event) => setRollbackNote(event.target.value)}
                    placeholder="Why are you restoring an older version?"
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                    data-testid="pack-rollback-note"
                  />
                </label>
                {historyLoading ? (
                  <p className="text-sm text-muted-foreground">Loading history…</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {migrationMissing ? 'History unlocks after the versioning migration.' : 'No history entries yet — the next save starts versioning.'}
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {history.map((entry) => (
                      <li key={entry.id} className="rounded-md border p-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono">v{entry.version}</Badge>
                            <span className="text-muted-foreground">{entry.source.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          {typeof selected.version === 'number' && entry.version !== selected.version && (
                            confirmVersion === entry.version ? (
                              <span className="flex gap-1">
                                <Button size="sm" disabled={saving} onClick={() => void rollback(entry.version)}>
                                  <RotateCcw aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Confirm
                                </Button>
                                <Button size="sm" variant="ghost" disabled={saving} onClick={() => setConfirmVersion(null)}>
                                  Cancel
                                </Button>
                              </span>
                            ) : (
                              <Button size="sm" variant="outline" disabled={saving} onClick={() => setConfirmVersion(entry.version)}>
                                Restore
                              </Button>
                            )
                          )}
                        </div>
                        {entry.changeNote && <div className="pt-1">{entry.changeNote}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
