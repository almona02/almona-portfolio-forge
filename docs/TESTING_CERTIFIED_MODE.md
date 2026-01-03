# Testing Certified Mode - Step by Step Guide

## Quick Test: Create Workshop and Set to Certified

### Step 1: Get Your User ID

Run this in Supabase SQL Editor to find your user ID:

```sql
-- Get your user ID (replace with your email)
SELECT id, email, full_name 
FROM auth.users 
WHERE email = 'your-email@example.com';
```

**Copy the `id` value** - you'll need it in the next steps.

### Step 2: Create a Workshop

```sql
-- Replace 'YOUR_USER_ID_HERE' with the ID from Step 1
INSERT INTO public.workshops (owner_id, name, operation_mode)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,
  'Test Workshop',
  'certified'
)
RETURNING id, owner_id, operation_mode;
```

**Copy the workshop `id` value** from the result.

### Step 3: Link Workshop to Your Profile

```sql
-- Replace 'YOUR_USER_ID_HERE' with your user ID
-- Replace 'WORKSHOP_ID_HERE' with the workshop ID from Step 2
UPDATE public.profiles
SET workshop_id = 'WORKSHOP_ID_HERE'::uuid
WHERE id = 'YOUR_USER_ID_HERE'::uuid
RETURNING id, workshop_id;
```

### Step 4: Clear Browser Cache

The hook caches the mode for 5 minutes. To see changes immediately:

1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage
3. Delete the `almona_authority_state` key
4. Refresh the page

OR wait 5 minutes for cache to expire.

### Step 5: Verify Badge Shows "CERTIFIED"

After refreshing:
- Badge should be **gold/yellow** color
- Text should say **"CERTIFIED"**
- Should show **"Locked"** subtitle
- Should show **"Audit Active"** and **"No Overrides"** in certified mode

---

## Alternative: One-Line Test (If You Know Your User ID)

```sql
-- All-in-one: Create workshop, set to certified, link to profile
WITH new_workshop AS (
  INSERT INTO public.workshops (owner_id, name, operation_mode)
  VALUES (
    auth.uid(),  -- Uses current authenticated user
    'Test Workshop',
    'certified'
  )
  RETURNING id
)
UPDATE public.profiles
SET workshop_id = (SELECT id FROM new_workshop)
WHERE id = auth.uid()
RETURNING id, workshop_id;
```

**Note:** This only works if you're authenticated in Supabase SQL Editor.

---

## Testing Other Modes

### Test Sandbox Mode:
```sql
UPDATE public.workshops
SET operation_mode = 'sandbox'
WHERE owner_id = auth.uid();
```

### Test Production Mode:
```sql
UPDATE public.workshops
SET operation_mode = 'production'
WHERE owner_id = auth.uid();
```

### Test Certified Mode:
```sql
UPDATE public.workshops
SET operation_mode = 'certified'
WHERE owner_id = auth.uid();
```

After each change:
1. Clear localStorage cache (or wait 5 minutes)
2. Refresh the page
3. Verify badge color and text

---

## Troubleshooting

### Badge Still Shows "PRODUCTION" After Setting to Certified

**Check 1:** Verify workshop exists and mode is set:
```sql
SELECT w.id, w.operation_mode, p.id as profile_id, p.workshop_id
FROM public.workshops w
JOIN public.profiles p ON p.workshop_id = w.id
WHERE p.id = auth.uid();
```

**Check 2:** Clear browser cache (localStorage key: `almona_authority_state`)

**Check 3:** Check browser console for errors (F12 → Console)

### "Workshop Not Found" Error

Make sure:
1. Workshop exists in `workshops` table
2. `profiles.workshop_id` points to the workshop `id`
3. RLS policies allow you to read the workshop

---

## Cleanup (Remove Test Workshop)

```sql
-- Remove workshop link from profile
UPDATE public.profiles
SET workshop_id = NULL
WHERE id = auth.uid();

-- Delete test workshop
DELETE FROM public.workshops
WHERE owner_id = auth.uid()
AND name = 'Test Workshop';
```

