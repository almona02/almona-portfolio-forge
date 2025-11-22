# Supabase Migration Guide - Last 24 Hours

This guide provides step-by-step instructions for migrating the new database schema files to your Supabase project.

## Migration Files to Apply

The following migration files have been created in the last 24 hours and need to be applied to Supabase **in order**:

### 1. Migration 004: Fabricator Profiles and Accessories
**File:** `migrations/004_fabricator_profiles_accessories.sql`

**What it creates:**
- `fabricator_profiles` - User-defined window profiles with material specifications
- `fabricator_accessories` - User-defined hardware and accessories catalog
- `profile_accessory_compatibility` - Compatibility matrix linking profiles to accessories
- Helper function: `get_low_stock_profiles()`
- Row Level Security (RLS) policies for all tables

**Dependencies:** Requires `profiles` table (from earlier migrations)

### 2. Migration 005: Pricing Configuration System
**File:** `migrations/005_pricing_configuration.sql`

**What it creates:**
- `pricing_configurations` - User-specific pricing settings with multi-currency support
- `material_pricing_rules` - Material and profile-specific pricing rules
- `labor_cost_configurations` - Labor cost configurations by operation type
- `price_history` - Complete audit trail of all price changes
- `exchange_rate_cache` - Cached exchange rates for multi-currency pricing
- `price_validation_alerts` - Alerts for price validation issues
- `bulk_price_imports` - Log of bulk price update operations
- Helper functions: `calculate_final_price()`, `get_active_pricing_config()`, `log_price_change()`
- Row Level Security (RLS) policies for all tables

**Dependencies:** Requires `fabricator_profiles` table (from Migration 004)

### 3. Migration 006: Remnant Management & Enhanced Inventory
**File:** `migrations/006_remnant_management.sql`

**What it creates:**
- `inventory_locations` - Multi-location inventory support
- `material_remnants` - Tracks leftover materials from cutting operations
- `stock_movements` - Complete audit trail of all stock movements
- `stock_alerts` - Automated stock alerts with reorder suggestions
- `remnant_utilization_analytics` - Analytics for remnant utilization
- Helper functions: 
  - `create_remnant_from_cut()` - Automatically creates remnants from cutting waste
  - `use_remnant()` - Marks a remnant as used
  - `check_stock_levels()` - Checks and creates stock alerts
  - `get_remnant_consolidation_suggestions()` - Suggests consolidation opportunities
- Row Level Security (RLS) policies for all tables

**Dependencies:** Requires `fabricator_profiles` table (from Migration 004)

### 4. Migration 007: Supabase Fabricator Schema Enhancement
**File:** `migrations/007_supabase_fabricator_schema.sql`

**What it creates:**
- `fabricator_audit_logs` - Comprehensive audit trail for all operations
- `fabricator_backup_snapshots` - Backup snapshots for fabricator data
- `fabricator_backup_operations` - Log of backup and restore operations
- `fabricator_query_metrics` - Performance metrics for database queries
- Enhanced indexes for existing tables
- Audit triggers for automatic change tracking
- Helper functions:
  - `create_fabricator_backup()` - Creates backup snapshots
  - `restore_fabricator_backup()` - Restores from backup
  - `cleanup_expired_backups()` - Removes expired backups
  - `analyze_fabricator_tables()` - Analyzes table statistics
  - `get_slow_queries()` - Returns slow query metrics
  - `maintain_fabricator_tables()` - Performs VACUUM and ANALYZE
  - `cleanup_old_audit_logs()` - Removes old audit logs
  - `cleanup_old_query_metrics()` - Removes old query metrics
- Row Level Security (RLS) policies for all tables

**Dependencies:** Requires all previous migrations (004, 005, 006)

## How to Apply Migrations in Supabase

### Method 1: Using Supabase Dashboard (Recommended)

1. **Log in to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Apply Migrations in Order**
   - Copy the entire contents of `migrations/004_fabricator_profiles_accessories.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for success confirmation
   - Repeat for migrations 005, 006, and 007 in that exact order

4. **Verify Migration Success**
   - Check the "Table Editor" to see if new tables appear
   - Look for tables like `fabricator_profiles`, `fabricator_accessories`, etc.

### Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/almona-portfolio-forge

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Apply migrations in order
supabase db push migrations/004_fabricator_profiles_accessories.sql
supabase db push migrations/005_pricing_configuration.sql
supabase db push migrations/006_remnant_management.sql
supabase db push migrations/007_supabase_fabricator_schema.sql
```

### Method 3: Using psql (Direct Database Connection)

If you have direct database access:

```bash
# Get your database connection string from Supabase Dashboard
# Settings > Database > Connection string

# Apply each migration
psql "your-connection-string" -f migrations/004_fabricator_profiles_accessories.sql
psql "your-connection-string" -f migrations/005_pricing_configuration.sql
psql "your-connection-string" -f migrations/006_remnant_management.sql
psql "your-connection-string" -f migrations/007_supabase_fabricator_schema.sql
```

## Important Notes

### Migration Order is Critical
⚠️ **DO NOT skip or reorder migrations.** They must be applied in this exact sequence:
1. 004 → 005 → 006 → 007

### Error Handling
- If a migration fails, check the error message
- Common issues:
  - Missing dependencies (apply previous migrations first)
  - Extension not enabled (migrations include `CREATE EXTENSION IF NOT EXISTS`)
  - Permission issues (check RLS policies)

### Testing After Migration
After applying all migrations, verify:

1. **Tables Created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'fabricator%'
   ORDER BY table_name;
   ```

2. **Functions Created:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE '%fabricator%'
   ORDER BY routine_name;
   ```

3. **RLS Enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename LIKE 'fabricator%';
   ```

### Rollback Instructions
If you need to rollback (not recommended in production):

1. **Backup First:**
   ```sql
   -- Use the backup function created in migration 007
   SELECT create_fabricator_backup(
     auth.uid(),
     'pre_rollback_backup',
     'manual',
     'Backup before rollback'
   );
   ```

2. **Drop Tables (in reverse order):**
   ```sql
   -- Drop in reverse order: 007 → 006 → 005 → 004
   DROP TABLE IF EXISTS public.fabricator_query_metrics CASCADE;
   DROP TABLE IF EXISTS public.fabricator_backup_operations CASCADE;
   DROP TABLE IF EXISTS public.fabricator_backup_snapshots CASCADE;
   DROP TABLE IF EXISTS public.fabricator_audit_logs CASCADE;
   -- ... continue for all tables
   ```

## Post-Migration Checklist

- [ ] All 4 migrations applied successfully
- [ ] Tables visible in Supabase Table Editor
- [ ] RLS policies active (check in Authentication > Policies)
- [ ] Test creating a profile (should work with RLS)
- [ ] Test creating an accessory (should work with RLS)
- [ ] Verify functions are callable
- [ ] Check that indexes are created (in Database > Indexes)

## Support

If you encounter issues:
1. Check the error message in Supabase SQL Editor
2. Verify all previous migrations are applied
3. Check Supabase logs in Dashboard > Logs > Postgres Logs
4. Ensure your user has proper permissions

## Migration Summary

| Migration | Tables Created | Functions Created | Estimated Time |
|-----------|---------------|-------------------|----------------|
| 004 | 3 | 1 | ~30 seconds |
| 005 | 7 | 3 | ~45 seconds |
| 006 | 5 | 4 | ~40 seconds |
| 007 | 4 | 8 | ~60 seconds |
| **Total** | **19** | **16** | **~3 minutes** |

---

**Last Updated:** $(date)
**Migration Files Location:** `migrations/` directory

