# Lane A — local bootstrap / locale / start-command issues (separate from release binding)

Recorded for operators and Spark local reproduction. **Not** staging-apply blockers unless noted.

| Issue | Where seen | Impact | Staging build impact |
|-------|------------|--------|----------------------|
| Manual `locales/` → `public/locales/` copy | Local Vite dev sometimes 404s `/locales/*` | Dev-only workaround in handoff (`mkdir -p public/locales && cp -R locales/. public/locales/`) | **None for app i18n.** Production/preview Vite build loads translations via `import.meta.glob('../../locales/*/*.json')` in `src/lib/i18n.ts` from tracked repo `locales/`. No HTTP `/locales` backend. |
| `npm run dev -- --host 127.0.0.1 --port 3000` required | Loopback-only Lane A stack | Binding to `127.0.0.1` avoids accidental LAN exposure of local Auth | N/A (Vercel preview uses `npm run build`) |
| Bootstrap must target `almona-lane-a-local` ports `54421–54424` | Confusable with default local project `54321` | Wrong API URL breaks Auth/login | Staging uses hosted project env — not this bootstrap |
| `public/locales/**/*.json` mostly gitignored (`*.json`) | Local copies are untracked noise | Do not commit copied trees; keep using root `locales/` | Staging packages from `locales/`, not `public/locales` |

## Locale packaging prerequisite (staging)

**Conclusion:** The locale-copy step does **not** affect the staging/preview build. No packaging change is required before deployment for i18n.

Gate before any future staging preview: confirm `locales/` is present at the frontend tip (`ad9570bc`+) and that `npm run build` succeeds without relying on `public/locales`.

## Out of scope

No staging apply · no production · no FR-1 changes.
