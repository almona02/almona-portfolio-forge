# Dependabot Alerts — Fix Investigation

**Generated:** 2026-02-27  
**Applied:** 2026-02-27  
**Scope:** All open Dependabot alerts (npm + pip)

---

## ✅ Fixes Applied (2026-02-27)

| Change | Status |
|--------|--------|
| basic-ftp override ^5.2.0 | ✅ Applied |
| minimatch override ^10.2.1 | ✅ Applied |
| jspdf ^4.2.0 | ✅ Applied |
| Storybook packages ^9.1.19 | ✅ Applied |
| npm audit fix (ajv, rollup) | ✅ 0 vulnerabilities |
| Werkzeug>=3.1.6 | ✅ Applied |
| Flask>=3.1.3 | ✅ Applied |
| Type check | ✅ Passed |
| Build | ✅ Passed |
| CI (validate:manifest, validate:constitutional) | ✅ Passed |

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Fix available |
| High | 10 | Fix available |
| Moderate | 1 | Fix available |
| Low | 3 | Fix available |

---

## npm (Node.js) Fixes

### 1. basic-ftp — Path Traversal (CVE-2026-27699) — **Critical**

| Field | Value |
|-------|-------|
| **Current** | 5.1.0 (transitive via `get-uri`) |
| **Fixed** | 5.2.0 |
| **File** | `package-lock.json` |
| **Dependency chain** | `get-uri` → `basic-ftp` |

**Fix:** Add override in `package.json`:

```json
"overrides": {
  "basic-ftp": "^5.2.0"
}
```

Then run `npm install` to regenerate `package-lock.json`.

---

### 2. Storybook — WebSocket Hijacking (CVE-2026-27148) — **High**

| Field | Value |
|-------|-------|
| **Current** | 9.1.17 |
| **Fixed** | 9.1.19 |
| **File** | `package-lock.json` |
| **Note** | Dev-only; affects `storybook dev` server |

**Fix:** Update Storybook packages in `package.json`:

```json
"@chromatic-com/storybook": "^9.1.19",
"@storybook/addon-a11y": "^9.1.19",
"@storybook/addon-docs": "^9.1.19",
"@storybook/addon-onboarding": "^9.1.19",
"@storybook/addon-vitest": "^9.1.19",
"@storybook/react-vite": "^9.1.19",
"eslint-plugin-storybook": "^9.1.19",
"storybook": "^9.1.19"
```

Then `npm update @storybook/addon-a11y @storybook/addon-docs @storybook/addon-onboarding @storybook/addon-vitest @storybook/react-vite storybook eslint-plugin-storybook @chromatic-com/storybook` or `npm install`.

---

### 3. jsPDF — Multiple CVEs (204, 205, 206) — **High**

| CVE | Issue | Fixed Version |
|-----|-------|---------------|
| CVE-2026-25535 | DoS via malicious GIF dimensions | 4.2.0 |
| CVE-2026-25755 | PDF Object Injection in addJS | 4.2.0 |
| CVE-2026-24737 | AcroForm PDF Injection (RadioButton.createOption, "AS" property) | 4.2.0 |

| Field | Value |
|-------|-------|
| **Current** | 4.1.0 |
| **Fixed** | 4.2.0 |
| **File** | `package-lock.json` |

**Fix:** Update in `package.json`:

```json
"jspdf": "^4.2.0"
```

Then `npm install jspdf@^4.2.0`.

---

### 4. minimatch — ReDoS (CVE-2026-26996) — **High**

| Field | Value |
|-------|-------|
| **Current** | 3.1.2, 5.1.6, 9.0.5, 10.1.1 (multiple versions) |
| **Fixed** | 10.2.1+ |
| **Files** | `package-lock.json`, `fabricator-mobile/package-lock.json` |

**Note:** minimatch is a transitive dependency of many packages (glob, eslint, tar-fs, readdir-glob, etc.). Direct override may break packages that require older APIs.

**Fix:** Add override in `package.json`:

```json
"overrides": {
  "minimatch": "^10.2.1"
}
```

**Risk:** Some packages may expect minimatch v3/v5 API. Test thoroughly. If breakage occurs, consider:
- Overriding only for specific packages
- Waiting for upstream packages to update
- Using `npm audit fix` to see what it suggests

---

### 5. tar (node-tar) — Hardlink/Symlink (CVE-2026-23745, CVE-2026-24842) — **High**

