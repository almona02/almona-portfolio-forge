# Phase 2 Theme & Zoom Testing Guide

## ✅ Implementation Status
All Phase 2 tasks are completed and verified:
- ✅ CSS Theme System (`fabricator-themes.css`)
- ✅ ThemeToggle Component
- ✅ ZoomPresets Component
- ✅ Store Integration
- ✅ Component Integrations

## 🧪 Testing Checklist

### 1. Theme Toggle Testing

#### Location 1: Engineering Bay
- **URL**: `http://localhost:3000/fabricator/workflow/engineering-bay`
- **ThemeToggle Location**: Header area (near Dimensions button)
- **Test Steps**:
  1. Navigate to Engineering Bay
  2. Locate the ThemeToggle button (Sun/Moon icon) in the header
  3. Click to toggle between dark and light themes
  4. Verify:
     - ✅ Theme switches instantly (< 50ms)
     - ✅ All UI colors update correctly
     - ✅ CSS variables apply (check DevTools)
     - ✅ `data-theme` attribute updates on `<html>` element
     - ✅ Theme persists after page refresh (localStorage)

#### Location 2: Drafting Menu Bar
- **URL**: `http://localhost:3000/fabricator/workflow/engineering-bay` (switch to drafting mode)
- **ThemeToggle Location**: DraftingMenuBar (left side)
- **Test Steps**:
  1. Navigate to Engineering Bay
  2. Switch to drafting mode (if applicable)
  3. Locate ThemeToggle in DraftingMenuBar
  4. Test theme switching
  5. Verify same behaviors as above

### 2. Zoom Presets Testing

#### Location: Quick Access Toolbar
- **URL**: Any fabricator page (Engineering Bay, etc.)
- **ZoomPresets Location**: QuickAccessToolbar (floating toolbar)
- **Test Steps**:
  1. Navigate to any fabricator workspace
  2. Move mouse to reveal QuickAccessToolbar (if auto-hide enabled)
  3. Locate ZoomPresets buttons: Fit, 100%, 200%, Custom
  4. Click each preset button
  5. Verify:
     - ✅ Active preset is visually highlighted
     - ✅ Store state updates (check React DevTools)
     - ✅ Zoom preset persists after page refresh
     - ✅ Presets work per workspace type

### 3. CSS Theme System Testing

#### Dark Theme Verification
1. Set theme to dark (default)
2. Check CSS variables in DevTools:
   - `--fabricator-bg` should be `#0a0a0a`
   - `--fabricator-text` should be `#e5e7eb`
   - `--fabricator-amber-500` should be `#f59e0b`
3. Verify WCAG AAA contrast:
   - Text on background: 7:1+ ratio
   - Use browser accessibility tools or online contrast checkers

#### Light Theme Verification
1. Set theme to light
2. Check CSS variables:
   - `--fabricator-bg` should be `#f8f9fa`
   - `--fabricator-text` should be `#1f2937`
   - `--fabricator-amber-600` should be `#b45309`
3. Verify contrast ratios for light theme

### 4. Integration Testing

#### Cross-Component Theme Sync
1. Open Engineering Bay with ThemeToggle
2. Toggle theme
3. Navigate to different pages
4. Verify theme persists across navigation

#### Store Persistence
1. Change theme and zoom presets
2. Refresh page
3. Verify preferences are restored from localStorage
4. Check localStorage key: `almona_fabricator_ui_preferences`

### 5. Accessibility Testing

#### Keyboard Navigation
- ✅ Tab to ThemeToggle button
- ✅ Press Enter/Space to toggle
- ✅ Verify focus indicators visible
- ✅ Test ZoomPresets keyboard navigation

#### Screen Reader
- ✅ ARIA labels present
- ✅ Button descriptions clear
- ✅ Theme state announced

### 6. Performance Testing

#### Theme Switch Performance
- ✅ Theme switch should be instant (< 50ms)
- ✅ No visible flash or layout shift
- ✅ CSS-only changes (no re-renders needed)

#### Browser DevTools Checks
1. Open Performance tab
2. Record while toggling theme
3. Verify no layout recalculations
4. Check Network tab: no additional requests

## 🐛 Known Issues & Troubleshooting

### Theme Not Switching
- Check browser console for errors
- Verify `data-theme` attribute on `<html>` element
- Check if CSS file is loaded: `fabricator-themes.css`

### Zoom Presets Not Working
- Verify store state in React DevTools
- Check if workspace type is set correctly
- Verify `onZoomChange` callback if custom integration needed

### Styles Not Applying
- Verify CSS variables are defined
- Check if components use CSS variables (not hardcoded colors)
- Ensure `data-theme` attribute is on root element

## 📊 Expected Results

### Theme Toggle
- ✅ Smooth transition animation
- ✅ All UI elements respect theme
- ✅ No console errors
- ✅ State persists in localStorage

### Zoom Presets
- ✅ Buttons show active state
- ✅ Store updates correctly
- ✅ Callback fires (if provided)
- ✅ Presets persist per workspace

## 🎯 Success Criteria

All of the following must pass:
- ✅ Theme switches instantly and correctly
- ✅ All UI elements update with theme
- ✅ Zoom presets work and persist
- ✅ No linting errors
- ✅ No TypeScript errors
- ✅ WCAG AAA contrast compliance
- ✅ State persists across sessions
- ✅ Accessible (keyboard, screen reader)

## 📝 Test Results Template

```
Date: __________
Tester: __________

Theme Toggle (Engineering Bay):
[ ] Works correctly
[ ] Issues found: __________

Theme Toggle (Drafting Menu):
[ ] Works correctly
[ ] Issues found: __________

Zoom Presets (QuickAccessToolbar):
[ ] Works correctly
[ ] Issues found: __________

CSS Theme System:
[ ] Dark theme correct
[ ] Light theme correct
[ ] Contrast ratios pass

Accessibility:
[ ] Keyboard navigation works
[ ] Screen reader compatible

Performance:
[ ] Theme switch < 50ms
[ ] No layout shifts

Overall Status: [ ] PASS [ ] FAIL
Notes: __________
```
