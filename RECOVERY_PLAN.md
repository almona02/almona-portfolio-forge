# 🛠️ Vite Config Recovery Plan

## Situation
- Made 20+ commits during hardening phase
- Current config is complex and potentially fragile
- Need to restore stability while preserving valuable improvements

## Strategy
1. **Restore stable base** from commit `8a7b779` ("fix: safe default chunk strategy - site works")
2. **Preserve valuable improvements**:
   - Enhanced PWA configuration (Arabic RTL, NetworkOnly API)
   - Worker configuration (if needed)
   - AntD/RC version defines (if fixing errors)
3. **Remove risky optimizations**:
   - Complex chunk splitting
   - Aggressive tree shaking
   - Multiple vendor chunks

## Recovery Steps

### Step 1: Backup Current State ✅
```bash
git branch backup-before-recovery-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Restore Stable Config
```bash
git checkout 8a7b779 -- vite.config.ts
```

### Step 3: Merge Valuable Improvements
- Keep enhanced PWA manifest (Arabic RTL, better caching)
- Keep worker config if needed
- Keep AntD/RC version defines if they fix errors

### Step 4: Test Build
```bash
npm run build
npm run preview
```

### Step 5: Commit Stable State
```bash
git commit -m "chore: restore stable vite.config.ts - revert to safe chunk strategy"
```

## Next Steps (After Stability Restored)
1. Create `feature/build-optimization` branch
2. Apply optimizations ONE AT A TIME
3. Test after each change
4. Commit each successful optimization separately

