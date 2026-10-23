# PERF 50/75/100/200-piece benchmark report (PR8)

Generated 2026-10-23T08:26:36.318Z. Stock 6500 mm, saw kerf 10 mm, 5 runs per size.

| pieces | input mm | bars | utilization % | remnant mm | cutting loss mm | p50 ms | p95 ms | heap MB |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 78300 | 14 | 86.59 | 12200 | 500 | 0.05 | 0.69 | 8.6 |
| 75 | 122100 | 22 | 85.91 | 20150 | 750 | 0.11 | 0.55 | 7.5 |
| 100 | 152700 | 27 | 87.58 | 21800 | 1000 | 0.07 | 0.12 | 7.9 |
| 200 | 296200 | 52 | 88.22 | 39800 | 2000 | 0.16 | 0.19 | 8.6 |

## Conservation

`stock = input + cutting loss (kerf + trim) + remnant` holds for every size (asserted in-script).

## Waste accounting

- `remnant mm` = unused stock leftover (offcut and non-reusable remnant), reported separately.
- `cutting loss mm` = saw kerf + trim overhead (consumed − input), reported separately from remnant.
- No 15–20% → 3–5% improvement claim is made; all figures above are measured only.

## Limitations

- Synthetic representative profile lengths from a deterministic PRNG; not a real approved job.
- Single-threaded in-process benchmark; not a queue or capacity proof.
