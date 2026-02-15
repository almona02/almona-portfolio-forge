# Almona02.com Live Testing Guide

## Test Date: February 2026
## Test URL: https://almona02.com
## Test Credentials: almona.co@hotmail.com / abcd1234

---

## Testing Objectives
1. Login functionality verification
2. Project creation workflow
3. Window drawing with multiple sizes
4. Cut list optimization output verification
5. File generation and download

---

## Test Procedure

### Phase 1: Login & Authentication
**Steps:**
1. Navigate to https://almona02.com
2. Locate login form
3. Enter credentials:
   - Email: almona.co@hotmail.com
   - Password: abcd1234
4. Click "Login" or "Sign In" button

**Expected Results:**
- ✓ Successful authentication
- ✓ Redirect to dashboard/main interface
- ✓ User profile visible
- ✓ No error messages

**Checkpoints:**
- [ ] Login form loads correctly
- [ ] Credentials accepted
- [ ] Session established
- [ ] Dashboard accessible

---

### Phase 2: Project Creation
**Steps:**
1. Locate "New Project" or "Create Project" button
2. Click to initiate project creation
3. Fill in project details:
   - Project name: "Test_CutList_Optimization_[Date]"
   - Client name: "Test Client"
   - Location: [Any test location]
4. Save/Create project

**Expected Results:**
- ✓ Project creation form loads
- ✓ All fields editable
- ✓ Project saves successfully
- ✓ Redirect to project workspace

**Checkpoints:**
- [ ] New project button visible
- [ ] Form validation works
- [ ] Project created successfully
- [ ] Project appears in list

---

### Phase 3: Window Drawing - Test Case 1 (Small Window)
**Window Specifications:**
- **Size:** 800mm x 1200mm (Width x Height)
- **Type:** Casement/Fixed (as available)
- **Profile:** Standard profile

**Steps:**
1. Access drawing/design tool
2. Select window type
3. Input dimensions: 800 x 1200
4. Place window in design area
5. Confirm/Save window

**Expected Results:**
- ✓ Window renders correctly
- ✓ Dimensions accurate
- ✓ Profile applied properly

**Checkpoints:**
- [ ] Drawing tool responsive
- [ ] Dimensions accepted
- [ ] Window displays correctly
- [ ] Properties saved

---

### Phase 4: Window Drawing - Test Case 2 (Medium Window)
**Window Specifications:**
- **Size:** 1500mm x 1800mm (Width x Height)
- **Type:** Sliding/Casement (as available)
- **Profile:** Standard profile

**Steps:**
1. Add new window to project
2. Select window type
3. Input dimensions: 1500 x 1800
4. Place window in design area
5. Confirm/Save window

**Expected Results:**
- ✓ Second window added successfully
- ✓ Different size handled correctly
- ✓ Both windows visible in project

**Checkpoints:**
- [ ] Multiple windows supported
- [ ] Size variation handled
- [ ] Layout updates correctly
- [ ] No conflicts between windows

---

### Phase 5: Window Drawing - Test Case 3 (Large Window)
**Window Specifications:**
- **Size:** 2400mm x 2100mm (Width x Height)
- **Type:** Fixed/Picture window (as available)
- **Profile:** Standard profile

**Steps:**
1. Add third window to project
2. Select window type
3. Input dimensions: 2400 x 2100
4. Place window in design area
5. Confirm/Save window

**Expected Results:**
- ✓ Large window handled correctly
- ✓ All three windows visible
- ✓ System performance stable

**Checkpoints:**
- [ ] Large dimensions accepted
- [ ] Rendering performance good
- [ ] All windows in project list
- [ ] No memory issues

---

### Phase 6: Cut List Generation
**Steps:**
1. Locate "Generate Cut List" or "Optimization" button
2. Click to initiate cut list generation
3. Wait for processing
4. Review generated cut list

**Expected Results:**
- ✓ Cut list generates successfully
- ✓ All windows included
- ✓ Optimization algorithm runs
- ✓ Results displayed clearly

**Critical Verification Points:**
- [ ] All 3 windows included in cut list
- [ ] Correct dimensions for each window:
  - Window 1: 800 x 1200
  - Window 2: 1500 x 1800
  - Window 3: 2400 x 2100
- [ ] Profile lengths calculated
- [ ] Material quantities accurate
- [ ] Waste calculation present

---

