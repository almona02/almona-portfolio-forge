# Drafting Rectangle Grid Rendering Fix

## Issues Fixed

### 1. ✅ Rectangle Grid Lines (Mullions/Transoms) Not Showing

**Problem**: After drawing a rectangle, adjusting size, and selecting a system pack, only a single white rectangle appeared without showing the template grid structure (mullions/transoms).

**Root Cause**: The `GeometryRectangle` component was only rendering a simple rectangle without drawing the template-based grid lines inside it.

**Solution**: Added template grid rendering to `GeometryRectangle` component:
- Gets active template from `DraftingContext`
- Calculates mullion positions (vertical lines) based on `template.cols`
- Calculates transom positions (horizontal lines) based on `template.rows`
- Draws grid lines inside the rectangle when a template is active

**Files Modified**:
- `src/components/fabricator/drafting/components/GeometryRectangle.tsx`
  - Added `useDraftingContext` hook to access template
  - Added grid line calculation logic
  - Rendered mullion/transom lines inside rectangle

**How It Works**:
1. When a template is selected (e.g., 2x3 grid)
2. Rectangle calculates cell dimensions: `cellWidth = width / cols`, `cellHeight = height / rows`
3. Draws vertical lines (mullions) at column boundaries
4. Draws horizontal lines (transoms) at row boundaries
5. Lines are styled with `#64748b` color, 2px width, 60% opacity

**Result**: Rectangles now show the template grid structure visually, making it clear how the window is divided into cells.

### 2. ⚠️ 3D Tab Showing SQL Code

**Problem**: When switching to the 3D tab, SQL code for creating a drafts table is displayed instead of the 3D preview.

**Investigation**: 
- No SQL code found in `DraftingPreview3D.tsx` component
- SQL code provided by user is for creating `drafts` table in Supabase
- This might be:
  1. An error message displaying SQL code
  2. A component accidentally rendering text
  3. A browser console error being displayed

**SQL Migration File Created**: `supabase/migrations/create_drafts_table.sql`

**Next Steps**:
1. Apply SQL migration to Supabase database
2. Verify 3D preview component is loading correctly
3. Check browser console for errors
4. Ensure `Window3DGenerator` component is loading properly

## Testing Checklist

- [x] Rectangle shows grid lines when template is selected
- [x] Grid lines match template rows/cols
- [x] Grid lines are properly styled
- [x] Build passes without errors
- [ ] 3D preview loads correctly (needs verification)
- [ ] SQL migration applied to database

## Usage

1. **Draw Rectangle**: Use rectangle tool to create a window outline
2. **Select Template**: Choose a template from Properties panel (e.g., 2x3, 3x4)
3. **View Grid**: Rectangle automatically shows mullions/transoms based on template
4. **Adjust Size**: Grid lines update automatically when rectangle size changes

## Notes

- Grid lines only appear when a template is selected
- Grid lines respect rectangle rotation
- Grid lines are non-interactive (pointer-events-none)
- Grid styling matches the drafting theme (slate colors)
