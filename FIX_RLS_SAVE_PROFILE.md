# Fix RLS Policy Violation When Saving Profiles

## Problem

When saving imported DXF profiles, users get:
```
new row violates row-level security policy for table "fabricator_profiles"
```

## Root Cause

The RLS policy for `fabricator_profiles` requires:
```sql
auth.uid() IS NOT NULL AND user_id = auth.uid()
```

The issue occurs when:
1. The `userId` prop doesn't match the authenticated user's ID
2. The session is not properly verified before insert
3. The `user_id` field in the insert doesn't match `auth.uid()`

## Solution

### 1. Verify Session Before Insert

Always verify the user session and use the authenticated user's ID:

```typescript
// Verify user session and get authenticated user ID
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session?.user) {
  throw new Error('User not authenticated. Please log in again.');
}

// Use authenticated user ID to satisfy RLS policy
const authenticatedUserId = session.user.id;
profileData.user_id = authenticatedUserId;
```

### 2. Better Error Messages

Provide helpful error messages for RLS violations:

```typescript
if (saveError.code === '42501' || saveError.message?.includes('row-level security')) {
  throw new Error('Permission denied: Unable to save profile. Please ensure you are logged in and have the correct permissions.');
}
```

## Changes Made

1. **`src/components/fabricator/smartscan/DXFProfileImporter.tsx`**:
   - Added session verification before insert
   - Use authenticated user ID from session instead of prop
   - Added better error handling for RLS violations
   - Use detected role from profile metadata if available

## Testing

1. Import a DXF file
2. Click "Save to Library"
3. Confirm the profile saves successfully
4. Verify the profile appears in the library with correct `user_id`

## RLS Policy Reference

The policy is defined in `migrations/015_fix_fabricator_profiles_insert_policy.sql`:

```sql
CREATE POLICY "auth_insert_profiles" ON public.fabricator_profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
```

This ensures:
- User must be authenticated (`auth.uid() IS NOT NULL`)
- User can only insert profiles with their own `user_id` (`user_id = auth.uid()`)

## Additional Notes

- Always use `supabase.auth.getSession()` to get the authenticated user ID
- Don't rely on props for user ID in database operations
- The `userId` prop is still useful for UI logic, but database operations should use session

