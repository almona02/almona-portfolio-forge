# Frame Geometry Debug Notes

## Current Issue
Fixed window shows frame as a single continuous shape instead of 4 distinct connected bars.

## Expected Structure
- **Outer Frame**: 4 connected bars (top, bottom, left, right) forming a rectangle
- **Fixed Glass**: Single glass pane inside the frame

## Code Flow
1. `generateGenericGeometries()` creates `frameParts` using `createMiteredFrame()`
2. `createMiteredFrame()` returns 4 `MiteredFrameData` objects
3. `Window3DGenerator` renders each part as separate `MiteredFramePart` component
4. Each `MiteredFramePart` creates `ExtrudeGeometry` and applies matrix

## Potential Issues
1. **Bars overlapping**: If profile width is large relative to window, bars might overlap visually
2. **Matrix composition**: Rotation + translation might not be positioning bars correctly
3. **ExtrudeGeometry behavior**: Need to verify how ExtrudeGeometry positions geometry after rotation

## Next Steps
- Verify frame parts are being created (check console logs)
- Check if bars are positioned correctly (may need to adjust positioning calculations)
- Consider adding visual distinction (small gaps or different materials) to make bars more visible

