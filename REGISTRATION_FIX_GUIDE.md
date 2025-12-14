# User Registration Database Error - Fix Guide

## Problem
Users were getting database errors when trying to register because the database trigger wasn't saving all the user metadata fields (company_name, phone, sector).

## Solution Applied

### 1. Code Changes (Already Applied)
- ✅ Updated `src/context/AuthContext.tsx` with improved error handling
- ✅ Added manual profile creation fallback if trigger fails
- ✅ Improved error messages in `src/pages/Register.tsx`
- ✅ Updated database schema files with fixed trigger

### 2. Database Migrations (NEEDS TO BE RUN)

You **MUST** run these two migrations in your Supabase SQL Editor:

#### Migration 1: Fix Trigger Function
**File:** `migrations/013_fix_user_registration_trigger.sql`

This updates the trigger to save all user metadata fields.

#### Migration 2: Add INSERT Policy
**File:** `migrations/014_add_profiles_insert_policy.sql`

This adds an INSERT policy so users can create their own profile if the trigger fails.

## How to Run Migrations

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run Migration 013**
   - Copy the contents of `migrations/013_fix_user_registration_trigger.sql`
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Verify success message

3. **Run Migration 014**
   - Copy the contents of `migrations/014_add_profiles_insert_policy.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Verify success message

## Testing After Migration

1. Try registering a new user with:
   - Full name
   - Email
   - Password
   - Company name (optional)
   - Phone number
   - Sector selection

2. Verify in Supabase:
   - Go to **Table Editor** → `profiles` table
   - Check that the new user's profile has all fields populated

3. Test Login:
   - Try logging in with the newly registered user
   - Should work without errors

## Fallback Behavior

Even if migrations aren't run yet, the code now includes:
- Manual profile creation if trigger fails
- Better error messages
- Automatic retry logic

However, **you should still run the migrations** for the best experience.

## Troubleshooting

### If registration still fails after migrations:

1. **Check Supabase Logs**
   - Go to **Logs** → **Postgres Logs**
   - Look for errors related to `handle_new_user` function

2. **Verify Trigger Exists**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Check RLS Policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

4. **Test Trigger Manually**
   ```sql
   -- Check if function exists
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```

### Common Issues

- **"relation does not exist"**: Table `profiles` might not exist - run initial schema migration
- **"permission denied"**: RLS policies might be blocking - check policies
- **"function does not exist"**: Trigger function not created - run migration 013
- **"duplicate key"**: User already exists - try logging in instead

## Support

If issues persist after running migrations:
1. Check browser console for detailed error messages
2. Check Supabase logs for database errors
3. Verify all migrations have been run successfully

