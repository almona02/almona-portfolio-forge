# Supabase Migration Files - Quick Reference

## Files to Manually Add in Supabase

All migration files are located in the `migrations/` directory. Apply them **in this exact order**:

### 1. `migrations/004_fabricator_profiles_accessories.sql`
- **Purpose:** Creates fabricator profiles and accessories tables
- **Tables:** 3 tables
- **Functions:** 1 function
- **RLS Policies:** Yes
- **Dependencies:** Requires `profiles` table

### 2. `migrations/005_pricing_configuration.sql`
- **Purpose:** Creates comprehensive pricing system
- **Tables:** 7 tables
- **Functions:** 3 functions
- **RLS Policies:** Yes
- **Dependencies:** Requires Migration 004

### 3. `migrations/006_remnant_management.sql`
- **Purpose:** Creates remnant management and inventory system
- **Tables:** 5 tables
- **Functions:** 4 functions
- **RLS Policies:** Yes
- **Dependencies:** Requires Migration 004

### 4. `migrations/007_supabase_fabricator_schema.sql`
- **Purpose:** Enhanced schema with audit trails and performance monitoring
- **Tables:** 4 tables
- **Functions:** 8 functions
- **RLS Policies:** Yes
- **Dependencies:** Requires Migrations 004, 005, 006

## Quick Copy-Paste Locations

### In Supabase Dashboard:
1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click "New query"
3. Copy entire file content from:
   - `migrations/004_fabricator_profiles_accessories.sql`
   - `migrations/005_pricing_configuration.sql`
   - `migrations/006_remnant_management.sql`
   - `migrations/007_supabase_fabricator_schema.sql`
4. Paste and run each one in order
5. Wait for "Success" confirmation before proceeding to next

## Total Impact

- **Total Tables Created:** 19 tables
- **Total Functions Created:** 16 functions
- **Total Indexes:** 50+ indexes
- **Estimated Migration Time:** ~3-5 minutes
- **RLS Policies:** All tables secured with Row Level Security

## Verification Query

After applying all migrations, run this to verify:

```sql
-- Check all fabricator tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'fabricator%'
ORDER BY table_name;
```

Expected result: 19 tables should be listed.

## Need Help?

See `SUPABASE_MIGRATION_GUIDE.md` for detailed step-by-step instructions.

