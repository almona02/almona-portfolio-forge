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
        <ContractAgreement contract={overview} visits={visits[overview.id] ?? []} onClose={() => setOverview(null)} />
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
                        <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                          <span className="flex-1">{fmt(v.scheduled_at)} · {v.type}</span>
                          {v.technician && <span className="text-muted-foreground">{v.technician}</span>}
                          <Badge variant={v.status === 'completed' ? 'default' : v.status === 'cancelled' ? 'destructive' : 'secondary'}>{v.status}</Badge>
                          {v.photos.length > 0 && <span className="text-xs text-muted-foreground">{v.photos.length} photo(s)</span>}
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

const FreqAR: Record<ServiceContract['visit_frequency'], string> = {
  weekly: 'أسبوعي',
  biweekly: 'كل أسبوعين',
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  biannual: 'نصف سنوي',
  annual: 'سنوي',
}

/**
 * Printable service contract agreement (Arabic + English) with visit history,
 * photo evidence and customer stamp/signature blocks.
 */
export const ContractAgreement: React.FC<{ contract: ServiceContract; visits: ServiceVisit[]; onClose: () => void }> = ({ contract, visits, onClose }) => {  const period = `${fmt(contract.start_date)} → ${fmt(contract.end_date)}`
  const price = contract.price ? `${contract.price} ${contract.currency}` : '—'
  const completed = visits.filter((v) => v.status === 'completed')
  const allPhotos = completed.flatMap((v) => v.photos)

  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 p-4 overflow-y-auto">
      <div id="printable-contract" className="mx-auto max-w-3xl rounded-lg bg-white text-gray-900 p-8 shadow-xl print:shadow-none print:p-0 print:max-w-none">
        <div className="print:hidden flex justify-end gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print / Save PDF</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">ALMONA SERVICE CONTRACT</h1>
          <p className="text-sm text-gray-600 mt-1">عقد خدمة — شركة المُنى</p>
          <p className="text-xs text-gray-500 mt-2">Contract No. {contract.id.slice(0, 8).toUpperCase()} · Status: {contract.status}</p>
        </div>

        {/* Parties */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="border rounded-md p-3">
            <div className="font-semibold">Service Provider · مقدّم الخدمة</div>
            <div className="mt-1 text-gray-700">ALMONA Co. — Authorized YILMAZ dealer</div>
            <div className="text-gray-600">13B/18 Tarik Ibn Ziad St., Taawen, Haram, Giza, Egypt</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="font-semibold">Customer · العميل</div>
            <div className="mt-1 text-gray-700">{contract.factory_name}</div>
            <div className="text-gray-600">Machine: {contract.machine_name}</div>
          </div>
        </div>

        {/* Key terms */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="border rounded-md p-2"><div className="text-xs text-gray-500 uppercase">Period / المدة</div><div className="font-medium">{period}</div></div>
          <div className="border rounded-md p-2"><div className="text-xs text-gray-500 uppercase">Visits / الزيارات</div><div className="font-medium capitalize">{contract.visit_frequency}</div></div>
          <div className="border rounded-md p-2"><div className="text-xs text-gray-500 uppercase">Fee / الأتعاب</div><div className="font-medium">{price}</div></div>
          <div className="border rounded-md p-2"><div className="text-xs text-gray-500 uppercase">Visits done / المنفّذة</div><div className="font-medium">{completed.length}</div></div>
        </div>

        {/* English terms */}
        <div className="mt-6">
          <h2 className="text-base font-bold border-b pb-1">Terms & Conditions</h2>
          <ol className="mt-3 space-y-2 text-sm text-gray-800 list-decimal list-inside">
            <li><strong>Scope.</strong> The Service Provider shall perform preventive maintenance, inspection and support for the Equipment identified above.</li>
            <li><strong>Term.</strong> This Agreement is effective {fmt(contract.start_date)} and continues until {contract.end_date ? fmt(contract.end_date) : 'terminated per clause 7'}.</li>
            <li><strong>Visit schedule.</strong> Preventive visits are performed {contract.visit_frequency}. Each visit is documented by a visit ticket with photographic evidence.</li>
            <li><strong>Fees.</strong> The Customer shall pay {price} per the agreed schedule. Corrective repairs are billed separately unless stated otherwise.</li>
            <li><strong>Customer responsibilities.</strong> The Customer shall provide safe access to the Equipment and accurate operating data.</li>
            <li><strong>Provider responsibilities.</strong> The Service Provider shall assign qualified technicians and use genuine parts.</li>
            <li><strong>Termination.</strong> Either party may terminate with thirty (30) days written notice.</li>
            <li><strong>Governing law.</strong> This Agreement is governed by the laws of the Arab Republic of Egypt.</li>
          </ol>
          {contract.terms && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{contract.terms}</p>}
        </div>

        {/* Arabic terms */}
        <div className="mt-6" dir="rtl">
          <h2 className="text-base font-bold border-b pb-1 text-right">الشروط والأحكام</h2>
          <ol className="mt-3 space-y-2 text-sm text-gray-800 list-decimal list-inside text-right">
            <li><strong>النطاق.</strong> يلتزم مقدّم الخدمة بأداء الصيانة الوقائية والفحص والدعم للمعدات المحددة أعلاه.</li>
            <li><strong>المدة.</strong> يسري هذا العقد اعتباراً من {fmt(contract.start_date)} ويستمر حتى {contract.end_date ? fmt(contract.end_date) : 'إنهائه وفق البند 7'}.</li>
            <li><strong>جدول الزيارات.</strong> تُنفَّذ الزيارات الوقائية {FreqAR[contract.visit_frequency]}. وتوثَّق كل زيارة بتذكرة زيارة تتضمن أدلة فوتوغرافية.</li>
            <li><strong>الأتعاب.</strong> يدفع العميل مبلغ {price} وفق الجدول المتفق عليه، وتُحتسب الإصلاحات التصحيحية منفصلة ما لم يُنص على غير ذلك.</li>
            <li><strong>التزامات العميل.</strong> يوفر العميل وصولاً آمناً للمعدات وبيانات تشغيل دقيقة.</li>
            <li><strong>التزامات المقدّم.</strong> يعيّن مقدّم الخدمة فنيين مؤهلين ويستخدم قطع غيار أصلية.</li>
            <li><strong>الإنهاء.</strong> يجوز لأي طرف إنهاء العقد بإشعار كتابي قبل ثلاثين (30) يوماً.</li>
            <li><strong>القانون الواجب التطبيق.</strong> يخضع هذا العقد لقوانين جمهورية مصر العربية.</li>
          </ol>
        </div>

        {/* Visit history + photo evidence */}
        <div className="mt-6">
          <h2 className="text-base font-bold border-b pb-1">Visit History · سجل الزيارات</h2>
          {visits.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No visits recorded.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="py-1">Date</th><th className="py-1">Type</th><th className="py-1">Status</th><th className="py-1">Technician</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-t align-top">
                    <td className="py-1">{fmt(v.scheduled_at)}</td>
                    <td className="py-1 capitalize">{v.type}</td>
                    <td className="py-1 capitalize">{v.status}</td>
                    <td className="py-1">{v.technician || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {allPhotos.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 uppercase mb-1">Photo evidence · الأدلة الفوتوغرافية</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allPhotos.map((src, i) => (
                  <img key={i} src={src} alt={`Visit evidence ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Signature + stamp */}
        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-semibold">For ALMONA Co. · عن شركة المُنى</div>
            <div className="mt-8">Signature / التوقيع: ____________________</div>
            <div className="mt-3">Name / الاسم: __________________________</div>
            <div className="mt-3">Title / الصفة: __________________________</div>
            <div className="mt-3">Date / التاريخ: _________________________</div>
            <div className="mt-3">Stamp / الختم: __________________________</div>
          </div>
          <div>
            <div className="font-semibold">For Customer · عن العميل</div>
            <div className="mt-8">Signature / التوقيع: ____________________</div>
            <div className="mt-3">Name / الاسم: __________________________</div>
            <div className="mt-3">Title / الصفة: __________________________</div>
            <div className="mt-3">Date / التاريخ: _________________________</div>
            <div className="mt-3">Stamp & Seal / الختم والاعتماد: ____________</div>
          </div>
        </div>
        <p className="mt-8 text-center text-[10px] text-gray-400">Generated by ALMONA Service Portal · {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
}

export default ServiceContractCustomerView
