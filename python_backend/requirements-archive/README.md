# Archived Requirements Files

**Date:** January 2025  
**Purpose:** Archive legacy/unused requirements files

---

## Archived Files

### `requirements-production.txt` → Replaced by `requirements-prod.txt`
**Reason:** Older versions, replaced by newer `requirements-prod.txt`  
**Status:** Still referenced by `requirements-ci.txt` (updated to use `requirements-prod.txt`)

### `requirements-enhanced.txt` → Merged into `requirements.txt`
**Reason:** Contents merged into base requirements.txt  
**Status:** No longer needed as separate file

### `requirements-optimized.txt` → Review needed
**Reason:** Check if used by Dockerfile.optimized  
**Status:** Under review

### `requirements-minimal.txt` → Review needed
**Reason:** Check if used for lightweight builds  
**Status:** Under review

### `requirements-simple.txt` → Review needed
**Reason:** Check if still needed  
**Status:** Under review

### `requirements_fixed.txt` → Legacy
**Reason:** Likely legacy file, no longer needed  
**Status:** Archive

### `requirements-runtime.txt` → Review needed
**Reason:** Check if different from `requirements-prod.txt`  
**Status:** Under review (used by production.yml workflow)

---

## Migration Notes

- `requirements-ci.txt` now uses `requirements-prod.txt` instead of `requirements-production.txt`
- `README.md` updated to use `requirements-dev.txt` instead of `requirements-enhanced.txt`
- Essential files kept: `requirements.txt`, `requirements-prod.txt`, `requirements-dev.txt`, `requirements-ci.txt`

---

**Status:** Archive created  
**Action:** Files can be moved here after verification

