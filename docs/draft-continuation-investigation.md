# Draft Continuation Investigation & Implementation

## Investigation Summary

### Current State

**Draft Storage**:
- Drafts are currently saved to localStorage only (not user-specific in database)
- Recovery dialog shows unsaved drafts from previous session
- Import dialog allows loading JSON/DXF files
- No UI for listing/selecting user drafts
- No backend API for drafts yet

**Draft Loading**:
- `ImportDialog` handles file uploads (JSON/DXF)
- `RecoveryDialog` handles crash recovery from localStorage
- No mechanism to list and select user's saved drafts

### Implementation Plan

#### 1. Backend API Service (`src/lib/api/drafts.ts`) ✅ CREATED
- `saveDraft()` - Save draft to Supabase (with localStorage fallback)
- `updateDraft()` - Update existing draft
- `loadDraft()` - Load draft by ID
- `listDrafts()` - List user's drafts
- `deleteDraft()` - Delete draft

**Features**:
- Supabase integration with localStorage fallback
- User-specific draft storage
- Twincode tracking
- Element count metadata

#### 2. Draft List Dialog (`src/components/fabricator/drafting/components/DraftListDialog.tsx`) ✅ CREATED
- Lists user's drafts with metadata
- Search/filter functionality
- Continue draft (load into workbench)
- Delete draft
- Import from file (fallback)

**Features**:
- Shows draft name, twincode, last updated, element count
- Search by name or twincode
- Loading states
- Error handling

#### 3. Handler Integration (`src/components/fabricator/drafting/hooks/useDraftingWorkbenchHandlers.ts`) ✅ UPDATED
- Added `handleLoadDraft()` function
- Loads draft geometry, dimensions, and template
- Error handling and status messages

#### 4. Next Steps (TODO)

**State Management**:
- Add `draftListDialogOpen` state to `useDraftingWorkbenchState`
- Add action to toggle draft list dialog

**UI Integration**:
- Update `DraftingWorkbench` to show `DraftListDialog`
- Update `DraftingMenuBar` "Open" button to show draft list dialog
- Add option to switch between draft list and import file

**Backend Setup**:
- Create `drafts` table in Supabase:
  ```sql
  CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    twincode TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX idx_drafts_user_id ON drafts(user_id);
  CREATE INDEX idx_drafts_updated_at ON drafts(updated_at DESC);
  
  -- RLS Policies
  ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can view their own drafts"
    ON drafts FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert their own drafts"
    ON drafts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own drafts"
    ON drafts FOR UPDATE
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own drafts"
    ON drafts FOR DELETE
    USING (auth.uid() = user_id);
  ```

**Login Integration**:
- On login, check for user drafts
- Show draft list dialog if drafts exist
- Option to continue last draft or select from list

## User Flow

### Current Flow (Guest/No Login)
1. User creates draft → Saved to localStorage
2. User closes browser → Recovery dialog on next visit
3. User can import JSON/DXF files

### New Flow (Logged In)
1. User logs in → Drafts loaded from Supabase
2. User clicks "Open" → Draft list dialog shows
3. User selects draft → Draft loaded into workbench
4. User continues working → Auto-saved to Supabase
5. User saves → Draft updated with twincode

## Files Created/Modified

### Created
1. `src/lib/api/drafts.ts` - Draft API service
2. `src/components/fabricator/drafting/components/DraftListDialog.tsx` - Draft list UI

### Modified
1. `src/components/fabricator/drafting/hooks/useDraftingWorkbenchHandlers.ts` - Added `handleLoadDraft`

### TODO
1. Add `draftListDialogOpen` state to state hook
2. Update `DraftingWorkbench` to show draft list dialog
3. Update `DraftingMenuBar` to open draft list dialog
4. Create Supabase `drafts` table
5. Add login integration to show drafts

## Testing Checklist

- [ ] User can save draft (creates twincode)
- [ ] User can list their drafts
- [ ] User can search/filter drafts
- [ ] User can select draft to continue
- [ ] Draft loads correctly (geometry, dimensions, template)
- [ ] User can delete draft
- [ ] Guest users fallback to localStorage
- [ ] Login loads user drafts
- [ ] Draft list shows correct metadata
