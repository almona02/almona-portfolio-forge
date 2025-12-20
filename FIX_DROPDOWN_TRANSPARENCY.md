# 🔧 Fix: Transparent Dropdown Menus in Profile Tuning Studio

## Problem
Dropdown menus (Select components) appear transparent in Profile Tuning Studio and inside tabs, making them hard to read.

## Root Cause
1. **SelectContent** had `bg-gray-900/95` (95% opacity) which was still slightly transparent
2. **SelectItem** didn't have explicit background colors, relying on default styles
3. **Native HTML `<select>` elements** have limited styling control for dropdown options

## ✅ Fixes Applied

### 1. SelectContent Component (`src/shared/ui/ui/select.tsx`)
- Changed from `bg-gray-900/95` to `bg-gray-900` (fully opaque)
- Added `shadow-xl` for better visibility
- Added `bg-gray-900` to Viewport for consistency

### 2. SelectItem Component (`src/shared/ui/ui/select.tsx`)
- Added explicit background: `bg-gray-900 text-gray-100`
- Added hover state: `hover:bg-gray-800`
- Added focus state: `focus:bg-gray-800`

### 3. Native Select Elements (`src/components/fabricator/ProfileTuningStudio.tsx`)
- Added `text-gray-100` for text color
- Added `[&>option]:bg-gray-900 [&>option]:text-gray-100` for option styling
- Applied to:
  - Corner Technology select
  - Physics Stiffness Class select

## Files Modified

1. ✅ `src/shared/ui/ui/select.tsx` - Made SelectContent and SelectItem fully opaque
2. ✅ `src/components/fabricator/ProfileTuningStudio.tsx` - Fixed native select styling

## Result

- ✅ Dropdown menus are now fully opaque (not transparent)
- ✅ Text is clearly visible (white text on dark background)
- ✅ Hover states work properly
- ✅ All Select components throughout the app benefit from this fix

## Testing

1. Open Profile Tuning Studio
2. Navigate to any tab with dropdowns (Cutting Rules, Structural, etc.)
3. Click on any dropdown menu
4. Verify:
   - Dropdown panel is fully opaque (dark gray background)
   - Text is clearly visible (white/light gray)
   - Options are readable
   - Hover states work

## Note

Native HTML `<select>` elements have limited browser styling control. The `[&>option]` Tailwind classes help, but browser support varies. For best results, consider converting native selects to use the shadcn Select component in the future.

