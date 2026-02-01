# Verify and Test Reports Storage Bucket

**Date:** January 2026  
**Purpose:** Guide to verify and test the `reports` Supabase Storage bucket

---

## Quick Verification

After creating the bucket manually in Supabase Dashboard, you can verify it's set up correctly using the test script.

---

## Option 1: Automated Test Script (Recommended)

### Prerequisites

1. **Environment Variables:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. **Python Dependencies:**
   - `supabase` Python client (already installed)

### Run Test Script

```bash
cd python_backend
python scripts/test_reports_storage_bucket.py
```

### Expected Output

```
============================================================
Supabase Storage Bucket Verification Script
Bucket: reports
============================================================

============================================================
Test 1: Check if bucket exists
============================================================
[OK] Bucket 'reports' exists
   Bucket ID: reports
   Public: False
   Created: 2026-01-XX...
[OK] Bucket is private (correct)

============================================================
Test 2: Upload test file
============================================================
Uploading to: test/verification.txt
[OK] File uploaded successfully

============================================================
Test 3: Generate signed URL
============================================================
Generating signed URL for: test/verification.txt
[OK] Signed URL generated successfully
   URL: https://your-project.supabase.co/storage/v1/object/sign/...
   Expires in: 1 hour

============================================================
Test 4: List files in bucket
============================================================
[OK] Found 1 file(s) in test/ directory
   - verification.txt

============================================================
Cleanup: Remove test files
============================================================
[OK] Test file removed

============================================================
Test Summary
============================================================
[PASS] Bucket Exists
[PASS] Upload File
[PASS] Signed URL Generation
[PASS] File Listing

[OK] All tests passed!

Bucket is configured correctly and ready for use.
```

---

## Option 2: Manual Verification via Dashboard

### Step 1: Check Bucket Exists

1. Go to Supabase Dashboard → **Storage**
2. Look for bucket named `reports` in the list
3. Verify:
   - ✅ Name is exactly `reports`
   - ✅ Access shows "Private" (not "Public")
   - ✅ Bucket is listed and accessible

### Step 2: Verify Bucket Settings

1. Click on the `reports` bucket
2. Check the bucket settings:
   - ✅ **Public:** Should be unchecked/disabled
   - ✅ **File size limit:** Can be empty or set to a limit
   - ✅ **Allowed MIME types:** Optional (can be empty or include PDF/Excel/CSV types)

---

## Option 3: Manual API Test (Python)

If you want to test manually using Python:

```python
from supabase import create_client
import os

# Get credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Create client
client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Test 1: List buckets (verify bucket exists)
buckets = client.storage.list_buckets()
reports_bucket = next((b for b in buckets if b.name == "reports"), None)
print(f"Bucket exists: {reports_bucket is not None}")
print(f"Bucket is private: {not reports_bucket.public}")

# Test 2: Upload a test file
storage = client.storage.from_("reports")
test_content = b"Test file content"
storage.upload("test/verify.txt", test_content, {"content-type": "text/plain"})
print("Upload successful")

# Test 3: Generate signed URL
signed_url_response = storage.create_signed_url("test/verify.txt", expires_in=3600)
print(f"Signed URL: {signed_url_response}")

# Test 4: List files
files = storage.list("test")
print(f"Files in test/: {len(files)}")

# Cleanup
storage.remove(["test/verify.txt"])
print("Cleanup complete")
```

---

## What the Tests Verify

### Test 1: Bucket Exists
- ✅ Bucket is created and accessible
- ✅ Bucket name is correct (`reports`)
- ✅ Bucket is private (not public)

### Test 2: Upload File
- ✅ Service role client can upload files
- ✅ Files can be stored in the bucket
- ✅ Upload permissions are correct

### Test 3: Signed URL Generation
- ✅ Signed URLs can be generated
- ✅ URLs are formatted correctly
- ✅ Expiration is set correctly

### Test 4: File Listing
- ✅ Files can be listed in the bucket
- ✅ Directory structure works correctly

---

## Troubleshooting

### Test 1 Fails: Bucket Not Found

**Error:** `[FAIL] Bucket 'reports' not found`

**Solutions:**
1. Check bucket name is exactly `reports` (case-sensitive)
2. Verify bucket was created successfully in dashboard
3. Check you're using the correct Supabase project URL

### Test 2 Fails: Upload Error

**Error:** `[FAIL] Error uploading file: Permission denied`

**Solutions:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
2. Check service role key is correct
3. Verify Storage API is enabled in Supabase project settings

### Test 3 Fails: Signed URL Error

**Error:** `[FAIL] Error generating signed URL`

**Solutions:**
1. Verify file was uploaded successfully (check Test 2)
2. Check file path is correct
3. Verify bucket is private (signed URLs only work with private buckets)

### All Tests Pass but Application Still Fails

**Possible Causes:**
1. Bucket name mismatch (check exact spelling: `reports`)
2. Environment variables not set in application environment
3. Application using wrong Supabase client (should use service role for uploads)
4. RLS policies blocking access (check database policies)

---

## Integration Testing

After verification, test the full integration:

### Test Report Generation Workflow

1. **Generate a Report via API:**
   ```bash
   curl -X POST https://your-api.com/api/v2/reports/generate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "report_type": "revenue",
       "report_data": {"period": "monthly"},
       "format": "pdf"
     }'
   ```

2. **Check Job Status:**
   ```bash
   curl https://your-api.com/api/v2/reports/{job_id} \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Verify File in Bucket:**
   - Check Supabase Dashboard → Storage → reports bucket
   - Should see file: `reports/{job_id}.pdf`

4. **Test Download:**
   - Use the `download_url` from job status
   - Should be able to download the file
   - URL should expire after 7 days

---

## Next Steps After Verification

Once all tests pass:

1. ✅ **Bucket is configured correctly**
2. ✅ **Ready for report generation**
3. ✅ **Can proceed with integration testing**
4. ✅ **Can deploy to production**

---

**Last Updated:** January 2026  
**Status:** ✅ Verification Guide Complete
