import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Printer, ChevronDown, ChevronRight } from 'lucide-react'
import { serviceContractApi, type ServiceContract, type ServiceVisit } from '@/lib/serviceContractApi'

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—')

/**
 * Customer-facing service contracts: their contracts, upcoming visits and a
 * printable contract overview.
 */
export const ServiceContractCustomerView: React.FC<{ userId: string }> = ({ userId }) => {
  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [visits, setVisits] = useState<Record<string, ServiceVisit[]>>({})
  const [overview, setOverview] = useState<ServiceContract | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setContracts(await serviceContractApi.listContracts(userId)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!visits[id]) {
      try {
        const list = await serviceContractApi.listVisits(id)
        setVisits((v) => ({ ...v, [id]: list }))
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="space-y-4">
      {overview && (
        <ContractOverview contract={overview} visits={visits[overview.id] ?? []} onClose={() => setOverview(null)} />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading contracts…</div>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no service contracts yet.</p>
      ) : (
        contracts.map((c) => {
          const vs = visits[c.id] ?? []
          const upcoming = vs.filter((v) => v.status === 'scheduled')
          return (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <button className="flex items-center gap-2 text-left" onClick={() => void toggle(c.id)}>
                  {expanded === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">{c.machine_name} <span className="text-muted-foreground">· {c.factory_name}</span></CardTitle>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setOverview(c)}><Printer className="mr-2 h-4 w-4" /> Overview</Button>
                </div>
              </CardHeader>
              {expanded === c.id && (
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground capitalize">Visits: {c.visit_frequency} · {fmt(c.start_date)} → {fmt(c.end_date)}</div>
                  {vs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No visits scheduled yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {vs.map((v) => (
                        <li key={v.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                          <span className="flex-1">{fmt(v.scheduled_at)} · {v.type}</span>
                          {v.technician && <span className="text-muted-foreground">{v.technician}</span>}
                          <Badge variant={v.status === 'completed' ? 'default' : v.status === 'cancelled' ? 'destructive' : 'secondary'}>{v.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {upcoming.length > 0 && <p className="text-xs text-muted-foreground">{upcoming.length} upcoming visit(s)</p>}
                </CardContent>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}

/** Printable contract overview, shown in a fixed overlay and printed on demand. */
const ContractOverview: React.FC<{ contract: ServiceContract; visits: ServiceVisit[]; onClose: () => void }> = ({ contract, visits, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 p-4 overflow-y-auto">
      <div id="printable-contract" className="mx-auto max-w-2xl rounded-lg bg-white text-gray-900 p-6 shadow-xl print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">ALMONA Service Contract</h1>
            <p className="text-sm text-gray-600">{contract.factory_name} — {contract.machine_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">Status</dt><dd className="capitalize">{contract.status}</dd>
          <dt className="text-gray-500">Visit frequency</dt><dd className="capitalize">{contract.visit_frequency}</dd>
          <dt className="text-gray-500">Period</dt><dd>{fmt(contract.start_date)} → {fmt(contract.end_date)}</dd>
          <dt className="text-gray-500">Price</dt><dd>{contract.price ? `${contract.price} ${contract.currency}` : '—'}</dd>
        </dl>
        {contract.terms && (
          <div className="mt-4">
            <div className="text-sm font-medium">Terms</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.terms}</p>
          </div>
        )}
        <div className="mt-4">
          <div className="text-sm font-medium">Visit history</div>
          {visits.length === 0 ? (
            <p className="text-sm text-gray-500">No visits recorded.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="py-1">Date</th><th className="py-1">Type</th><th className="py-1">Status</th><th className="py-1">Technician</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="py-1">{fmt(v.scheduled_at)}</td>
                    <td className="py-1 capitalize">{v.type}</td>
                    <td className="py-1 capitalize">{v.status}</td>
                    <td className="py-1">{v.technician || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default ServiceContractCustomerView
