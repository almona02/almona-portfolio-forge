# 🔑 Railway Environment Variables - Where to Set Them

**Quick clarification on where environment variables go**

---

## ✅ Correct Location: Backend Service (almona-portfolio-forge)

**Set environment variables in:**
- **Settings → Variables** of the **almona-portfolio-forge service** (your backend service)
- **NOT** in the PostgreSQL service

---

## 📋 Two Ways to Set Variables

### Option 1: Service-Level Variables (Recommended)
**Location:** Your backend service → Settings → Variables

**Why:** Variables are specific to your backend service

### Option 2: Project-Level Variables (Also Works)
**Location:** Project → Variables (shared across all services)

**Why:** If you set them at project level, they're inherited by all services

---

## ✅ If You Already Set Them in Project Variables

**That's fine!** Project-level variables work and are inherited by all services.

**However, verify:**
1. Go to your **backend service** (almona-portfolio-forge)
2. Go to **Settings → Variables**
3. Check if the variables are visible there (they should be if set at project level)

---

## 🔗 DATABASE_URL - Special Case

### Option A: Auto-Reference (Best)
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**How it works:**
- Railway automatically references the PostgreSQL service
- Updates automatically if database changes
- **Set this in your backend service variables**

### Option B: Manual Copy
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**How to get it:**
1. Go to PostgreSQL service
2. Go to **Settings → Variables**
3. Copy the `DATABASE_URL` value
4. Paste it in your backend service variables

---

## ✅ Quick Verification

### Check Your Setup:

1. **Go to:** Your backend service (almona-portfolio-forge)
2. **Go to:** Settings → Variables
3. **Verify these are present:**
   - ✅ `DATABASE_URL` (either `${{Postgres.DATABASE_URL}}` or manual connection string)
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_KEY`
   - ✅ `SECRET_KEY`
   - ✅ `TZ=Africa/Cairo`
   - ✅ `LANG=ar_EG.UTF-8`
   - ✅ `LC_ALL=ar_EG.UTF-8`

---

## 🎯 Summary

**Where to set:**
- ✅ **Backend service** (almona-portfolio-forge) → Settings → Variables
- ❌ **NOT** PostgreSQL service

**If you set at project level:**
- ✅ That works too! Variables are inherited
- ✅ Just verify they're visible in your backend service

**DATABASE_URL:**
- ✅ Use `${{Postgres.DATABASE_URL}}` (auto-reference)
- ✅ OR manually copy from PostgreSQL service

---

## ✅ You're Good If:

- Variables are set in **project variables** OR **backend service variables**
- `DATABASE_URL` is set (either auto-reference or manual)
- All other variables are present

**If you've already set them in project variables, you're all set!** 🎉
