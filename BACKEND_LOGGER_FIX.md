# 🔧 Backend Logger Fix - job_id Error

## Problem
Backend error when using SmartScan:
```
Logger._log() got an unexpected keyword argument 'job_id'
```

## Root Cause
In `python_backend/apis/v2/smart_scan.py` line 120-123, the logger was called with keyword arguments directly:
```python
logger.info("Smart scan single job enqueued",
           job_id=task.id,  # ❌ Wrong - Python logger doesn't accept arbitrary kwargs
           filename=file.filename,
           file_size_bytes=len(content))
```

Python's standard `logging.Logger` doesn't accept arbitrary keyword arguments. It only accepts:
- `msg` (the message)
- `args` (formatting arguments)
- `exc_info`, `stack_info`, `stacklevel` (special kwargs)
- `extra` (dict for custom fields)

## ✅ Fix Applied

Changed to use `extra={}` dictionary (like in `heavy_optimization.py`):
```python
logger.info(
    f"Smart scan single job enqueued: job_id={task.id}, "
    f"filename={file.filename}, file_size_bytes={len(content)}",
    extra={"job_id": task.id, "filename": file.filename, "file_size_bytes": len(content)}
)
```

## 🚀 Next Steps

1. **Restart Railway backend** (or wait for auto-deploy if using Git)
2. **Test SmartScan** - should work now
3. **But remember**: Use **DXF Direct Import** for DXF files (no Celery needed!)

## 📝 Note

This fix allows SmartScan to work, but for DXF files, you should still use the **DXF/DWG Direct Import** section in Profile Tuning Studio (green card) which:
- ✅ Works immediately (synchronous)
- ✅ No Celery/Redis required
- ✅ Shows SVG preview instantly
- ✅ Extracts dimensions on the spot

