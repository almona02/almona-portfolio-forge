# 🚀 Vercel Deployment via Git

**Deploy almona-portfolio-forge to Vercel using GitHub integration.**

---

## 📋 Prerequisites

- [ ] GitHub account with repo: `almona02/almona-portfolio-forge`
- [ ] [Vercel account](https://vercel.com) (free tier works)
- [ ] Supabase project (for auth/data)
- [ ] Backend API deployed (Railway/Render) — optional for static features

---

## ⚡ Quick Setup (First-Time)

### 1. Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. **Import Git Repository** → Select `almona02/almona-portfolio-forge`
3. Vercel auto-detects:
   - **Framework:** Vite
   - **Build Command:** `npm run build` (from `vercel.json`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

### 2. Configure Project

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (leave default) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |
| **Node.js Version** | 20.x (from `package.json` engines) |

### 3. Set Environment Variables

Before first deploy, add in **Settings → Environment Variables**:

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key

# Required if using backend features (DXF, API)
VITE_API_URL=https://your-backend.railway.app

# Optional
VITE_VERCEL=true
VITE_ENABLE_ANALYTICS=true
```

See `docs/VERCEL_ENVIRONMENT_VARIABLES.md` for full list.

### 4. Deploy

Click **Deploy** — Vercel builds and deploys from your default branch.

---

## 🔄 Deploy via Git (Ongoing)

### Automatic Deployments

| Branch | Trigger | URL |
|--------|---------|-----|
| `main` | Push to `main` | `https://your-project.vercel.app` (Production) |
| `staging/*` | Push to branch | `https://your-project-git-staging-fabricator-v2-studio-consolidation-*.vercel.app` (Preview) |
| PR | Open/update PR | Preview URL per PR |

### Deploy Production (main)

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Push — Vercel auto-deploys
git push origin main
```

### Deploy from Staging Branch

```bash
# Push your branch — Vercel creates a Preview deployment
git push origin staging/fabricator-v2-studio-consolidation
```

### Promote Preview to Production

1. Go to **Vercel Dashboard** → **Deployments**
2. Find the Preview deployment you want
3. Click **⋯** → **Promote to Production**

---

## 📂 Branch Strategy

| Branch | Use Case |
|--------|----------|
| `main` | Production — auto-deploys to production URL |
| `staging/*` | Staging/feature branches — Preview URLs |
| PRs | Each PR gets a unique Preview URL |

**Current setup:** Your repo uses `staging/fabricator-v2-studio-consolidation`. To deploy this to production:

1. Merge to `main`: `git checkout main && git merge staging/fabricator-v2-studio-consolidation && git push origin main`
2. Or promote the Preview deployment in Vercel Dashboard

---

## 🔧 Vercel Configuration

Your `vercel.json` already configures:

- **Framework:** Vite
- **Build:** `npm run build`
- **Output:** `dist`
- **SPA rewrites** for `/fabricator`, `/ydt`, `/products`, etc.
- **Headers** for PWA, cache, security
- **Clean URLs** (no `.html`)

No changes needed unless you add new routes.

---

## ✅ Post-Deploy Checklist

- [ ] Visit production URL — app loads
- [ ] Check browser console (F12) — no errors
- [ ] Test Supabase auth (login/signup)
- [ ] Test API calls (if `VITE_API_URL` set)
- [ ] Verify PWA manifest: `/manifest.webmanifest`
- [ ] Test key routes: `/fabricator`, `/products`, `/ydt`

---

## 🚨 Troubleshooting

### Build fails

- **Node version:** Ensure Vercel uses Node 20+ (Settings → General → Node.js Version)
- **Memory:** Large builds may need Pro plan for more memory
- **Logs:** Check build logs in Vercel Dashboard for specific errors

### 404 on routes

- `vercel.json` rewrites should handle SPA routing
- If new routes added, add to `rewrites` in `vercel.json`

### Env vars not working

- Must start with `VITE_` for client-side access
- **Redeploy** after adding/changing variables
- Check variable is set for correct environment (Production/Preview)

### CORS errors

- Ensure backend `VITE_API_URL` allows your Vercel domain
- Add `*.vercel.app` to backend CORS if needed

---

## 📚 Related Docs

- **Environment Variables:** `docs/VERCEL_ENVIRONMENT_VARIABLES.md`
- **Quick Deploy:** `DEPLOY_NOW.md`
- **Backend Setup:** `docs/BACKEND_DEPLOYMENT_OPTIONS.md`
