import { usePublicCopy } from '@/hooks/usePublicCopy';
import { useYilmazMachines } from '@/hooks/useYilmazMachines';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Download, Plus, RotateCw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import type { Machine } from '@/constants/yilmazMachines';

type ItemKind =
  | 'machine'
  | 'workbench'
  | 'storage'
  | 'pickup'
  | 'air'
  | 'manager'
  | 'workers'
  | 'toilets'
  | 'assembly'
  | 'glass'
  | 'accessories'
  | 'electricity';

interface LayoutItem {
  id: string;
  kind: ItemKind;
  label: string;
  modelId?: string;
  description?: string;
  w: number; // meters (x)
  h: number; // meters (y)
  x: number;
  y: number;
  color: string;
}

interface Door {
  id: string;
  label: string;
  side: 'bottom' | 'top';
  offset: number; // meters along the wall from left
  width: number; // meters
}

const ZONES: Record<string, { label: string; color: string; w: number; h: number }> = {
  storage: { label: 'Storage Area', color: '#a78bfa', w: 6, h: 3 },
  pickup: { label: 'Pickup / Discharge', color: '#34d399', w: 4, h: 4 },
  air: { label: 'Air Compressor', color: '#f87171', w: 3, h: 3 },
  manager: { label: 'Manager Office', color: '#60a5fa', w: 3, h: 3 },
  workers: { label: 'Workers Office', color: '#2dd4bf', w: 4, h: 3 },
  toilets: { label: 'Toilets', color: '#22d3ee', w: 2, h: 2 },
  assembly: { label: 'Assembly Area', color: '#f472b6', w: 6, h: 4 },
  glass: { label: 'Glass Area', color: '#7dd3fc', w: 4, h: 3 },
  accessories: { label: 'Accessories Warehouse', color: '#fbbf24', w: 4, h: 3 },
  electricity: { label: 'Electricity Panel', color: '#fde047', w: 1.5, h: 0.6 },
};

