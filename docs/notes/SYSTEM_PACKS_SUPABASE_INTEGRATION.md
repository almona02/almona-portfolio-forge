# System Packs Supabase Integration

## Overview

System packs are now stored in Supabase for persistence across devices and users, with localStorage as a fallback.

## Database Table: `fabricator_system_packs`

The table already exists in your Supabase schema with the following structure:

```sql
CREATE TABLE fabricator_system_packs (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,                    -- System pack name
  regions TEXT[],                          -- Array of regions (egypt, turkey, etc.)
  brands TEXT[],                           -- Array of brand names
  spec JSONB NOT NULL,                     -- Full system pack data (SystemPack object)
  is_active BOOLEAN DEFAULT true,          -- Soft delete flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_user_id UUID REFERENCES auth.users(id), -- User who created it (null for public)
  scope TEXT DEFAULT 'user'                -- 'user' for custom, 'public' for shared
);
```

## Implementation

### Files Created/Modified

1. **`src/lib/fabricator/systemPackSupabase.ts`** (NEW)
   - Service functions for Supabase operations
   - Converts between SystemPack and Supabase format
   - Handles user-specific and public system packs

2. **`src/lib/fabricator/customSystemStorage.ts`** (UPDATED)
   - Added async versions of all functions with Supabase sync
   - Kept synchronous versions for backward compatibility
   - Hybrid approach: localStorage + Supabase sync
   - Set `USE_SUPABASE = true` to enable Supabase sync

3. **Navigation Fixes**
   - All back buttons now return to `/fabricator/system-packs` instead of `/fabricator-workflow`
   - Fixed in:
     - `SystemPackTuningStudio.tsx`
     - `ProfileTuningStudio.tsx`
     - `NoDXFTuningStudio.tsx`
     - `SystemPackManagement.tsx`
     - `SystemPacksPage.tsx`

## Usage

### Loading System Packs

```typescript
// Synchronous (localStorage only - backward compatible)
const systems = loadCustomSystems();

// Async (with Supabase sync)
const systems = await loadCustomSystemsAsync(userId);
```

### Adding System Packs

```typescript
// Synchronous (localStorage only)
const updated = addCustomSystem(systemPack);

// Async (with Supabase sync)
const updated = await addCustomSystemAsync(systemPack, userId);
```

### Features

- **Hybrid Storage**: localStorage for immediate access, Supabase for persistence
- **User Isolation**: Each user's custom system packs are stored separately
- **Public System Packs**: Can be shared across users (scope: 'public')
- **Backward Compatible**: Existing code using sync functions still works
- **Graceful Fallback**: If Supabase fails, falls back to localStorage

## Benefits

1. **Persistence**: System packs survive browser cache clears
2. **Multi-Device**: Access system packs from any device
3. **Collaboration**: Can share system packs with team (future feature)
4. **Backup**: Data is backed up in Supabase
5. **Audit Trail**: Created/updated timestamps tracked

## Migration Path

1. Existing localStorage data continues to work
2. New system packs are saved to both localStorage and Supabase
3. On load, Supabase data takes precedence if available
4. Gradually migrate existing data to Supabase (optional)

## Next Steps (Optional)

1. Add migration script to move existing localStorage data to Supabase
2. Add sharing functionality (scope: 'public')
3. Add versioning for system packs
4. Add team/organization-level system packs