| Field | Value |
|-------|-------|
| **Current** | 7.5.7 (fabricator-mobile), tar-fs 2.x/3.x in main (uses tar-stream) |
| **Fixed** | 7.5.7+ (CVE-2026-24842); 7.5.3+ (CVE-2026-23745) |
| **File** | `fabricator-mobile/package-lock.json` |

**Note:** Main project uses `tar-fs` and `tar-stream`, not `tar` directly. fabricator-mobile uses `tar` 7.5.7 — verify if that version is patched. CVE-2026-24842 says fixed in 7.5.7; CVE-2026-23745 says 7.5.3. So 7.5.7 should cover both. If fabricator-mobile has 7.5.7, it may already be fixed — confirm with `npm audit` in fabricator-mobile.

---

## pip (Python) Fixes

### 6. Werkzeug — Windows Device Names (CVE-2025-66221 / CVE-2026-27199) — **Moderate**

| Field | Value |
|-------|-------|
| **Current** | 3.1.5 (requirements-prod.txt) |
| **Fixed** | 3.1.6 |
| **File** | `python_backend/requirements-prod.txt` |

**Fix:** Update in requirements-prod.txt:

```
Werkzeug>=3.1.6
```

Or pin: `Werkzeug==3.1.6`

---

### 7. Flask — Vary: Cookie Header (CVE-2026-27205) — **Low**

| Field | Value |
|-------|-------|
| **Current** | 3.1.2 (requirements-prod.txt), 3.0.3 (requirements.txt) |
| **Fixed** | 3.1.3 |
| **Files** | `python_backend/requirements.txt`, `requirements-production.txt`, `requirements-prod.txt` |

**Fix:** Update in all three files:

```
Flask>=3.1.3
```

Or pin: `Flask==3.1.3`

---

## fabricator-mobile Specific

| Package | Alert | Fix |
|---------|-------|-----|
| minimatch | ReDoS | Add override in fabricator-mobile/package.json: `"minimatch": "^10.2.1"` |
| tar | Hardlink/symlink | Verify 7.5.7 is installed; if not, upgrade to 7.5.7+ (or latest) |

---

## Execution Order

1. **Python (quick):**
   - `requirements-prod.txt`: Werkzeug `>=3.1.6`, Flask `>=3.1.3`
   - `requirements.txt`: Flask `>=3.1.3`
   - `requirements-production.txt`: Flask `>=3.1.3`
   - Run: `pip install -r requirements-prod.txt` (or equivalent)

2. **npm main project:**
   - Add overrides: `basic-ftp`, `minimatch`
   - Update: `jspdf`, Storybook packages
   - Run: `npm install`
   - Run: `npm audit` to verify

3. **fabricator-mobile:**
   - Add override for minimatch if needed
   - Run: `cd fabricator-mobile && npm install && npm audit`

4. **Verification:**
   - `npm audit` (main + fabricator-mobile)
   - `pip-audit` or `pip install pip-audit && pip-audit` (Python)

---

## Recommended package.json Changes (Main Project)

```json
{
  "overrides": {
    "basic-ftp": "^5.2.0",
    "minimatch": "^10.2.1",
    "markdown-it": "^14.1.1",
    ...
  },
  "dependencies": {
    "jspdf": "^4.2.0",
    ...
  },
  "devDependencies": {
    "@chromatic-com/storybook": "^9.1.19",
    "@storybook/addon-a11y": "^9.1.19",
    "@storybook/addon-docs": "^9.1.19",
    "@storybook/addon-onboarding": "^9.1.19",
    "@storybook/addon-vitest": "^9.1.19",
    "@storybook/react-vite": "^9.1.19",
    "eslint-plugin-storybook": "^9.1.19",
    "storybook": "^9.1.19",
    ...
  }
}
```

---

## References

- [basic-ftp CVE-2026-27699](https://nvd.nist.gov/vuln/detail/CVE-2026-27699)
- [Storybook CVE-2026-27148](https://github.com/storybookjs/storybook/security/advisories)
- [jsPDF CVE-2026-25535](https://nvd.nist.gov/vuln/detail/CVE-2026-25535)
- [minimatch CVE-2026-26996](https://nvd.nist.gov/vuln/detail/CVE-2026-26996)
- [node-tar CVE-2026-23745](https://nvd.nist.gov/vuln/detail/CVE-2026-23745)
- [Werkzeug CVE-2026-27199](https://nvd.nist.gov/vuln/detail/CVE-2026-27199)
- [Flask CVE-2026-27205](https://nvd.nist.gov/vuln/detail/CVE-2026-27205)