function parseMeters(s?: string): number {
  const m = String(s || '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) / 1000 : 0;
}

let idc = 0;
const uid = () => `it-${Date.now()}-${++idc}`;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const snap = (v: number) => Math.round(v / 0.25) * 0.25;

export function FactoryLayoutPlanner({ onClose }: { onClose: () => void }) {
  const copy = usePublicCopy();
  const { data: machines = [] } = useYilmazMachines();
  const [factoryW, setFactoryW] = useState(20);
  const [factoryL, setFactoryL] = useState(30);
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const doorDragRef = useRef<{ id: string; dx: number } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return machines.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)
    );
  }, [search, machines]);

  const qtyOf = useCallback(
    (modelId: string) => items.filter((it) => it.modelId === modelId).length,
    [items]
  );

  const addMachine = useCallback((m: Machine) => {
    const len = parseMeters(m.dimensions?.length);
    const wid = parseMeters(m.dimensions?.width);
    const unknown = len <= 0 || wid <= 0;
    const w = unknown ? 2 : len;
    const h = unknown ? 1.2 : wid;
    setItems((prev) => [...prev, { id: uid(), kind: 'machine', label: unknown ? `${m.name} *` : m.name, modelId: m.id, description: m.description, w, h, x: 0, y: 0, color: '#f59e0b' }]);
  }, []);

  const addWorkbench = useCallback(() => {
    setItems((prev) => [...prev, { id: uid(), kind: 'workbench', label: 'Workbench', description: 'Workbench for manual assembly and fitting', w: 2, h: 0.8, x: 0, y: 0, color: '#94a3b8' }]);
  }, []);

  const addZone = useCallback((kind: string) => {
    const z = ZONES[kind];
    setItems((prev) => [...prev, { id: uid(), kind: kind as ItemKind, label: z.label, description: z.label, w: z.w, h: z.h, x: 0, y: 0, color: z.color }]);
  }, []);

  const addDoor = useCallback((n: number) => {
    setDoors((prev) => [...prev, { id: uid(), label: `Door ${n}`, side: 'bottom', offset: 2, width: 2 }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const rotateItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const w = it.h;
        const h = it.w;
        return {
          ...it,
          w,
          h,
          x: clamp(it.x, 0, Math.max(0, factoryL - w)),
          y: clamp(it.y, 0, Math.max(0, factoryW - h)),
        };
      })
    );
  }, [factoryL, factoryW]);

  const updateSize = useCallback((id: string, key: 'w' | 'h', value: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const v = clamp(value, 0.5, 50);
        const w = key === 'w' ? v : it.w;
        const h = key === 'h' ? v : it.h;
        return {
          ...it,
          w,
          h,
          x: clamp(it.x, 0, Math.max(0, factoryL - w)),
          y: clamp(it.y, 0, Math.max(0, factoryW - h)),
        };
      })
    );
  }, [factoryL, factoryW]);

  const clearAll = useCallback(() => {
    setItems([]);
    setDoors([]);
    setSelectedId(null);
  }, []);

  const svg = useMemo(() => {
    const svgW = 800;
    const svgH = 560;
    const s = Math.min((svgW - 60) / factoryL, (svgH - 60) / factoryW);
    return { svgW, svgH, scale: s, ox: (svgW - factoryL * s) / 2, oy: (svgH - factoryW * s) / 2, floorW: factoryL * s, floorH: factoryW * s };
  }, [factoryW, factoryL]);

  const toMeters = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { mx: 0, my: 0 };
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * svg.svgW;
    const py = ((clientY - r.top) / r.height) * svg.svgH;
    return { mx: (px - svg.ox) / svg.scale, my: (py - svg.oy) / svg.scale };
  }, [svg]);

  const onPointerDown = useCallback((e: React.PointerEvent, it: LayoutItem) => {
    e.stopPropagation();
    setSelectedId(it.id);
    const { mx, my } = toMeters(e.clientX, e.clientY);
    dragRef.current = { id: it.id, dx: mx - it.x, dy: my - it.y };
    svgRef.current?.setPointerCapture(e.pointerId);
  }, [toMeters]);

  const onDoorPointerDown = useCallback((e: React.PointerEvent, door: Door) => {
    e.stopPropagation();
    const { mx } = toMeters(e.clientX, e.clientY);
    doorDragRef.current = { id: door.id, dx: mx - door.offset };
    svgRef.current?.setPointerCapture(e.pointerId);
  }, [toMeters]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const doorDrag = doorDragRef.current;
    if (doorDrag) {
      const { mx } = toMeters(e.clientX, e.clientY);
      setDoors((prev) =>
        prev.map((d) => (d.id === doorDrag.id ? { ...d, offset: clamp(snap(mx - doorDrag.dx), 0, Math.max(0, factoryL - d.width)) } : d))
      );
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const { mx, my } = toMeters(e.clientX, e.clientY);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== drag.id) return it;
        return {
          ...it,
          x: clamp(snap(mx - drag.dx), 0, Math.max(0, factoryL - it.w)),
          y: clamp(snap(my - drag.dy), 0, Math.max(0, factoryW - it.h)),
        };
      })
    );
  }, [toMeters, factoryL, factoryW]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    doorDragRef.current = null;
  }, []);

  const exportPdf = useCallback(async () => {
    const { generateWorkshopLayoutPDF } = await import('@/lib/reports/workshopLayoutPdf');
    let logoDataUrl: string | undefined;
    try {
      const res = await fetch('/logo-bg-removed.png');
      if (res.ok) {
        const blob = await res.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(blob);
        });
      }
    } catch { /* logo optional */ }

    const pdfItems = items.map((it) => ({ label: it.label, x: it.x, y: it.y, w: it.w, h: it.h, color: it.color }));
    const componentMap = new Map<string, number>();
    let totalPowerKw = 0;
    let totalAirLmin = 0;
    for (const it of items) {
      componentMap.set(it.label, (componentMap.get(it.label) || 0) + 1);
      if (it.kind === 'machine') {
        const machine = machines.find((m) => m.id === it.modelId);
        totalPowerKw += parseFloat((machine?.powerSpec?.consumption || '0').match(/[\d.]+/)?.[0] || '0');
        totalAirLmin += parseFloat((machine?.airSpec?.consumption || '0').match(/[\d.]+/)?.[0] || '0');
      }
    }
    const components = [...componentMap.entries()].map(([label, qty]) => ({ label, qty }));
    const bytes = await generateWorkshopLayoutPDF(factoryW, factoryL, pdfItems, logoDataUrl, {
      components,
      totalPowerKw: Math.round(totalPowerKw * 10) / 10,
      totalAirLmin: Math.round(totalAirLmin),
    });
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    a.download = `almona-workshop-layout-${ts}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [items, factoryW, factoryL]);

  const selected = items.find((it) => it.id === selectedId) || null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100] p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-[1400px] max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{copy("Workshop Layout Planner")}</h2>
            <p className="text-xs text-gray-400">{copy("Add machines and zones, drag to position them, then export a PDF.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={exportPdf} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Download className="h-4 w-4 mr-1" />{copy("Export PDF")}
            </Button>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_1fr]">
          {/* Sidebar */}
          <div className="border-b lg:border-b-0 lg:border-r border-gray-700 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-700">
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">{copy("Width (m)")}</label>
                  <Input type="number" min={1} value={factoryW} onChange={(e) => setFactoryW(Math.max(1, Number(e.target.value) || 1))} className="bg-gray-800 border-gray-600 h-8" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">{copy("Length (m)")}</label>
                  <Input type="number" min={1} value={factoryL} onChange={(e) => setFactoryL(Math.max(1, Number(e.target.value) || 1))} className="bg-gray-800 border-gray-600 h-8" />
                </div>
              </div>

              {/* Zones */}
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.entries(ZONES).map(([k, z]) => (
                  <button key={k} onClick={() => addZone(k)} className="text-[11px] px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-gray-200">
                    + {z.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                <button onClick={addWorkbench} className="text-[11px] px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-gray-200">+ Workbench</button>
                <button onClick={() => addDoor(1)} className="text-[11px] px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-gray-200">+ Door 1</button>
                <button onClick={() => addDoor(2)} className="text-[11px] px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-gray-200">+ Door 2</button>
                <button onClick={clearAll} className="text-[11px] px-2 py-1 rounded border border-red-700 text-red-400 hover:bg-red-900/30">Clear</button>
              </div>
            </div>

            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={copy("Search machines...")} className="pl-9 bg-gray-800 border-gray-600 h-8" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filtered.slice(0, 150).map((m) => {
                const q = qtyOf(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate">{m.name}</div>
                      <div className="text-[10px] text-gray-500 capitalize">{m.category?.replace(/-/g, ' ')}</div>
                    </div>
                    {q > 0 && <span className="text-xs text-amber-400 font-bold">{q}×</span>}
                    <button onClick={() => addMachine(m)} className="text-amber-400 hover:text-amber-300 p-1" aria-label={`Add ${m.name}`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canvas */}
          <div className="p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
              <span>{copy("Drag items to position them. Click to select.")}</span>
              <span>{items.length} {copy("items")}</span>
            </div>
            <div className="flex-1 min-h-[380px] bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svg.svgW} ${svg.svgH}`}
                className="w-full h-full touch-none"
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* grid */}
                {Array.from({ length: Math.ceil(factoryL) + 1 }).map((_, i) => (
                  <line key={`v${i}`} x1={svg.ox + i * svg.scale} y1={svg.oy} x2={svg.ox + i * svg.scale} y2={svg.oy + svg.floorH} stroke="#1f2937" strokeWidth={1} />
                ))}
                {Array.from({ length: Math.ceil(factoryW) + 1 }).map((_, i) => (
                  <line key={`h${i}`} x1={svg.ox} y1={svg.oy + i * svg.scale} x2={svg.ox + svg.floorW} y2={svg.oy + i * svg.scale} stroke="#1f2937" strokeWidth={1} />
                ))}

                {/* floor */}
                <rect x={svg.ox} y={svg.oy} width={svg.floorW} height={svg.floorH} fill="none" stroke="#64748b" strokeWidth={2} />
                <text x={svg.ox + svg.floorW / 2} y={svg.oy + svg.floorH + 16} textAnchor="middle" fill="#94a3b8" fontSize={11}>{factoryL} m</text>
                <text x={svg.ox - 14} y={svg.oy + svg.floorH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11} transform={`rotate(-90 ${svg.ox - 14} ${svg.oy + svg.floorH / 2})`}>{factoryW} m</text>

                {/* doors */}
                {doors.map((d) => {
                  const dx = svg.ox + d.offset * svg.scale;
                  const dw = d.width * svg.scale;
                  const dy = d.side === 'bottom' ? svg.oy + svg.floorH : svg.oy;
                  return (
                    <g key={d.id} onPointerDown={(e) => onDoorPointerDown(e, d)} style={{ cursor: 'ew-resize' }}>
                      <rect x={dx} y={d.side === 'bottom' ? dy - 6 : dy} width={dw} height={6} fill="#fff" stroke="#f87171" strokeWidth={2} />
                      <text x={dx + dw / 2} y={d.side === 'bottom' ? dy - 10 : dy + 14} textAnchor="middle" fill="#f87171" fontSize={9}>{d.label}</text>
                    </g>
                  );
                })}

                {/* items */}
                {items.map((it) => {
                  const px = svg.ox + it.x * svg.scale;
                  const py = svg.oy + it.y * svg.scale;
                  const pw = it.w * svg.scale;
                  const ph = it.h * svg.scale;
                  const sel = selectedId === it.id;
                  return (
                    <g
                      key={it.id}
                      onPointerDown={(e) => onPointerDown(e, it)}
                      style={{ cursor: 'grab' }}
                    >
                      <rect x={px} y={py} width={pw} height={ph} fill={`${it.color}33`} stroke={it.color} strokeWidth={sel ? 3 : 1.5} rx={2} />
                      <text x={px + pw / 2} y={py + ph / 2 + 1} textAnchor="middle" fill="#fff" fontSize={Math.max(7, Math.min(11, pw / 6))} fontWeight={600} style={{ pointerEvents: 'none' }}>
                        {it.label}
                      </text>
                      {pw > 26 && ph > 16 && (
                        <text x={px + pw / 2} y={py + ph / 2 + 12} textAnchor="middle" fill="#cbd5e1" fontSize={9} style={{ pointerEvents: 'none' }}>
                          {it.w.toFixed(1)} × {it.h.toFixed(1)} m
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* selected item actions */}
            {selected && (
              <div className="mt-2 text-sm bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-gray-200 font-medium truncate">{selected.label}</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>W</span>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.1}
                      value={selected.w}
                      onChange={(e) => updateSize(selected.id, 'w', Number(e.target.value))}
                      className="w-16 h-7 bg-gray-900 border-gray-600 text-xs"
                    />
                    <span>×</span>
                    <span>L</span>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.1}
                      value={selected.h}
                      onChange={(e) => updateSize(selected.id, 'h', Number(e.target.value))}
                      className="w-16 h-7 bg-gray-900 border-gray-600 text-xs"
                    />
                    <span>m</span>
                  </div>
                  <button onClick={() => rotateItem(selected.id)} className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                    <RotateCw className="h-4 w-4" />{copy("Rotate")}
                  </button>
                  <button onClick={() => removeItem(selected.id)} className="ml-auto text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />{copy("Remove")}
                  </button>
                </div>
                {selected.description && (
                  <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-700 pt-2">{selected.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FactoryLayoutPlanner;
