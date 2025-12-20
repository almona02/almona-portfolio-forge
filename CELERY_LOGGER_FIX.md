# 🔧 Celery Task Logger Fix - filename Error

## Problem
Backend error when using SmartScan:
```
Failed to enqueue scan job: "Attempt to overwrite 'filename' in LogRecord"
```

## Root Cause
In `python_backend/tasks/heavy_computation_tasks.py`, the `smart_scan_single_task` function was using `filename` as a keyword argument to the logger:

**Line 193-195:**
```python
logger.info("Starting smart scan single task",
           task_id=self.request.id,
           filename=filename)  # ❌ Wrong - 'filename' is reserved in LogRecord
```

**Line 240-243:**
```python
logger.error("Smart scan single failed",
            task_id=self.request.id,
            filename=filename,  # ❌ Wrong
            error=str(e))
```

Python's `logging.LogRecord` has a reserved `filename` attribute (the source file name where the log was called), so you cannot use it as a custom field in the `extra` dictionary or as a keyword argument.

## ✅ Fix Applied

Changed to include filename in the message string instead:

**Before:**
```python
logger.info("Starting smart scan single task",
           task_id=self.request.id,
           filename=filename)
```

**After:**
```python
logger.info(f"Starting smart scan single task: task_id={self.request.id}, file_name={filename}",
           task_id=self.request.id)
```

Same fix applied to the error logging.

## 🚀 Next Steps

1. **Deploy to Railway** - The fix is in `python_backend/tasks/heavy_computation_tasks.py`
2. **Restart Railway backend** (or wait for auto-deploy if using Git)
3. **Test SmartScan** - Should work now without logger errors

## 📝 Note

This was the second location causing the error:
1. ✅ Fixed: `python_backend/apis/v2/smart_scan.py` (API endpoint)
2. ✅ Fixed: `python_backend/tasks/heavy_computation_tasks.py` (Celery task)

Both locations were trying to use `filename` as a logger keyword argument, which conflicts with Python's reserved `LogRecord.filename` attribute.