### Phase 7: Cut List Optimization Output Files
**Files to Check:**

#### 7.1 PDF Output
**Steps:**
1. Locate PDF export/download option
2. Download cut list PDF
3. Open and review

**Verification Checklist:**
- [ ] PDF downloads successfully
- [ ] File opens without errors
- [ ] Contains project header information
- [ ] Lists all 3 windows with specifications
- [ ] Shows optimized cut lengths
- [ ] Includes material list
- [ ] Shows waste percentage
- [ ] Professional formatting
- [ ] Readable fonts and layout
- [ ] Company branding present

**Key Data Points to Verify:**
- Window 1 (800x1200): Frame perimeter = ~4000mm
- Window 2 (1500x1800): Frame perimeter = ~6600mm
- Window 3 (2400x2100): Frame perimeter = ~9000mm
- Total material needed
- Number of standard profiles required
- Cutting pattern optimization

#### 7.2 Excel/CSV Output
**Steps:**
1. Locate Excel/CSV export option
2. Download cut list spreadsheet
3. Open in Excel/LibreOffice

**Verification Checklist:**
- [ ] File downloads successfully
- [ ] Opens in spreadsheet application
- [ ] Data structured in columns
- [ ] Headers present and clear
- [ ] All windows listed separately
- [ ] Dimensions accurate
- [ ] Quantities calculated
- [ ] Formulas working (if present)
- [ ] Sortable/filterable data

**Expected Columns:**
- Item/Window ID
- Window Type
- Width (mm)
- Height (mm)
- Profile Type
- Cut Length
- Quantity
- Material Code
- Notes/Comments

#### 7.3 DXF/CAD Output (if available)
**Steps:**
1. Check for DXF/CAD export option
2. Download CAD file
3. Open in CAD viewer/AutoCAD

**Verification Checklist:**
- [ ] DXF file downloads
- [ ] Opens in CAD software
- [ ] Windows drawn to scale
- [ ] Dimensions annotated
- [ ] Layers organized
- [ ] Cut lines visible
- [ ] Profile details included

---

### Phase 8: Optimization Algorithm Verification

**Manual Calculation Check:**

**Window 1 (800 x 1200):**
- Top: 800mm
- Bottom: 800mm
- Left: 1200mm
- Right: 1200mm
- Total: 4000mm

**Window 2 (1500 x 1800):**
- Top: 1500mm
- Bottom: 1500mm
- Left: 1800mm
- Right: 1800mm
- Total: 6600mm

**Window 3 (2400 x 2100):**
- Top: 2400mm
- Bottom: 2400mm
- Left: 2100mm
- Right: 2100mm
- Total: 9000mm

**Grand Total: 19,600mm of profile needed**

**Optimization Checks:**
- [ ] System suggests optimal profile lengths (e.g., 6000mm standard)
- [ ] Minimizes waste by smart cutting
- [ ] Groups similar cuts together
- [ ] Provides cutting sequence
- [ ] Calculates number of profiles needed
- [ ] Shows waste percentage (should be < 10% for good optimization)

**Example Expected Output:**
```
Standard Profile Length: 6000mm

Profile 1:
- Cut 1: 2400mm (Window 3 top)
- Cut 2: 2400mm (Window 3 bottom)
- Cut 3: 1200mm (Window 1 left)
- Waste: 0mm ✓

Profile 2:
- Cut 1: 2100mm (Window 3 left)
- Cut 2: 2100mm (Window 3 right)
- Cut 3: 1800mm (Window 2 left)
- Waste: 0mm ✓

Profile 3:
- Cut 1: 1800mm (Window 2 right)
- Cut 2: 1500mm (Window 2 top)
- Cut 3: 1500mm (Window 2 bottom)
- Cut 4: 1200mm (Window 1 right)
- Waste: 0mm ✓

Profile 4:
- Cut 1: 800mm (Window 1 top)
- Cut 2: 800mm (Window 1 bottom)
- Waste: 4400mm (73% waste - needs optimization!)
```

---

### Phase 9: Performance & Quality Checks

**System Performance:**
- [ ] Page load time < 3 seconds
- [ ] Drawing tool responsive (no lag)
- [ ] Cut list generation < 10 seconds
- [ ] File downloads immediate
- [ ] No browser console errors
- [ ] No memory leaks during session

