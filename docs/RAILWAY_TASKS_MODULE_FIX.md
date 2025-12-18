# Railway Tasks Module Fix

## Problem
Railway health checks were failing with:
```
ModuleNotFoundError: No module named 'tasks'
```

## Root Cause
The `tasks/` directory and `celery_app.py` (root-level) were not being copied into the Docker image, but they are imported by:
- `apis/v2/app.py` - imports `from tasks.monitoring_tasks import ...`
- `apis/v2/quotes.py` - imports `from tasks.erp_tasks import dispatch_invoice_task`
- `celery_app.py` - includes tasks from the `tasks/` directory

Since `apis/v2/app.py` is imported by `apis/main.py` at startup, the import fails immediately.

## Solution
Updated `python_backend/Dockerfile.realistic` to include:
```dockerfile
COPY tasks/ tasks/
COPY celery_app.py celery_app.py
```

## Files Changed
- `python_backend/Dockerfile.realistic` - Added `tasks/` and `celery_app.py` to COPY commands

## Additional Notes

### Locale Warning (Non-Critical)
```
bash: warning: setlocale: LC_ALL: cannot change locale (ar_EG.UTF-8): No such file or directory
```
This is a warning, not an error. The locale is generated in the Dockerfile, but bash may still show this warning. It doesn't prevent the service from starting.

### Pydantic Warning (Non-Critical)
```
UserWarning: Field "model_version" in ModelInfo has conflict with protected namespace "model_".
```
This is a Pydantic warning about field naming. It doesn't prevent the service from starting. To fix, set `model_config['protected_namespaces'] = ()` in the affected model.

## Testing
After this fix, Railway should:
1. ✅ Build successfully (no missing module errors)
2. ✅ Start the service (uvicorn starts correctly)
3. ✅ Pass health checks (service responds to `/health`)

## Next Steps
1. Push the updated Dockerfile to trigger Railway rebuild
2. Monitor Railway logs to confirm service starts successfully
3. Verify health checks pass
4. Test API endpoints to ensure full functionality

