# Supabase Storage Bucket Setup - Reports

**Date:** January 2026  
**Purpose:** Setup guide for creating the `reports` storage bucket for Phase 4 Reporting & Analytics

---

## Overview

Phase 4 Reporting & Analytics requires a Supabase Storage bucket named `reports` to store generated PDF, Excel, and CSV files. This bucket should be configured as **private** (signed URLs only) to ensure secure access.

---

## Option 1: Automated Script (Recommended)

A Python script is available to create the bucket programmatically.

### Prerequisites

1. **Environment Variables:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. **Python Dependencies:**
   - `supabase` Python client (already installed)

### Run Script

```bash
cd python_backend
python scripts/create_reports_storage_bucket.py
```

### Expected Output

```
============================================================
Supabase Storage Bucket Creation Script
Bucket: reports
============================================================

Checking if 'reports' bucket exists...
Creating 'reports' bucket...
✅ Bucket 'reports' created successfully

============================================================
✅ Setup Complete
============================================================

Bucket Configuration:
  - Name: reports
  - Access: Private (signed URLs only)
  - Expiration: 7 days (configurable)
  - Supported formats: PDF, Excel (.xlsx), CSV
```

---

## Option 2: Manual Setup via Supabase Dashboard

If the automated script fails or you prefer manual setup:

### Steps

1. **Access Supabase Dashboard**
   - Navigate to your Supabase project dashboard
   - Go to **Storage** section in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button
   - Fill in the bucket configuration:

   **Bucket Details:**
   - **Name:** `reports` (must be exactly "reports")
   - **Public bucket:** ❌ **No** (unchecked - private bucket)
   - **File size limit:** Leave empty (no limit)
   - **Allowed MIME types:** (optional, but recommended)
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `text/csv`

3. **Save Bucket**
   - Click **"Create bucket"** or **"Save"**

4. **Verify Configuration**
   - Bucket should appear in the Storage list
   - Access should be set to "Private"

---

## Bucket Configuration Details

### Required Settings

- **Name:** `reports` (case-sensitive, must match exactly)
- **Public:** ❌ **No** (private bucket)
- **File Size Limit:** None (or set appropriate limit if needed)
- **Allowed MIME Types:** (optional but recommended)
  - `application/pdf` - PDF files
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - Excel files (.xlsx)
  - `text/csv` - CSV files

### Access Pattern

- **Upload:** Service role only (handled by backend)
- **Download:** Signed URLs (expiration: 7 days default)
- **Security:** Private bucket ensures only authenticated users with valid signed URLs can access files

---

## Verification

After creating the bucket, verify it works:

### Test Upload (Optional)

```python
from supabase import create_client
import os

client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Test upload
storage = client.storage.from_("reports")
storage.upload("test/test.txt", b"test content", {"content-type": "text/plain"})

# Generate signed URL
url = storage.create_signed_url("test/test.txt", expires_in=3600)
print(f"Signed URL: {url}")
```

### Expected Behavior

- Upload should succeed
- Signed URL should be generated
- URL should be accessible for the expiration period
- Direct bucket access (without signed URL) should fail

---

## Troubleshooting

### Error: "Bucket already exists"

- **Solution:** Bucket is already created. The script will detect this and report success.

### Error: "Permission denied" or "Unauthorized"

- **Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly (not the anon key)
- **Check:** Service role key should start with `eyJ...` and be longer than the anon key

### Error: "Bucket name is invalid"

- **Solution:** Bucket name must be:
  - Lowercase letters, numbers, and hyphens only
  - Must start with a letter
  - Must be 3-63 characters long
  - "reports" meets all requirements

### Script Fails but Bucket Works

- **Solution:** This is acceptable. The script may fail due to API limitations, but if the bucket exists and is configured correctly, the application will work.

---

## Integration with Phase 4

The `reports` bucket is used by:

1. **Report Generation Service** (`python_backend/apis/v2/services/report_generation_service.py`)
   - Creates report generation jobs
   - Triggers Celery task for file generation

2. **Report Generation Celery Task** (`python_backend/tasks/report_tasks.py`)
   - Generates PDF/Excel/CSV files
   - Uploads files to `reports/{job_id}.{format}`
   - Updates job with signed URL

3. **Storage Service** (`python_backend/apis/v2/utils/storage_service.py`)
   - Handles file upload to Supabase Storage
   - Generates signed URLs with expiration
   - Returns download URL and expiration timestamp

---

## Security Considerations

- ✅ **Private Bucket:** Files are not publicly accessible
- ✅ **Signed URLs:** Time-limited access (7 days default)
- ✅ **Service Role:** Only backend (service role) can upload
- ✅ **RLS Policies:** Row Level Security on `report_generation_jobs` table ensures users can only access their own reports

---

## Next Steps

After bucket setup:

1. ✅ Verify bucket exists and is configured correctly
2. ✅ Test report generation workflow
3. ✅ Verify signed URLs work correctly
4. ✅ Test file download from frontend

---

**Last Updated:** January 2026  
**Status:** ✅ Setup Guide Complete
