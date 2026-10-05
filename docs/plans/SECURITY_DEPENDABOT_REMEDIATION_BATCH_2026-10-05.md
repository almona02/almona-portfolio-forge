# Security remediation batch — Dependabot open alerts

Date: 5 October 2026. Status: **prepared locally; not committed until frontend + backend verification passes**.

Inputs: open Dependabot alerts listed by the operator (braces, brace-expansion, node-forge, PyJWT, fast-uri, serialize-javascript, DOMPurify) plus Railway Dockerfile path review.

## Alert disposition

| Alert | Package | Manifest | Severity | Action | Clearable now? |
|---|---|---|---|---|---|
| #935 | PyJWT | `python_backend/requirements.txt` | critical | Bump **2.13.0 → 2.15.1** (also align prod/optimized 2.15.0 → 2.15.1) | **Yes** |
| #931–934, #938 | PyJWT | requirements.txt | high | Same PyJWT 2.15.1 | **Yes** |
| #929–930, #936–937, #939–941 | PyJWT | requirements.txt | moderate | Same PyJWT 2.15.1 | **Yes** |
| #861 | fast-uri | package-lock.json | moderate (dev) | Override/pin **4.1.4 → 4.2.1** | **Yes** |
| #867 | serialize-javascript | package-lock.json | low (dev) | Override/pin **7.1.1 → 7.1.2** | **Yes** |
| #866 | dompurify | package-lock.json | low | Direct dep **3.4.15 → 3.4.16** | **Yes** |
| #863–865 | brace-expansion | fabricator-mobile lock | high/moderate | Mobile override **2.1.4 → 2.1.7** (Sept 14 patches) | **Yes** (expected) |
| #942 | node-forge | fabricator-mobile lock | high | Advisory claims fix in **1.4.1**; npm latest is still **1.4.0** (no 1.4.1 published) | **No — blocked** |
| #943–944 | braces | root + mobile locks | high | CVE-2026-93687; **no patched release above 3.0.3** | **No — blocked** |

### Why Railway already differs on PyJWT

Live Railway builds `python_backend/Dockerfile.realistic`, which installs `requirements-prod.txt` (**PyJWT==2.15.0**). Dependabot still flags **`requirements.txt` (2.13.0)** because that file is scanned as a direct manifest. Aligning all pins to **2.15.1** closes the advisory surface and keeps prod/dev/optimized consistent.

## Railway Dockerfile path

| Source | Path | Starts | Verdict |
|---|---|---|---|
| Railway dashboard (live) | `/python_backend/Dockerfile.realistic` | `uvicorn apis.main:app` + `requirements-prod.txt` | **Correct Industrial API image** (Batch 1 verified) |
| Repo `python_backend/railway.json` | `python_backend/Dockerfile` | `api.prestige_endpoints` (YDT Prestige) | **Wrong for the live Industrial service** |
| `python_backend/Dockerfile.prod` | multi-stage `apis.main` | `requirements-runtime.txt` (no explicit PyJWT pin) | Alternate Industrial image; not what Railway uses today |

**Conclusion:** `.realistic` is not a mistaken “size experiment” on Railway — it is the live Industrial backend. The mistake is the **repo `railway.json` still pointing at the Prestige Dockerfile**. Remediation: set `railway.json` to `python_backend/Dockerfile.realistic` and an Industrial start command (or null so the Dockerfile `CMD` wins).

## Local change set (this batch)

1. Python: `PyJWT==2.15.1` in `requirements.txt`, `requirements-prod.txt`, `requirements-optimized.txt`.
2. Root npm: bump overrides/deps for `fast-uri`, `serialize-javascript`, `dompurify`, pin `brace-expansion` to `5.0.12`; refresh lockfile.
3. Mobile npm: `brace-expansion` override `2.1.7`; refresh mobile lockfile.
4. Railway: align `python_backend/railway.json` with Dockerfile.realistic / `apis.main`.
5. Docs: this plan + Batch 1 verification note.

## Explicitly not claimed clearable

- **braces #943/#944** — no upstream release; mitigate by not feeding untrusted brace patterns into micromatch/chokidar paths; re-check when micromatch publishes >3.0.3.
- **node-forge #942** — wait for npm `1.4.1+`; keep 1.4.0 until published.

## Local verification — 5 October 2026 night (pre-commit)

| Gate | Result |
|---|---|
| `npm run test:batch1` | 30/30 |
| Apex / preset / industrial UI regressions | 28/28 |
| `npm run build` | PASS |
| Redis readiness pytest | 5/5 |
| PyJWT runtime | 2.15.1 |
| Lock resolves | root: fast-uri 4.2.1, serialize-javascript 7.1.2, dompurify 3.4.16, brace-expansion 5.0.12; mobile: brace-expansion 2.1.7; braces remains 3.0.3; node-forge remains 1.4.0 |
| `railway.json` | `python_backend/Dockerfile.realistic` + `apis.main` |

Blocked advisories remain: **braces #943/#944** (no upstream patch), **node-forge #942** (1.4.1 not on npm).
