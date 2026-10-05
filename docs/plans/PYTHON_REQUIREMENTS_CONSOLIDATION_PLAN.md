# Python Requirements Consolidation Plan

**Date:** January 2025  
**Task:** Task 1.2 - Unify Python Requirements Management  
**Priority:** MEDIUM - Environment consistency

## Current State Analysis

### Requirements Files Found (12 files)

| File | Purpose | Status | Used By |
|------|---------|--------|---------|
| `requirements.txt` | Base/core dependencies | ✅ Primary | Default, most Dockerfiles |
| `requirements-prod.txt` | Production dependencies | ✅ Active | Production Dockerfiles |
| `requirements-dev.txt` | Development dependencies | ✅ Active | Local development |
| `requirements-ci.txt` | CI/CD dependencies | ✅ Active | GitHub Actions |
| `requirements-enhanced.txt` | Enhanced features | ⚠️ Review | Some setups |
| `requirements-optimized.txt` | Optimized build | ⚠️ Review | Some Dockerfiles |
| `requirements-minimal.txt` | Minimal dependencies | ⚠️ Review | Lightweight builds |
| `requirements-production.txt` | Production (alt) | ⚠️ Duplicate? | Check usage |
| `requirements-runtime.txt` | Runtime only | ⚠️ Review | Container runtime |
| `requirements-simple.txt` | Simplified | ⚠️ Review | Alternative setup |
| `requirements_fixed.txt` | Fixed version | ⚠️ Legacy? | Check if still used |
| `sdk/python/requirements.txt` | SDK dependencies | ✅ Keep | SDK package |

## Recommended Consolidation Strategy

### Phase 1: Keep Essential Files (No Breaking Changes)

**Keep These Files:**
1. ✅ `requirements.txt` - Base/core dependencies (primary)
2. ✅ `requirements-prod.txt` - Production (used by Dockerfiles)
3. ✅ `requirements-dev.txt` - Development (local setup)
4. ✅ `requirements-ci.txt` - CI/CD (GitHub Actions)
5. ✅ `sdk/python/requirements.txt` - SDK (separate package)

### Phase 2: Audit and Consolidate

**Files to Review:**
- `requirements-enhanced.txt` - Check if still needed
- `requirements-optimized.txt` - Merge into prod if similar
- `requirements-minimal.txt` - Keep if used for lightweight builds
- `requirements-production.txt` - Likely duplicate of `requirements-prod.txt`
- `requirements-runtime.txt` - Keep if used for runtime-only containers
- `requirements-simple.txt` - Review and potentially remove
- `requirements_fixed.txt` - Likely legacy, archive if not used

### Phase 3: Documentation

**Create:**
- `python_backend/REQUIREMENTS.md` - Documentation explaining each file's purpose
- Update `README.md` with requirements file usage guide

## Implementation Plan

### Step 1: Verify Current Usage
1. Check all Dockerfiles for which requirements file they use
2. Check CI/CD workflows for requirements file references
3. Check documentation for requirements file mentions
4. Check if any scripts reference specific requirements files

### Step 2: Create Consolidated Structure
```
python_backend/
├── requirements.txt          # Base/core (keep)
├── requirements-prod.txt     # Production (keep)
├── requirements-dev.txt      # Development (keep)
├── requirements-ci.txt       # CI/CD (keep)
├── requirements-minimal.txt  # Minimal (keep if needed)
└── REQUIREMENTS.md           # Documentation (new)
```

### Step 3: Archive Legacy Files
- Move unused files to `python_backend/requirements-archive/`
- Add deprecation notices if files are still referenced

### Step 4: Update Documentation
- Update README.md with requirements file guide
- Update Dockerfiles if needed
- Update CI/CD workflows if needed

## Risk Assessment

**Low Risk:**
- Keeping essential files (requirements.txt, requirements-prod.txt, requirements-dev.txt, requirements-ci.txt)
- Creating documentation

**Medium Risk:**
- Removing files that might be referenced in scripts
- Consolidating similar files

**Mitigation:**
- Thorough audit before removal
- Archive instead of delete
- Update all references before removal

## Success Criteria

- ✅ Clear structure with 4-5 essential requirements files
- ✅ All Dockerfiles and CI/CD workflows use correct files
- ✅ Documentation explains each file's purpose
- ✅ No breaking changes to production
- ✅ Legacy files archived (not deleted)

---

**Status:** Planning Phase  
**Next Step:** Execute Step 1 (Verify Current Usage)

