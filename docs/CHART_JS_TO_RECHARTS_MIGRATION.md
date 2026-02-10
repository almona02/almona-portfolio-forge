# Chart.js → Recharts Migration Guide

**Phase 2 - Bundle Optimization**  
**Status:** ✅ **COMPLETE** — Chart.js removed

---

## Component Migration Order

1. ✅ **MaterialUtilizationChart.tsx** (DONE)
2. ✅ **RemnantLifespanChart.tsx** (DONE)
3. ✅ **PerformanceBenchmarkChart.tsx** (DONE)
4. ✅ **FabricationReportGenerator.tsx** (DONE)

---

## Pattern Mapping

| Chart.js | Recharts |
|----------|----------|
| Bar | `BarChart` + `Bar` |
| Line | `LineChart` + `Line` |
| Doughnut | `PieChart` + `Pie` + `Cell` |

---

## Data Format

**Chart.js** (labels + datasets):
```typescript
{ labels: ['A','B'], datasets: [{ data: [1,2], label: 'X' }] }
```

**Recharts** (array of objects):
```typescript
[{ name: 'A', value: 1 }, { name: 'B', value: 2 }]
// or for multi-series: [{ name: 'A', used: 1, wasted: 2 }, ...]
```

---

## MaterialUtilizationChart (Completed)

- **Before:** Bar from react-chartjs-2, ChartJS.register
- **After:** BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer from recharts
- **Data:** Props unchanged – `{ period, used, wasted, utilization }[]` works directly
- **Colors:** Preserved – green (used), red (wasted)

---

## PerformanceBenchmarkChart (Completed)

- **Before:** Line from react-chartjs-2, dual Y-axis
- **After:** ComposedChart with Line, Line, dual YAxis (yAxisId left/right)
- **Data:** averageDuration (ms), averageWaste (%) — preserved from PerformanceBenchmarker
- **Colors:** Orange (duration), Red (waste)

---

## RemnantLifespanChart (Completed)

- **Before:** Bar + Doughnut from react-chartjs-2 (two charts side-by-side)
- **After:** BarChart + PieChart in separate ResponsiveContainers (grid layout)
- **Data:** byAge (range, count), byStatus (status, count) — structure preserved
- **Pie:** innerRadius for doughnut effect

---

## Testing

- ResizeObserver mock required for jsdom (Recharts ResponsiveContainer)
- Tests: `MaterialUtilizationChart.migration.test.tsx`, `RemnantLifespanChart.migration.test.tsx`, `PerformanceBenchmarkChart.migration.test.tsx`

---

## FabricationReportGenerator (Completed)

- **Before:** Bar from react-chartjs-2, cost breakdown chart
- **After:** BarChart with isAnimationActive={false} (PDF/print-safe)
- **Data:** Profile, Locks, Handles, Espanglites, Rails cost breakdown

---

## Cleanup

```bash
npm uninstall chart.js react-chartjs-2 @types/chart.js
```

**Status:** ✅ DONE — Chart.js removed from project.