**Data Accuracy:**
- [ ] All dimensions match input
- [ ] Calculations mathematically correct
- [ ] No rounding errors
- [ ] Units consistent (mm throughout)
- [ ] Totals sum correctly

**User Experience:**
- [ ] Interface intuitive
- [ ] Clear instructions/tooltips
- [ ] Error messages helpful
- [ ] Success confirmations present
- [ ] Navigation logical
- [ ] Mobile responsive (if applicable)

---

### Phase 10: Edge Cases & Error Handling

**Test Scenarios:**

1. **Invalid Dimensions:**
   - Try: 0 x 1000 (should reject)
   - Try: -500 x 1000 (should reject)
   - Try: 10000 x 10000 (should warn if too large)

2. **Empty Project:**
   - Try generating cut list with no windows
   - Expected: Error message or warning

3. **Duplicate Windows:**
   - Add same window size twice
   - Verify: Both counted in cut list

4. **Delete Window:**
   - Remove one window
   - Regenerate cut list
   - Verify: Updated correctly

---

## Test Results Summary Template

### Test Execution Date: _______________
### Tester Name: _______________

| Phase | Status | Issues Found | Notes |
|-------|--------|--------------|-------|
| Login | ⬜ Pass ⬜ Fail | | |
| Project Creation | ⬜ Pass ⬜ Fail | | |
| Window 1 (800x1200) | ⬜ Pass ⬜ Fail | | |
| Window 2 (1500x1800) | ⬜ Pass ⬜ Fail | | |
| Window 3 (2400x2100) | ⬜ Pass ⬜ Fail | | |
| Cut List Generation | ⬜ Pass ⬜ Fail | | |
| PDF Output | ⬜ Pass ⬜ Fail | | |
| Excel/CSV Output | ⬜ Pass ⬜ Fail | | |
| Optimization Quality | ⬜ Pass ⬜ Fail | | |
| Performance | ⬜ Pass ⬜ Fail | | |

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

## Screenshots to Capture

1. **Login Page** - Before login
2. **Dashboard** - After successful login
3. **New Project Form** - Project creation screen
4. **Drawing Tool** - With all 3 windows visible
5. **Window 1 Properties** - 800x1200 details
6. **Window 2 Properties** - 1500x1800 details
7. **Window 3 Properties** - 2400x2100 details
8. **Cut List Screen** - Generated optimization
9. **PDF Output** - First page of PDF
10. **Excel Output** - Spreadsheet view
11. **Optimization Details** - Cutting pattern
12. **Any Errors** - If encountered

---

## Post-Test Actions

1. **Save all output files** with naming convention:
   - `almona02_cutlist_pdf_[date].pdf`
   - `almona02_cutlist_excel_[date].xlsx`
   - `almona02_cutlist_dxf_[date].dxf`

2. **Document any bugs** in detail:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS information
   - Screenshots/videos

3. **Compare with requirements:**
   - Review against project specifications
   - Check if optimization meets industry standards
   - Verify compliance with any regulations

4. **Performance metrics:**
   - Note any slow operations
   - Check browser console for errors
   - Monitor network requests

---

## Success Criteria

✅ **Test Passes If:**
- All 3 windows created successfully
- Cut list generates without errors
- Output files download and open correctly
- Dimensions are accurate in all outputs
- Optimization reduces waste to < 15%
- Total material calculation is correct
- System performance is acceptable
- No critical bugs encountered

❌ **Test Fails If:**
- Cannot login
- Windows don't save correctly
- Cut list generation fails
- Output files corrupted or missing
- Calculations are incorrect
- Optimization is poor (>20% waste)
- System crashes or freezes
- Data loss occurs

---

## Contact for Issues

If you encounter any problems during testing:
- Document the issue thoroughly
- Save error messages/screenshots
- Note the exact steps that caused the problem
- Check browser console for technical errors

---

## Additional Testing Recommendations

1. **Browser Compatibility:**
   - Test in Chrome, Firefox, Safari, Edge
   - Check mobile browsers if applicable

2. **Different Profile Types:**
   - Test with various profile systems
   - Verify each has correct optimization

3. **Large Projects:**
   - Create project with 10+ windows
   - Test system scalability

4. **Export Formats:**
   - Try all available export options
   - Verify data integrity in each format

5. **User Permissions:**
   - Test with different user roles if applicable
   - Verify access controls

---

## Notes Section

Use this space for any additional observations, suggestions, or findings during testing:

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
