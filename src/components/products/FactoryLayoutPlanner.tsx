import { usePublicCopy } from '@/hooks/usePublicCopy';
import { useYilmazMachines } from '@/hooks/useYilmazMachines';
import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';

/** Parse a dimension string like "8850mm" or "On request" into meters. */
function parseMeters(s?: string): number {
  const m = String(s || '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) / 1000 : 1; // mm -> m (default 1m if unknown)
}

interface LayoutItem {
  id: string;
  name: string;
  w: number; // footprint length (m) along X
  h: number; // footprint width (m) along Y
  x: number;
  y: number;
}

export function FactoryLayoutPlanner({ onClose }: { onClose: () => void }) {
  const copy = usePublicCopy();
  const { data: machines = [] } = useYilmazMachines();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [factoryW, setFactoryW] = useState(20); // meters (depth / Y)
  const [factoryL, setFactoryL] = useState(30); // meters (width / X)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return machines.filter((m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q)
    );
  }, [search, machines]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedMachines = useMemo(
    () => machines.filter((m) => selected.includes(m.id)),
    [machines, selected]
  );

  // Simple row-wrap ("shelf") packing: largest machines first, wrap when exceeding factory length.
  const layout = useMemo(() => {
    const sorted = selectedMachines
      .map((m) => ({
        id: m.id,
        name: m.name,
        w: parseMeters(m.dimensions?.length),
        h: parseMeters(m.dimensions?.width),
      }))
      .sort((a, b) => b.w * b.h - a.w * a.h);

    const gap = 1; // 1 m aisle between machines
    const items: LayoutItem[] = [];
    let x = 0;
    let y = 0;
    let rowH = 0;
    for (const it of sorted) {
      if (x + it.w > factoryL) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      items.push({ ...it, x, y });
      x += it.w + gap;
      rowH = Math.max(rowH, it.h);
    }
    return items;
  }, [selectedMachines, factoryL]);

  const svg = useMemo(() => {
    const svgW = 760;
    const svgH = 560;
    const s = Math.min((svgW - 60) / factoryL, (svgH - 60) / factoryW);
    return {
      scale: s,
      floorW: factoryL * s,
      floorH: factoryW * s,
      ox: (svgW - factoryL * s) / 2,
      oy: (svgH - factoryW * s) / 2,
      svgW,
      svgH,
    };
  }, [factoryW, factoryL]);

  const totalArea = useMemo(
    () => selectedMachines.reduce((a, m) => a + parseMeters(m.dimensions?.length) * parseMeters(m.dimensions?.width), 0),
    [selectedMachines]
  );
  const coverage = factoryW * factoryL > 0 ? (totalArea / (factoryW * factoryL)) * 100 : 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{copy("Factory Layout Planner")}</h2>
            <p className="text-xs text-gray-400">{copy("Select machines and enter your factory space to preview a 2D layout.")}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          {/* Machine selection */}
          <div className="border-b lg:border-b-0 lg:border-r border-gray-700 p-4 flex flex-col min-h-0">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy("Search machines...")}
                className="pl-10 bg-gray-800 border-gray-600"
              />
            </div>
            <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
              <span>{copy("Selected")}: {selected.length}</span>
              <button className="text-amber-400 hover:underline" onClick={() => setSelected([])}>
                {copy("Clear")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filtered.slice(0, 120).map((m) => {
                const on = selected.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm border ${
                      on ? 'border-amber-500/50 bg-amber-500/10' : 'border-transparent hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(m.id)}
                      className="accent-amber-500"
                    />
                    <span className="text-gray-200 truncate">{m.name}</span>
                    <span className="text-gray-500 text-xs ml-auto capitalize">{m.category?.replace(/-/g, ' ')}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Layout */}
          <div className="p-4 flex flex-col min-h-0">
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">{copy("Factory width (m)")}</label>
                <Input
                  type="number"
                  min={1}
                  value={factoryW}
                  onChange={(e) => setFactoryW(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{copy("Factory length (m)")}</label>
                <Input
                  type="number"
                  min={1}
                  value={factoryL}
                  onChange={(e) => setFactoryL(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 bg-gray-800 border-gray-600"
                />
              </div>
              <div className="text-xs text-gray-400 ml-auto text-right">
                <div>{copy("Machines")}: {selectedMachines.length}</div>
                <div>{copy("Footprint")}: {totalArea.toFixed(0)} m² / {factoryW * factoryL} m² ({coverage.toFixed(0)}%)</div>
              </div>
            </div>

            <div className="flex-1 min-h-[300px] bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
              {selectedMachines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  {copy("Select machines to preview the layout")}
                </div>
              ) : (
                <svg viewBox={`0 0 ${svg.svgW} ${svg.svgH}`} className="w-full h-full">
                  {/* Factory floor */}
                  <rect
                    x={svg.ox}
                    y={svg.oy}
                    width={svg.floorW}
                    height={svg.floorH}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {/* Dimension labels for the floor */}
                  <text x={svg.ox + svg.floorW / 2} y={svg.oy + svg.floorH + 18} textAnchor="middle" fill="#94a3b8" fontSize={12}>
                    {factoryL} m
                  </text>
                  <text x={svg.ox - 14} y={svg.oy + svg.floorH / 2} textAnchor="middle" fill="#94a3b8" fontSize={12} transform={`rotate(-90 ${svg.ox - 14} ${svg.oy + svg.floorH / 2})`}>
                    {factoryW} m
                  </text>

                  {layout.map((it) => {
                    const px = svg.ox + it.x * svg.scale;
                    const py = svg.oy + it.y * svg.scale;
                    const pw = it.w * svg.scale;
                    const ph = it.h * svg.scale;
                    return (
                      <g key={it.id}>
                        <rect x={px} y={py} width={pw} height={ph} fill="#f59e0b22" stroke="#f59e0b" strokeWidth={1.5} rx={2} />
                        {pw > 50 && ph > 24 ? (
                          <>
                            <text x={px + pw / 2} y={py + ph / 2 - 4} textAnchor="middle" fill="#fbbf24" fontSize={11} fontWeight={600}>
                              {it.name}
                            </text>
                            <text x={px + pw / 2} y={py + ph / 2 + 10} textAnchor="middle" fill="#94a3b8" fontSize={9}>
                              {it.w.toFixed(1)} × {it.h.toFixed(1)} m
                            </text>
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FactoryLayoutPlanner;
